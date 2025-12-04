/**
 * Invoice Model Metadata
 *
 * SRP: ONLY defines Invoice table structure and query capabilities
 * Used by QueryBuilderService to generate dynamic queries
 * Used by GenericEntityService for CRUD operations
 *
 * SINGLE SOURCE OF TRUTH for Invoice model query and CRUD capabilities
 */

module.exports = {
  // Table name in database
  tableName: 'invoices',

  // Primary key
  primaryKey: 'id',

  // ============================================================================
  // IDENTITY CONFIGURATION (Entity Contract v2.0)
  // ============================================================================

  /**
   * The human-readable identifier field (not the PK)
   * Used for: Display names, search results, logging
   */
  identityField: 'invoice_number',

  /**
   * RLS resource name for permission checks
   * Maps to permissions.json resource names
   */
  rlsResource: 'invoices',

  // ============================================================================
  // CRUD CONFIGURATION (for GenericEntityService)
  // ============================================================================

  /**
   * Fields required when creating a new entity
   */
  requiredFields: ['invoice_number', 'customer_id', 'amount', 'total'],

  /**
   * Fields that can be set during CREATE
   * Excludes: id, created_at, updated_at (system-managed)
   */
  createableFields: ['invoice_number', 'customer_id', 'work_order_id', 'amount', 'tax', 'total', 'due_date', 'status'],

  /**
   * Fields that can be modified during UPDATE
   * Excludes: id, invoice_number (immutable), created_at
   */
  updateableFields: ['amount', 'tax', 'total', 'due_date', 'paid_at', 'status', 'is_active'],

  // ============================================================================
  // SEARCH CONFIGURATION (Text Search with ILIKE)
  // ============================================================================

  /**
   * Fields that support text search (ILIKE %term%)
   * These are concatenated with OR for full-text search
   */
  searchableFields: ['invoice_number'],

  // ============================================================================
  // FILTER CONFIGURATION (Exact Match & Operators)
  // ============================================================================

  /**
   * Fields that can be used in WHERE clauses
   * Supports: exact match, gt, gte, lt, lte, in, not
   */
  filterableFields: [
    'id',
    'invoice_number',
    'customer_id',
    'work_order_id',
    'is_active',
    'status',
    'due_date',
    'paid_at',
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
    'invoice_number',
    'status',
    'amount',
    'total',
    'due_date',
    'paid_at',
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
    invoice_number: { type: 'string', required: true, maxLength: 100 },
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamp', readonly: true },
    updated_at: { type: 'timestamp', readonly: true },

    // TIER 2: Entity-Specific Lifecycle Field
    status: {
      type: 'enum',
      values: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
      default: 'draft',
    },

    // Entity-specific fields
    work_order_id: { type: 'integer' },
    customer_id: { type: 'integer', required: true },
    amount: { type: 'decimal', required: true },
    tax: { type: 'decimal', default: 0 },
    total: { type: 'decimal', required: true },
    due_date: { type: 'date' },
    paid_at: { type: 'timestamp' },
  },
};
