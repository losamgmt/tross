/**
 * Row-Level Security (RLS) Middleware
 *
 * Enforces data-driven row-level access control policies.
 * Works with permissions.json configuration and model-level filtering.
 *
 * SECURITY: This is Level 2 of the multi-tier access control system:
 * - Level 1: Resource permissions (requirePermission) - WHO can access WHAT
 * - Level 2: Row-Level Security (enforceRLS) - WHICH RECORDS can be accessed
 * - Level 3: Field-Level Security (future) - WHICH FIELDS can be seen/modified
 *
 * RLS POLICY TYPES (defined in permissions.json):
 * - all_records: No filtering - role can see all records (applied: false)
 * - own_record_only: Filter by user ID - user sees only their own record (applied: true)
 * - own_work_orders_only: Filter by customer_id - customers see their work orders (applied: true)
 * - assigned_work_orders_only: Filter by assigned_technician_id - technicians see assigned work orders (applied: true)
 * - own_invoices_only: Filter by customer_id - customers see their invoices (applied: true)
 * - own_contracts_only: Filter by customer_id - customers see their contracts (applied: true)
 * - public_resource: No filtering - resource is public to all authorized users (applied: false)
 * - deny_all: Deny all access - role cannot access any records (applied: true, returns 1=0 SQL)
 * - admin_only: Admin-only resource - non-admins get deny_all (applied: varies by role)
 *
 * USAGE:
 * Apply AFTER authenticateToken and requirePermission:
 * router.get('/customers',
 *   authenticateToken,
 *   requirePermission('customers', 'read'),
 *   enforceRLS('customers'),
 *   getCustomers
 * );
 */

const { getRLSRule } = require('../config/permissions-loader');
const { logSecurityEvent, logger } = require('../config/logger');
const { getClientIp, getUserAgent } = require('../utils/request-helpers');
const ResponseFormatter = require('../utils/response-formatter');
const { ERROR_CODES } = require('../utils/response-formatter');

/**
 * Enforce Row-Level Security for a resource
 *
 * Attaches RLS policy to request object for model-level filtering.
 * Models use this policy in their buildRLSQuery() method.
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
 *     // req.rlsPolicy is now available for filtering
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
    return ResponseFormatter.internalError(res, new Error('Route misconfiguration: entity metadata not attached'));
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
    return ResponseFormatter.forbidden(res, 'User has no assigned role', ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS);
  }

  // Get RLS policy from permissions.json
  const rlsPolicy = getRLSRule(userRole, resource);

  // RLS policy can be:
  // - string: Policy name that model will interpret (e.g., 'all_records', 'own_record_only', 'deny_all', 'public_resource')
  // - null/undefined: No RLS policy defined (falls back to permission-based access control)
  //
  // Note: Models handle policy interpretation. See permissions.json _comments.rlsPolicies for full policy definitions.
  req.rlsPolicy = rlsPolicy;
  req.rlsResource = resource;
  req.rlsUserId = userId;

  // Debug log only - RLS application is routine, not a security concern
  // Use logger.debug directly to avoid cluttering warn logs
  logger.debug('RLS policy applied', {
    url: req.url,
    userId,
    userRole,
    resource,
    policy: rlsPolicy,
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
  if (!req.rlsResource) {
    return; // No RLS enforcement on this route
  }

  if (req.rlsPolicy === null) {
    return; // No RLS filtering required
  }

  // Result should have metadata indicating RLS was applied
  if (!result || !result.rlsApplied) {
    const error = new Error(
      `RLS validation failed for ${req.rlsResource}: ` +
        `Model did not apply RLS filtering (policy: ${req.rlsPolicy})`,
    );
    logSecurityEvent('RLS_VALIDATION_FAILED', {
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      url: req.url,
      userId: req.rlsUserId,
      userRole: req.dbUser?.role,
      resource: req.rlsResource,
      policy: req.rlsPolicy,
      severity: 'CRITICAL',
    });
    throw error;
  }
};

module.exports = {
  enforceRLS,
  validateRLSApplied,
};
