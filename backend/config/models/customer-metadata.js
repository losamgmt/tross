/**
 * Customer Model Metadata
 *
 * SRP: ONLY defines Customer table structure and query capabilities
 * Used by QueryBuilderService to generate dynamic queries
 *
 * SINGLE SOURCE OF TRUTH for Customer model query capabilities
 */

module.exports = {
  // Table name in database
  tableName: 'customers',

  // Primary key
  primaryKey: 'id',

  // ============================================================================
  // SEARCH CONFIGURATION (Text Search with ILIKE)
  // ============================================================================

  /**
   * Fields that support text search (ILIKE %term%)
   * These are concatenated with OR for full-text search
   */
  searchableFields: [
    'email',
    'phone',
    'company_name',
  ],

  // ============================================================================
  // FILTER CONFIGURATION (Exact Match & Operators)
  // ============================================================================

  /**
   * Fields that can be used in WHERE clauses
   * Supports: exact match, gt, gte, lt, lte, in, not
   */
  filterableFields: [
    'id',
    'email',
    'phone',
    'company_name',
    'is_active',
    'status',
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
    'email',
    'company_name',
    'is_active',
    'status',
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
    email: { type: 'string', required: true, maxLength: 255 },
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamp', readonly: true },
    updated_at: { type: 'timestamp', readonly: true },

    // TIER 2: Entity-Specific Lifecycle Field
    status: {
      type: 'enum',
      values: ['pending', 'active', 'suspended'],
      default: 'pending',
    },

    // Entity-specific fields
    phone: { type: 'string', maxLength: 50 },
    company_name: { type: 'string', maxLength: 255 },
    billing_address: { type: 'jsonb' },
    service_address: { type: 'jsonb' },
  },
};
