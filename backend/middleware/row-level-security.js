/**
 * Row-Level Security (RLS) Middleware
 *
 * Enforces data-driven row-level access control policies.
 * ADR-011: Rule-based RLS using declarative grant rules.
 *
 * SECURITY: This is Level 2 of the multi-tier access control system:
 * - Level 1: Resource permissions (requirePermission) - WHO can access WHAT
 * - Level 2: Row-Level Security (enforceRLS) - WHICH RECORDS can be accessed
 * - Level 3: Field-Level Security (future) - WHICH FIELDS can be seen/modified
 *
 * CONTEXT BUILDING (ADR-011):
 * - Dynamically extracts all *_profile_id columns from user record
 * - Maps HTTP method to operation (read, create, update, delete)
 * - Context uses snake_case for all profile IDs (schema-aligned)
 *
 * USAGE:
 * Apply AFTER authenticateToken and requirePermission:
 * router.get('/customers',
 *   authenticateToken,
 *   requirePermission('customers', 'read'),
 *   enforceRLS,
 *   getCustomers
 * );
 */

const { logSecurityEvent, logger } = require('../config/logger');
const { getClientIp, getUserAgent } = require('../utils/request-helpers');
const ResponseFormatter = require('../utils/response-formatter');
const { ERROR_CODES } = require('../utils/response-formatter');

/**
 * Extract all profile ID columns from user record
 *
 * Convention-based: any column ending in '_profile_id' is extracted.
 * This is schema-driven — adding a new profile type (e.g., vendor_profile_id)
 * to the users table requires NO code changes here.
 *
 * @param {Object} user - User record from database
 * @returns {Object} Profile IDs keyed by column name (snake_case)
 */
function extractProfileIds(user) {
  if (!user) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(user)
      .filter(([key]) => key.endsWith('_profile_id'))
      .map(([key, value]) => [key, value ?? null]),
  );
}

/**
 * Map HTTP method to RLS operation
 *
 * @param {string} method - HTTP method (GET, POST, PUT, PATCH, DELETE)
 * @returns {string} RLS operation (read, create, update, delete)
 */
function getOperationFromMethod(method) {
  const mapping = {
    GET: 'read',
    POST: 'create',
    PUT: 'update',
    PATCH: 'update',
    DELETE: 'delete',
  };
  return mapping[method] || 'read';
}

/**
 * Enforce Row-Level Security for a resource
 *
 * Attaches RLS context to request object for service-level filtering.
 * Context includes all profile IDs dynamically extracted from user record.
 *
 * ADR-011: Rule-based RLS. Context structure:
 * - role: User's role (for rule matching)
 * - userId: User's ID
 * - operation: Derived from HTTP method (read, create, update, delete)
 * - *_profile_id: All profile columns from users table (snake_case)
 * - filterConfig: (LEGACY) For backward compatibility during migration
 *
 * UNIFIED PATTERN: Resource is ALWAYS read from req.entityMetadata.rlsResource
 * Routes must attach entity metadata via middleware BEFORE this runs.
 *
 * @returns {Function} Express middleware function
 *
 * @example
 * // In routes file:
 * router.get('/customers',
 *   authenticateToken,
 *   attachEntity,
 *   requirePermission('read'),
 *   enforceRLS,
 *   async (req, res) => {
 *     // req.rlsContext is now available for filtering
 *     const customers = await Customer.findAll(req);
 *   }
 * );
 */
const enforceRLS = (req, res, next) => {
  // Resource comes from entity metadata - ONE source, no fallbacks
  const resource = req.entityMetadata?.rlsResource;

  if (!resource) {
    // This is a configuration error - route is missing entity attachment middleware
    logSecurityEvent('RLS_NO_ENTITY_METADATA', {
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      url: req.url,
      severity: 'ERROR',
    });
    return ResponseFormatter.internalError(
      res,
      new Error('Route misconfiguration: entity metadata not attached'),
    );
  }

  const userRole = req.dbUser?.role;
  const userId = req.dbUser?.id;

  if (!userRole) {
    logSecurityEvent('RLS_NO_ROLE', {
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      url: req.url,
      userId,
      resource,
    });
    return ResponseFormatter.forbidden(
      res,
      'User has no assigned role',
      ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS,
    );
  }

  // Dynamically extract all profile IDs from user record (ADR-011)
  // Convention: any column ending in '_profile_id'
  const profileIds = extractProfileIds(req.dbUser);

  // Determine operation from HTTP method
  const operation = getOperationFromMethod(req.method);

  // Build RLS context (ADR-011 format)
  // The new RLS engine reads rlsRules from entity metadata to match rules by role
  req.rlsContext = {
    // Core identity
    role: userRole,
    userId,
    operation,
    resource,

    // Dynamic profile IDs (snake_case, schema-driven)
    ...profileIds,

    // Polymorphic parent context (from setPolymorphicContext middleware)
    // Used by polymorphic parent RLS rules to resolve parent type at runtime
    polymorphic: req.polymorphicContext || null,
  };

  // Debug log only - RLS application is routine, not a security concern
  logger.debug('RLS context attached', {
    url: req.url,
    userId,
    userRole,
    resource,
    operation,
    profileIds: Object.keys(profileIds).join(', ') || 'none',
  });

  next();
};

/**
 * Validate RLS filtering was applied
 *
 * Use at the END of route handler to verify model applied RLS correctly.
 * This is a safety check to prevent accidentally returning unfiltered data.
 *
 * @param {Object} req - Express request object
 * @param {Object} result - Query result to validate
 * @throws {Error} If RLS was not applied when required
 *
 * @example
 * router.get('/customers',
 *   authenticateToken,
 *   attachEntity,
 *   requirePermission('read'),
 *   enforceRLS,
 *   async (req, res) => {
 *     const customers = await Customer.findAll(req);
 *     validateRLSApplied(req, customers);
 *     res.json(customers);
 *   }
 * );
 */
const validateRLSApplied = (req, result) => {
  if (!req.rlsContext?.resource) {
    return; // No RLS enforcement on this route
  }

  // ADR-011: The new RLS engine always sets rlsApplied=true when rules are processed.
  // This includes full-access rules (access: null) which add no filter but are still "applied".
  // Result should have metadata indicating RLS was applied
  if (!result || !result.rlsApplied) {
    const error = new Error(
      `RLS validation failed for ${req.rlsContext.resource}: ` +
        'Model did not apply RLS filtering',
    );
    logSecurityEvent('RLS_VALIDATION_FAILED', {
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      url: req.url,
      userId: req.rlsContext.userId,
      userRole: req.rlsContext.role,
      resource: req.rlsContext.resource,
      severity: 'CRITICAL',
    });
    throw error;
  }
};

module.exports = {
  enforceRLS,
  validateRLSApplied,
  // Exported for use by related modules (e.g., sub-entity.js, parent-rls-service.js)
  extractProfileIds,
  getOperationFromMethod,
};
