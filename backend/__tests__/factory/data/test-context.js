/**
 * Test Context Builder
 *
 * SRP: Create the test context that scenarios receive.
 * Wraps supertest, db, factory, and auth helpers.
 *
 * ARCHITECTURE:
 * - FIXTURES: Shared entities created once per suite (beforeAll), reused by all tests
 * - FACTORY: Creates test-specific entities, auto-resolves FK deps using fixtures
 * - CLEANUP: Entities tracked and deleted in afterEach/afterAll
 *
 * This is the "ctx" object passed to every scenario function.
 */

const request = require('supertest');
const entityFactory = require('./entity-factory');
const allMetadata = require('../../../config/models');
const { createTestUser } = require('../../helpers/test-db');

/**
 * Build test context for a given app instance
 *
 * @param {Express} app - Express application
 * @param {Object} db - Database connection (pool)
 * @returns {Object} Test context for scenarios
 */
function buildTestContext(app, db) {
  const supertestRequest = request(app);

  // Cache for test users (created once per role)
  const testUsers = {};

  // ==========================================================================
  // FIXTURES: Shared entities for FK resolution
  // Created once per suite, reused by all tests needing these dependencies
  // ==========================================================================
  const fixtures = {};

  /**
   * Get or create a test user for a role
   * Uses real database users with valid JWT tokens
   */
  async function getTestUser(role) {
    if (!testUsers[role]) {
      testUsers[role] = await createTestUser(role);
    }
    return testUsers[role];
  }

  /**
   * Get auth header for a role
   * Lazily creates test users as needed
   */
  async function authHeader(role) {
    const { token } = await getTestUser(role);
    return { Authorization: `Bearer ${token}` };
  }

  /**
   * Get auth header for a specific user object
   */
  function authHeaderForUser(user) {
    // User object should already have a token from createTestUser
    if (user.token) {
      return { Authorization: `Bearer ${user.token}` };
    }
    // Fallback: generate token (shouldn't normally happen)
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'dev-secret-key';
    const token = jwt.sign(
      {
        iss: process.env.API_URL || 'https://api.trossapp.dev',
        sub: user.auth0_id || `auth0|${user.id}`,
        aud: process.env.API_URL || 'https://api.trossapp.dev',
        email: user.email,
        role: user.role || 'customer',
        provider: 'auth0',
        userId: user.id,
      },
      secret,
      { expiresIn: '1h' }
    );
    return { Authorization: `Bearer ${token}` };
  }

  // Created entities cache for cleanup
  const createdEntities = [];

  /**
   * Resolve FK for a field using fixtures or by creating a new entity
   * 
   * @param {string} fkField - FK field name (e.g., 'customer_id')
   * @param {Object} fkDef - FK definition from metadata
   * @returns {Promise<number>} The ID to use for the FK
   */
  async function resolveFkDependency(fkField, fkDef) {
    const parentEntityName = entityFactory.entityNameFromTable(fkDef.table);
    
    // Check if we have a fixture for this entity type
    if (fixtures[parentEntityName]) {
      return fixtures[parentEntityName].id;
    }
    
    // No fixture - create the entity (which may recursively create its own deps)
    const parent = await factory.create(parentEntityName);
    return parent.id;
  }

  // Factory methods that use the context's HTTP client
  const factory = {
    buildMinimal: entityFactory.buildMinimal,
    buildComplete: entityFactory.buildComplete,
    generateFieldValue: entityFactory.generateFieldValue,
    resetCounter: entityFactory.resetCounter,

    /**
     * Build minimal payload with FK dependencies resolved.
     * Uses fixtures when available, creates entities when not.
     */
    async buildMinimalWithFKs(entityName, overrides = {}) {
      const meta = entityFactory.getMetadata(entityName);
      const payload = entityFactory.buildMinimal(entityName, overrides);

      // Handle required FK dependencies - use fixtures or create parents
      for (const [fkField, fkDef] of Object.entries(meta.foreignKeys || {})) {
        if (!meta.requiredFields?.includes(fkField)) continue;
        if (payload[fkField] || overrides[fkField]) continue; // Already provided

        payload[fkField] = await resolveFkDependency(fkField, fkDef);
      }

      return { ...payload, ...overrides };
    },

    /**
     * Create entity via HTTP and track for cleanup.
     * Uses fixtures for FK dependencies when available.
     * 
     * For entities with entityPermissions.create: null (system-only creation),
     * this bypasses the API and inserts directly to the database.
     */
    async create(entityName, overrides = {}) {
      const meta = entityFactory.getMetadata(entityName);
      const payload = entityFactory.buildMinimal(entityName, overrides);

      // Handle required FK dependencies - use fixtures or create parents
      for (const [fkField, fkDef] of Object.entries(meta.foreignKeys || {})) {
        if (!meta.requiredFields?.includes(fkField)) continue;
        if (payload[fkField] || overrides[fkField]) continue; // Already provided

        payload[fkField] = await resolveFkDependency(fkField, fkDef);
      }

      // Apply overrides after FK resolution
      Object.assign(payload, overrides);

      // Check if API create is disabled (system-only entities like notifications)
      const createDisabled = meta.entityPermissions?.create === null;
      
      if (createDisabled) {
        // SYSTEMIC FIX: For entities with own_record_only RLS, set the owner field
        // to the admin test user's ID so the record is accessible via API.
        // This uses rlsFilterConfig.ownRecordField to find the owner field.
        const ownRecordField = meta.rlsFilterConfig?.ownRecordField;
        const isOwnRecordOnly = Object.values(meta.rlsPolicy || {}).some(
          policy => policy === 'own_record_only'
        );
        
        if (isOwnRecordOnly && ownRecordField && !overrides[ownRecordField]) {
          const { user } = await getTestUser('admin');
          payload[ownRecordField] = user.id;
        }
        
        // Insert directly to database (bypassing API)
        const fields = Object.keys(payload);
        const values = Object.values(payload);
        const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
        
        const insertQuery = `
          INSERT INTO ${meta.tableName} (${fields.join(', ')})
          VALUES (${placeholders})
          RETURNING *
        `;
        
        const result = await db.query(insertQuery, values);
        const entityData = result.rows[0];
        createdEntities.push({ table: meta.tableName, id: entityData.id });
        return entityData;
      }

      const auth = await authHeader('admin');
      const response = await supertestRequest
        .post(`/api/${meta.tableName}`)
        .set(auth)
        .send(payload);

      if (response.status !== 201) {
        throw new Error(
          `Failed to create ${entityName}: ${response.status} ${JSON.stringify(response.body)}`
        );
      }

      // Handle wrapped response (success: true, data: {...}) vs direct response
      const entityData = response.body.data || response.body;
      createdEntities.push({ table: meta.tableName, id: entityData.id });
      return entityData;
    },

    /**
     * Create entity with dependent records
     */
    async createWithDependents(entityName) {
      const meta = entityFactory.getMetadata(entityName);
      const entity = await this.create(entityName);
      const dependentRecords = [];

      for (const dep of meta.dependents || []) {
        let insertQuery;
        let values;

        if (dep.polymorphicType) {
          insertQuery = `INSERT INTO ${dep.table} (${dep.foreignKey}, ${dep.polymorphicType.column}, action) VALUES ($1, $2, 'test') RETURNING *`;
          values = [entity.id, dep.polymorphicType.value];
        } else {
          insertQuery = `INSERT INTO ${dep.table} (${dep.foreignKey}) VALUES ($1) RETURNING *`;
          values = [entity.id];
        }

        try {
          const result = await db.query(insertQuery, values);
          dependentRecords.push({ table: dep.table, id: result.rows[0].id });
        } catch (err) {
          // Some tables may need more fields - skip those
          console.warn(`Could not create dependent in ${dep.table}: ${err.message}`);
        }
      }

      return { entity, dependentRecords };
    },

    /**
     * Create entity with related records included
     */
    async createWithRelated(entityName) {
      const meta = entityFactory.getMetadata(entityName);
      return this.create(entityName);
    },

    /**
     * Create entity with owner for RLS testing
     */
    async createWithOwner(entityName) {
      const user = await this.create('user');
      const entity = await this.create(entityName);
      return { entity, user };
    },

    /**
     * Create parent with child for cascade testing
     */
    async createParentWithChild(parentEntityName) {
      const parent = await this.create(parentEntityName);

      // Find an entity that has FK to this parent
      const childEntities = Object.entries(allMetadata).filter(([_, meta]) => {
        return Object.values(meta.foreignKeys || {}).some(
          (fk) => fk.table === entityFactory.getMetadata(parentEntityName).tableName
        );
      });

      if (!childEntities.length) {
        return { parent, child: null };
      }

      const [childName, childMeta] = childEntities[0];
      const fkField = Object.entries(childMeta.foreignKeys).find(
        ([_, fk]) => fk.table === entityFactory.getMetadata(parentEntityName).tableName
      )[0];

      const child = await this.create(childName, { [fkField]: parent.id });
      return { parent, child };
    },

    /**
     * Create a shared fixture (call in beforeAll).
     * Fixtures are cached and reused across tests in the suite.
     * @param {string} entityName - The entity type to create
     * @param {Object} [overrides] - Optional field overrides
     * @returns {Promise<Object>} The created entity
     */
    async createFixture(entityName, overrides = {}) {
      const entity = await this.create(entityName, overrides);
      fixtures[entityName] = entity;
      return entity;
    },

    /**
     * Get a fixture by entity name.
     * Returns undefined if fixture doesn't exist.
     * @param {string} entityName - The entity type
     * @returns {Object|undefined} The fixture entity or undefined
     */
    getFixture(entityName) {
      return fixtures[entityName];
    },
  };

  // Helper to get entities that have FK to a given entity
  function entitiesWithFkTo(entityName) {
    const targetTable = entityFactory.getMetadata(entityName).tableName;
    return Object.entries(allMetadata)
      .filter(([_, meta]) => {
        return Object.values(meta.foreignKeys || {}).some(
          (fk) => fk.table === targetTable
        );
      })
      .map(([name, meta]) => ({ name, ...meta }));
  }

  return {
    request: supertestRequest,
    db,
    factory,
    fixtures, // Expose fixtures for direct access
    authHeader,
    authHeaderForUser,
    getTestUser,
    entityNameFromTable: entityFactory.entityNameFromTable,
    entitiesWithFkTo,
    createdEntities,

    // Jest bindings (will be bound by runner)
    it: null,
    expect: null,

    /**
     * Cleanup all created entities (call in afterEach)
     */
    async cleanup() {
      // Delete in reverse order to respect FK constraints
      for (const { table, id } of createdEntities.reverse()) {
        try {
          await db.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
        } catch (err) {
          // Ignore cleanup errors (may already be deleted)
        }
      }
      createdEntities.length = 0;
    },

    /**
     * Cleanup fixtures only (call in afterAll)
     * Clears fixture references but actual entities cleaned up in cleanup()
     */
    clearFixtures() {
      Object.keys(fixtures).forEach(key => delete fixtures[key]);
    },
  };
}

module.exports = { buildTestContext };
