/**
 * Sub-Entity Middleware
 *
 * Generic middleware for sub-entity (parent-child) route patterns.
 * Examples: /work_orders/:id/files, /customers/:id/contacts
 *
 * Uses declarative RLS via requireParentAccess middleware.
 */

const AppError = require('../utils/app-error');
const { pool } = require('../db/connection');
const { buildRLSFilter } = require('../db/helpers/rls');
const { logger } = require('../config/logger');
const allMetadata = require('../config/models');
const {
  extractProfileIds,
  getOperationFromMethod,
} = require('./row-level-security');

/** Attach parent entity metadata to request */
function attachParentMetadata(metadata) {
  return (req, res, next) => {
    req.parentMetadata = metadata;
    next();
  };
}

/**
 * Set polymorphic context for RLS engine.
 *
 * This middleware sets the parentType and parentId for polymorphic RLS rules.
 * The RLS engine uses this context to resolve which parent entity's rules to apply.
 *
 * @param {string} parentEntityKey - The parent entity key (e.g., 'work_order', 'asset')
 * @param {string} [idParam='id'] - Route parameter name for parent ID
 * @returns {Function} Express middleware
 *
 * @example
 * // Route: /work_orders/:id/files
 * router.get('/:id/files',
 *   setPolymorphicContext('work_order'),
 *   // ... other middleware
 * );
 */
function setPolymorphicContext(parentEntityKey, idParam = 'id') {
  return (req, res, next) => {
    const parentId = req.validated?.id || parseInt(req.params[idParam], 10);

    // Set polymorphic context for RLS engine
    req.polymorphicContext = {
      parentType: parentEntityKey,
      parentId: isNaN(parentId) ? null : parentId,
    };

    next();
  };
}

/**
 * Require RLS access to parent entity using DECLARATIVE rules.
 *
 * This middleware verifies the user has access to the parent entity by:
 * 1. Looking up the parent entity's metadata
 * 2. Building RLS context for the current user
 * 3. Using the declarative RLS engine to filter
 * 4. Querying the parent table with RLS filter applied
 *
 * Returns 404 (not 403) to hide entity existence from unauthorized users.
 *
 * BENEFITS over imperative requireParentRLS:
 * - Uses declarative rlsRules from metadata (SSOT)
 * - No separate parent-rls-service needed
 * - Automatically inherits any rule changes
 *
 * @param {string} parentEntityKey - Entity key (e.g., 'work_order', 'asset')
 * @param {string} [idParam='id'] - Route parameter name for parent ID
 * @returns {Function} Express middleware
 *
 * @example
 * // Route: POST /work_orders/:id/files
 * router.post('/:id/files',
 *   requireParentAccess('work_order'),
 *   // ... other middleware
 * );
 */
function requireParentAccess(parentEntityKey, idParam = 'id') {
  return async (req, res, next) => {
    try {
      // Parse parent ID
      const parentId = req.validated?.id || parseInt(req.params[idParam], 10);

      if (isNaN(parentId) || parentId <= 0) {
        return next(
          new AppError('Invalid parent entity ID', 400, 'VALIDATION_ERROR'),
        );
      }

      // Get parent metadata
      const parentMetadata = allMetadata[parentEntityKey];
      if (!parentMetadata) {
        logger.error('requireParentAccess: Unknown entity key', { parentEntityKey });
        return next(
          new AppError('Parent entity configuration error', 500, 'INTERNAL_ERROR'),
        );
      }

      const { tableName, entityKey } = parentMetadata;

      // Build RLS context for parent entity
      const rlsContext = {
        role: req.dbUser.role,
        userId: req.dbUser.id,
        resource: parentMetadata.rlsResource,
        operation: getOperationFromMethod(req.method),
        ...extractProfileIds(req.dbUser),
      };

      // Build RLS filter using declarative engine
      const { clause, params, applied } = buildRLSFilter(
        rlsContext,
        parentMetadata,
        'read', // Always check read access to parent
        2, // Offset for WHERE id = $1
        allMetadata,
      );

      // If RLS denied (clause = 1=0), short-circuit
      if (clause === '1=0') {
        logger.debug('requireParentAccess: RLS denied', {
          parentEntityKey,
          parentId,
          role: rlsContext.role,
        });
        return next(
          new AppError(`${entityKey} not found`, 404, 'NOT_FOUND'),
        );
      }

      // Build query with RLS filter
      let query = `SELECT id FROM ${tableName} WHERE id = $1`;
      let queryParams = [parentId];

      if (clause && clause !== '') {
        query += ` AND ${clause}`;
        queryParams = queryParams.concat(params);
      }

      // Execute query
      const result = await pool.query(query, queryParams);

      if (result.rows.length === 0) {
        // Parent not found or not accessible - return 404 to hide existence
        return next(
          new AppError(`${entityKey} not found`, 404, 'NOT_FOUND'),
        );
      }

      // Set request state for downstream handlers
      req.parentId = parentId;
      req.parentEntity = result.rows[0];
      req.polymorphicContext = {
        parentType: parentEntityKey,
        parentId,
      };

      logger.debug('requireParentAccess: Access granted', {
        parentEntityKey,
        parentId,
        rlsApplied: applied,
      });

      next();
    } catch (error) {
      logger.error('requireParentAccess: Error', {
        error: error.message,
        parentEntityKey,
      });
      next(error);
    }
  };
}

/** Require permission on parent entity resource */
function requireParentPermission(operation) {
  return (req, res, next) => {
    const metadata = req.parentMetadata || req.entityMetadata;
    const { rlsResource, entityKey } = metadata || {};

    if (!rlsResource) {
      return next(
        new AppError(
          'Parent entity metadata not available',
          500,
          'INTERNAL_ERROR',
        ),
      );
    }

    const hasPermission =
      req.permissions?.hasPermission(rlsResource, operation) ?? false;

    if (!hasPermission) {
      const actionVerb = getActionVerb(operation);
      return next(
        new AppError(
          `You don't have permission to ${actionVerb} this ${entityKey || 'resource'}`,
          403,
          'FORBIDDEN',
        ),
      );
    }

    next();
  };
}

/** Get human-readable action verb for error messages */
function getActionVerb(operation) {
  const verbs = {
    read: 'view',
    create: 'add to',
    update: 'modify',
    delete: 'delete from',
  };
  return verbs[operation] || operation;
}

/** Require external service to be configured */
function requireServiceConfigured(checkFn, serviceName) {
  return (req, res, next) => {
    if (!checkFn()) {
      return next(
        new AppError(
          `${serviceName} is not configured`,
          503,
          'SERVICE_UNAVAILABLE',
        ),
      );
    }
    next();
  };
}

/**
 * @deprecated Use requireParentRLS instead - verifies both existence AND RLS access.
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
            'NOT_FOUND',
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
  requireParentAccess,
  requireServiceConfigured,
  requireParentExists,
  setPolymorphicContext,
  getActionVerb,
};
