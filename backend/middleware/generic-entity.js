/**
 * Generic Entity Middleware
 *
 * Middleware stack for the generic entity API (/api/v2/:entity).
 * Uses entity metadata as the SINGLE SOURCE OF TRUTH for:
 * - Entity validation
 * - Permission checks (via rlsResource)
 * - Row-Level Security (via rlsResource)
 * - Request body validation (via requiredFields, updateableFields)
 *
 * ARCHITECTURE:
 * authenticateToken → extractEntity → genericRequirePermission → genericEnforceRLS → handler
 *                          ↓                    ↓                       ↓
 *                    req.entityName        uses metadata            uses metadata
 *                    req.entityMetadata    .rlsResource             .rlsResource
 *                    req.entityId
 *
 * SECURITY: All middleware follow defense-in-depth principle.
 * Each layer validates independently - no assumptions about prior checks.
 */

const GenericEntityService = require('../services/generic-entity-service');
const { getRLSRule } = require('../config/permissions-loader');
const { hasPermission } = require('../config/permissions-loader');
const { HTTP_STATUS } = require('../config/constants');
const { logSecurityEvent } = require('../config/logger');
const { getClientIp, getUserAgent } = require('../utils/request-helpers');
const { toSafeInteger } = require('../validators/type-coercion');
const { buildEntitySchema } = require('../utils/validation-schema-builder');

// =============================================================================
// ERROR RESPONSE HELPERS
// =============================================================================

/**
 * Send standardized error response
 * @param {Object} res - Express response
 * @param {number} status - HTTP status code
 * @param {string} error - Error type
 * @param {string} message - User-facing message
 */
const sendError = (res, status, error, message) => {
  return res.status(status).json({
    error,
    message,
    timestamp: new Date().toISOString(),
  });
};

// =============================================================================
// ENTITY NAME MAPPING
// =============================================================================

/**
 * Map URL entity names to internal entity names
 * Handles pluralization and case normalization
 *
 * URL: /api/v2/customers/1 → entityName: 'customer'
 * URL: /api/v2/work-orders/1 → entityName: 'work_order'
 * All internal entity names use snake_case
 */
const ENTITY_URL_MAP = {
  // Plural URL forms → internal entity names (snake_case only)
  users: 'user',
  roles: 'role',
  customers: 'customer',
  technicians: 'technician',
  'work-orders': 'work_order',
  work_orders: 'work_order',
  invoices: 'invoice',
  contracts: 'contract',
  inventory: 'inventory',
  // Singular forms (also accepted)
  user: 'user',
  role: 'role',
  customer: 'customer',
  technician: 'technician',
  'work-order': 'work_order',
  work_order: 'work_order',
  invoice: 'invoice',
  contract: 'contract',
};

/**
 * Normalize URL entity parameter to internal entity name
 * @param {string} urlEntity - Entity from URL (e.g., 'customers', 'work-orders')
 * @returns {string|null} Internal entity name or null if not found
 */
const normalizeEntityName = (urlEntity) => {
  if (!urlEntity) {
    return null;
  }
  const normalized = urlEntity.toLowerCase().trim();
  return ENTITY_URL_MAP[normalized] || null;
};

// =============================================================================
// EXTRACT ENTITY MIDDLEWARE
// =============================================================================

/**
 * Extract and validate entity from URL parameter
 *
 * Attaches to request:
 * - req.entityName: Normalized entity name (e.g., 'customer')
 * - req.entityMetadata: Full metadata object from registry
 * - req.entityId: Validated ID (if :id param present)
 *
 * @returns {Function} Express middleware
 *
 * @example
 * // In route: GET /api/v2/:entity/:id
 * router.get('/:entity/:id', extractEntity, handler);
 * // req.entityName = 'customer'
 * // req.entityMetadata = { tableName: 'customers', ... }
 * // req.entityId = 123
 */
const extractEntity = (req, res, next) => {
  const urlEntity = req.params.entity;

  // Normalize URL entity to internal name
  const entityName = normalizeEntityName(urlEntity);

  if (!entityName) {
    logSecurityEvent('GENERIC_ENTITY_INVALID', {
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      url: req.url,
      urlEntity,
      severity: 'WARN',
    });
    return sendError(
      res,
      HTTP_STATUS.NOT_FOUND,
      'Not Found',
      `Unknown entity: ${urlEntity}`,
    );
  }

  // Get metadata (validates entity exists in registry)
  let metadata;
  try {
    metadata = GenericEntityService._getMetadata(entityName);
  } catch (error) {
    // This shouldn't happen if ENTITY_URL_MAP is in sync with metadata registry
    logSecurityEvent('GENERIC_ENTITY_METADATA_MISSING', {
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      url: req.url,
      entityName,
      error: error.message,
      severity: 'ERROR',
    });
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      'Internal Error',
      'Entity configuration error',
    );
  }

  // Attach entity info to request
  req.entityName = entityName;
  req.entityMetadata = metadata;

  // If :id param present, validate and attach
  if (req.params.id !== undefined) {
    try {
      // silent: true because URL params are ALWAYS strings - coercion is expected, not noteworthy
      req.entityId = toSafeInteger(req.params.id, 'id', { silent: true });
    } catch (error) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        'Bad Request',
        `Invalid ${entityName} ID: ${error.message}`,
      );
    }
  }

  next();
};

// =============================================================================
// GENERIC PERMISSION MIDDLEWARE
// =============================================================================

/**
 * Generic permission check using entity metadata
 *
 * Uses metadata.rlsResource to determine the permission resource.
 * This allows the generic route to work without hardcoded resource names.
 *
 * @param {string} operation - Operation to check ('create', 'read', 'update', 'delete')
 * @returns {Function} Express middleware
 *
 * @example
 * router.get('/:entity/:id',
 *   extractEntity,
 *   genericRequirePermission('read'),
 *   handler
 * );
 */
const genericRequirePermission = (operation) => (req, res, next) => {
  const userRole = req.dbUser?.role;
  const { entityName, entityMetadata } = req;

  // Defense-in-depth: Verify extractEntity ran
  if (!entityName || !entityMetadata) {
    logSecurityEvent('GENERIC_PERMISSION_NO_ENTITY', {
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      url: req.url,
      severity: 'ERROR',
    });
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      'Internal Error',
      'Entity not extracted',
    );
  }

  // Defense-in-depth: Verify user authenticated
  if (!userRole) {
    logSecurityEvent('GENERIC_PERMISSION_NO_ROLE', {
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      url: req.url,
      entityName,
      operation,
      severity: 'WARN',
    });
    return sendError(
      res,
      HTTP_STATUS.FORBIDDEN,
      'Forbidden',
      'User has no assigned role',
    );
  }

  // Get resource name from metadata (e.g., 'customers', 'work_orders')
  const resource = entityMetadata.rlsResource;

  if (!resource) {
    logSecurityEvent('GENERIC_PERMISSION_NO_RLS_RESOURCE', {
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      url: req.url,
      entityName,
      severity: 'ERROR',
    });
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      'Internal Error',
      'Entity missing rlsResource configuration',
    );
  }

  // Check permission using existing permission loader
  if (!hasPermission(userRole, resource, operation)) {
    logSecurityEvent('GENERIC_PERMISSION_DENIED', {
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      url: req.url,
      userId: req.dbUser?.id,
      userRole,
      resource,
      operation,
      severity: 'WARN',
    });
    return sendError(
      res,
      HTTP_STATUS.FORBIDDEN,
      'Forbidden',
      `You do not have permission to ${operation} ${resource}`,
    );
  }

  // Log successful permission check
  logSecurityEvent('GENERIC_PERMISSION_GRANTED', {
    ip: getClientIp(req),
    userAgent: getUserAgent(req),
    url: req.url,
    userId: req.dbUser?.id,
    userRole,
    resource,
    operation,
    severity: 'DEBUG',
  });

  next();
};

// =============================================================================
// GENERIC RLS MIDDLEWARE
// =============================================================================

/**
 * Generic Row-Level Security using entity metadata
 *
 * Uses metadata.rlsResource to determine the RLS resource.
 * Attaches RLS policy to request for service-layer filtering.
 *
 * @returns {Function} Express middleware
 *
 * @example
 * router.get('/:entity',
 *   extractEntity,
 *   genericRequirePermission('read'),
 *   genericEnforceRLS,
 *   handler
 * );
 */
const genericEnforceRLS = (req, res, next) => {
  const userRole = req.dbUser?.role;
  const userId = req.dbUser?.id;
  const { entityName, entityMetadata } = req;

  // Defense-in-depth: Verify extractEntity ran
  if (!entityName || !entityMetadata) {
    logSecurityEvent('GENERIC_RLS_NO_ENTITY', {
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      url: req.url,
      severity: 'ERROR',
    });
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      'Internal Error',
      'Entity not extracted',
    );
  }

  // Defense-in-depth: Verify user authenticated
  if (!userRole) {
    logSecurityEvent('GENERIC_RLS_NO_ROLE', {
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      url: req.url,
      entityName,
      severity: 'WARN',
    });
    return sendError(
      res,
      HTTP_STATUS.FORBIDDEN,
      'Forbidden',
      'User has no assigned role',
    );
  }

  // Get resource name from metadata
  const resource = entityMetadata.rlsResource;

  // Get RLS policy from permissions.json
  const rlsPolicy = getRLSRule(userRole, resource);

  // Attach RLS context to request
  req.rlsPolicy = rlsPolicy;
  req.rlsResource = resource;
  req.rlsUserId = userId;

  logSecurityEvent('GENERIC_RLS_APPLIED', {
    ip: getClientIp(req),
    userAgent: getUserAgent(req),
    url: req.url,
    userId,
    userRole,
    entityName,
    resource,
    policy: rlsPolicy,
    severity: 'DEBUG',
  });

  next();
};

// =============================================================================
// GENERIC BODY VALIDATION MIDDLEWARE
// =============================================================================

/**
 * Generic request body validation using entity metadata
 *
 * SECURITY: Role-aware field filtering ensures users can only set fields
 * their role has permission to write. Fields requiring higher permissions
 * are silently stripped from the request body.
 *
 * For CREATE: Validates requiredFields are present (that user can set)
 * For UPDATE: Validates at least one updateableField is present
 *
 * @param {'create'|'update'} operation - Which operation to validate for
 * @returns {Function} Express middleware
 *
 * @example
 * router.post('/:entity',
 *   extractEntity,
 *   genericRequirePermission('create'),
 *   genericValidateBody('create'),
 *   handler
 * );
 */
const genericValidateBody = (operation) => (req, res, next) => {
  const { entityName, entityMetadata } = req;
  const body = req.body;
  const userRole = req.dbUser?.role;

  // Defense-in-depth: Verify extractEntity ran
  if (!entityName || !entityMetadata) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      'Internal Error',
      'Entity not extracted',
    );
  }

  // Defense-in-depth: Verify user is authenticated (should be caught by auth middleware)
  if (!userRole) {
    return sendError(
      res,
      HTTP_STATUS.FORBIDDEN,
      'Forbidden',
      'User role not available for field access control',
    );
  }

  // Validate body is an object
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return sendError(
      res,
      HTTP_STATUS.BAD_REQUEST,
      'Bad Request',
      'Request body must be a JSON object',
    );
  }

  // Build role-aware Joi schema for this entity/operation/role
  // This ensures only fields the user's role can write are accepted
  const schema = buildEntitySchema(entityName, operation, entityMetadata, userRole);

  // Validate with Joi - stripUnknown removes fields not in schema
  const { error, value } = schema.validate(body, {
    abortEarly: false, // Collect all errors
    stripUnknown: true, // Remove fields not in schema (security)
  });

  if (error) {
    // Format Joi errors into user-friendly message
    const messages = error.details.map((detail) => detail.message);
    return sendError(
      res,
      HTTP_STATUS.BAD_REQUEST,
      'Validation Error',
      messages.join('; '),
    );
  }

  // Additional operation-specific checks
  if (operation === 'create') {
    // Required fields check is now role-aware (handled in schema builder)
    // But we do belt-and-suspenders check here for fields the user CAN set
    const requiredFields = entityMetadata.requiredFields || [];
    // Only check required fields that user's role can create
    const { deriveCreatableFields } = require('../utils/validation-schema-builder');
    const creatableByRole = new Set(deriveCreatableFields(entityMetadata, userRole));

    const missingFields = requiredFields.filter((field) => {
      // Only enforce required if user can create this field
      if (!creatableByRole.has(field)) {
        return false;
      }
      return value[field] === undefined || value[field] === null || value[field] === '';
    });

    if (missingFields.length > 0) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        'Validation Error',
        `Missing required fields: ${missingFields.join(', ')}`,
      );
    }
  } else if (operation === 'update') {
    // Ensure at least one valid field
    if (Object.keys(value).length === 0) {
      // Derive updateable fields from fieldAccess for this role
      const { deriveUpdateableFields } = require('../utils/validation-schema-builder');
      const updateableFields = deriveUpdateableFields(entityMetadata, userRole);
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        'Validation Error',
        `No valid updateable fields provided. Allowed for your role: ${updateableFields.join(', ')}`,
      );
    }
  }

  // Store validated and filtered body
  req.validatedBody = value;

  next();
};

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Core middleware
  extractEntity,
  genericRequirePermission,
  genericEnforceRLS,
  genericValidateBody,

  // Utilities (for testing)
  normalizeEntityName,
  ENTITY_URL_MAP,
};
