/**
 * Technician Model Metadata
 *
 * SRP: ONLY defines Technician table structure and query capabilities
 * Used by QueryBuilderService to generate dynamic queries
 *
 * SINGLE SOURCE OF TRUTH for Technician model query capabilities
 */

module.exports = {
  // Table name in database
  tableName: 'technicians',

  // Primary key
  primaryKey: 'id',

  // ============================================================================
  // SEARCH CONFIGURATION (Text Search with ILIKE)
  // ============================================================================

  /**
   * Fields that support text search (ILIKE %term%)
   * These are concatenated with OR for full-text search
   */
  searchableFields: ['license_number'],

  // ============================================================================
  // FILTER CONFIGURATION (Exact Match & Operators)
  // ============================================================================

  /**
   * Fields that can be used in WHERE clauses
   * Supports: exact match, gt, gte, lt, lte, in, not
   */
  filterableFields: [
    'id',
    'license_number',
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
    'license_number',
    'is_active',
    'status',
    'hourly_rate',
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
    license_number: { type: 'string', required: true, maxLength: 100 },
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamp', readonly: true },
    updated_at: { type: 'timestamp', readonly: true },

    // TIER 2: Entity-Specific Lifecycle Field
    status: {
      type: 'enum',
      values: ['available', 'on_job', 'off_duty', 'suspended'],
      default: 'available',
    },

    // Entity-specific fields
    certifications: { type: 'jsonb' },
    skills: { type: 'jsonb' },
    hourly_rate: { type: 'decimal' },
  },
};
