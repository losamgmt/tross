/**
 * RLS Filter Helper
 *
 * SRP LITERALISM: ONLY builds RLS WHERE clauses based on policy and metadata
 *
 * PHILOSOPHY:
 * - METADATA-DRIVEN: Uses entity metadata to determine filter field
 * - POLICY-AWARE: Implements all RLS policies from permissions.json
 * - COMPOSABLE: Returns clause/params that can be combined with other WHERE conditions
 * - SECURE: Defaults to deny (1=0) for unknown policies
 *
 * EXTRACTED FROM:
 *   Legacy models (User.js, Customer.js, WorkOrder.js, Invoice.js, Contract.js)
 *   all had _buildRLSFilter() with identical switch logic - now centralized here.
 *
 * RLS POLICIES (from config/permissions.json):
 *   - all_records: No filtering (admin/manager view)
 *   - own_record_only: Filter by user's own ID (users viewing themselves)
 *   - own_work_orders_only: Filter work orders by customer_id
 *   - assigned_work_orders_only: Filter work orders by assigned_technician_id
 *   - own_invoices_only: Filter invoices by customer_id
 *   - own_contracts_only: Filter contracts by customer_id
 *   - public_resource: No filtering (e.g., roles)
 *   - deny_all: Block all access (1=0)
 *
 * USAGE:
 *   const { clause, params, applied } = buildRLSFilter(req, metadata, paramOffset);
 *   // clause: 'customer_id = $3' or '' or '1=0'
 *   // params: [userId] or []
 *   // applied: true if RLS was processed
 */

const { logger } = require('../../config/logger');

/**
 * RLS policy implementations
 *
 * Each policy returns { clause, params } for the given context.
 * The clause uses $RLS_OFFSET as a placeholder for the parameter position.
 *
 * @private
 */
const POLICY_HANDLERS = {
  /**
   * all_records: Full access, no filtering needed
   * applied: false because no actual filtering occurs
   */
  all_records: () => ({
    clause: '',
    params: [],
    noFilter: true, // Flag to indicate no filtering was applied
  }),

  /**
   * public_resource: Same as all_records (e.g., roles table)
   * applied: false because no actual filtering occurs
   */
  public_resource: () => ({
    clause: '',
    params: [],
    noFilter: true,
  }),

  /**
   * own_record_only: User can only see their own record
   * Uses metadata.rlsFilterConfig.ownRecordField or defaults to 'id'
   */
  own_record_only: (userId, metadata, paramOffset) => {
    const field = metadata.rlsFilterConfig?.ownRecordField || 'id';
    return {
      clause: `${field} = $${paramOffset + 1}`,
      params: [userId],
    };
  },

  /**
   * own_work_orders_only: Customer sees only their work orders
   * Filter by customer_id (or metadata.rlsFilterConfig.customerField)
   */
  own_work_orders_only: (userId, metadata, paramOffset) => {
    const field = metadata.rlsFilterConfig?.customerField || 'customer_id';
    return {
      clause: `${field} = $${paramOffset + 1}`,
      params: [userId],
    };
  },

  /**
   * assigned_work_orders_only: Technician sees only assigned work orders
   * Filter by assigned_technician_id (or metadata.rlsFilterConfig.assignedField)
   */
  assigned_work_orders_only: (userId, metadata, paramOffset) => {
    const field = metadata.rlsFilterConfig?.assignedField || 'assigned_technician_id';
    return {
      clause: `${field} = $${paramOffset + 1}`,
      params: [userId],
    };
  },

  /**
   * own_invoices_only: Customer sees only their invoices
   * Filter by customer_id (or metadata.rlsFilterConfig.customerField)
   */
  own_invoices_only: (userId, metadata, paramOffset) => {
    const field = metadata.rlsFilterConfig?.customerField || 'customer_id';
    return {
      clause: `${field} = $${paramOffset + 1}`,
      params: [userId],
    };
  },

  /**
   * own_contracts_only: Customer sees only their contracts
   * Filter by customer_id (or metadata.rlsFilterConfig.customerField)
   */
  own_contracts_only: (userId, metadata, paramOffset) => {
    const field = metadata.rlsFilterConfig?.customerField || 'customer_id';
    return {
      clause: `${field} = $${paramOffset + 1}`,
      params: [userId],
    };
  },

  /**
   * deny_all: Block all access (security failsafe)
   */
  deny_all: () => ({
    clause: '1=0',
    params: [],
  }),
};

/**
 * Build RLS filter clause based on request context and entity metadata
 *
 * @param {Object} rlsContext - RLS context from middleware
 * @param {string} rlsContext.policy - RLS policy name (from permissions.json)
 * @param {number} rlsContext.userId - User ID for filtering
 * @param {Object} metadata - Entity metadata from config/models
 * @param {Object} [metadata.rlsFilterConfig] - RLS filter configuration
 * @param {number} [paramOffset=0] - Starting parameter offset (for $N placeholders)
 * @returns {Object} { clause: string, params: array, applied: boolean }
 *
 * @example
 *   // Customer viewing work orders
 *   const filter = buildRLSFilter(
 *     { policy: 'own_work_orders_only', userId: 42 },
 *     workOrderMetadata,
 *     2  // Already have $1 and $2 from search/filter
 *   );
 *   // Returns: { clause: 'customer_id = $3', params: [42], applied: true }
 *
 * @example
 *   // Admin viewing anything
 *   const filter = buildRLSFilter(
 *     { policy: 'all_records', userId: 1 },
 *     userMetadata,
 *     0
 *   );
 *   // Returns: { clause: '', params: [], applied: true }
 *
 * @example
 *   // Technician trying to view invoices (deny_all)
 *   const filter = buildRLSFilter(
 *     { policy: 'deny_all', userId: 5 },
 *     invoiceMetadata,
 *     0
 *   );
 *   // Returns: { clause: '1=0', params: [], applied: true }
 */
function buildRLSFilter(rlsContext, metadata, paramOffset = 0) {
  // If no RLS context, return unapplied (caller must decide if this is OK)
  if (!rlsContext || !rlsContext.policy) {
    logger.debug('buildRLSFilter: No RLS context provided', {
      entity: metadata?.tableName,
    });
    return {
      clause: '',
      params: [],
      applied: false,
    };
  }

  const { policy, userId } = rlsContext;

  // Get the handler for this policy
  const handler = POLICY_HANDLERS[policy];

  if (!handler) {
    // Unknown policy = deny access (security failsafe)
    logger.warn('buildRLSFilter: Unknown RLS policy, denying access', {
      policy,
      entity: metadata?.tableName,
      userId,
    });
    return {
      clause: '1=0',
      params: [],
      applied: true,
    };
  }

  // Execute the policy handler
  const result = handler(userId, metadata, paramOffset);

  // Determine if RLS actually filtered anything
  // 'applied' = true only when actual row filtering occurred
  // 'applied' = false for all_records/public_resource (full access, no restriction)
  const actuallyFiltered = !result.noFilter && (result.clause || false);

  logger.debug('buildRLSFilter: Applied RLS filter', {
    policy,
    entity: metadata?.tableName,
    clause: result.clause || '(none)',
    hasParams: result.params.length > 0,
  });

  return {
    clause: result.clause,
    params: result.params,
    applied: !!actuallyFiltered,
  };
}

/**
 * Build RLS filter for findById operations
 *
 * For findById, we need to verify the user can access the specific record.
 * This returns an additional WHERE condition that should be ANDed with id = $1.
 *
 * @param {Object} rlsContext - RLS context from middleware
 * @param {Object} metadata - Entity metadata
 * @param {number} [paramOffset=1] - Starting offset (1 because $1 is the ID)
 * @returns {Object} { clause: string, params: array, applied: boolean }
 *
 * @example
 *   // Customer accessing their own user record
 *   const filter = buildRLSFilterForFindById(
 *     { policy: 'own_record_only', userId: 42 },
 *     userMetadata
 *   );
 *   // Final query: SELECT * FROM users WHERE id = $1 AND id = $2
 *   // With params: [requestedId, 42]
 */
function buildRLSFilterForFindById(rlsContext, metadata, paramOffset = 1) {
  return buildRLSFilter(rlsContext, metadata, paramOffset);
}

/**
 * Check if an RLS policy allows access to any records
 *
 * Utility function to quickly check if a policy will deny all access.
 *
 * @param {string} policy - RLS policy name
 * @returns {boolean} True if policy allows any access, false if deny_all
 */
function policyAllowsAccess(policy) {
  return policy !== 'deny_all' && POLICY_HANDLERS[policy] !== undefined;
}

/**
 * Get list of supported RLS policies
 *
 * @returns {string[]} Array of policy names
 */
function getSupportedPolicies() {
  return Object.keys(POLICY_HANDLERS);
}

module.exports = {
  buildRLSFilter,
  buildRLSFilterForFindById,
  policyAllowsAccess,
  getSupportedPolicies,
  // Exported for testing only
  _POLICY_HANDLERS: POLICY_HANDLERS,
};
