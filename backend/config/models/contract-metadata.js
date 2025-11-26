/**
 * Contract Model Metadata
 *
 * SRP: ONLY defines Contract table structure and query capabilities
 * Used by QueryBuilderService to generate dynamic queries
 *
 * SINGLE SOURCE OF TRUTH for Contract model query capabilities
 */

module.exports = {
  // Table name in database
  tableName: 'contracts',

  // Primary key
  primaryKey: 'id',

  // ============================================================================
  // SEARCH CONFIGURATION (Text Search with ILIKE)
  // ============================================================================

  /**
   * Fields that support text search (ILIKE %term%)
   * These are concatenated with OR for full-text search
   */
  searchableFields: ['contract_number'],

  // ============================================================================
  // FILTER CONFIGURATION (Exact Match & Operators)
  // ============================================================================

  /**
   * Fields that can be used in WHERE clauses
   * Supports: exact match, gt, gte, lt, lte, in, not
   */
  filterableFields: [
    'id',
    'contract_number',
    'customer_id',
    'is_active',
    'status',
    'start_date',
    'end_date',
    'billing_cycle',
    'created_at',
    'updated_at',
  ],

  // ============================================================================
  // SORT CONFIGURATION
  // ============================================================================

  /**
   * Fields that can be used in ORDER BY clauses
   */
  sortableFields: [
    'id',
    'contract_number',
    'status',
    'value',
    'start_date',
    'end_date',
    'created_at',
    'updated_at',
  ],

  /**
   * Default sort when no sortBy specified
   */
  defaultSort: {
    field: 'created_at',
    order: 'DESC',
  },

  // ============================================================================
  // FIELD DEFINITIONS (for validation & documentation)
  // ============================================================================

  fields: {
    // TIER 1: Universal Entity Contract Fields
    id: { type: 'integer', readonly: true },
    contract_number: { type: 'string', required: true, maxLength: 100 },
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamp', readonly: true },
    updated_at: { type: 'timestamp', readonly: true },

    // TIER 2: Entity-Specific Lifecycle Field
    status: {
      type: 'enum',
      values: ['draft', 'active', 'expired', 'cancelled'],
      default: 'draft',
    },

    // Entity-specific fields
    customer_id: { type: 'integer', required: true },
    start_date: { type: 'date', required: true },
    end_date: { type: 'date' },
    terms: { type: 'text' },
    value: { type: 'decimal' },
    billing_cycle: {
      type: 'enum',
      values: ['monthly', 'quarterly', 'annually', 'one_time'],
    },
  },
};
