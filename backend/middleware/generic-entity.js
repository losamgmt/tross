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
// FIELD ACCESS HELPERS
// =============================================================================

/**
 * Derive updateable fields from fieldAccess metadata
 * A field is updateable if its update access is NOT 'none'
 *
 * @param {Object} metadata - Entity metadata
 * @returns {string[]} List of updateable field names
 */
function deriveUpdateableFields(metadata) {
  const fieldAccess = metadata.fieldAccess || {};
  const immutableFields = new Set(metadata.immutableFields || []);

  return Object.keys(fieldAccess).filter((field) => {
    // Skip immutable fields
    if (immutableFields.has(field)) {
      return false;
    }

    const access = fieldAccess[field];
    return access && access.update && access.update !== 'none';
  });
}

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
 * URL: /api/v2/work-orders/1 → entityName: 'workOrder'
 */
const ENTITY_URL_MAP = {
  // Plural URL forms → internal entity names
  users: 'user',
  roles: 'role',
  customers: 'customer',
  technicians: 'technician',
  'work-orders': 'workOrder',
  workorders: 'workOrder',
  invoices: 'invoice',
  contracts: 'contract',
  inventory: 'inventory',
  // Singular forms (also accepted)
  user: 'user',
  role: 'role',
  customer: 'customer',
  technician: 'technician',
  'work-order': 'workOrder',
  workorder: 'workOrder',
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
 * For CREATE: Validates requiredFields are present
 * For UPDATE: Validates at least one updateableField is present
 *
 * Also filters body to only include allowed fields (security: strips unknown fields)
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

  // Defense-in-depth: Verify extractEntity ran
  if (!entityName || !entityMetadata) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      'Internal Error',
      'Entity not extracted',
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

  // Build Joi schema for this entity/operation
  const schema = buildEntitySchema(entityName, operation, entityMetadata);

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
    // Check required fields (Joi handles this, but belt-and-suspenders)
    const requiredFields = entityMetadata.requiredFields || [];
    const missingFields = requiredFields.filter(
      (field) => value[field] === undefined || value[field] === null || value[field] === '',
    );

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
      // Derive updateable fields from fieldAccess if not explicitly defined
      const updateableFields = entityMetadata.updateableFields ||
        deriveUpdateableFields(entityMetadata);
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        'Validation Error',
        `No valid updateable fields provided. Allowed: ${updateableFields.join(', ')}`,
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
