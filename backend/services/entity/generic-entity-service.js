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

const allMetadata = require('../../config/models');
const {
  getFieldsWithTrait,
  FIELD_TRAIT,
} = require('../../config/metadata-accessors');
const { logger } = require('../../config/logger');
const db = require('../../db/connection');
const { toSafeId } = require('../../validators/type-coercion');
const PaginationService = require('./pagination-service');
const QueryBuilderService = require('./query-builder-service');
const {
  evaluateBeforeHooks,
  evaluateAfterHooks,
} = require('./hook-service');
const { buildUpdateClause } = require('../../db/helpers/update-helper');
const { applyDerived } = require('./field-derivation');
const { cascadeDeleteDependents } = require('../../db/helpers/cascade-helper');
// ADR-011: Use new rule-based RLS engine
const { buildRLSFilter } = require('../../db/helpers/rls');
const {
  stripAuthIdentifiers,
  stripAuthIdentifiersArray,
} = require('../../db/helpers/auth-identifier-sanitizer');
// ADR-011: field-level read redaction at the service output boundary
const { filterDataByRole } = require('../../utils/field-access-controller');
const { composeComputedName } = require('../../utils/name-utils');
const { logEntityAuditIfEnabled } = require('../../db/helpers/audit-helper');
const {
  loadRelationships,
  buildForeignKeyDisplayClauses,
} = require('../../db/helpers/relationship-loader');
const {
  ENTITY_FIELDS,
  NAME_PATTERNS,
  NAME_PATTERN_MAP,
} = require('../../config/constants');
const { sanitizeData } = require('../../utils/data-hygiene');
const {
  generateIdentifier,
  IDENTIFIER_FIELDS,
} = require('../../utils/identifier-generator');
const AppError = require('../../utils/app-error');
const { ERROR_CODES } = require('../../config/error-codes');

/**
 * Partition an object's entries into kept vs rejected by a predicate.
 * @param {Object} data - Source object.
 * @param {(value: *, key: string) => boolean} predicate - Keep when it returns true.
 * @returns {{ kept: Object, rejected: string[] }} Kept subset plus rejected keys.
 */
function partitionFields(data, predicate) {
  const kept = {};
  const rejected = [];
  for (const [key, value] of Object.entries(data)) {
    if (predicate(value, key)) {
      kept[key] = value;
    } else {
      rejected.push(key);
    }
  }
  return { kept, rejected };
}

/**
 * Valid entity names (keys from config/models/index.js)
 * Used for validation and error messages
 */
const VALID_ENTITIES = Object.keys(allMetadata);

// Default list sort when an entity declares no defaultSort in metadata.
const DEFAULT_SORT = Object.freeze({ field: 'id', order: 'ASC' });

class GenericEntityService {
  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Get metadata for an entity by name
   *
   * SRP: ONLY looks up and validates entity metadata exists
   *
   * Semi-public: consumed by middleware/routes at route-definition time.
   * @param {string} entityName - Entity name (e.g., 'user', 'role', 'customer')
   * @returns {Object} Entity metadata from config/models
   * @throws {Error} If entityName is invalid or metadata not found
   *
   * @example
   *   const metadata = GenericEntityService.requireEntityMetadata('user');
   *   // Returns: { tableName: 'users', primaryKey: 'id', ... }
   *
   * @example
   *   GenericEntityService.requireEntityMetadata('invalid');
   *   // Throws: Error('Unknown entity: invalid. Valid entities: user, role, ...')
   */
  static requireEntityMetadata(entityName) {
    // Validate entityName is provided
    if (!entityName || typeof entityName !== 'string') {
      throw new AppError(
        'Entity name is required and must be a string',
        400,
        ERROR_CODES.VALIDATION_FAILED,
      );
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
        ERROR_CODES.VALIDATION_FAILED,
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
        if (
          value !== null &&
          value !== undefined &&
          typeof value === 'object'
        ) {
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

  /**
   * Redact fields the caller's role may not read (ADR-011 output boundary)
   *
   * SRP: ONLY strips non-readable fields from a record (or array of records)
   * according to the caller's role in the RLS context.
   *
   * Field-level read filtering is applied ONLY when a role is present in the RLS
   * context. Internal/system callers (no rlsContext, or a context without a role)
   * receive the record unchanged — mirroring the RLS engine's skip-for-system
   * behavior so role-less reads are not over-redacted to the least-privileged role.
   *
   * @private
   * @param {Object|Array|null} data - A record, an array of records, or null
   * @param {Object} metadata - Entity metadata with fieldAccess config
   * @param {Object|null} [rlsContext] - ADR-011 RLS context; redaction is skipped unless rlsContext.role is set
   * @returns {Object|Array|null} Data limited to role-readable fields, or unchanged when no role applies
   *
   * @example
   *   // API read (role present) → non-readable fields removed
   *   GenericEntityService._redactForContext(row, metadata, { role: 'customer' });
   *
   * @example
   *   // Internal/system read (no role) → full record returned
   *   GenericEntityService._redactForContext(row, metadata, null);
   */
  static _redactForContext(data, metadata, rlsContext = null) {
    // No role in context → internal/system caller → return full data unchanged
    if (!rlsContext || !rlsContext.role) {
      return data;
    }

    // Always 'read': this is the response-visibility boundary
    return filterDataByRole(data, metadata, rlsContext.role, 'read');
  }

  /**
   * Compose a COMPUTED entity's display `name` ON READ (never stored). No-op for
   * non-COMPUTED entities. Runs AFTER redaction so it composes from the
   * redaction-safe <fk>_display values already on the row; only sets `name` when
   * the caller may read it.
   *
   * @param {Object|Object[]} data - a redacted record or array of records
   * @param {Object} metadata - entity metadata
   * @returns {Object|Object[]} the same reference, `name` composed where applicable
   */
  static _applyComputedName(data, metadata) {
    if (!metadata.computedName || !data) {
      return data;
    }
    // Synthesize `name` unconditionally: it is a computed projection (like
    // <fk>_display), backed by no stored column, composed only from the
    // already-redacted row parts (own fields + surviving <fk>_display).
    const apply = (row) => {
      if (row) {
        row.name = composeComputedName(row, metadata);
      }
      return row;
    };
    return Array.isArray(data) ? data.map(apply) : apply(data);
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
   * @param {Object} [options={}] - Options bag
   * @param {string[]} [options.include] - Relationship names to eager-load
   * @param {Object} [options.rlsContext] - ADR-011 RLS context ({ role, userId, operation, *_profile_id }); omit for internal/system reads (no filtering)
   * @param {Object} [options.client] - Optional pg client to run the read on a caller's open transaction (batch); defaults to the pool. Relationship eager-loading (include) still uses the pool.
   * @returns {Promise<Object|null>} Entity record or null if not found/not authorized
   * @throws {Error} If entityName is invalid or id cannot be coerced to integer
   *
   * @example
   *   // Internal/system read (no RLS filtering)
   *   const user = await GenericEntityService.findById('user', 123);
   *
   * @example
   *   // With RLS (API endpoints) — rlsContext from enforceRLS middleware
   *   const user = await GenericEntityService.findById('user', 123, { rlsContext });
   *
   * @example
   *   // With eager-loaded relationships
   *   const customer = await GenericEntityService.findById('customer', 123, {
   *     include: ['units'],
   *     rlsContext,
   *   });
   */
  static async findById(entityName, id, options = {}) {
    const { include = null, rlsContext = null, client = null } = options || {};

    // Get metadata to find primary key name
    const metadata = this.requireEntityMetadata(entityName);

    // Validate and coerce ID to integer (throws on invalid)
    // toSafeId enforces min=1 by default, so 0 and negatives throw; it coerces
    // silently because IDs from controllers are URL-param strings (expected)
    const safeId = toSafeId(id);

    // Delegate to findByField using the primary key
    // Note: primaryKey (e.g., 'id') must be in filterableFields for this to work.
    // findByField does NOT redact — findById redacts once below, after
    // relationships are assembled, so FK fields survive relationship loading.
    let entity = await this.findByField(
      entityName,
      metadata.primaryKey,
      safeId,
      { rlsContext, client },
    );

    // Load relationships if requested and entity found
    if (entity && include && include.length > 0) {
      const withRelationships = await loadRelationships(
        entityName,
        include,
        [entity],
        { rlsContext },
      );
      entity = withRelationships[0] || entity;
    }

    // Redact non-readable fields for the caller's role (ADR-011 output boundary)
    const redacted = this._redactForContext(entity, metadata, rlsContext);
    return this._applyComputedName(redacted, metadata);
  }

  /**
   * Append the RLS WHERE-clause fragment for a read operation to the given
   * clause/param arrays, in place. Shared by findAll, findByField, and count;
   * the write paths (update/delete) assemble RLS differently and stay inline.
   *
   * @param {string} entityName - Entity name (for debug logging).
   * @param {string[]} whereClauses - WHERE fragments; RLS clause pushed if present.
   * @param {Array} params - Query params; RLS params pushed if present.
   * @param {Object|null} rlsContext - RLS context; when falsy, no-op returns false.
   * @param {Object} metadata - Entity metadata for the RLS engine.
   * @returns {boolean} Whether an RLS filter was applied (used by findAll's result).
   */
  static _appendRlsFilter(entityName, whereClauses, params, rlsContext, metadata) {
    if (!rlsContext) {
      return false;
    }

    // Determine operation: use context.operation if set, else default to 'read'
    const operation = rlsContext.operation || 'read';
    // New engine uses 1-indexed offset, pass allMetadata for parent access
    const rlsFilter = buildRLSFilter(
      rlsContext,
      metadata,
      operation,
      params.length + 1,
      allMetadata,
    );

    if (rlsFilter.clause) {
      whereClauses.push(rlsFilter.clause);
      params.push(...rlsFilter.params);
    }

    logger.debug('GenericEntityService RLS filter applied', {
      entity: entityName,
      operation,
      rlsApplied: rlsFilter.applied,
      rlsClause: rlsFilter.clause || '(none)',
    });

    return rlsFilter.applied;
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
   * @param {string[]} [options.include] - Relationship names to eager-load
   * @param {Object} [options.rlsContext] - ADR-011 RLS context ({ role, userId, operation, *_profile_id }); omit for internal/system reads (no filtering)
   * @returns {Promise<Object>} { data, pagination, appliedFilters, rlsApplied } — rlsApplied = RLS rules were EVALUATED (not that rows were filtered)
   *
   * @example
   *   // Internal/system read (no RLS filtering)
   *   const result = await GenericEntityService.findAll('user', { page: 1, limit: 10 });
   *   // Returns: { data: [...], pagination: { page: 1, limit: 10, total: 100, ... } }
   *
   * @example
   *   // With RLS (API endpoints) — rlsContext from enforceRLS middleware
   *   const result = await GenericEntityService.findAll('work_order', { page: 1, rlsContext });
   *   // Returns only rows the caller is authorized to see
   */
  static async findAll(entityName, options = {}) {
    const { rlsContext = null } = options || {};

    // Get metadata (throws if invalid entityName)
    const metadata = this.requireEntityMetadata(entityName);

    const built = this._buildListQuery(entityName, metadata, options, rlsContext);
    const { rows, total } = await this._executeListQuery(
      built.countQuery,
      built.dataQuery,
      built.params,
    );

    return this._shapeListResult(
      {
        rows,
        total,
        page: built.page,
        limit: built.limit,
        appliedFilters: built.appliedFilters,
        rlsApplied: built.rlsApplied,
      },
      entityName,
      metadata,
      options,
      rlsContext,
    );
  }

  /**
   * Assemble the COUNT and DATA queries (with their shared params) for a list
   * read. Pure: no DB access. Used only by findAll.
   *
   * @returns {{ countQuery: string, dataQuery: string, params: Array, page: number,
   *   limit: number, appliedFilters: Object, rlsApplied: boolean }}
   */
  static _buildListQuery(entityName, metadata, options, rlsContext) {
    // Validate pagination params (gracefully caps invalid values)
    const { page, limit, offset } = PaginationService.validateParams(options);
    const includeInactive = options.includeInactive || false;

    // Extract query-building metadata
    const {
      tableName,
      defaultSort = DEFAULT_SORT,
    } = metadata;

    const searchableFields = getFieldsWithTrait(metadata, FIELD_TRAIT.SEARCHABLE);
    const filterableFields = getFieldsWithTrait(metadata, FIELD_TRAIT.FILTERABLE);
    const sortableFields = getFieldsWithTrait(metadata, FIELD_TRAIT.SORTABLE);

    // Embed each FK's display value (LEFT JOIN target, project <fk>_display)
    let selectClause = `${tableName}.*`;
    let joinClause = '';

    const { selectParts, joinParts } = buildForeignKeyDisplayClauses(
      metadata,
      allMetadata,
    );
    if (selectParts.length > 0) {
      selectClause = `${tableName}.*, ${selectParts.join(', ')}`;
      joinClause = joinParts.join(' ');
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

    // Ensure is_active is always filterable if the entity has it
    // This guarantees the is_active filter works even if filterableFields is empty
    const effectiveFilterableFields = [...filterableFields];
    if (metadata.fields?.is_active && !effectiveFilterableFields.includes('is_active')) {
      effectiveFilterableFields.push('is_active');
    }

    const filters = QueryBuilderService.buildFilterClause(
      filterOptions,
      effectiveFilterableFields,
      search ? search.paramOffset : 0,
      tableName,
    );

    // Combine WHERE clauses
    const whereClauses = [search?.clause, filters?.clause].filter(Boolean);

    // Combine parameters
    const params = [...(search?.params || []), ...(filters?.params || [])];

    // Apply RLS filter if context provided (ADR-011: rule-based engine)
    const rlsApplied = this._appendRlsFilter(
      entityName,
      whereClauses,
      params,
      rlsContext,
      metadata,
    );

    const combinedWhere = QueryBuilderService.combineWhereClauses(whereClauses);
    const whereClause = combinedWhere ? `WHERE ${combinedWhere}` : '';

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

    // COUNT omits the belongsTo JOINs: they only project display fields; filters/RLS qualify by tableName.
    const countQuery = `SELECT COUNT(*) as total FROM ${tableName} ${whereClause}`;

    const dataQuery = `
      SELECT ${selectClause} 
      FROM ${tableName} 
      ${joinClause}
      ${whereClause} 
      ORDER BY ${sortClause}
      ${PaginationService.buildLimitClause(limit, offset)}
    `;

    return {
      countQuery,
      dataQuery,
      params,
      page,
      limit,
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
   * Execute the COUNT and DATA queries for a list read. The only I/O in the
   * findAll path.
   *
   * @returns {Promise<{ rows: Object[], total: number }>}
   */
  static async _executeListQuery(countQuery, dataQuery, params) {
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total, 10);

    const result = await db.query(dataQuery, params);

    return { rows: result.rows, total };
  }

  /**
   * Shape executed list rows into the public findAll response. Redaction is the
   * LAST step (ADR-011 output boundary), after auth-strip and relationship load.
   *
   * @returns {Promise<{ data: Object[], pagination: Object, appliedFilters: Object, rlsApplied: boolean }>}
   */
  static async _shapeListResult(
    { rows, total, page, limit, appliedFilters, rlsApplied },
    entityName,
    metadata,
    options,
    rlsContext,
  ) {
    // Generate pagination metadata
    const pagination = PaginationService.generateMetadata(page, limit, total);

    // Strip auth identifiers from all records
    let filteredData = stripAuthIdentifiersArray(rows, metadata);

    // Load relationships if requested
    if (options.include && options.include.length > 0 && filteredData.length > 0) {
      filteredData = await loadRelationships(
        entityName,
        options.include,
        filteredData,
        { rlsContext },
      );
    }

    // Redact non-readable fields for the caller's role (ADR-011 output boundary)
    filteredData = this._redactForContext(filteredData, metadata, rlsContext);

    // Compose the COMPUTED display name on read (never stored) from the
    // redaction-safe <fk>_display values now on each row.
    filteredData = this._applyComputedName(filteredData, metadata);

    return {
      data: filteredData,
      pagination,
      appliedFilters,
      // rlsApplied = RLS rules were EVALUATED for this read, not that rows were filtered.
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
   * @param {Object} [options={}] - Options bag
   * @param {Object} [options.rlsContext] - ADR-011 RLS context; omit for internal/system reads
   * @param {Object} [options.client] - Optional pg client to run the read on a caller's open transaction (batch); defaults to the pool
   * @returns {Promise<Object|null>} Entity record or null if not found
   * @throws {Error} If entityName invalid or field not in filterableFields
   *
   * @example
   *   const user = await GenericEntityService.findByField('user', 'email', 'test@example.com');
   *   // Returns: { id: 1, email: 'test@example.com', ... } or null
   */
  static async findByField(entityName, field, value, options = {}) {
    const { rlsContext = null, client = null } = options || {};
    // Get metadata (throws if invalid entityName)
    const metadata = this.requireEntityMetadata(entityName);

    const {
      tableName,
      primaryKey,
    } = metadata;
    const filterableFields = getFieldsWithTrait(metadata, FIELD_TRAIT.FILTERABLE);

    // Validate field is filterable (security: prevent arbitrary column access)
    // SYSTEMIC: Primary key is ALWAYS allowed (for findById to work)
    const isPrimaryKey = field === primaryKey;
    if (!isPrimaryKey && !filterableFields.includes(field)) {
      throw new AppError(
        `Field '${field}' is not filterable for ${entityName}. ` +
          `Allowed: ${filterableFields.join(', ')}`,
        400,
        ERROR_CODES.VALIDATION_FAILED,
      );
    }

    // Embed each FK's display value (LEFT JOIN target, project <fk>_display)
    let selectClause = `${tableName}.*`;
    let joinClause = '';

    const { selectParts, joinParts } = buildForeignKeyDisplayClauses(
      metadata,
      allMetadata,
    );
    if (selectParts.length > 0) {
      selectClause = `${tableName}.*, ${selectParts.join(', ')}`;
      joinClause = joinParts.join(' ');
    }

    // Build WHERE clause - qualify field with table name to avoid ambiguity
    const whereClauses = [`${tableName}.${field} = $1`];
    const params = [value];

    // Apply RLS filter if context provided (ADR-011: rule-based engine)
    this._appendRlsFilter(entityName, whereClauses, params, rlsContext, metadata);

    // Build parameterized query with optional JOINs
    const query = `SELECT ${selectClause} FROM ${tableName} ${joinClause} WHERE ${whereClauses.join(' AND ')} LIMIT 1`;

    logger.debug('GenericEntityService.findByField', {
      entity: entityName,
      table: tableName,
      field,
      hasRLS: !!rlsContext,
      hasJoins: joinClause.length > 0,
    });

    // Execute query (use the caller's transaction client when threaded, else the pool)
    const exec = client || db;
    const result = await exec.query(query, params);

    // Return first row or null (with auth identifiers stripped)
    const record = result.rows[0] || null;
    return record ? stripAuthIdentifiers(record, metadata) : null;
  }

  /**
   * Count entities matching filters
   *
   * SRP: ONLY returns count of matching records with RLS enforcement
   *
   * USE CASES:
   * - count('user', { filters: { role_id: 5 } }) → replaces Role.getUserCount()
   * - count('work_order', { filters: { status: 'pending' } }) → count pending work orders
   * - count('customer', { filters: { is_active: true } }) → count active customers
   *
   * @param {string} entityName - Entity name (e.g., 'user', 'role', 'customer')
   * @param {Object} [options={}] - Options bag
   * @param {Object} [options.filters] - Filters to apply (must be in filterableFields)
   * @param {Object} [options.rlsContext] - ADR-011 RLS context; omit for internal/system reads
   * @returns {Promise<number>} Count of matching records
   * @throws {Error} If entityName invalid
   *
   * @example
   *   const activeUsers = await GenericEntityService.count('user', { filters: { is_active: true } });
   *   // Returns: 42
   *
   * @example
   *   const usersInRole = await GenericEntityService.count('user', { filters: { role_id: 5 } });
   *   // Returns: 10
   */
  static async count(entityName, options = {}) {
    const { filters = {}, rlsContext = null } = options || {};

    // Get metadata (throws if invalid entityName)
    const metadata = this.requireEntityMetadata(entityName);

    const { tableName } = metadata;
    const filterableFields = getFieldsWithTrait(metadata, FIELD_TRAIT.FILTERABLE);

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

    // Apply RLS filter if context provided (ADR-011: rule-based engine)
    this._appendRlsFilter(entityName, whereClauses, params, rlsContext, metadata);

    // Build WHERE clause
    const combinedWhere = QueryBuilderService.combineWhereClauses(whereClauses);
    const whereClause = combinedWhere ? `WHERE ${combinedWhere}` : '';

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
   * TRANSACTION SEMANTICS (NOT wrapped in a DB transaction):
   * - The INSERT is auto-committed via db.query() the moment it runs.
   * - afterChange hooks then run POST-COMMIT and are reactive: their failures are
   *   caught and logged inside evaluateAfterHooks — they never roll back the write
   *   or fail the request. Recursion is bounded by `options.skipHooks` and the hook
   *   cascade-depth cap (HOOK_LIMITS.maxCascadeDepth).
   * - Audit is written post-commit as a blocking await (audit integrity is
   *   intentionally allowed to surface as an error).
   * - Contrast: delete() and batch() DO use BEGIN/COMMIT/ROLLBACK. Wrapping the
   *   write + afterChange + audit in a single transaction is deferred to P2.
   *
   * @param {string} entityName - Entity name (e.g., 'user', 'role', 'customer')
   * @param {Object} data - Entity data to insert
   * @param {Object} [options={}] - Additional options
   * @param {Object} [options.auditContext] - Audit context from buildAuditContext()
   * @param {boolean} [options.skipHooks] - Skip hook evaluation (prevents recursion)
   * @param {string|number} [options.user] - User ID for hook/audit context
   * @param {Object} [options.rlsContext] - ADR-011 RLS context; redacts the returned record to the caller's role (omit for internal/system callers → full record)
   * @param {Object} [options.client] - Optional pg client to run the INSERT on a caller's open transaction (batch); defaults to the pool
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
    const metadata = this.requireEntityMetadata(entityName);

    const { tableName } = metadata;
    const requiredFields = getFieldsWithTrait(metadata, FIELD_TRAIT.REQUIRED);

    // Validate data is an object
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new AppError(
        `Data is required and must be an object for ${entityName}`,
        400,
        ERROR_CODES.VALIDATION_FAILED,
      );
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
    const namePattern = NAME_PATTERN_MAP[entityName];
    if (namePattern === NAME_PATTERNS.COMPUTED) {
      const identifierField = IDENTIFIER_FIELDS[entityName];
      if (identifierField && !cleanData[identifierField]) {
        cleanData[identifierField] = await generateIdentifier(entityName, options.client);
        logger.debug('Auto-generated identifier for COMPUTED entity', {
          entity: entityName,
          field: identifierField,
          value: cleanData[identifierField],
        });
      }
    }

    // =========================================================================
    // APPLY METADATA-DRIVEN FIELD DERIVATIONS
    // For fields with `derived: { from, via }`, compute the value per method.
    // Example: work_order.property_id via:'lookup' from unit_id → unit.property_id
    // =========================================================================
    await applyDerived(entityName, cleanData, metadata);

    // Validate required fields are present (after sanitization and auto-generation)
    const missingFields = requiredFields.filter(
      (field) =>
        cleanData[field] === undefined ||
        cleanData[field] === null ||
        cleanData[field] === '',
    );

    if (missingFields.length > 0) {
      throw new AppError(
        `Missing required fields for ${entityName}: ${missingFields.join(', ')}`,
        400,
        ERROR_CODES.VALIDATION_FAILED,
      );
    }

    // Filter data using EXCLUSION pattern - allow all fields EXCEPT system-managed ones
    // Uses centralized constant from config/constants.js
    // EXCEPTION: sharedPrimaryKey entities (e.g., preferences) allow 'id' to be provided
    const allowedSystemFields = metadata.sharedPrimaryKey ? ['id'] : [];
    const { kept: filteredData } = partitionFields(
      cleanData,
      (value, field) =>
        (!ENTITY_FIELDS.SYSTEM_MANAGED_ON_CREATE.includes(field) ||
          allowedSystemFields.includes(field)) &&
        value !== undefined,
    );

    // Check we have at least one field to insert
    const fields = Object.keys(filteredData);
    if (fields.length === 0) {
      throw new AppError(
        `No valid fields provided for ${entityName}`,
        400,
        ERROR_CODES.VALIDATION_FAILED,
      );
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

    // Execute query (use the caller's transaction client when threaded, else the pool)
    const exec = options.client || db;
    const result = await exec.query(query, values);

    logger.info(`${entityName} created`, {
      id: result.rows[0]?.[metadata.primaryKey],
      identityField: result.rows[0]?.[metadata.identityField],
    });

    // Strip auth identifiers from response
    const filteredResult = stripAuthIdentifiers(result.rows[0], metadata);

    // =========================================================================
    // EVALUATE AFTER-CHANGE HOOKS FOR CREATE (trigger actions)
    // POST-COMMIT + reactive: the row is already persisted; hook failures are
    // caught/logged inside evaluateAfterHooks and never fail the request or roll
    // back the write.
    // Hooks are defined in metadata.fields[fieldName].afterChange
    // For create, oldValue is null/undefined (field didn't exist)
    // Skip if options.skipHooks is true (prevents recursive hook execution)
    // =========================================================================
    if (metadata.fields && !options.skipHooks) {
      for (const [fieldName, newValue] of Object.entries(filteredData)) {
        const fieldMeta = metadata.fields[fieldName];
        const hooks = fieldMeta?.afterChange;
        if (hooks && hooks.length > 0) {
          await evaluateAfterHooks({
            hooks,
            oldValue: null,
            newValue,
            context: {
              entity: entityName,
              record: filteredResult,
              field: fieldName,
              user: options.user || options.auditContext?.userId,
            },
            operation: 'create',
          });
        }
      }
    }

    // Log audit event (blocking to ensure audit is written before response)
    await logEntityAuditIfEnabled(
      'create',
      entityName,
      filteredResult,
      options.auditContext,
    );

    // Redact non-readable fields for the caller's role (ADR-011 output boundary).
    // Applied AFTER hooks + audit, which require the full created record.
    return this._redactForContext(filteredResult, metadata, options.rlsContext);
  }

  /**
   * Update an existing entity by ID
   *
   * SRP: ONLY updates a row using metadata-driven field validation
   *
   * TRANSACTION SEMANTICS (NOT wrapped in a DB transaction):
   * - beforeChange hooks run PRE-write and may block the update (403) or require
   *   approval (202) — a blocked update never persists.
   * - The UPDATE is auto-committed via db.query(); afterChange hooks then run
   *   POST-COMMIT and are reactive: their failures are caught and logged inside
   *   evaluateAfterHooks — they never roll back the write or fail the request.
   *   Recursion is bounded by `options.skipHooks` and HOOK_LIMITS.maxCascadeDepth.
   * - Audit is written post-commit as a blocking await.
   * - Contrast: delete() and batch() DO use BEGIN/COMMIT/ROLLBACK. Full
   *   transactionalization of update is deferred to P2.
   *
   * @param {string} entityName - Entity name (e.g., 'user', 'role', 'customer')
   * @param {number|string} id - Primary key value
   * @param {Object} data - Fields to update
   * @param {Object} [options={}] - Additional options
   * @param {Object} [options.auditContext] - Audit context from buildAuditContext()
   * @param {boolean} [options.skipHooks] - Skip hook evaluation (prevents recursion)
   * @param {string|number} [options.user] - User ID for hook/audit context
   * @param {Object} [options.rlsContext] - ADR-011 RLS context; row-scopes the update (out-of-scope → null → 404) AND redacts the returned record to the caller's role. Omit for internal/system callers (no scoping/redaction).
   * @param {Object} [options.client] - Optional pg client to run the UPDATE and its re-fetch on a caller's open transaction (batch); defaults to the pool
   * @returns {Promise<Object|null>} Updated entity, or null if not found or not authorized by RLS
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
    const { rlsContext = null } = options || {};

    // Get metadata (throws if invalid entityName)
    const metadata = this.requireEntityMetadata(entityName);

    const {
      tableName,
      primaryKey,
      identityField,
      systemProtected,
    } = metadata;
    const immutableFields = getFieldsWithTrait(metadata, FIELD_TRAIT.IMMUTABLE);

    // Validate and coerce ID (throws on invalid)
    // silent: true - IDs from controllers are strings, coercion is expected
    const safeId = toSafeId(id);

    // Validate data is an object
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new AppError(
        `Data is required and must be an object for ${entityName}`,
        400,
        ERROR_CODES.VALIDATION_FAILED,
      );
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
      : metadata.fields
        ? Object.keys(metadata.fields)
        : [];
    const { kept: filteredData, rejected } = partitionFields(
      cleanData,
      (_value, field) =>
        knownFields.length === 0 || knownFields.includes(field),
    );
    for (const field of rejected) {
      logger.debug('GenericEntityService.update: Unknown field ignored', {
        entity: entityName,
        field,
      });
    }

    // =========================================================================
    // APPLY METADATA-DRIVEN FIELD DERIVATIONS
    // For fields with `derived: { from, via }`, compute the value per method.
    // Example: work_order.property_id via:'lookup' from unit_id → unit.property_id
    // =========================================================================
    await applyDerived(entityName, filteredData, metadata);

    // Use buildUpdateClause with EXCLUSION pattern
    // All fields allowed except those in immutableFields (+ universal immutables)
    // Extract JSONB field names from metadata for proper serialization
    const jsonbFields = metadata.fields
      ? Object.entries(metadata.fields)
        .filter(([_, def]) => def.type === 'json' || def.type === 'jsonb')
        .map(([name]) => name)
      : [];

    const { updates, values: updateValues, hasUpdates } = buildUpdateClause(
      filteredData,
      immutableFields,
      { jsonbFields },
    );

    if (!hasUpdates) {
      throw new AppError(
        `No valid updateable fields provided for ${entityName}`,
        400,
        ERROR_CODES.VALIDATION_FAILED,
      );
    }

    // =========================================================================
    // CAPTURE OLD VALUES (for hooks, audit, and system protection)
    // Single fetch used by: system protection check, beforeChange hooks,
    // afterChange hooks, and audit old-vs-new comparison
    // =========================================================================
    const oldRecord = await this.findById(entityName, safeId, {
      client: options.client,
    });
    if (!oldRecord) {
      return null; // Record doesn't exist
    }

    // =========================================================================
    // SYSTEM PROTECTION CHECK (against existing record)
    // =========================================================================
    if (systemProtected) {
      // Check if attempting to modify system-protected immutable fields
      const attemptedImmutable = (systemProtected.immutableFields || []).filter(
        (field) => filteredData[field] !== undefined,
      );

      if (attemptedImmutable.length > 0) {
        // Use protectedByField if specified, otherwise fall back to identityField
        const protectionField =
          systemProtected.protectedByField || identityField;
        const identityValue = oldRecord[protectionField];

        if (systemProtected.values.includes(identityValue)) {
          throw new AppError(
            `Cannot modify ${attemptedImmutable.join(', ')} on system ${entityName}: ${identityValue}`,
            403,
            ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS,
          );
        }
      }
    }

    // =========================================================================
    // EVALUATE BEFORE-CHANGE HOOKS (may block the update)
    // Hooks are defined in metadata.fields[fieldName].beforeChange
    // Skip if options.skipHooks is true (prevents recursive hook execution)
    // =========================================================================
    if (metadata.fields && !options.skipHooks) {
      for (const [fieldName, newValue] of Object.entries(filteredData)) {
        const fieldMeta = metadata.fields[fieldName];
        const hooks = fieldMeta?.beforeChange;
        if (hooks && hooks.length > 0) {
          const oldValue = oldRecord[fieldName];
          const hookResult = await evaluateBeforeHooks({
            hooks,
            oldValue,
            newValue,
            context: {
              entity: entityName,
              record: oldRecord,
              field: fieldName,
              user: options.user || options.auditContext?.userId,
            },
            operation: 'update',
          });

          if (!hookResult.allowed) {
            if (hookResult.requiresApproval) {
              throw new AppError(
                hookResult.approvalInfo?.description || 'Change requires approval',
                202,
                ERROR_CODES.APPROVAL_REQUIRED,
                { approvalInfo: hookResult.approvalInfo },
              );
            }
            throw new AppError(
              hookResult.blockReason || 'Change blocked by policy',
              403,
              ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS,
            );
          }
        }
      }
    }

    // Full param list = SET values (from buildUpdateClause) + the id; a fresh
    // array so buildUpdateClause's return is not mutated.
    const values = [...updateValues, safeId];

    // Row-scope the write by RLS (defense-in-depth): even if a caller reaches
    // update() without a route-level access pre-check, an out-of-scope row matches
    // zero rows and yields null (→ 404). Internal/system callers (no rlsContext)
    // are unaffected. We scope the UPDATE itself rather than the oldRecord fetch,
    // because hooks + audit require the full (unredacted) oldRecord.
    let whereClause = `${primaryKey} = $${values.length}`;
    if (rlsContext) {
      const rlsFilter = buildRLSFilter(
        rlsContext,
        metadata,
        rlsContext.operation || 'update',
        values.length + 1,
        allMetadata,
      );
      if (rlsFilter.clause) {
        whereClause += ` AND ${rlsFilter.clause}`;
        values.push(...rlsFilter.params);
      }
    }

    // Build parameterized UPDATE query
    const query = `
      UPDATE ${tableName}
      SET ${updates.join(', ')}
      WHERE ${whereClause}
      RETURNING ${primaryKey}
    `;

    logger.debug('GenericEntityService.update', {
      entity: entityName,
      table: tableName,
      id: safeId,
      fieldsUpdated: updates.length,
    });

    // Execute query (use the caller's transaction client when threaded, else the pool)
    const exec = options.client || db;
    const result = await exec.query(query, values);

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
    const updatedRecord = await this.findById(entityName, safeId, {
      client: options.client,
    });

    // =========================================================================
    // EVALUATE AFTER-CHANGE HOOKS (trigger actions, cannot block)
    // Hooks are defined in metadata.fields[fieldName].afterChange
    // Errors are logged but don't fail the request
    // Skip if options.skipHooks is true (prevents recursive hook execution)
    // =========================================================================
    if (metadata.fields && !options.skipHooks) {
      for (const [fieldName, newValue] of Object.entries(filteredData)) {
        const fieldMeta = metadata.fields[fieldName];
        const hooks = fieldMeta?.afterChange;
        if (hooks && hooks.length > 0) {
          const oldValue = oldRecord[fieldName];
          // Only evaluate if value actually changed
          if (oldValue !== newValue) {
            await evaluateAfterHooks({
              hooks,
              oldValue,
              newValue,
              context: {
                entity: entityName,
                record: updatedRecord,
                field: fieldName,
                user: options.user || options.auditContext?.userId,
              },
              operation: 'update',
            });
          }
        }
      }
    }

    // Log audit event (blocking to ensure audit is written before response)
    await logEntityAuditIfEnabled(
      'update',
      entityName,
      updatedRecord,
      options.auditContext,
      oldRecord,
    );

    // Redact non-readable fields for the caller's role (ADR-011 output boundary).
    // Applied AFTER hooks + audit, which require the full updated record.
    return this._redactForContext(updatedRecord, metadata, rlsContext);
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
   * @param {Object} [options.rlsContext] - ADR-011 RLS context; row-scopes the delete so a caller cannot delete rows outside their access scope (out-of-scope → null → 404). Omit for internal/system callers (no filtering).
   * @param {Object} [options.client] - Optional pg client to run the delete on a caller's open transaction (batch); when present, the caller owns BEGIN/COMMIT/ROLLBACK and release, and this method does not manage its own transaction. Defaults to the pool.
   * @returns {Promise<Object|null>} Deleted entity, or null if not found or not authorized by RLS
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
    const { rlsContext = null, client: externalClient = null } = options || {};

    // Get metadata (throws if invalid entityName)
    const metadata = this.requireEntityMetadata(entityName);

    const { tableName, primaryKey, identityField, systemProtected } = metadata;

    // Validate and coerce ID (throws on invalid)
    // silent: true - IDs from controllers are strings, coercion is expected
    const safeId = toSafeId(id);

    // =========================================================================
    // SYSTEM PROTECTION CHECK (before any DB operation)
    // =========================================================================
    if (systemProtected?.preventDelete) {
      // Need to fetch record to check if it's protected
      const record = await this.findById(entityName, safeId, {
        client: externalClient,
      });

      if (record) {
        // Use protectedByField if specified, otherwise fall back to identityField
        const protectionField =
          systemProtected.protectedByField || identityField;
        const identityValue = record[protectionField];

        if (systemProtected.values.includes(identityValue)) {
          throw new AppError(
            `Cannot delete system ${entityName}: ${identityValue}`,
            403,
            ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS,
          );
        }
      }
    }

    // Transaction handling: when a caller threads their own client (batch), run
    // on it and let the caller own BEGIN/COMMIT/ROLLBACK + release. Otherwise
    // open and manage our own transaction for cascade + delete atomicity.
    const ownTransaction = !externalClient;
    const client = externalClient || (await db.getClient());

    try {
      if (ownTransaction) {
        await client.query('BEGIN');
      }

      // Check the record exists AND is within the caller's RLS scope.
      // Applying RLS here (operation 'delete') prevents deleting rows outside the
      // caller's access scope: an out-of-scope row matches zero rows and returns
      // null (surfaced as 404), mirroring how reads hide unauthorized rows.
      // Internal/system callers (no rlsContext) are unaffected — no clause added.
      const checkClauses = [`${primaryKey} = $1`];
      const checkParams = [safeId];

      if (rlsContext) {
        const rlsFilter = buildRLSFilter(
          rlsContext,
          metadata,
          rlsContext.operation || 'delete',
          checkParams.length + 1,
          allMetadata,
        );
        if (rlsFilter.clause) {
          checkClauses.push(rlsFilter.clause);
          checkParams.push(...rlsFilter.params);
        }
      }

      const checkQuery = `SELECT * FROM ${tableName} WHERE ${checkClauses.join(' AND ')}`;
      const checkResult = await client.query(checkQuery, checkParams);

      if (checkResult.rows.length === 0) {
        if (ownTransaction) {
          await client.query('ROLLBACK');
        }
        return null;
      }

      // Record fetched for audit logging
      const recordBeforeDelete = checkResult.rows[0];

      // Cascade delete dependents (metadata-driven)
      const cascadeResult = await cascadeDeleteDependents(
        client,
        metadata,
        safeId,
      );

      // Delete the entity itself
      const deleteQuery = `DELETE FROM ${tableName} WHERE ${primaryKey} = $1 RETURNING *`;
      const deleteResult = await client.query(deleteQuery, [safeId]);

      if (ownTransaction) {
        await client.query('COMMIT');
      }

      logger.info(`${entityName} deleted`, {
        id: safeId,
        cascadedDependents: cascadeResult.totalDeleted,
      });

      // Strip auth identifiers from response
      const filteredResult = stripAuthIdentifiers(deleteResult.rows[0], metadata);
      const filteredOldValues = stripAuthIdentifiers(recordBeforeDelete, metadata);

      // Log audit event (blocking to ensure audit is written before response)
      await logEntityAuditIfEnabled(
        'delete',
        entityName,
        filteredResult,
        options.auditContext,
        filteredOldValues,
      );

      return filteredResult;
    } catch (error) {
      if (ownTransaction) {
        await client.query('ROLLBACK');
      }

      logger.error(`Error deleting ${entityName}`, {
        error: error.message,
        id: safeId,
      });

      throw error;
    } finally {
      if (ownTransaction) {
        client.release();
      }
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
   * @param {Object} [options.rlsContext] - RLS context for access checks on update/delete
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
    // Validate entityName early (throws if invalid); the delegated
    // create/update/delete calls fetch metadata themselves.
    this.requireEntityMetadata(entityName);

    // Validate operations array
    if (!Array.isArray(operations) || operations.length === 0) {
      throw new AppError(
        'Operations must be a non-empty array',
        400,
        ERROR_CODES.VALIDATION_FAILED,
      );
    }

    // Validate each operation structure before starting transaction
    const validOperations = ['create', 'update', 'delete'];
    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];

      if (!op || typeof op !== 'object') {
        throw new AppError(
          `Operation at index ${i} must be an object`,
          400,
          ERROR_CODES.VALIDATION_FAILED,
        );
      }

      if (!validOperations.includes(op.operation)) {
        throw new AppError(
          `Invalid operation '${op.operation}' at index ${i}. Valid: ${validOperations.join(', ')}`,
          400,
          ERROR_CODES.VALIDATION_FAILED,
        );
      }

      if ((op.operation === 'update' || op.operation === 'delete') && !op.id) {
        throw new AppError(
          `Operation '${op.operation}' at index ${i} requires an id`,
          400,
          ERROR_CODES.VALIDATION_FAILED,
        );
      }

      if (
        (op.operation === 'create' || op.operation === 'update') &&
        !op.data
      ) {
        throw new AppError(
          `Operation '${op.operation}' at index ${i} requires data`,
          400,
          ERROR_CODES.VALIDATION_FAILED,
        );
      }
    }

    const { continueOnError = false, auditContext, rlsContext } = options;

    // ─────────────────────────────────────────────────────────────────────────
    // RLS PRE-VALIDATION: Verify access to all records before starting transaction
    // This matches individual route pattern: check access before mutation
    // Security boundary: fail-fast if user attempts unauthorized modification
    // ─────────────────────────────────────────────────────────────────────────
    if (rlsContext) {
      const accessChecks = operations
        .map((op, index) => ({ op, index }))
        .filter(
          ({ op }) => op.operation === 'update' || op.operation === 'delete',
        );

      for (const { op, index } of accessChecks) {
        const safeId = toSafeId(op.id);
        const existing = await this.findById(entityName, safeId, { rlsContext });

        if (!existing) {
          // Record not found OR user lacks RLS access - same behavior as individual routes
          throw new AppError(
            `Access denied or record not found at operation ${index}: ${op.operation} on id ${safeId}`,
            404,
            ERROR_CODES.RESOURCE_NOT_FOUND,
          );
        }
      }
    }

    const results = [];
    const errors = [];
    const stats = { created: 0, updated: 0, deleted: 0, failed: 0 };

    // Get a client for transaction
    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      for (let i = 0; i < operations.length; i++) {
        const op = operations[i];

        // Per-op SAVEPOINT under continueOnError lets a failed op undo its own
        // partial writes (e.g. a delete whose cascade already ran) without
        // discarding earlier successful ops; the batch still COMMITs survivors.
        const savepoint = continueOnError ? `op_${i}` : null;
        if (savepoint) {
          await client.query(`SAVEPOINT ${savepoint}`);
        }

        try {
          // Delegate to the canonical single-entity methods ON this transaction.
          // skipHooks keeps batch hook-free (S6a); create/update/delete already
          // sanitize, derive, generate identifiers, enforce system-protection,
          // audit, and redact for rlsContext.
          const delegateOptions = {
            client,
            skipHooks: true,
            rlsContext,
            auditContext,
          };
          let result;

          switch (op.operation) {
            case 'create':
              result = await this.create(entityName, op.data, delegateOptions);
              stats.created++;
              break;

            case 'update':
              result = await this.update(
                entityName,
                op.id,
                op.data,
                delegateOptions,
              );
              if (result === null) {
                throw new AppError(
                  `Record not found: ${op.id}`,
                  404,
                  ERROR_CODES.RESOURCE_NOT_FOUND,
                );
              }
              stats.updated++;
              break;

            case 'delete':
              result = await this.delete(entityName, op.id, delegateOptions);
              if (result === null) {
                throw new AppError(
                  `Record not found: ${op.id}`,
                  404,
                  ERROR_CODES.RESOURCE_NOT_FOUND,
                );
              }
              stats.deleted++;
              break;
          }

          // Delegated create/update/delete already redacted for rlsContext.
          results.push({
            index: i,
            operation: op.operation,
            success: true,
            result,
          });

          if (savepoint) {
            await client.query(`RELEASE SAVEPOINT ${savepoint}`);
          }
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

          if (continueOnError) {
            // Undo just this op's partial writes; keep earlier successful ops.
            if (savepoint) {
              await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
            }
          } else {
            // Roll the whole transaction back and return immediately.
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
module.exports.partitionFields = partitionFields;
