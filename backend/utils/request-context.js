/**
 * Request Context Utilities
 *
 * SRP: Provides helpers for extracting common request context
 * Used by routes to build consistent context objects
 *
 * PHILOSOPHY:
 * - DRY: Eliminate repeated context construction across routes
 * - Single Source: Consistent structure for RLS and audit context
 * - Middleware Integration: Works with auth and RLS middleware output
 */

const { getClientIp, getUserAgent } = require("./request-helpers");

/**
 * Build RLS (Row-Level Security) context from request middleware
 *
 * Used by GenericEntityService.findAll/findById to apply row-level filtering
 *
 * @param {Object} req - Express request object (with RLS middleware applied)
 * @returns {Object|null} RLS context { policy, userId } or null if no RLS applies
 *
 * @example
 *   const rlsContext = buildRlsContext(req);
 *   const result = await GenericEntityService.findAll('invoice', options, rlsContext);
 */
function buildRlsContext(req) {
  if (!req.rlsPolicy) {
    return null;
  }

  return {
    policy: req.rlsPolicy,
    userId: req.rlsUserId,
  };
}

/**
 * Build audit context from request for GenericEntityService operations
 *
 * Provides consistent audit trail information for create/update/delete operations
 *
 * @param {Object} req - Express request object (with auth middleware applied)
 * @returns {Object} Audit context { userId, ipAddress, userAgent }
 *
 * @example
 *   const auditContext = buildAuditContext(req);
 *   await GenericEntityService.create('contract', data, { auditContext });
 */
function buildAuditContext(req) {
  return {
    userId: req.dbUser?.id || req.user?.userId,
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
  };
}

module.exports = {
  buildRlsContext,
  buildAuditContext,
};
