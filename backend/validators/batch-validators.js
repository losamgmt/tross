/**
 * Batch Operation Validators
 *
 * SRP LITERALISM: ONLY validates batch request structure
 *
 * PHILOSOPHY:
 * - SHAPE VALIDATION: Validates structure, not business rules
 * - CONFIG-DRIVEN: Limits from API_OPERATIONS (SSOT)
 * - CONSISTENT: Follows validatePagination() pattern
 * - DETAILED ERRORS: Reports all issues, not just first
 *
 * USAGE:
 *   router.post('/batch', validateBatchRequest(), handler)
 *   // Access: req.validated.batch = { operations, options }
 */

const { API_OPERATIONS } = require('../config/api-operations');
const ResponseFormatter = require('../utils/response-formatter');
const { logValidationFailure } = require('./validation-logger');

const { BATCH } = API_OPERATIONS;

/**
 * Validate batch request body
 *
 * Validates:
 * - operations is array, non-empty, within limit
 * - Each operation has valid structure
 * - Operation types are valid (create/update/delete)
 * - Required fields per operation type (id for update/delete, data for create/update)
 *
 * @returns {Function} Express middleware
 */
function validateBatchRequest() {
  return (req, res, next) => {
    const errors = [];
    const { operations, options = {} } = req.body || {};

    // ─────────────────────────────────────────────────────────────
    // Operations array validation
    // ─────────────────────────────────────────────────────────────

    if (!Array.isArray(operations)) {
      errors.push({
        field: 'operations',
        message: 'Operations must be an array',
      });
    } else if (operations.length === 0) {
      errors.push({
        field: 'operations',
        message: 'Operations array cannot be empty',
      });
    } else if (operations.length > BATCH.MAX_OPERATIONS) {
      errors.push({
        field: 'operations',
        message: `Operations array exceeds maximum of ${BATCH.MAX_OPERATIONS}`,
      });
    } else {
      // Validate each operation
      const operationTypes = new Set();

      operations.forEach((op, index) => {
        const prefix = `operations[${index}]`;

        if (!op || typeof op !== 'object') {
          errors.push({
            field: prefix,
            message: 'Each operation must be an object',
          });
          return;
        }

        // Validate operation type
        if (!BATCH.OPERATIONS.includes(op.operation)) {
          errors.push({
            field: `${prefix}.operation`,
            message: `Invalid operation '${op.operation}'. Valid: ${BATCH.OPERATIONS.join(', ')}`,
          });
        } else {
          operationTypes.add(op.operation);
        }

        // Validate id requirement for update/delete
        if (
          (op.operation === 'update' || op.operation === 'delete') &&
          !op.id
        ) {
          errors.push({
            field: `${prefix}.id`,
            message: `Operation '${op.operation}' requires an id`,
          });
        }

        // Validate data requirement for create/update
        if (
          (op.operation === 'create' || op.operation === 'update') &&
          !op.data
        ) {
          errors.push({
            field: `${prefix}.data`,
            message: `Operation '${op.operation}' requires data`,
          });
        }
      });

      // Check mixed operations if not allowed
      if (!BATCH.ALLOW_MIXED_OPERATIONS && operationTypes.size > 1) {
        errors.push({
          field: 'operations',
          message: `Mixed operation types not allowed. Found: ${[...operationTypes].join(', ')}`,
        });
      }
    }

    // ─────────────────────────────────────────────────────────────
    // Options validation
    // ─────────────────────────────────────────────────────────────

    if (
      options.continueOnError !== undefined &&
      typeof options.continueOnError !== 'boolean'
    ) {
      errors.push({
        field: 'options.continueOnError',
        message: 'continueOnError must be a boolean',
      });
    }

    // ─────────────────────────────────────────────────────────────
    // Return errors or proceed
    // ─────────────────────────────────────────────────────────────

    if (errors.length > 0) {
      logValidationFailure({
        validator: 'validateBatchRequest',
        field: 'batch',
        value: { operationsCount: operations?.length, options },
        reason: errors.map((e) => e.message).join('; '),
        context: { url: req.url, method: req.method },
      });

      return ResponseFormatter.badRequest(
        res,
        `Batch validation failed with ${errors.length} error(s)`,
        errors,
      );
    }

    // Attach validated data
    if (!req.validated) {
      req.validated = {};
    }

    req.validated.batch = {
      operations,
      options: {
        continueOnError:
          options.continueOnError ?? BATCH.DEFAULT_CONTINUE_ON_ERROR,
      },
    };

    next();
  };
}

module.exports = {
  validateBatchRequest,
};
