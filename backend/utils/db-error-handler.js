/**
 * Database Error Handler Utility
 *
 * SRP: ONLY maps PostgreSQL error codes to user-friendly HTTP responses
 *
 * PHILOSOPHY:
 * - Database constraints are the SINGLE SOURCE OF TRUTH for data integrity
 * - FK constraints (23503), unique constraints (23505), check constraints (23514) are enforced by PostgreSQL
 * - This utility translates those errors into appropriate HTTP responses
 * - Centralized handling = DRY, consistent error messages across all routes
 *
 * USAGE:
 *   const { handleDbError } = require('../utils/db-error-handler');
 *
 *   try {
 *     await GenericEntityService.create('contract', data);
 *   } catch (error) {
 *     const handled = handleDbError(error, res, {
 *       uniqueFields: { contract_number: 'Contract number' },
 *       foreignKeys: { customer_id: 'Customer' },
 *     });
 *     if (handled) return;
 *     return ResponseFormatter.internalError(res, error);
 *   }
 */

const ResponseFormatter = require("./response-formatter");
const { logger } = require("../config/logger");
const { ImmutableFieldError } = require("../db/helpers/update-helper");

/**
 * Build DB error config from entity metadata
 * Eliminates duplication - metadata is the single source of truth
 *
 * @param {Object} metadata - Entity metadata (e.g., contract-metadata.js)
 * @returns {Object} Config for handleDbError
 *
 * @example
 *   const contractMetadata = require('../config/models/contract-metadata');
 *   const DB_ERROR_CONFIG = buildDbErrorConfig(contractMetadata);
 */
function buildDbErrorConfig(metadata) {
  const entityName = metadata.tableName
    ? metadata.tableName.charAt(0).toUpperCase() +
      metadata.tableName.slice(1).replace(/s$/, "")
    : "Resource";

  // Build uniqueFields from identity field (always unique)
  const uniqueFields = {};
  if (metadata.identityField) {
    // Convert snake_case to Title Case
    const displayName = metadata.identityField
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    uniqueFields[metadata.identityField] = displayName;
  }

  // Build foreignKeys from metadata.foreignKeys
  const foreignKeys = {};
  if (metadata.foreignKeys) {
    for (const [field, config] of Object.entries(metadata.foreignKeys)) {
      foreignKeys[field] = config.displayName || config.table || field;
    }
  }

  return { entityName, uniqueFields, foreignKeys };
}

/**
 * PostgreSQL Error Codes
 * https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
const PG_ERROR_CODES = Object.freeze({
  // Class 23 — Integrity Constraint Violation
  FOREIGN_KEY_VIOLATION: "23503",
  UNIQUE_VIOLATION: "23505",
  CHECK_VIOLATION: "23514",
  NOT_NULL_VIOLATION: "23502",

  // Class 22 — Data Exception
  INVALID_DATETIME_FORMAT: "22007",
  DATETIME_FIELD_OVERFLOW: "22008",
  NUMERIC_VALUE_OUT_OF_RANGE: "22003",
  INVALID_TEXT_REPRESENTATION: "22P02",
});

/**
 * Extract field name from PostgreSQL constraint error message
 *
 * PostgreSQL error messages follow patterns like:
 * - "Key (customer_id)=(999) is not present in table "customers""
 * - "duplicate key value violates unique constraint "contracts_contract_number_key""
 *
 * @param {Error} error - PostgreSQL error
 * @returns {string|null} Field name or null
 */
function extractFieldFromError(error) {
  const message = error.message || "";
  const detail = error.detail || "";

  // FK violation: "Key (customer_id)=(999) is not present..."
  const fkMatch = detail.match(/Key \(([^)]+)\)/);
  if (fkMatch) {
    return fkMatch[1];
  }

  // Unique violation: constraint name often includes field name
  const constraintMatch = message.match(/"[^"]*_([^_"]+)_key"/);
  if (constraintMatch) {
    return constraintMatch[1];
  }

  return null;
}

/**
 * Handle PostgreSQL database errors with user-friendly messages
 *
 * @param {Error} error - Error from database operation
 * @param {Object} res - Express response object
 * @param {Object} [config={}] - Entity-specific configuration
 * @param {Object} [config.uniqueFields] - Map of field -> display name for unique violations
 * @param {Object} [config.foreignKeys] - Map of FK field -> referenced entity name
 * @param {string} [config.entityName] - Human-readable entity name for generic messages
 * @returns {boolean} true if error was handled, false if caller should handle
 *
 * @example
 *   handleDbError(error, res, {
 *     entityName: 'Contract',
 *     uniqueFields: {
 *       contract_number: 'Contract number',
 *     },
 *     foreignKeys: {
 *       customer_id: 'Customer',
 *     },
 *   });
 */
function handleDbError(error, res, config = {}) {
  const {
    uniqueFields = {},
    foreignKeys = {},
    entityName = "Resource",
  } = config;
  const errorCode = error.code;

  // =========================================================================
  // IMMUTABLE FIELD VIOLATION (custom error from update-helper.js)
  // Client attempted to update field(s) that cannot be modified
  // =========================================================================
  if (error instanceof ImmutableFieldError) {
    logger.warn("Immutable field violation", {
      entity: entityName,
      violations: error.violations,
    });

    // Return 400 with field-level error details for frontend display
    return res.status(400).json({
      success: false,
      error: "Bad Request",
      message: error.message,
      code: error.code,
      violations: error.violations,
      timestamp: new Date().toISOString(),
    });
  }

  // Not a PostgreSQL error code - let caller handle
  // PostgreSQL error codes are 5 characters: digits or letters (e.g., 23503, 22P02)
  if (
    !errorCode ||
    typeof errorCode !== "string" ||
    !errorCode.match(/^[0-9A-Z]{5}$/i)
  ) {
    return false;
  }

  const field = extractFieldFromError(error);

  switch (errorCode) {
    // =========================================================================
    // FOREIGN KEY VIOLATION (23503)
    // Two scenarios:
    // 1. INSERT/UPDATE: Referenced record doesn't exist
    //    Detail: "Key (role_id)=(999) is not present in table \"roles\""
    // 2. DELETE: Record cannot be deleted because it's referenced elsewhere
    //    Detail: "Key (id)=(90) is still referenced from table \"users\""
    // =========================================================================
    case PG_ERROR_CODES.FOREIGN_KEY_VIOLATION: {
      const detail = error.detail || "";
      const isDeleteViolation = detail.includes("is still referenced");

      let message;
      if (isDeleteViolation) {
        // Extract the referencing table from detail: "...from table \"users\""
        const tableMatch = detail.match(/from table "([^"]+)"/);
        const referencingTable = tableMatch ? tableMatch[1] : "other records";
        message = `Cannot delete ${entityName.toLowerCase()}: it is still referenced by ${referencingTable}. Please remove or reassign the dependent records first.`;
      } else {
        // Standard FK violation: referenced record doesn't exist
        const refEntity = foreignKeys[field] || "Referenced resource";
        message = `${refEntity} not found. Please provide a valid ${field || "reference"}.`;
      }

      logger.warn("FK violation", {
        entity: entityName,
        field,
        errorCode,
        detail: error.detail,
      });

      ResponseFormatter.badRequest(res, message);
      return true;
    }

    // =========================================================================
    // UNIQUE VIOLATION (23505)
    // Duplicate value for unique constraint
    // =========================================================================
    case PG_ERROR_CODES.UNIQUE_VIOLATION: {
      const displayName = uniqueFields[field] || field || "Value";
      const message = `${displayName} already exists`;

      logger.warn("Unique violation", {
        entity: entityName,
        field,
        errorCode,
      });

      ResponseFormatter.conflict(res, message);
      return true;
    }

    // =========================================================================
    // CHECK VIOLATION (23514)
    // Value doesn't satisfy CHECK constraint (enum values, ranges, etc.)
    // =========================================================================
    case PG_ERROR_CODES.CHECK_VIOLATION: {
      const message = `Invalid value for ${field || "field"}. Please check allowed values.`;

      logger.warn("Check constraint violation", {
        entity: entityName,
        field,
        errorCode,
        detail: error.detail,
      });

      ResponseFormatter.badRequest(res, message);
      return true;
    }

    // =========================================================================
    // NOT NULL VIOLATION (23502)
    // Required field is null
    // =========================================================================
    case PG_ERROR_CODES.NOT_NULL_VIOLATION: {
      const message = `${field || "Required field"} cannot be empty`;

      logger.warn("Not null violation", {
        entity: entityName,
        field,
        errorCode,
      });

      ResponseFormatter.badRequest(res, message);
      return true;
    }

    // =========================================================================
    // DATE/TIME FORMAT ERRORS (22007, 22008)
    // Invalid date string format
    // =========================================================================
    case PG_ERROR_CODES.INVALID_DATETIME_FORMAT:
    case PG_ERROR_CODES.DATETIME_FIELD_OVERFLOW: {
      const message = "Invalid date format. Please use YYYY-MM-DD format.";

      logger.warn("Date format error", {
        entity: entityName,
        errorCode,
      });

      ResponseFormatter.badRequest(res, message);
      return true;
    }

    // =========================================================================
    // NUMERIC ERRORS (22003, 22P02)
    // Invalid numeric value
    // =========================================================================
    case PG_ERROR_CODES.NUMERIC_VALUE_OUT_OF_RANGE: {
      const message = "Numeric value is out of allowed range";

      logger.warn("Numeric range error", {
        entity: entityName,
        errorCode,
      });

      ResponseFormatter.badRequest(res, message);
      return true;
    }

    case PG_ERROR_CODES.INVALID_TEXT_REPRESENTATION: {
      const message = "Invalid data format provided";

      logger.warn("Invalid text representation", {
        entity: entityName,
        errorCode,
      });

      ResponseFormatter.badRequest(res, message);
      return true;
    }

    default:
      // Unknown PostgreSQL error - let caller handle
      return false;
  }
}

module.exports = {
  handleDbError,
  buildDbErrorConfig,
  PG_ERROR_CODES,
};
