/**
 * Work Order Model Metadata
 *
 * SRP: ONLY defines Work Order table structure and query capabilities
 * Used by QueryBuilderService to generate dynamic queries
 *
 * SINGLE SOURCE OF TRUTH for Work Order model query capabilities
 */

module.exports = {
  // Table name in database
  tableName: 'work_orders',

  // Primary key
  primaryKey: 'id',

  // ============================================================================
  // SEARCH CONFIGURATION (Text Search with ILIKE)
  // ============================================================================

  /**
   * Fields that support text search (ILIKE %term%)
   * These are concatenated with OR for full-text search
   */
  searchableFields: ['title', 'description'],

  // ============================================================================
  // FILTER CONFIGURATION (Exact Match & Operators)
  // ============================================================================

  /**
   * Fields that can be used in WHERE clauses
   * Supports: exact match, gt, gte, lt, lte, in, not
   */
  filterableFields: [
    'id',
    'title',
    'customer_id',
    'assigned_technician_id',
    'is_active',
    'status',
    'priority',
    'scheduled_start',
    'scheduled_end',
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
    'title',
    'priority',
    'status',
    'scheduled_start',
    'scheduled_end',
    'completed_at',
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
    title: { type: 'string', required: true, maxLength: 255 },
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamp', readonly: true },
    updated_at: { type: 'timestamp', readonly: true },

    // TIER 2: Entity-Specific Lifecycle Field
    status: {
      type: 'enum',
      values: ['pending', 'assigned', 'in_progress', 'completed', 'cancelled'],
      default: 'pending',
    },

    // Entity-specific fields
    description: { type: 'text' },
    priority: {
      type: 'enum',
      values: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    customer_id: { type: 'integer', required: true },
    assigned_technician_id: { type: 'integer' },
    scheduled_start: { type: 'timestamp' },
    scheduled_end: { type: 'timestamp' },
    completed_at: { type: 'timestamp' },
  },
};
