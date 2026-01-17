/**
 * Generic Entity Middleware
 *
 * Middleware for the generic entity API.
 * Uses entity metadata as the SINGLE SOURCE OF TRUTH for:
 * - Entity extraction from URL
 * - Request body validation (via requiredFields, updateableFields)
 *
 * UNIFIED ARCHITECTURE:
 * authenticateToken → extractEntity → requirePermission → enforceRLS → handler
 *                          ↓                 ↓                 ↓
 *                    req.entityMetadata   reads from      reads from
 *                    req.entityName       req.entityMetadata   req.entityMetadata
 *                    req.entityId         .rlsResource    .rlsResource
 *
 * NOTE: requirePermission and enforceRLS are unified middleware that read
 * resource from req.entityMetadata.rlsResource. No wrapper functions needed.
 *
 * SECURITY: All middleware follow defense-in-depth principle.
 * Each layer validates independently - no assumptions about prior checks.
 */

const GenericEntityService = require('../services/generic-entity-service');
const { logSecurityEvent } = require('../config/logger');
const { getClientIp, getUserAgent } = require('../utils/request-helpers');
const { buildEntitySchema } = require('../utils/validation-schema-builder');
const ResponseFormatter = require('../utils/response-formatter');
const { ERROR_CODES } = require('../utils/response-formatter');

// =============================================================================
// ENTITY NAME MAPPING (METADATA-DRIVEN - NO HARDCODING!)
// =============================================================================

/**
 * Build entity URL map dynamically from metadata.
 * SINGLE SOURCE OF TRUTH: config/models/*.js
 *
 * For each entity in metadata, accepts:
 * - Singular form (entity name): 'customer' → 'customer'
 * - Plural form (table name): 'customers' → 'customer'
 * - Kebab-case form: 'work-orders' → 'work_order'
 * - Snake_case form: 'work_orders' → 'work_order'
 */
const allMetadata = require('../config/models');

function buildEntityUrlMap() {
  const map = {};

  for (const [entityName, metadata] of Object.entries(allMetadata)) {
    // Map singular form (entity name)
    map[entityName] = entityName;

    // Map plural form (table name)
    if (metadata.tableName) {
      map[metadata.tableName] = entityName;
    }

    // Map kebab-case variants for URL compatibility
    // work_order → work-order, work-orders
    const kebabCase = entityName.replace(/_/g, '-');
    map[kebabCase] = entityName;
    if (metadata.tableName) {
      map[metadata.tableName.replace(/_/g, '-')] = entityName;
    }
  }

  return map;
}

const ENTITY_URL_MAP = buildEntityUrlMap();

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
// ATTACH ENTITY MIDDLEWARE (FACTORY-TIME METADATA)
// =============================================================================

/**
 * Factory to create middleware that attaches entity metadata at route-definition time.
 * Use this for routes that know their entity statically (not from URL params).
 *
 * UNIFIED DATA FLOW: Sets req.entityMetadata which requirePermission and enforceRLS read.
 *
 * @param {string} entityName - The internal entity name (e.g., 'customer', 'work_order')
 * @returns {Function} Express middleware that attaches entity metadata
 *
 * @example
 * // In roles-extensions.js - knows it's checking 'users' permission
 * router.get('/:id/users',
 *   authenticateToken,
 *   attachEntity('user'),
 *   requirePermission('read'),
 *   handler
 * );
 */
const attachEntity = (entityName) => {
  // Get metadata at factory time (route definition)
  let metadata;
  try {
    metadata = GenericEntityService._getMetadata(entityName);
  } catch (_error) {
    // Fail at startup, not at request time
    throw new Error(`attachEntity: Unknown entity '${entityName}' - check config/models`);
  }

  return (req, res, next) => {
    req.entityName = entityName;
    req.entityMetadata = metadata;
    next();
  };
};

// =============================================================================
// EXTRACT ENTITY MIDDLEWARE (RUNTIME URL PARSING)
// =============================================================================

/**
 * Extract and validate entity from URL parameter
 *
 * Attaches to request:
 * - req.entityName: Normalized entity name (e.g., 'customer')
 * - req.entityMetadata: Full metadata object from registry
 *
 * Note: ID validation is handled separately by validateIdParam() middleware.
 * Use both in your route chain: extractEntity, validateIdParam()
 *
 * @returns {Function} Express middleware
 *
 * @example
 * // In route: GET /api/v2/:entity/:id
 * router.get('/:entity/:id', extractEntity, validateIdParam(), handler);
 * // req.entityName = 'customer'
 * // req.entityMetadata = { tableName: 'customers', ... }
 * // req.validated.id = 123 (set by validateIdParam)
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
    return ResponseFormatter.notFound(res, `Unknown entity: ${urlEntity}`, ERROR_CODES.RESOURCE_NOT_FOUND);
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
    return ResponseFormatter.internalError(res, new Error('Entity configuration error'), ERROR_CODES.SERVER_ERROR);
  }

  // Attach entity info to request
  req.entityName = entityName;
  req.entityMetadata = metadata;

  // Note: ID validation is handled by validateIdParam() middleware
  // Do not duplicate validation here - SRP

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
    return ResponseFormatter.internalError(res, new Error('Entity not extracted'), ERROR_CODES.SERVER_ERROR);
  }

  // Defense-in-depth: Verify user is authenticated (should be caught by auth middleware)
  if (!userRole) {
    return ResponseFormatter.forbidden(res, 'User role not available for field access control', ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS);
  }

  // Validate body is an object
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return ResponseFormatter.badRequest(res, 'Request body must be a JSON object', null, ERROR_CODES.VALIDATION_FAILED);
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
    return ResponseFormatter.badRequest(res, messages.join('; '), null, ERROR_CODES.VALIDATION_FAILED);
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
      return ResponseFormatter.badRequest(res, `Missing required fields: ${missingFields.join(', ')}`, null, ERROR_CODES.VALIDATION_MISSING_FIELD);
    }
  } else if (operation === 'update') {
    // Ensure at least one valid field
    if (Object.keys(value).length === 0) {
      // Derive updateable fields from fieldAccess for this role
      const { deriveUpdateableFields } = require('../utils/validation-schema-builder');
      const updateableFields = deriveUpdateableFields(entityMetadata, userRole);
      return ResponseFormatter.badRequest(res, `No valid updateable fields provided. Allowed for your role: ${updateableFields.join(', ')}`, null, ERROR_CODES.VALIDATION_FAILED);
    }
  }

  // Store validated and filtered body in unified location
  if (!req.validated) {req.validated = {};}
  req.validated.body = value;

  next();
};

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Core middleware
  extractEntity,
  genericValidateBody,
  attachEntity,

  // Utilities (for testing)
  normalizeEntityName,
  ENTITY_URL_MAP,
};
