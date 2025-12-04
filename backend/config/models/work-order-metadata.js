/**
 * Work Order Model Metadata
 *
 * SRP: ONLY defines Work Order table structure and query capabilities
 * Used by QueryBuilderService to generate dynamic queries
 * Used by GenericEntityService for CRUD operations
 *
 * SINGLE SOURCE OF TRUTH for Work Order model query and CRUD capabilities
 */

module.exports = {
  // Table name in database
  tableName: 'work_orders',

  // Primary key
  primaryKey: 'id',

  // ============================================================================
  // IDENTITY CONFIGURATION (Entity Contract v2.0)
  // ============================================================================

  /**
   * The human-readable identifier field (not the PK)
   * Used for: Display names, search results, logging
   */
  identityField: 'title',

  /**
   * RLS resource name for permission checks
   * Maps to permissions.json resource names
   */
  rlsResource: 'work_orders',

  // ============================================================================
  // CRUD CONFIGURATION (for GenericEntityService)
  // ============================================================================

  /**
   * Fields required when creating a new entity
   */
  requiredFields: ['title', 'customer_id'],

  /**
   * Fields that can be set during CREATE
   * Excludes: id, created_at, updated_at (system-managed)
   */
  createableFields: ['title', 'description', 'priority', 'customer_id', 'assigned_technician_id', 'scheduled_start', 'scheduled_end', 'status'],

  /**
   * Fields that can be modified during UPDATE
   * Excludes: id, created_at
   */
  updateableFields: ['title', 'description', 'priority', 'assigned_technician_id', 'scheduled_start', 'scheduled_end', 'completed_at', 'status', 'is_active'],

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
