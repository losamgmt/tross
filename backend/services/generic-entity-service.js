/**
 * Generic Entity Service
 *
 * SRP LITERALISM: ONLY performs CRUD operations using entity metadata
 *
 * PHILOSOPHY:
 * - GENERIC: Works with ANY entity that has metadata defined
 * - METADATA-DRIVEN: All behavior derived from config/models/*.js
 * - SECURE: Parameterized queries, type coercion, RLS support
 * - COMPOSABLE: Uses existing services (QueryBuilder, Pagination)
 * - TESTABLE: Pure logic, injectable dependencies
 *
 * USAGE:
 *   const entity = await GenericEntityService.findById('user', 123);
 *   const list = await GenericEntityService.findAll('customer', { page: 1, limit: 10 });
 *   const created = await GenericEntityService.create('technician', { license_number: 'ABC123' });
 *
 * STRANGLER-FIG PATTERN:
 *   This service will gradually replace entity-specific models (User.js, Role.js, etc.)
 *   Old models can delegate to this service during transition.
 */

const allMetadata = require('../config/models');
const { logger } = require('../config/logger');
const db = require('../db/connection');
const { toSafeInteger } = require('../validators/type-coercion');
const PaginationService = require('./pagination-service');
const QueryBuilderService = require('./query-builder-service');
const { buildUpdateClause } = require('../db/helpers/update-helper');
const { cascadeDeleteDependents } = require('../db/helpers/cascade-helper');
const { buildRLSFilter, buildRLSFilterForFindById } = require('../db/helpers/rls-filter-helper');
const { filterOutput, filterOutputArray } = require('../db/helpers/output-filter-helper');
const { logEntityAudit, isAuditEnabled } = require('../db/helpers/audit-helper');
const { ENTITY_FIELDS, NAME_TYPES, NAME_TYPE_MAP } = require('../config/constants');
const { sanitizeData } = require('../utils/data-hygiene');
const { generateIdentifier, IDENTIFIER_FIELDS } = require('../utils/identifier-generator');
const AppError = require('../utils/app-error');

/**
 * Table name to entity name mapping for related entity lookups
 * DYNAMICALLY DERIVED from metadata - no hardcoding!
 */
const TABLE_TO_ENTITY = Object.fromEntries(
  Object.entries(allMetadata)
    .filter(([, meta]) => meta.tableName)
    .map(([entityName, meta]) => [meta.tableName, entityName]),
);

/**
 * Get the display field for a related entity's table
 * Used in JOIN queries to select the appropriate display field
 *
 * Prefers 'displayField' (human-readable) over 'identityField' (uniqueness)
 * Example: roles have identityField='priority' but displayField='name'
 *
 * @param {string} tableName - Related table name (e.g., 'customers')
 * @returns {string} Display field name (e.g., 'email' for customers, 'name' for roles)
 */
function getRelatedIdentityField(tableName) {
  const entityName = TABLE_TO_ENTITY[tableName];
  if (!entityName || !allMetadata[entityName]) {
    // Fallback to 'name' for unknown entities (backward compatibility)
    return 'name';
  }
  const metadata = allMetadata[entityName];
  // Prefer displayField for JOINs, fall back to identityField, then 'name'
  return metadata.displayField || metadata.identityField || 'name';
}

/**
 * Build SELECT parts and JOIN parts for default includes
 * Extracts relationship fields with smart aliasing:
 * - Identity field (e.g., 'name') → relationship name (e.g., 'role')
 * - Other fields → prefixed (e.g., 'priority' → 'role_priority')
 *
 * @param {string} tableName - Main table name
 * @param {string[]} defaultIncludes - Relationship names to include
 * @param {Object} relationships - Relationship definitions from metadata
 * @returns {{ selectParts: string[], joinParts: string[] }} Parts for query building
 */
function buildDefaultIncludesClauses(tableName, defaultIncludes, relationships) {
  const joinParts = [];
  const selectParts = [];

  for (const relName of defaultIncludes) {
    const rel = relationships[relName];
    if (rel && rel.type === 'belongsTo') {
      const relAlias = relName.charAt(0); // 'r' for role, 'c' for customer
      const identityField = getRelatedIdentityField(rel.table);

      // Include all configured fields from relationship, or just identity field as fallback
      if (rel.fields && rel.fields.length > 0) {
        // Select specific fields with smart aliasing:
        // - Identity field (e.g., 'name') → relationship name (e.g., 'role')
        // - Other fields → prefixed (e.g., 'priority' → 'role_priority')
        for (const field of rel.fields) {
          // Skip 'id' to avoid confusion with main entity id
          if (field === 'id') { continue; }

          if (field === identityField) {
            // Identity field: alias as relationship name (e.g., r.name as role)
            selectParts.push(`${relAlias}.${field} as ${relName}`);
          } else {
            // Other fields: prefix with relationship name (e.g., r.priority as role_priority)
            selectParts.push(`${relAlias}.${field} as ${relName}_${field}`);
          }
        }
      } else {
        // Fallback: just the identity field with relationship name as alias
        selectParts.push(`${relAlias}.${identityField} as ${relName}`);
      }

      joinParts.push(`LEFT JOIN ${rel.table} ${relAlias} ON ${tableName}.${rel.foreignKey} = ${relAlias}.id`);
    }
  }

  return { selectParts, joinParts };
}

/**
 * Valid entity names (keys from config/models/index.js)
 * Used for validation and error messages
 */
const VALID_ENTITIES = Object.keys(allMetadata);

class GenericEntityService {
  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Get metadata for an entity by name
   *
   * SRP: ONLY looks up and validates entity metadata exists
   *
   * @private
   * @param {string} entityName - Entity name (e.g., 'user', 'role', 'customer')
   * @returns {Object} Entity metadata from config/models
   * @throws {Error} If entityName is invalid or metadata not found
   *
   * @example
   *   const metadata = GenericEntityService._getMetadata('user');
   *   // Returns: { tableName: 'users', primaryKey: 'id', ... }
   *
   * @example
   *   GenericEntityService._getMetadata('invalid');
   *   // Throws: Error('Unknown entity: invalid. Valid entities: user, role, ...')
   */
  static _getMetadata(entityName) {
    // Validate entityName is provided
    if (!entityName || typeof entityName !== 'string') {
      throw new AppError('Entity name is required and must be a string', 400, 'BAD_REQUEST');
    }

    // Trim whitespace but preserve case (metadata uses snake_case: work_order, not workorder)
    const normalizedName = entityName.trim();

    // Look up metadata
    const metadata = allMetadata[normalizedName];

    if (!metadata) {
      logger.warn('Unknown entity requested', {
        entityName: normalizedName,
        validEntities: VALID_ENTITIES,
      });

      throw new AppError(
        `Unknown entity: ${normalizedName}. Valid entities: ${VALID_ENTITIES.join(', ')}`,
        400,
        'BAD_REQUEST',
      );
    }

    return metadata;
  }

  /**
   * Serialize values for database insertion/update based on field types
   *
   * SRP: ONLY converts JavaScript values to database-compatible format
   *
   * @private
   * @param {Object} data - Data object with field values
   * @param {Object} metadata - Entity metadata with field definitions
   * @returns {Object} Data with JSON fields serialized
   *
   * Handles:
   * - json/jsonb fields: Arrays and objects are JSON.stringify'd
   * - Other types: Passed through unchanged
   */
  static _serializeForDb(data, metadata) {
    if (!metadata.fields) {
      return data; // No field definitions, pass through
    }

    const serialized = {};
    for (const [field, value] of Object.entries(data)) {
      const fieldDef = metadata.fields[field];

      // Serialize JSON/JSONB fields
      if (fieldDef && (fieldDef.type === 'json' || fieldDef.type === 'jsonb')) {
        if (value !== null && value !== undefined && typeof value === 'object') {
          serialized[field] = JSON.stringify(value);
        } else {
          serialized[field] = value; // Already a string or null
        }
      } else {
        serialized[field] = value;
      }
    }

    return serialized;
  }

  // ============================================================================
  // READ OPERATIONS
  // ============================================================================

  /**
   * Find a single entity by its primary key
   *
   * SRP: ONLY retrieves one row by ID using parameterized query with RLS enforcement
   *
   * @param {string} entityName - Entity name (e.g., 'user', 'role', 'customer')
   * @param {number|string} id - Primary key value
   * @param {Object} [rlsContext] - RLS context from middleware
   * @param {string} [rlsContext.policy] - RLS policy name (e.g., 'own_record_only')
   * @param {number} [rlsContext.userId] - User ID for RLS filtering
   * @returns {Promise<Object|null>} Entity record or null if not found/not authorized
   * @throws {Error} If entityName is invalid or id cannot be coerced to integer
   *
   * @example
   *   // Without RLS (internal use, batch jobs, etc.)
   *   const user = await GenericEntityService.findById('user', 123);
   *   // Returns: { id: 123, email: 'test@example.com', ... } or null
   *
   * @example
   *   // With RLS (API endpoints)
   *   const user = await GenericEntityService.findById('user', 123, {
   *     policy: 'own_record_only',
   *     userId: 123
   *   });
   *   // Returns user if authorized, null if not
   */
  static async findById(entityName, id, rlsContext = null) {
    // Get metadata to find primary key name
    const metadata = this._getMetadata(entityName);

    // Validate and coerce ID to integer (throws on invalid)
    // toSafeInteger enforces min=1 by default, so 0 and negatives throw
    // silent: true - IDs from controllers are strings (URL params), coercion is expected
    const safeId = toSafeInteger(id, 'id', { silent: true });

    // Delegate to findByField using the primary key
    // Note: primaryKey (e.g., 'id') must be in filterableFields for this to work
    return this.findByField(entityName, metadata.primaryKey, safeId, rlsContext);
  }

  /**
   * Find all entities with pagination, search, filtering, sorting, and RLS
   *
   * SRP: ONLY retrieves paginated list using metadata-driven query building
   *
   * @param {string} entityName - Entity name (e.g., 'user', 'role', 'customer')
   * @param {Object} [options={}] - Query options
   * @param {number} [options.page=1] - Page number (1-indexed)
   * @param {number} [options.limit=50] - Items per page (max: 200)
   * @param {boolean} [options.includeInactive=false] - Include inactive entities
   * @param {string} [options.search] - Search term (searches across searchableFields)
   * @param {Object} [options.filters] - Filters (e.g., { priority[gte]: 50 })
   * @param {string} [options.sortBy] - Field to sort by (validated against sortableFields)
   * @param {string} [options.sortOrder] - 'ASC' or 'DESC'
   * @param {Object} [rlsContext] - RLS context from middleware
   * @param {string} [rlsContext.policy] - RLS policy name (e.g., 'own_work_orders_only')
   * @param {number} [rlsContext.userId] - User ID for RLS filtering
   * @returns {Promise<Object>} { data: Entity[], pagination: {...}, appliedFilters: {...} }
   *
   * @example
   *   // Without RLS (internal use)
   *   const result = await GenericEntityService.findAll('user', { page: 1, limit: 10 });
   *   // Returns: { data: [...], pagination: { page: 1, limit: 10, total: 100, ... } }
   *
   * @example
   *   // With RLS (API endpoints - customer viewing their work orders)
   *   const result = await GenericEntityService.findAll('work_order', { page: 1 }, {
   *     policy: 'own_work_orders_only',
   *     userId: customerId
   *   });
   *   // Returns only work orders where customer_id = customerId
   */
  static async findAll(entityName, options = {}, rlsContext = null) {
    // Get metadata (throws if invalid entityName)
    const metadata = this._getMetadata(entityName);

    // Validate pagination params (gracefully caps invalid values)
    const { page, limit, offset } = PaginationService.validateParams(options);
    const includeInactive = options.includeInactive || false;

    // Extract query-building metadata
    const {
      tableName,
      searchableFields = [],
      filterableFields = [],
      sortableFields = [],
      defaultSort = { field: 'id', order: 'ASC' },
      defaultIncludes = [],
      relationships = {},
    } = metadata;

    // Build SELECT and JOIN clauses for default includes
    let selectClause = `${tableName}.*`;
    let joinClause = '';

    if (defaultIncludes.length > 0) {
      const { selectParts, joinParts } = buildDefaultIncludesClauses(tableName, defaultIncludes, relationships);

      if (selectParts.length > 0) {
        selectClause = `${tableName}.*, ${selectParts.join(', ')}`;
        joinClause = joinParts.join(' ');
      }
    }

    // Build search clause (case-insensitive ILIKE across searchable fields)
    // Pass tableName as prefix to avoid ambiguity with JOINs
    const search = QueryBuilderService.buildSearchClause(
      options.search,
      searchableFields,
      tableName,
    );

    // Build filter clause
    const filterOptions = { ...options.filters };

    // Add is_active filter unless explicitly including inactive
    if (!includeInactive) {
      filterOptions.is_active = true;
    }

    const filters = QueryBuilderService.buildFilterClause(
      filterOptions,
      filterableFields,
      search ? search.paramOffset : 0,
      tableName,
    );

    // Combine WHERE clauses
    const whereClauses = [search?.clause, filters?.clause].filter(Boolean);

    // Combine parameters
    const params = [
      ...(search?.params || []),
      ...(filters?.params || []),
    ];

    // Apply RLS filter if context provided
    let rlsApplied = false;
    if (rlsContext) {
      const rlsFilter = buildRLSFilter(rlsContext, metadata, params.length);

      if (rlsFilter.clause) {
        whereClauses.push(rlsFilter.clause);
        params.push(...rlsFilter.params);
      }

      rlsApplied = rlsFilter.applied;

      logger.debug('GenericEntityService.findAll with RLS', {
        entity: entityName,
        policy: rlsContext.policy,
        rlsApplied: rlsFilter.applied,
        rlsClause: rlsFilter.clause || '(none)',
      });
    }

    const whereClause = whereClauses.length > 0
      ? `WHERE ${whereClauses.join(' AND ')}`
      : '';

    // Build sort clause (validated against sortableFields, with table prefix)
    const sortClause = QueryBuilderService.buildSortClause(
      options.sortBy,
      options.sortOrder,
      sortableFields,
      defaultSort,
      tableName,
    );

    logger.debug('GenericEntityService.findAll', {
      entity: entityName,
      table: tableName,
      page,
      limit,
      whereClause,
      sortClause,
      hasRLS: !!rlsContext,
      hasJoins: joinClause.length > 0,
    });

    // Get total count for pagination metadata
    const countQuery = `SELECT COUNT(*) as total FROM ${tableName} ${joinClause} ${whereClause}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated entities with optional JOINs
    const query = `
      SELECT ${selectClause} 
      FROM ${tableName} 
      ${joinClause}
      ${whereClause} 
      ORDER BY ${sortClause}
      LIMIT ${limit} OFFSET ${offset}
    `;
    const result = await db.query(query, params);

    // Generate pagination metadata
    const pagination = PaginationService.generateMetadata(page, limit, total);

    // Filter sensitive fields from all records
    const filteredData = filterOutputArray(result.rows, metadata);

    return {
      data: filteredData,
      pagination,
      appliedFilters: {
        search: options.search || null,
        filters: filterOptions,
        sortBy: options.sortBy || defaultSort.field,
        sortOrder: options.sortOrder || defaultSort.order,
      },
      rlsApplied,
    };
  }

  /**
   * Find a single entity by a specific field value
   *
   * SRP: ONLY retrieves one row by field match using parameterized query with RLS
   *
   * USE CASES:
   * - findByField('user', 'auth0_id', 'auth0|abc123') → replaces User.findByAuth0Id()
   * - findByField('user', 'email', 'test@example.com') → replaces User.findByEmail()
   * - findByField('customer', 'email', 'cust@example.com') → replaces Customer.findByEmail()
   * - findByField('technician', 'license_number', 'ABC123') → replaces Technician.findByLicenseNumber()
   * - findByField('role', 'name', 'admin') → replaces Role.getByName()
   *
   * @param {string} entityName - Entity name (e.g., 'user', 'role', 'customer')
   * @param {string} field - Field name to search by (must be in filterableFields)
   * @param {any} value - Value to match
   * @param {Object} [rlsContext] - RLS context from middleware
   * @returns {Promise<Object|null>} Entity record or null if not found
   * @throws {Error} If entityName invalid or field not in filterableFields
   *
   * @example
   *   const user = await GenericEntityService.findByField('user', 'email', 'test@example.com');
   *   // Returns: { id: 1, email: 'test@example.com', ... } or null
   */
  static async findByField(entityName, field, value, rlsContext = null) {
    // Get metadata (throws if invalid entityName)
    const metadata = this._getMetadata(entityName);

    const { tableName, primaryKey, filterableFields = [], defaultIncludes = [], relationships = {} } = metadata;

    // Validate field is filterable (security: prevent arbitrary column access)
    // SYSTEMIC: Primary key is ALWAYS allowed (for findById to work)
    const isPrimaryKey = field === primaryKey;
    if (!isPrimaryKey && !filterableFields.includes(field)) {
      throw new AppError(
        `Field '${field}' is not filterable for ${entityName}. ` +
        `Allowed: ${filterableFields.join(', ')}`,
        400,
        'BAD_REQUEST',
      );
    }

    // Build SELECT and JOIN clauses for default includes
    let selectClause = `${tableName}.*`;
    let joinClause = '';

    if (defaultIncludes.length > 0) {
      const { selectParts, joinParts } = buildDefaultIncludesClauses(tableName, defaultIncludes, relationships);

      if (selectParts.length > 0) {
        selectClause = `${tableName}.*, ${selectParts.join(', ')}`;
        joinClause = joinParts.join(' ');
      }
    }

    // Build WHERE clause - qualify field with table name to avoid ambiguity
    const whereClauses = [`${tableName}.${field} = $1`];
    const params = [value];

    // Apply RLS filter if context provided
    if (rlsContext) {
      const rlsFilter = buildRLSFilterForFindById(rlsContext, metadata, params.length);

      if (rlsFilter.clause) {
        whereClauses.push(rlsFilter.clause);
        params.push(...rlsFilter.params);
      }

      logger.debug('GenericEntityService.findByField with RLS', {
        entity: entityName,
        field,
        policy: rlsContext.policy,
        rlsApplied: rlsFilter.applied,
      });
    }

    // Build parameterized query with optional JOINs
    const query = `SELECT ${selectClause} FROM ${tableName} ${joinClause} WHERE ${whereClauses.join(' AND ')} LIMIT 1`;

    logger.debug('GenericEntityService.findByField', {
      entity: entityName,
      table: tableName,
      field,
      hasRLS: !!rlsContext,
      hasJoins: joinClause.length > 0,
    });

    // Execute query
    const result = await db.query(query, params);

    // Return first row or null (with sensitive fields filtered)
    const record = result.rows[0] || null;
    return record ? filterOutput(record, metadata) : null;
  }

  /**
   * Count entities matching filters
   *
   * SRP: ONLY returns count of matching records with RLS enforcement
   *
   * USE CASES:
   * - count('user', { role_id: 5 }) → replaces Role.getUserCount()
   * - count('work_order', { status: 'pending' }) → count pending work orders
   * - count('customer', { is_active: true }) → count active customers
   *
   * @param {string} entityName - Entity name (e.g., 'user', 'role', 'customer')
   * @param {Object} [filters={}] - Filters to apply (must be in filterableFields)
   * @param {Object} [rlsContext] - RLS context from middleware
   * @returns {Promise<number>} Count of matching records
   * @throws {Error} If entityName invalid
   *
   * @example
   *   const activeUsers = await GenericEntityService.count('user', { is_active: true });
   *   // Returns: 42
   *
   * @example
   *   const usersInRole = await GenericEntityService.count('user', { role_id: 5 });
   *   // Returns: 10
   */
  static async count(entityName, filters = {}, rlsContext = null) {
    // Get metadata (throws if invalid entityName)
    const metadata = this._getMetadata(entityName);

    const { tableName, filterableFields = [] } = metadata;

    // Build filter clause
    const filterResult = QueryBuilderService.buildFilterClause(
      filters,
      filterableFields,
      0, // paramOffset
    );

    const whereClauses = [];
    let params = [];

    if (filterResult.clause) {
      whereClauses.push(filterResult.clause);
      params = [...filterResult.params];
    }

    // Apply RLS filter if context provided
    if (rlsContext) {
      const rlsFilter = buildRLSFilter(rlsContext, metadata, params.length);

      if (rlsFilter.clause) {
        whereClauses.push(rlsFilter.clause);
        params.push(...rlsFilter.params);
      }

      logger.debug('GenericEntityService.count with RLS', {
        entity: entityName,
        policy: rlsContext.policy,
        rlsApplied: rlsFilter.applied,
      });
    }

    // Build WHERE clause
    const whereClause = whereClauses.length > 0
      ? `WHERE ${whereClauses.join(' AND ')}`
      : '';

    // Build count query
    const query = `SELECT COUNT(*) as total FROM ${tableName} ${whereClause}`;

    logger.debug('GenericEntityService.count', {
      entity: entityName,
      table: tableName,
      filters: Object.keys(filters),
      hasRLS: !!rlsContext,
    });

    // Execute query
    const result = await db.query(query, params);

    return parseInt(result.rows[0].total, 10);
  }

  // ============================================================================
  // WRITE OPERATIONS
  // ============================================================================

  /**
   * Create a new entity
   *
   * SRP: ONLY inserts a new row using metadata-driven field validation
   *
   * @param {string} entityName - Entity name (e.g., 'user', 'role', 'customer')
   * @param {Object} data - Entity data to insert
   * @param {Object} [options={}] - Additional options
   * @param {Object} [options.auditContext] - Audit context from buildAuditContext()
   * @returns {Promise<Object>} Created entity with all fields (RETURNING *)
   * @throws {Error} If entityName invalid, required fields missing, or DB error
   *
   * @example
   *   const customer = await GenericEntityService.create('customer', {
   *     email: 'test@example.com',
   *     company_name: 'ACME Corp',
   *   });
   *   // Returns: { id: 1, email: 'test@example.com', ... }
   *
   * @example
   *   // With audit logging
   *   const customer = await GenericEntityService.create('customer', data, {
   *     auditContext: buildAuditContext(req),
   *   });
   */
  static async create(entityName, data, options = {}) {
    // Get metadata (throws if invalid entityName)
    const metadata = this._getMetadata(entityName);

    const { tableName, requiredFields = [] } = metadata;

    // Validate data is an object
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new AppError(`Data is required and must be an object for ${entityName}`, 400, 'BAD_REQUEST');
    }

    // =========================================================================
    // UNIVERSAL DATA HYGIENE (type-based, not field-based)
    // Trims all strings, lowercases enums, etc. based on metadata.fields types
    // =========================================================================
    const cleanData = sanitizeData(data, metadata);

    // =========================================================================
    // AUTO-GENERATE IDENTIFIERS FOR COMPUTED ENTITIES
    // COMPUTED entities (work_order, invoice, contract) have auto-generated
    // identifiers in the format PREFIX-YYYY-NNNN (e.g., WO-2025-0001)
    // =========================================================================
    const nameType = NAME_TYPE_MAP[entityName];
    if (nameType === NAME_TYPES.COMPUTED) {
      const identifierField = IDENTIFIER_FIELDS[entityName];
      if (identifierField && !cleanData[identifierField]) {
        cleanData[identifierField] = await generateIdentifier(entityName);
        logger.debug('Auto-generated identifier for COMPUTED entity', {
          entity: entityName,
          field: identifierField,
          value: cleanData[identifierField],
        });
      }
    }

    // Validate required fields are present (after sanitization and auto-generation)
    const missingFields = requiredFields.filter(
      (field) => cleanData[field] === undefined || cleanData[field] === null || cleanData[field] === '',
    );

    if (missingFields.length > 0) {
      throw new AppError(
        `Missing required fields for ${entityName}: ${missingFields.join(', ')}`,
        400,
        'BAD_REQUEST',
      );
    }

    // Filter data using EXCLUSION pattern - allow all fields EXCEPT system-managed ones
    // Uses centralized constant from config/constants.js
    // EXCEPTION: sharedPrimaryKey entities (e.g., preferences) allow 'id' to be provided
    const filteredData = {};
    const allowedSystemFields = metadata.sharedPrimaryKey ? ['id'] : [];
    for (const [field, value] of Object.entries(cleanData)) {
      const isSystemManaged = ENTITY_FIELDS.SYSTEM_MANAGED_ON_CREATE.includes(field);
      const isAllowedSystemField = allowedSystemFields.includes(field);
      if ((!isSystemManaged || isAllowedSystemField) && value !== undefined) {
        filteredData[field] = value;
      }
    }

    // Check we have at least one field to insert
    const fields = Object.keys(filteredData);
    if (fields.length === 0) {
      throw new AppError(`No valid fields provided for ${entityName}`, 400, 'BAD_REQUEST');
    }

    // Serialize JSON/JSONB fields for database insertion
    const serializedData = this._serializeForDb(filteredData, metadata);

    // Build parameterized INSERT query
    const columns = fields.join(', ');
    const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
    const values = fields.map((field) => serializedData[field]);

    const query = `
      INSERT INTO ${tableName} (${columns})
      VALUES (${placeholders})
      RETURNING *
    `;

    logger.debug('GenericEntityService.create', {
      entity: entityName,
      table: tableName,
      fields,
    });

    // Execute query
    const result = await db.query(query, values);

    logger.info(`${entityName} created`, {
      id: result.rows[0]?.[metadata.primaryKey],
      identityField: result.rows[0]?.[metadata.identityField],
    });

    // Filter sensitive fields from response
    const filteredResult = filterOutput(result.rows[0], metadata);

    // Log audit event (blocking to ensure audit is written before response)
    if (options.auditContext && isAuditEnabled(entityName)) {
      await logEntityAudit('create', entityName, filteredResult, options.auditContext);
    }

    return filteredResult;
  }

  /**
   * Update an existing entity by ID
   *
   * SRP: ONLY updates a row using metadata-driven field validation
   *
   * @param {string} entityName - Entity name (e.g., 'user', 'role', 'customer')
   * @param {number|string} id - Primary key value
   * @param {Object} data - Fields to update
   * @param {Object} [options={}] - Additional options
   * @param {Object} [options.auditContext] - Audit context from buildAuditContext()
   * @returns {Promise<Object|null>} Updated entity or null if not found
   * @throws {Error} If entityName invalid, id invalid, or no valid fields provided
   *
   * @example
   *   const updated = await GenericEntityService.update('customer', 1, {
   *     phone: '555-9999',
   *     company_name: 'New Name',
   *   });
   *   // Returns: { id: 1, phone: '555-9999', ... } or null if not found
   *
   * @example
   *   // With audit logging
   *   const updated = await GenericEntityService.update('customer', 1, data, {
   *     auditContext: buildAuditContext(req),
   *   });
   */
  static async update(entityName, id, data, options = {}) {
    // Get metadata (throws if invalid entityName)
    const metadata = this._getMetadata(entityName);

    const { tableName, primaryKey, immutableFields = [], identityField, systemProtected } = metadata;

    // Validate and coerce ID (throws on invalid)
    // silent: true - IDs from controllers are strings, coercion is expected
    const safeId = toSafeInteger(id, 'id', { silent: true });

    // Validate data is an object
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new AppError(`Data is required and must be an object for ${entityName}`, 400, 'BAD_REQUEST');
    }

    // =========================================================================
    // UNIVERSAL DATA HYGIENE (type-based, not field-based)
    // Trims all strings, lowercases enums, etc. based on metadata.fields types
    // =========================================================================
    const cleanData = sanitizeData(data, metadata);

    // =========================================================================
    // FILTER UNKNOWN FIELDS (only allow fields defined in metadata)
    // This prevents "column does not exist" DB errors from unknown fields
    // Use fieldAccess keys if available (our standard), fallback to fields
    // =========================================================================
    const knownFields = metadata.fieldAccess
      ? Object.keys(metadata.fieldAccess)
      : (metadata.fields ? Object.keys(metadata.fields) : []);
    const filteredData = {};
    for (const [field, value] of Object.entries(cleanData)) {
      if (knownFields.length === 0 || knownFields.includes(field)) {
        filteredData[field] = value;
      } else {
        logger.debug('GenericEntityService.update: Unknown field ignored', {
          entity: entityName,
          field,
        });
      }
    }

    // =========================================================================
    // SYSTEM PROTECTION CHECK (before any DB operation)
    // =========================================================================
    if (systemProtected) {
      // Check if attempting to modify system-protected immutable fields
      const attemptedImmutable = (systemProtected.immutableFields || []).filter(
        field => filteredData[field] !== undefined,
      );

      if (attemptedImmutable.length > 0) {
        // Need to fetch record to check if it's protected
        const record = await this.findById(entityName, safeId);

        if (record) {
          // Use protectedByField if specified, otherwise fall back to identityField
          const protectionField = systemProtected.protectedByField || identityField;
          const identityValue = record[protectionField];

          if (systemProtected.values.includes(identityValue)) {
            throw new AppError(
              `Cannot modify ${attemptedImmutable.join(', ')} on system ${entityName}: ${identityValue}`,
              403,
              'FORBIDDEN',
            );
          }
        }
      }
    }

    // Use buildUpdateClause with EXCLUSION pattern
    // All fields allowed except those in immutableFields (+ universal immutables)
    // Extract JSONB field names from metadata for proper serialization
    const jsonbFields = metadata.fields
      ? Object.entries(metadata.fields)
        .filter(([_, def]) => def.type === 'json' || def.type === 'jsonb')
        .map(([name]) => name)
      : [];

    const { updates, values, hasUpdates } = buildUpdateClause(filteredData, immutableFields, { jsonbFields });

    if (!hasUpdates) {
      throw new AppError(`No valid updateable fields provided for ${entityName}`, 400, 'BAD_REQUEST');
    }

    // =========================================================================
    // CAPTURE OLD VALUES FOR AUDIT (before update)
    // =========================================================================
    let oldValues = null;
    if (options.auditContext && isAuditEnabled(entityName)) {
      const oldRecord = await this.findById(entityName, safeId);
      if (oldRecord) {
        oldValues = oldRecord;
      }
    }

    // Add ID as the last parameter
    values.push(safeId);

    // Build parameterized UPDATE query
    const query = `
      UPDATE ${tableName}
      SET ${updates.join(', ')}
      WHERE ${primaryKey} = $${values.length}
      RETURNING ${primaryKey}
    `;

    logger.debug('GenericEntityService.update', {
      entity: entityName,
      table: tableName,
      id: safeId,
      fieldsUpdated: updates.length,
    });

    // Execute query
    const result = await db.query(query, values);

    // Return null if not found (no rows updated)
    if (result.rows.length === 0) {
      return null;
    }

    logger.info(`${entityName} updated`, {
      id: safeId,
      fieldsUpdated: updates.length,
    });

    // Re-fetch using findById to include JOINs (defaultIncludes)
    // This ensures the returned record has all relationship data
    const updatedRecord = await this.findById(entityName, safeId);

    // Log audit event (blocking to ensure audit is written before response)
    if (options.auditContext && isAuditEnabled(entityName)) {
      await logEntityAudit('update', entityName, updatedRecord, options.auditContext, oldValues);
    }

    return updatedRecord;
  }

  /**
   * Delete an entity by ID (hard delete with cascade)
   *
   * SRP: ONLY deletes a row using metadata-driven cascade deletion
   *
   * @param {string} entityName - Entity name (e.g., 'user', 'role', 'customer')
   * @param {number|string} id - Primary key value
   * @param {Object} [options={}] - Additional options
   * @param {Object} [options.auditContext] - Audit context from buildAuditContext()
   * @returns {Promise<Object|null>} Deleted entity or null if not found
   * @throws {Error} If entityName invalid, id invalid, or DB constraint violation
   *
   * @example
   *   const deleted = await GenericEntityService.delete('customer', 1);
   *   // Returns: { id: 1, email: 'test@example.com', ... } or null if not found
   *
   * @example
   *   // With dependents (e.g., audit_logs) - cascaded automatically
   *   const deleted = await GenericEntityService.delete('role', 5);
   *   // Cascade deletes audit_logs where resource_type='roles' AND resource_id=5
   *   // Then deletes the role itself
   *
   * @example
   *   // With audit logging
   *   const deleted = await GenericEntityService.delete('customer', 1, {
   *     auditContext: buildAuditContext(req),
   *   });
   */
  static async delete(entityName, id, options = {}) {
    // Get metadata (throws if invalid entityName)
    const metadata = this._getMetadata(entityName);

    const { tableName, primaryKey, identityField, systemProtected } = metadata;

    // Validate and coerce ID (throws on invalid)
    // silent: true - IDs from controllers are strings, coercion is expected
    const safeId = toSafeInteger(id, 'id', { silent: true });

    // =========================================================================
    // SYSTEM PROTECTION CHECK (before any DB operation)
    // =========================================================================
    if (systemProtected?.preventDelete) {
      // Need to fetch record to check if it's protected
      const record = await this.findById(entityName, safeId);

      if (record) {
        // Use protectedByField if specified, otherwise fall back to identityField
        const protectionField = systemProtected.protectedByField || identityField;
        const identityValue = record[protectionField];

        if (systemProtected.values.includes(identityValue)) {
          throw new AppError(
            `Cannot delete system ${entityName}: ${identityValue}`,
            403,
            'FORBIDDEN',
          );
        }
      }
    }

    // Start transaction for cascade + delete atomicity
    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      // Check if record exists first
      const checkQuery = `SELECT * FROM ${tableName} WHERE ${primaryKey} = $1`;
      const checkResult = await client.query(checkQuery, [safeId]);

      if (checkResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      // Record fetched for audit logging
      const recordBeforeDelete = checkResult.rows[0];

      // Cascade delete dependents (metadata-driven)
      const cascadeResult = await cascadeDeleteDependents(client, metadata, safeId);

      // Delete the entity itself
      const deleteQuery = `DELETE FROM ${tableName} WHERE ${primaryKey} = $1 RETURNING *`;
      const deleteResult = await client.query(deleteQuery, [safeId]);

      await client.query('COMMIT');

      logger.info(`${entityName} deleted`, {
        id: safeId,
        cascadedDependents: cascadeResult.totalDeleted,
      });

      // Filter sensitive fields from response
      const filteredResult = filterOutput(deleteResult.rows[0], metadata);
      const filteredOldValues = filterOutput(recordBeforeDelete, metadata);

      // Log audit event (blocking to ensure audit is written before response)
      if (options.auditContext && isAuditEnabled(entityName)) {
        await logEntityAudit('delete', entityName, filteredResult, options.auditContext, filteredOldValues);
      }

      return filteredResult;

    } catch (error) {
      await client.query('ROLLBACK');

      logger.error(`Error deleting ${entityName}`, {
        error: error.message,
        id: safeId,
      });

      throw error;

    } finally {
      client.release();
    }
  }

  // ============================================================================
  // BATCH OPERATIONS
  // ============================================================================

  /**
   * Execute multiple operations in a single transaction
   *
   * SRP: ONLY orchestrates multiple create/update/delete operations atomically
   *
   * PHILOSOPHY:
   * - ALL SUCCEED OR ALL FAIL: Transactional guarantee
   * - ORDERED EXECUTION: Operations execute in array order (for dependencies)
   * - DETAILED RESULTS: Returns success/failure for each operation
   * - AUDIT TRAIL: Each operation is individually audited
   *
   * @param {string} entityName - Entity name (e.g., 'user', 'role', 'customer')
   * @param {Array<Object>} operations - Array of operations to execute
   * @param {string} operations[].operation - 'create' | 'update' | 'delete'
   * @param {number|string} [operations[].id] - Required for update/delete
   * @param {Object} [operations[].data] - Required for create/update
   * @param {Object} [options={}] - Additional options
   * @param {Object} [options.auditContext] - Audit context from buildAuditContext()
   * @param {boolean} [options.continueOnError=false] - Continue processing after first error
   * @returns {Promise<Object>} { success: boolean, results: [...], errors: [...], stats: {...} }
   *
   * @example
   *   // Create multiple records atomically
   *   const result = await GenericEntityService.batch('customer', [
   *     { operation: 'create', data: { email: 'a@test.com', company_name: 'A Corp' } },
   *     { operation: 'create', data: { email: 'b@test.com', company_name: 'B Corp' } },
   *   ]);
   *   // Returns: { success: true, results: [{...}, {...}], errors: [], stats: { created: 2 } }
   *
   * @example
   *   // Mixed operations
   *   const result = await GenericEntityService.batch('customer', [
   *     { operation: 'create', data: { email: 'new@test.com', company_name: 'New' } },
   *     { operation: 'update', id: 5, data: { phone: '555-1234' } },
   *     { operation: 'delete', id: 10 },
   *   ], { auditContext });
   *
   * @example
   *   // Continue on error (for bulk imports)
   *   const result = await GenericEntityService.batch('customer', operations, {
   *     continueOnError: true,
   *   });
   *   // Returns partial success with errors array populated
   */
  static async batch(entityName, operations, options = {}) {
    // Get metadata (throws if invalid entityName)
    const metadata = this._getMetadata(entityName);

    // Validate operations array
    if (!Array.isArray(operations) || operations.length === 0) {
      throw new AppError('Operations must be a non-empty array', 400, 'BAD_REQUEST');
    }

    // Validate each operation structure before starting transaction
    const validOperations = ['create', 'update', 'delete'];
    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];

      if (!op || typeof op !== 'object') {
        throw new AppError(`Operation at index ${i} must be an object`, 400, 'BAD_REQUEST');
      }

      if (!validOperations.includes(op.operation)) {
        throw new AppError(
          `Invalid operation '${op.operation}' at index ${i}. Valid: ${validOperations.join(', ')}`,
          400,
          'BAD_REQUEST',
        );
      }

      if ((op.operation === 'update' || op.operation === 'delete') && !op.id) {
        throw new AppError(`Operation '${op.operation}' at index ${i} requires an id`, 400, 'BAD_REQUEST');
      }

      if ((op.operation === 'create' || op.operation === 'update') && !op.data) {
        throw new AppError(`Operation '${op.operation}' at index ${i} requires data`, 400, 'BAD_REQUEST');
      }
    }

    const { tableName, primaryKey, requiredFields = [], immutableFields = [] } = metadata;
    const { continueOnError = false, auditContext } = options;

    const results = [];
    const errors = [];
    const stats = { created: 0, updated: 0, deleted: 0, failed: 0 };

    // Get a client for transaction
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      for (let i = 0; i < operations.length; i++) {
        const op = operations[i];

        try {
          let result;

          switch (op.operation) {
            case 'create': {
              // Validate required fields
              const missingFields = requiredFields.filter(
                (field) => op.data[field] === undefined || op.data[field] === null || op.data[field] === '',
              );

              if (missingFields.length > 0) {
                throw new AppError(`Missing required fields: ${missingFields.join(', ')}`, 400, 'BAD_REQUEST');
              }

              // Filter using EXCLUSION pattern - allow all fields EXCEPT system-managed ones
              // Uses centralized constant from config/constants.js
              // EXCEPTION: sharedPrimaryKey entities (e.g., preferences) allow 'id' to be provided
              const filteredData = {};
              const allowedSystemFields = metadata.sharedPrimaryKey ? ['id'] : [];
              for (const [field, value] of Object.entries(op.data)) {
                const isSystemManaged = ENTITY_FIELDS.SYSTEM_MANAGED_ON_CREATE.includes(field);
                const isAllowedSystemField = allowedSystemFields.includes(field);
                if ((!isSystemManaged || isAllowedSystemField) && value !== undefined) {
                  filteredData[field] = value;
                }
              }

              const fields = Object.keys(filteredData);
              if (fields.length === 0) {
                throw new AppError('No valid fields provided', 400, 'BAD_REQUEST');
              }

              const columns = fields.join(', ');
              const placeholders = fields.map((_, j) => `$${j + 1}`).join(', ');
              const values = fields.map((field) => filteredData[field]);

              const query = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders}) RETURNING *`;
              const dbResult = await client.query(query, values);
              result = filterOutput(dbResult.rows[0], metadata);
              stats.created++;

              // Audit (blocking to ensure audit is written before transaction completes)
              if (auditContext && isAuditEnabled(entityName)) {
                await logEntityAudit('create', entityName, result, auditContext);
              }
              break;
            }

            case 'update': {
              const safeId = toSafeInteger(op.id, 'id', { silent: true });

              // Fetch current record for audit oldValues
              const fetchQuery = `SELECT * FROM ${tableName} WHERE ${primaryKey} = $1`;
              const fetchResult = await client.query(fetchQuery, [safeId]);

              if (fetchResult.rows.length === 0) {
                throw new AppError(`Record not found: ${safeId}`, 404, 'NOT_FOUND');
              }

              const oldRecord = fetchResult.rows[0];

              // Filter using EXCLUSION pattern - allow all fields EXCEPT immutables
              // Uses centralized constant from config/constants.js
              const allExcluded = [...ENTITY_FIELDS.UNIVERSAL_IMMUTABLES, ...immutableFields];
              const updateData = {};
              for (const [field, value] of Object.entries(op.data)) {
                if (!allExcluded.includes(field) && value !== undefined) {
                  updateData[field] = value;
                }
              }

              const fields = Object.keys(updateData);
              if (fields.length === 0) {
                throw new AppError('No valid fields provided', 400, 'BAD_REQUEST');
              }

              // Build UPDATE clause
              const setClause = fields.map((field, j) => `${field} = $${j + 2}`).join(', ');
              const values = [safeId, ...fields.map((field) => updateData[field])];

              const query = `UPDATE ${tableName} SET ${setClause} WHERE ${primaryKey} = $1 RETURNING *`;
              const dbResult = await client.query(query, values);
              result = filterOutput(dbResult.rows[0], metadata);
              stats.updated++;

              // Audit with oldValues (blocking to ensure audit is written before transaction completes)
              if (auditContext && isAuditEnabled(entityName)) {
                const filteredOld = filterOutput(oldRecord, metadata);
                await logEntityAudit('update', entityName, result, auditContext, filteredOld);
              }
              break;
            }

            case 'delete': {
              const safeId = toSafeInteger(op.id, 'id', { silent: true });

              // Fetch record before delete for audit
              const fetchQuery = `SELECT * FROM ${tableName} WHERE ${primaryKey} = $1`;
              const fetchResult = await client.query(fetchQuery, [safeId]);

              if (fetchResult.rows.length === 0) {
                throw new AppError(`Record not found: ${safeId}`, 404, 'NOT_FOUND');
              }

              const oldRecord = fetchResult.rows[0];

              // Cascade delete dependents
              await cascadeDeleteDependents(client, metadata, safeId);

              // Delete the record
              const query = `DELETE FROM ${tableName} WHERE ${primaryKey} = $1 RETURNING *`;
              const dbResult = await client.query(query, [safeId]);
              result = filterOutput(dbResult.rows[0], metadata);
              stats.deleted++;

              // Audit with oldValues (blocking to ensure audit is written before transaction completes)
              if (auditContext && isAuditEnabled(entityName)) {
                const filteredOld = filterOutput(oldRecord, metadata);
                await logEntityAudit('delete', entityName, result, auditContext, filteredOld);
              }
              break;
            }
          }

          results.push({
            index: i,
            operation: op.operation,
            success: true,
            result,
          });

        } catch (opError) {
          stats.failed++;

          const errorEntry = {
            index: i,
            operation: op.operation,
            success: false,
            error: opError.message,
          };

          errors.push(errorEntry);
          results.push(errorEntry);

          if (!continueOnError) {
            // Rollback and return immediately
            await client.query('ROLLBACK');

            logger.warn(`Batch ${entityName} failed at operation ${i}`, {
              operation: op.operation,
              error: opError.message,
              stats,
            });

            return {
              success: false,
              results,
              errors,
              stats,
              message: `Batch aborted at operation ${i}: ${opError.message}`,
            };
          }
        }
      }

      // If continueOnError and we have errors, still commit successful operations
      // This is intentional - caller requested partial success
      await client.query('COMMIT');

      const success = errors.length === 0;

      logger.info(`Batch ${entityName} completed`, {
        success,
        stats,
        errorCount: errors.length,
      });

      return {
        success,
        results,
        errors,
        stats,
        message: success
          ? `Batch completed: ${stats.created} created, ${stats.updated} updated, ${stats.deleted} deleted`
          : `Batch completed with ${errors.length} error(s): ${stats.created} created, ${stats.updated} updated, ${stats.deleted} deleted`,
      };

    } catch (error) {
      await client.query('ROLLBACK');

      logger.error(`Batch ${entityName} transaction failed`, {
        error: error.message,
        stats,
      });

      throw error;

    } finally {
      client.release();
    }
  }
}

module.exports = GenericEntityService;
