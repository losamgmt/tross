/**
 * Inventory Model Metadata
 *
 * Category: SIMPLE (name field for display, sku as identity)
 *
 * SRP: ONLY defines Inventory table structure and query capabilities
 * Used by QueryBuilderService to generate dynamic queries
 * Used by GenericEntityService for CRUD operations
 *
 * SINGLE SOURCE OF TRUTH for Inventory model query and CRUD capabilities
 */

const {
  FIELD_ACCESS_LEVELS: FAL,
  UNIVERSAL_FIELD_ACCESS,
} = require('../constants');
const { NAME_TYPES } = require('../entity-types');

module.exports = {
  // Table name in database
  tableName: 'inventory',

  // Primary key
  primaryKey: 'id',

  // ============================================================================
  // PLURALIZATION
  // ============================================================================

  /**
   * Uncountable noun - no plural form (stays 'inventory', not 'inventories')
   * Used by route-loader and API endpoints for URL generation
   */
  uncountable: true,

  // ============================================================================
  // ENTITY CATEGORY (determines name handling pattern)
  // ============================================================================

  /**
   * Entity category: SIMPLE entities have a direct name field
   * and a unique identifier field (sku for inventory)
   */
  nameType: NAME_TYPES.SIMPLE,

  // ============================================================================
  // IDENTITY CONFIGURATION (Entity Contract v2.0)
  // ============================================================================

  /**
   * The unique identifier field - SKU is the barcode/lookup identity
   * Multiple items can have the same 'name' but different SKUs
   */
  identityField: 'sku',

  /**
   * The human-readable display field for relationships
   * Used when JOINing this entity - 'name' is what we show
   */
  displayField: 'name',

  /**
   * Whether the identity field has a UNIQUE constraint in the database
   */
  identityFieldUnique: true,

  /**
   * RLS resource name for permission checks
   * Maps to permissions.json resource names
   */
  rlsResource: 'inventory',

  /**
   * Row-Level Security policy per role
   * Inventory is a public resource - all authorized users can read
   */
  rlsPolicy: {
    customer: 'public_resource',
    technician: 'public_resource',
    dispatcher: 'public_resource',
    manager: 'public_resource',
    admin: 'public_resource',
  },

  /**
   * Entity-level permission overrides
   * Matches permissions.json - technician+ read/update, dispatcher+ create, manager+ delete
   */
  entityPermissions: {
    create: 'dispatcher',
    read: 'technician',
    update: 'technician',
    delete: 'manager',
  },

  /**
   * Route configuration - explicit opt-in for generic router
   */
  routeConfig: {
    useGenericRouter: true,
  },

  // ============================================================================
  // FIELD ALIASING (for UI display names)
  // ============================================================================
  /**
   * Field aliases for UI display. Key = field name, Value = display label
   * Empty object = use field names as-is
   */
  fieldAliases: {},

  // ============================================================================
  // CRUD CONFIGURATION (for GenericEntityService)
  // ============================================================================

  /**
   * Fields required when creating a new entity
   */
  requiredFields: ['name', 'sku'],

  /**
   * Fields that cannot be modified after creation (beyond universal immutables: id, created_at)
   * - sku: Barcode/lookup identity, cannot change
   */
  immutableFields: ['sku'],

  /**
   * Default columns to display in table views (ordered)
   * Used by admin panel and frontend table widgets
   */
  displayColumns: ['sku', 'name', 'category', 'quantity', 'unit_price', 'status'],

  // ============================================================================
  // FIELD-LEVEL ACCESS CONTROL (for response-transform.js)
  // ============================================================================

  /**
   * Per-field CRUD permissions using FIELD_ACCESS_LEVELS shortcuts
   * Entity Contract fields use UNIVERSAL_FIELD_ACCESS spread
   *
   * Inventory access: Technician+ only (customers blocked at permission level)
   * - Technicians: READ only (view parts availability)
   * - Dispatchers+: CREATE/UPDATE (manage stock)
   * - Managers+: DELETE
   */
  fieldAccess: {
    // Entity Contract v2.0 fields
    ...UNIVERSAL_FIELD_ACCESS,

    // Identity field - set on create, immutable, technician+ read
    name: {
      create: 'dispatcher',
      read: 'technician',
      update: 'dispatcher',
      delete: 'none',
    },

    // SKU - immutable after creation (barcode identity)
    sku: {
      create: 'dispatcher',
      read: 'technician',
      update: 'none', // Immutable
      delete: 'none',
    },

    // Operational fields - dispatcher+ manages, technician+ reads
    description: {
      create: 'dispatcher',
      read: 'technician',
      update: 'dispatcher',
      delete: 'none',
    },
    quantity: {
      create: 'dispatcher',
      read: 'technician',
      update: 'dispatcher',
      delete: 'none',
    },
    reorder_level: {
      create: 'dispatcher',
      read: 'technician',
      update: 'dispatcher',
      delete: 'none',
    },
    location: {
      create: 'dispatcher',
      read: 'technician',
      update: 'dispatcher',
      delete: 'none',
    },

    // Financial field - manager+ only (cost data is sensitive)
    unit_cost: FAL.MANAGER_MANAGED,

    // Supplier info - manager+ manages, technician+ can read
    supplier: {
      create: 'manager',
      read: 'technician',
      update: 'manager',
      delete: 'none',
    },
  },

  // ============================================================================
  // RELATIONSHIPS (for JOIN queries)
  // ============================================================================

  /**
   * Relationships to JOIN by default in all queries (findById, findAll, findByField)
   * These are included automatically without needing to specify 'include' option
   */
  defaultIncludes: [],

  /**
   * Foreign key relationships
   * Used for JOIN generation and validation
   *
   * Note: Inventory is a standalone entity with no foreign key relationships.
   * This empty object is included for metadata parity across all entities.
   */
  relationships: {},

  // ============================================================================
  // DELETE CONFIGURATION (for GenericEntityService.delete)
  // ============================================================================

  /**
   * Dependent records that must be cascade-deleted before this entity
   * Only for relationships NOT handled by database ON DELETE CASCADE/SET NULL
   *
   * For audit_logs: polymorphic FK via resource_type + resource_id
   */
  dependents: [
    {
      table: 'audit_logs',
      foreignKey: 'resource_id',
      polymorphicType: { column: 'resource_type', value: 'inventory' },
    },
  ],

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
