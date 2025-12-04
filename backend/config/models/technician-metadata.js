/**
 * Technician Model Metadata
 *
 * SRP: ONLY defines Technician table structure and query capabilities
 * Used by QueryBuilderService to generate dynamic queries
 * Used by GenericEntityService for CRUD operations
 *
 * SINGLE SOURCE OF TRUTH for Technician model query and CRUD capabilities
 */

module.exports = {
  // Table name in database
  tableName: 'technicians',

  // Primary key
  primaryKey: 'id',

  // ============================================================================
  // IDENTITY CONFIGURATION (Entity Contract v2.0)
  // ============================================================================

  /**
   * The human-readable identifier field (not the PK)
   * Used for: Display names, search results, logging
   */
  identityField: 'license_number',

  /**
   * RLS resource name for permission checks
   * Maps to permissions.json resource names
   */
  rlsResource: 'technicians',

  // ============================================================================
  // CRUD CONFIGURATION (for GenericEntityService)
  // ============================================================================

  /**
   * Fields required when creating a new entity
   */
  requiredFields: ['license_number'],

  /**
   * Fields that can be set during CREATE
   * Excludes: id, created_at, updated_at (system-managed)
   */
  createableFields: ['license_number', 'certifications', 'skills', 'hourly_rate', 'status'],

  /**
   * Fields that can be modified during UPDATE
   * Excludes: id, created_at
   */
  updateableFields: ['license_number', 'certifications', 'skills', 'hourly_rate', 'status', 'is_active'],

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
