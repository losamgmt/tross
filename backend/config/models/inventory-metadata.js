/**
 * Inventory Model Metadata
 *
 * SRP: ONLY defines Inventory table structure and query capabilities
 * Used by QueryBuilderService to generate dynamic queries
 *
 * SINGLE SOURCE OF TRUTH for Inventory model query capabilities
 */

module.exports = {
  // Table name in database
  tableName: 'inventory',

  // Primary key
  primaryKey: 'id',

  // ============================================================================
  // SEARCH CONFIGURATION (Text Search with ILIKE)
  // ============================================================================

  /**
   * Fields that support text search (ILIKE %term%)
   * These are concatenated with OR for full-text search
   */
  searchableFields: ['name', 'sku', 'description'],

  // ============================================================================
  // FILTER CONFIGURATION (Exact Match & Operators)
  // ============================================================================

  /**
   * Fields that can be used in WHERE clauses
   * Supports: exact match, gt, gte, lt, lte, in, not
   */
  filterableFields: [
    'id',
    'name',
    'sku',
    'is_active',
    'status',
    'quantity',
    'reorder_level',
    'location',
    'supplier',
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
    'name',
    'sku',
    'status',
    'quantity',
    'unit_cost',
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
    name: { type: 'string', required: true, maxLength: 255 },
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamp', readonly: true },
    updated_at: { type: 'timestamp', readonly: true },

    // TIER 2: Entity-Specific Lifecycle Field
    status: {
      type: 'enum',
      values: ['in_stock', 'low_stock', 'out_of_stock', 'discontinued'],
      default: 'in_stock',
    },

    // Entity-specific fields
    sku: { type: 'string', required: true, maxLength: 100 },
    description: { type: 'text' },
    quantity: { type: 'integer', default: 0 },
    reorder_level: { type: 'integer', default: 10 },
    unit_cost: { type: 'decimal' },
    location: { type: 'string', maxLength: 255 },
    supplier: { type: 'string', maxLength: 255 },
  },
};
