/**
 * Generic Entity Routes Factory
 *
 * SINGLE module for ALL entity CRUD operations.
 * Replaces individual entity route files (customers.js, technicians.js, etc.)
 *
 * Architecture:
 * - createEntityRouter(entityName) returns a router for that entity
 * - Uses requirePermission for metadata-driven authorization
 * - Uses enforceRLS for row-level security
 * - Uses genericValidateBody for create/update validation
 *
 * Supported entities (defined in GenericEntityService metadata registry):
 * - customer, technician, inventory, work_order, invoice, contract
 * - All entity names use snake_case
 *
 * All handlers use GenericEntityService + ResponseFormatter for consistent responses.
 */
const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { enforceRLS } = require('../middleware/row-level-security');
const { genericValidateBody } = require('../middleware/generic-entity');
const {
  validatePagination,
  validateIdParam,
  validateQuery,
  validateInclude,
  validateBatchRequest,
} = require('../validators');
const GenericEntityService = require('../services/entity/generic-entity-service');
const ResponseFormatter = require('../utils/response-formatter');
const { filterDataByRole } = require('../utils/field-access-controller');
const {
  buildRlsContext,
  buildAuditContext,
} = require('../utils/request-context');
const {
  checkIdempotency,
  saveIdempotencyResponse,
} = require('../middleware/idempotency');
const { API_OPERATIONS } = require('../config/api-operations');
const {
  handleDbError,
  buildDbErrorConfig,
} = require('../utils/db-error-handler');
const { logger } = require('../config/logger');
const AppError = require('../utils/app-error');

// =============================================================================
// ASYNC HANDLER WRAPPER
// =============================================================================

/**
 * Async wrapper for consistent error handling
 * Catches promise rejections and passes to global error handler
 */
const createAsyncHandler =
  (entityName, metadata) => (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      logger.error(`Error in ${entityName} operation`, {
        error: error.message,
        code: error.code,
        entityId: req.params?.id,
      });

      // Try entity-specific DB error handling (unique constraints, FK violations)
      if (metadata) {
        const dbErrorConfig = buildDbErrorConfig(metadata);
        if (handleDbError(error, res, dbErrorConfig)) {
          return;
        }
      }

      // Pass to global error handler
      next(error);
    });
  };

// =============================================================================
// ENTITY ROUTER FACTORY
/**
 * Convert entity name to human-readable display name
 * Examples: 'work_order' -> 'Work Order', 'customer' -> 'Customer'
 *
 * @param {string} entityName - Internal entity name (snake_case)
 * @returns {string} Human-readable display name
 */
function toDisplayName(entityName) {
  return (
    entityName
      // Split on underscores
      .replace(/_/g, ' ')
      // Capitalize each word
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  );
}

// =============================================================================

/**
 * Create a router for a specific entity type
 *
 * @param {string} entityName - Internal entity name (e.g., 'customer', 'work_order')
 * @param {Object} _options - Optional configuration (deprecated - rlsResource comes from metadata)
 * @returns {express.Router} Configured router for the entity
 */
function createEntityRouter(entityName, _options = {}) {
  const router = express.Router();

  // Get metadata for this entity
  const metadata = GenericEntityService._getMetadata(entityName);
  // Use metadata displayName, or auto-generate from entityName
  const displayName = metadata.displayName || toDisplayName(entityName);

  // Create async handler bound to this entity
  const asyncHandler = createAsyncHandler(entityName, metadata);

  // Attach entity info to request for unified middleware
  // requirePermission and enforceRLS read from req.entityMetadata.rlsResource
  const attachEntity = (req, res, next) => {
    req.entityName = entityName;
    req.entityMetadata = metadata;
    next();
  };

  // =============================================================================
  // LIST ALL - GET /
  // =============================================================================

  router.get(
    '/',
    authenticateToken,
    attachEntity,
    requirePermission('read'),
    enforceRLS,
    validatePagination({ maxLimit: 200 }),
    (req, res, next) => validateQuery(metadata)(req, res, next),
    asyncHandler(async (req, res) => {
      const { page, limit } = req.validated.pagination;
      const { search, filters, sortBy, sortOrder } = req.validated.query;
      const rlsContext = buildRlsContext(req);

      const result = await GenericEntityService.findAll(
        entityName,
        {
          page,
          limit,
          search,
          filters,
          sortBy,
          sortOrder,
          include: req.validated.query.include,
        },
        rlsContext,
      );

      const sanitizedData = filterDataByRole(
        result.data,
        metadata,
        req.dbUser.role,
        'read',
      );

      return ResponseFormatter.list(res, {
        data: sanitizedData,
        pagination: result.pagination,
        appliedFilters: result.appliedFilters,
        rlsApplied: result.rlsApplied,
      });
    }),
  );

  // =============================================================================
  // GET BY ID - GET /:id
  // =============================================================================

  router.get(
    '/:id',
    authenticateToken,
    attachEntity,
    requirePermission('read'),
    enforceRLS,
    validateIdParam(),
    validateInclude(metadata),
    asyncHandler(async (req, res) => {
      const entityId = req.validated.id;
      const rlsContext = buildRlsContext(req);
      const include = req.validated.query?.include;

      const entity = await GenericEntityService.findById(
        entityName,
        entityId,
        { include },
        rlsContext,
      );

      if (!entity) {
        return ResponseFormatter.notFound(res, `${displayName} not found`);
      }

      const sanitizedData = filterDataByRole(
        entity,
        metadata,
        req.dbUser.role,
        'read',
      );

      return ResponseFormatter.get(res, sanitizedData);
    }),
  );

  // =============================================================================
  // CREATE - POST /
  // =============================================================================

  router.post(
    '/',
    authenticateToken,
    attachEntity,
    requirePermission('create'),
    checkIdempotency,
    genericValidateBody('create'),
    asyncHandler(async (req, res) => {
      const validatedBody = req.validated.body;
      const auditContext = buildAuditContext(req);

      const created = await GenericEntityService.create(
        entityName,
        validatedBody,
        { auditContext },
      );

      if (!created) {
        throw new AppError(
          `${displayName} creation failed unexpectedly`,
          500,
          'INTERNAL_ERROR',
        );
      }

      // SECURITY: Filter response to only include fields user can read
      const sanitizedData = filterDataByRole(
        created,
        metadata,
        req.dbUser.role,
        'read',
      );

      // Build response body for idempotency caching
      const responseBody = {
        success: true,
        data: sanitizedData,
        message: `${displayName} created successfully`,
      };

      // Save idempotency response for future retries
      await saveIdempotencyResponse(req, 201, responseBody);

      return ResponseFormatter.created(
        res,
        sanitizedData,
        `${displayName} created successfully`,
      );
    }),
  );

  // =============================================================================
  // UPDATE - PATCH /:id
  // =============================================================================

  router.patch(
    '/:id',
    authenticateToken,
    attachEntity,
    requirePermission('update'),
    enforceRLS,
    validateIdParam(),
    genericValidateBody('update'),
    asyncHandler(async (req, res) => {
      const validatedBody = req.validated.body;
      const entityId = req.validated.id;
      const rlsContext = buildRlsContext(req);
      const auditContext = buildAuditContext(req);

      // Check entity exists and user has access
      const existing = await GenericEntityService.findById(
        entityName,
        entityId,
        rlsContext,
      );
      if (!existing) {
        return ResponseFormatter.notFound(res, `${displayName} not found`);
      }

      const updated = await GenericEntityService.update(
        entityName,
        entityId,
        validatedBody,
        { auditContext },
      );

      if (!updated) {
        return ResponseFormatter.notFound(res, `${displayName} not found`);
      }

      // SECURITY: Filter response to only include fields user can read
      const sanitizedData = filterDataByRole(
        updated,
        metadata,
        req.dbUser.role,
        'read',
      );

      return ResponseFormatter.updated(
        res,
        sanitizedData,
        `${displayName} updated successfully`,
      );
    }),
  );

  // =============================================================================
  // DELETE - DELETE /:id
  // =============================================================================

  router.delete(
    '/:id',
    authenticateToken,
    attachEntity,
    requirePermission('delete'),
    enforceRLS,
    validateIdParam(),
    asyncHandler(async (req, res) => {
      const entityId = req.validated.id;
      const auditContext = buildAuditContext(req);

      // SELF-DELETION PREVENTION: Users cannot delete themselves
      if (entityName === 'user' && req.dbUser?.id === entityId) {
        return ResponseFormatter.badRequest(
          res,
          'Users cannot delete their own account',
        );
      }

      const deleted = await GenericEntityService.delete(entityName, entityId, {
        auditContext,
      });

      if (!deleted) {
        return ResponseFormatter.notFound(res, `${displayName} not found`);
      }

      return ResponseFormatter.deleted(
        res,
        `${displayName} deleted successfully`,
      );
    }),
  );

  // =============================================================================
  // BATCH - POST /batch
  // =============================================================================

  router.post(
    '/batch',
    authenticateToken,
    attachEntity,
    enforceRLS,
    checkIdempotency,
    validateBatchRequest(),
    asyncHandler(async (req, res) => {
      const { operations, options } = req.validated.batch;
      const auditContext = buildAuditContext(req);
      const rlsContext = buildRlsContext(req);

      // Per-operation permission check
      // Extract unique operation types and verify permissions for each
      const requiredPerms = [...new Set(operations.map((op) => op.operation))];
      for (const perm of requiredPerms) {
        if (!req.permissions.hasPermission(metadata.rlsResource, perm)) {
          return ResponseFormatter.forbidden(
            res,
            `Missing '${perm}' permission for ${entityName}`,
          );
        }
      }

      // Execute batch operation
      const result = await GenericEntityService.batch(entityName, operations, {
        auditContext,
        rlsContext,
        continueOnError: options.continueOnError,
      });

      // Filter results by role (consistent with single-item routes)
      const filteredResults = result.results.map((r) => {
        if (r.success && r.result) {
          return {
            ...r,
            result: filterDataByRole(
              r.result,
              metadata,
              req.dbUser.role,
              'read',
            ),
          };
        }
        return r;
      });

      // Determine status code based on success and atomicity mode
      // 200: All operations succeeded
      // 207: Partial success (only when continueOnError=true and some failed)
      // 400: Complete failure when continueOnError=false (atomic mode)
      let status;
      if (result.success) {
        status = API_OPERATIONS.BATCH.STATUS_SUCCESS;
      } else if (options.continueOnError) {
        // Partial success: some operations committed, some failed
        status = API_OPERATIONS.BATCH.STATUS_MULTI_STATUS;
      } else {
        // Atomic failure: transaction rolled back, nothing committed
        status = API_OPERATIONS.BATCH.STATUS_BAD_REQUEST;
      }

      const responseBody = {
        success: result.success,
        message: result.message,
        stats: result.stats,
        results: filteredResults,
        errors: result.errors,
      };

      // Save idempotency response for future retries
      await saveIdempotencyResponse(req, status, responseBody);

      return res.status(status).json(responseBody);
    }),
  );

  return router;
}

// =============================================================================
// DYNAMIC ENTITY ROUTER GENERATION
// =============================================================================

/**
 * Dynamically generate routers for all entities with routeConfig.useGenericRouter: true
 * This replaces hardcoded router declarations with metadata-driven generation.
 */
const allMetadata = require('../config/models');

// Derive uncountable entity names from metadata at load time (no hardcoding!)
const UNCOUNTABLE_ENTITIES = Object.entries(allMetadata)
  .filter(([, meta]) => meta.uncountable === true)
  .map(([key]) =>
    key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()),
  );

/**
 * Convert entity name to router export name
 * Examples: 'customer' -> 'customersRouter', 'work_order' -> 'workOrdersRouter'
 */
function toRouterName(entityName) {
  // Convert snake_case to camelCase
  const camelCase = entityName.replace(/_([a-z])/g, (_, letter) =>
    letter.toUpperCase(),
  );

  // Uncountable nouns derived from metadata (no plural form)
  if (UNCOUNTABLE_ENTITIES.includes(camelCase)) {
    return `${camelCase}Router`;
  }

  // Simple pluralization: 'y' -> 'ies' for consonant+y, otherwise add 's'
  const vowels = ['a', 'e', 'i', 'o', 'u'];
  const plural =
    camelCase.endsWith('y') && !vowels.includes(camelCase.slice(-2, -1))
      ? camelCase.slice(0, -1) + 'ies'
      : camelCase + 's';
  return `${plural}Router`;
}

// Generate routers dynamically from metadata
const dynamicRouters = {};

for (const [entityName, metadata] of Object.entries(allMetadata)) {
  // Only create routers for entities that opt-in via routeConfig
  if (metadata.routeConfig?.useGenericRouter === true && metadata.rlsResource) {
    const routerName = toRouterName(entityName);
    dynamicRouters[routerName] = createEntityRouter(entityName, {
      rlsResource: metadata.rlsResource,
    });
  }
}

// Export factory + all dynamic routers
module.exports = {
  createEntityRouter,
  ...dynamicRouters,
};
