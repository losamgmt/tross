/**
 * Entity Registry Validation Tests
 *
 * SRP: Validate that all entities have required metadata for testing.
 *
 * DRIFT PREVENTION: These tests fail if:
 * - A new entity is added without required metadata
 * - Existing entity metadata is corrupted
 * - Entity categories are misconfigured
 *
 * RUN EARLY: These tests should run before all other tests to fail fast.
 */

const {
  getAllEntityNames,
  getEntityMetadata,
  isBusinessEntity,
  getBusinessEntityNames,
  getSystemEntityNames,
  getEntitiesByCategory,
  getEntitiesWithFeature,
  validateEntityMetadata,
  assertValidMetadata,
  REQUIRED_FIELDS,
  RLS_REQUIRED_FIELDS,
} = require('../../factory/entity-registry');

describe('Entity Registry', () => {
  // ==========================================================================
  // DISCOVERY TESTS
  // ==========================================================================

  describe('Entity Discovery', () => {
    test('discovers all entities from config/models', () => {
      const entities = getAllEntityNames();

      // Should find all 12 entities (including system tables like audit_log)
      expect(entities).toContain('user');
      expect(entities).toContain('role');
      expect(entities).toContain('customer');
      expect(entities).toContain('technician');
      expect(entities).toContain('work_order');
      expect(entities).toContain('contract');
      expect(entities).toContain('invoice');
      expect(entities).toContain('inventory');
      expect(entities).toContain('preferences');
      expect(entities).toContain('saved_view');
      expect(entities).toContain('file_attachment');
      expect(entities).toContain('audit_log');

      expect(entities.length).toBe(12);
    });

    test('getEntityMetadata returns metadata with entityName added', () => {
      const meta = getEntityMetadata('customer');

      expect(meta.entityName).toBe('customer');
      expect(meta.tableName).toBe('customers');
      expect(meta.primaryKey).toBe('id');
    });

    test('getEntityMetadata throws for unknown entity', () => {
      expect(() => getEntityMetadata('nonexistent')).toThrow('Unknown entity: nonexistent');
    });
  });

  // ==========================================================================
  // VALIDATION TESTS
  // ==========================================================================

  describe('Metadata Validation', () => {
    test('all entities have required fields', () => {
      const errors = validateEntityMetadata();

      if (errors.length > 0) {
        // Provide helpful error message
        console.error('Metadata validation errors:');
        errors.forEach(err => console.error(`  - ${err}`));
      }

      expect(errors).toEqual([]);
    });

    test('assertValidMetadata does not throw when all valid', () => {
      expect(() => assertValidMetadata()).not.toThrow();
    });

    test.each(getAllEntityNames())('%s has tableName', (entityName) => {
      const meta = getEntityMetadata(entityName);
      expect(meta.tableName).toBeDefined();
      expect(typeof meta.tableName).toBe('string');
      expect(meta.tableName.length).toBeGreaterThan(0);
    });

    test.each(getAllEntityNames())('%s has primaryKey', (entityName) => {
      const meta = getEntityMetadata(entityName);
      expect(meta.primaryKey).toBeDefined();
      expect(typeof meta.primaryKey).toBe('string');
    });

    test.each(getAllEntityNames())('%s has requiredFields array', (entityName) => {
      const meta = getEntityMetadata(entityName);
      expect(meta.requiredFields).toBeDefined();
      expect(Array.isArray(meta.requiredFields)).toBe(true);
    });

    test.each(getAllEntityNames())('%s has identityField', (entityName) => {
      const meta = getEntityMetadata(entityName);
      expect(meta.identityField).toBeDefined();
      expect(typeof meta.identityField).toBe('string');
    });
  });

  // ==========================================================================
  // CATEGORIZATION TESTS
  // ==========================================================================

  describe('Entity Categorization', () => {
    test('identifies business entities correctly', () => {
      // These are business entities with full RLS
      expect(isBusinessEntity('user')).toBe(true);
      expect(isBusinessEntity('role')).toBe(true);
      expect(isBusinessEntity('customer')).toBe(true);
      expect(isBusinessEntity('technician')).toBe(true);
      expect(isBusinessEntity('work_order')).toBe(true);
      expect(isBusinessEntity('contract')).toBe(true);
      expect(isBusinessEntity('invoice')).toBe(true);
      expect(isBusinessEntity('inventory')).toBe(true);
    });

    test('identifies system entities correctly', () => {
      // These are system tables with limited/no RLS
      expect(isBusinessEntity('preferences')).toBe(true); // Has rlsResource
      expect(isBusinessEntity('saved_view')).toBe(true);  // Has rlsResource
      expect(isBusinessEntity('file_attachment')).toBe(false); // No rlsResource (polymorphic)
    });

    test('getBusinessEntityNames returns business entities', () => {
      const businessEntities = getBusinessEntityNames();

      expect(businessEntities).toContain('user');
      expect(businessEntities).toContain('customer');
      expect(businessEntities).toContain('work_order');
    });

    test('getSystemEntityNames returns system entities', () => {
      const systemEntities = getSystemEntityNames();

      // file_attachment is the only true system entity (no rlsResource)
      expect(systemEntities).toContain('file_attachment');
    });

    test('getEntitiesByCategory groups correctly', () => {
      const byCategory = getEntitiesByCategory();

      // HUMAN entities have first_name + last_name
      expect(byCategory.human).toContain('user');
      expect(byCategory.human).toContain('customer');
      expect(byCategory.human).toContain('technician');

      // SIMPLE entities have single 'name' field
      expect(byCategory.simple).toContain('role');
      expect(byCategory.simple).toContain('inventory');

      // COMPUTED entities have auto-generated identity
      expect(byCategory.computed).toContain('work_order');
      expect(byCategory.computed).toContain('contract');
      expect(byCategory.computed).toContain('invoice');

      // SYSTEM entities are system tables
      expect(byCategory.system).toContain('preferences');
      expect(byCategory.system).toContain('saved_view');
      expect(byCategory.system).toContain('file_attachment');
    });
  });

  // ==========================================================================
  // FEATURE DETECTION TESTS
  // ==========================================================================

  describe('Feature Detection', () => {
    test('getEntitiesWithFeature finds entities with foreignKeys', () => {
      const withFKs = getEntitiesWithFeature('foreignKeys');

      // These entities have foreign keys
      expect(withFKs).toContain('work_order');   // customer_id
      expect(withFKs).toContain('contract');     // customer_id
      expect(withFKs).toContain('invoice');      // customer_id
      expect(withFKs).toContain('user');         // role_id

      // These entities should NOT have foreign keys
      expect(withFKs).not.toContain('role');
      expect(withFKs).not.toContain('inventory');
    });

    test('getEntitiesWithFeature finds entities with searchableFields', () => {
      const withSearch = getEntitiesWithFeature('searchableFields');

      // Most entities should be searchable
      expect(withSearch.length).toBeGreaterThan(0);
    });

    test('getEntitiesWithFeature finds entities with unique identity', () => {
      const withUniqueIdentity = getEntitiesWithFeature('identityFieldUnique');

      // These should have unique identity fields
      expect(withUniqueIdentity).toContain('user');     // email
      expect(withUniqueIdentity).toContain('customer'); // email
      expect(withUniqueIdentity).toContain('role');     // name
    });
  });

  // ==========================================================================
  // RLS REQUIREMENTS TESTS
  // ==========================================================================

  describe('RLS Requirements', () => {
    test.each(getBusinessEntityNames())('%s has rlsResource (business entity)', (entityName) => {
      const meta = getEntityMetadata(entityName);
      expect(meta.rlsResource).toBeDefined();
      expect(typeof meta.rlsResource).toBe('string');
    });

    test.each(getBusinessEntityNames())('%s has fieldAccess (business entity)', (entityName) => {
      const meta = getEntityMetadata(entityName);
      expect(meta.fieldAccess).toBeDefined();
      expect(typeof meta.fieldAccess).toBe('object');
    });
  });

  // ==========================================================================
  // CONSISTENCY TESTS
  // ==========================================================================

  describe('Metadata Consistency', () => {
    test('all entities have consistent structure', () => {
      const entities = getAllEntityNames();

      for (const entityName of entities) {
        const meta = getEntityMetadata(entityName);

        // Basic structure checks
        expect(meta.tableName).toBeDefined();
        expect(meta.primaryKey).toBe('id'); // All use 'id' as PK

        // requiredFields should not include the primary key
        // Exception: preferences uses shared PK pattern where id = user_id
        if (entityName !== 'preferences') {
          expect(meta.requiredFields).not.toContain('id');
        }

        // requiredFields should not include timestamps
        expect(meta.requiredFields).not.toContain('created_at');
        expect(meta.requiredFields).not.toContain('updated_at');
      }
    });

    test('tableName follows naming convention', () => {
      const entities = getAllEntityNames();

      for (const entityName of entities) {
        const meta = getEntityMetadata(entityName);

        // Table names should be lowercase
        expect(meta.tableName).toBe(meta.tableName.toLowerCase());

        // Table names should use underscores (no camelCase)
        expect(meta.tableName).not.toMatch(/[A-Z]/);
      }
    });
  });
});
