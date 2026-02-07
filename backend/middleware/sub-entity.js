/**
 * Sub-Entity Middleware
 *
 * Generic middleware for sub-entity (parent-child) route patterns.
 * Used when one entity "belongs to" another entity.
 *
 * Examples:
 * - /work_orders/:id/files (files belong to work orders)
 * - /customers/:id/contacts (contacts belong to customers)
 * - /invoices/:id/line_items (line items belong to invoices)
 *
 * MIDDLEWARE:
 * - attachParentMetadata(metadata) - Attach parent entity metadata to request
 * - requireParentPermission(operation) - Check permission on parent entity
 * - requireServiceConfigured(checkFn, serviceName) - Ensure external service is available
 */

const AppError = require("../utils/app-error");

/**
 * Middleware Factory: Attach parent entity metadata to request
 * Makes metadata available to downstream middleware
 *
 * @param {Object} metadata - Entity metadata from config/models
 * @returns {Function} Express middleware
 */
function attachParentMetadata(metadata) {
  return (req, res, next) => {
    req.parentMetadata = metadata;
    next();
  };
}

/**
 * Middleware Factory: Require permission on parent entity
 * Uses rlsResource from req.parentMetadata
 *
 * @param {string} operation - 'read', 'create', 'update', 'delete'
 * @returns {Function} Express middleware
 */
function requireParentPermission(operation) {
  return (req, res, next) => {
    const metadata = req.parentMetadata || req.entityMetadata;
    const { rlsResource, entityKey } = metadata || {};

    if (!rlsResource) {
      return next(
        new AppError(
          "Parent entity metadata not available",
          500,
          "INTERNAL_ERROR",
        ),
      );
    }

    const hasPermission =
      req.permissions?.hasPermission(rlsResource, operation) ?? false;

    if (!hasPermission) {
      const actionVerb = getActionVerb(operation);
      return next(
        new AppError(
          `You don't have permission to ${actionVerb} this ${entityKey || "resource"}`,
          403,
          "FORBIDDEN",
        ),
      );
    }

    next();
  };
}

/**
 * Get human-readable action verb for error messages
 * @param {string} operation - CRUD operation
 * @returns {string} Human-readable verb
 */
function getActionVerb(operation) {
  const verbs = {
    read: "view",
    create: "add to",
    update: "modify",
    delete: "delete from",
  };
  return verbs[operation] || operation;
}

/**
 * Middleware Factory: Require external service to be configured
 * Generic check for any service dependency (storage, email, etc.)
 *
 * @param {Function} checkFn - Function that returns true if service is configured
 * @param {string} serviceName - Name of service for error message
 * @returns {Function} Express middleware
 */
function requireServiceConfigured(checkFn, serviceName) {
  return (req, res, next) => {
    if (!checkFn()) {
      return next(
        new AppError(
          `${serviceName} is not configured`,
          503,
          "SERVICE_UNAVAILABLE",
        ),
      );
    }
    next();
  };
}

/**
 * Middleware Factory: Validate parent entity exists
 * Calls service method to check if parent entity exists
 *
 * @param {Function} existsFn - Async function(entityKey, entityId) => boolean
 * @returns {Function} Express middleware
 */
function requireParentExists(existsFn) {
  return async (req, res, next) => {
    try {
      const metadata = req.parentMetadata || req.entityMetadata;
      const { entityKey } = metadata || {};
      const parentId = parseInt(req.params.id, 10);

      const exists = await existsFn(entityKey, parentId);
      if (!exists) {
        return next(
          new AppError(
            `${entityKey} with id ${parentId} not found`,
            404,
            "NOT_FOUND",
          ),
        );
      }

      // Store parsed ID for downstream handlers
      req.parentId = parentId;
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  attachParentMetadata,
  requireParentPermission,
  requireServiceConfigured,
  requireParentExists,
  getActionVerb,
};
