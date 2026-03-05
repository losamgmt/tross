/**
 * Entity Verifier - Unit Tests
 *
 * Tests the pure checkpoint functions used by entity-verifier.js.
 * Follows existing script test patterns (generate-schema, sync-entity-metadata).
 *
 * Test Strategy:
 * - Unit tests for pure checkpoint functions (context → result)
 * - No mocks needed - checkpoints operate on pre-loaded context
 * - Each checkpoint tested with valid, invalid, and edge case contexts
 */

const {
  // Core API
  runCheckpoints,
  formatResult,
  formatSummary,

  // Config
  CHECKPOINTS,
  CONFIG,
} = require('../../../../scripts/lib/entity-verifier');

// ============================================================================
// TEST FIXTURES - Mock contexts for pure function testing
// ============================================================================

/**
 * Create a valid context with all checks passing
 */
function createValidContext(entityName = 'customer') {
  return {
    entityName,
    metadataPath: `/backend/config/models/${entityName}-metadata.js`,
    metadata: {
      entityKey: entityName,
      tableName: `${entityName}s`,
      primaryKey: 'id',
      fields: { id: { type: 'integer' } },
      rlsResource: `${entityName}s`,
    },
    frontendJson: {
      [entityName]: {
        entityKey: entityName,
        fields: { id: {}, name: {}, status: {} },
      },
    },
    permissionsJson: {
      resources: {
        [`${entityName}s`]: { read: 'customer', create: 'admin' },
      },
    },
    dartContent: `enum ResourceType {\n  ${entityName}s,\n  users,\n}`,
    schemaContent: `CREATE TABLE ${entityName}s (\n  id SERIAL PRIMARY KEY\n);`,
    registryEntities: {
      all: [entityName, 'user', 'role'],
      genericCrud: [entityName, 'user'],
    },
  };
}

/**
 * Create an empty/invalid context
 */
function createEmptyContext(entityName = 'nonexistent') {
  return {
    entityName,
    metadataPath: null,
    metadata: null,
    frontendJson: null,
    permissionsJson: null,
    dartContent: null,
    schemaContent: null,
    registryEntities: { all: [], genericCrud: [] },
  };
}

// ============================================================================
// CONFIGURATION TESTS
// ============================================================================

describe('entity-verifier config', () => {
  describe('CONFIG', () => {
    it('defines required metadata fields', () => {
      expect(CONFIG.REQUIRED_FIELDS).toContain('entityKey');
      expect(CONFIG.REQUIRED_FIELDS).toContain('tableName');
      expect(CONFIG.REQUIRED_FIELDS).toContain('primaryKey');
      expect(CONFIG.REQUIRED_FIELDS).toContain('fields');
    });

    it('defines Dart enum exclusions', () => {
      expect(CONFIG.DART_EXCLUSIONS).toContain('file_attachment');
    });

    it('config is frozen (immutable)', () => {
      expect(Object.isFrozen(CONFIG)).toBe(true);
      expect(Object.isFrozen(CONFIG.REQUIRED_FIELDS)).toBe(true);
    });
  });

  describe('CHECKPOINTS', () => {
    it('defines 7 checkpoints', () => {
      expect(CHECKPOINTS).toHaveLength(7);
    });

    it('each checkpoint has name and fn', () => {
      for (const cp of CHECKPOINTS) {
        expect(cp).toHaveProperty('name');
        expect(cp).toHaveProperty('fn');
        expect(typeof cp.fn).toBe('function');
      }
    });

    it('checkpoints are in expected order', () => {
      const names = CHECKPOINTS.map((cp) => cp.name);
      expect(names[0]).toBe('Metadata file');
      expect(names[1]).toBe('Metadata fields');
      expect(names[6]).toBe('Entity registry');
    });

    it('CHECKPOINTS is frozen', () => {
      expect(Object.isFrozen(CHECKPOINTS)).toBe(true);
    });
  });
});

// ============================================================================
// CHECKPOINT FUNCTION TESTS (Pure Functions)
// ============================================================================

describe('entity-verifier checkpoints', () => {
  // Extract checkpoint functions for direct testing
  const getCheckpoint = (name) => CHECKPOINTS.find((cp) => cp.name === name).fn;

  describe('Metadata file checkpoint', () => {
    const check = getCheckpoint('Metadata file');

    it('passes when metadataPath exists', () => {
      const ctx = createValidContext();
      const result = check(ctx);
      expect(result.passed).toBe(true);
      expect(result.detail).toContain('metadata.js');
    });

    it('fails when metadataPath is null', () => {
      const ctx = createEmptyContext();
      const result = check(ctx);
      expect(result.passed).toBe(false);
      expect(result.detail).toContain('not found');
    });
  });

  describe('Metadata fields checkpoint', () => {
    const check = getCheckpoint('Metadata fields');

    it('passes when all required fields present', () => {
      const ctx = createValidContext();
      const result = check(ctx);
      expect(result.passed).toBe(true);
      expect(result.detail).toContain('required fields');
    });

    it('fails when metadata is null', () => {
      const ctx = createEmptyContext();
      const result = check(ctx);
      expect(result.passed).toBe(false);
      expect(result.detail).toBe('No metadata loaded');
    });

    it('fails when required field missing', () => {
      const ctx = createValidContext();
      delete ctx.metadata.fields;
      const result = check(ctx);
      expect(result.passed).toBe(false);
      expect(result.detail).toContain('fields');
    });

    it('reports all missing fields', () => {
      const ctx = createValidContext();
      ctx.metadata = { entityKey: 'test' }; // Only one field
      const result = check(ctx);
      expect(result.passed).toBe(false);
      expect(result.detail).toContain('tableName');
      expect(result.detail).toContain('primaryKey');
      expect(result.detail).toContain('fields');
    });
  });

  describe('Frontend JSON checkpoint', () => {
    const check = getCheckpoint('Frontend JSON');

    it('passes when entity in frontend JSON', () => {
      const ctx = createValidContext();
      const result = check(ctx);
      expect(result.passed).toBe(true);
      expect(result.detail).toContain('3 fields synced');
    });

    it('fails when frontendJson is null', () => {
      const ctx = createEmptyContext();
      const result = check(ctx);
      expect(result.passed).toBe(false);
      expect(result.detail).toContain('Cannot read');
    });

    it('fails when entity not in JSON', () => {
      const ctx = createValidContext();
      ctx.frontendJson = { other_entity: {} };
      const result = check(ctx);
      expect(result.passed).toBe(false);
      expect(result.detail).toContain('not in JSON');
    });

    it('handles entity with no fields gracefully', () => {
      const ctx = createValidContext();
      ctx.frontendJson.customer = {}; // No fields property
      const result = check(ctx);
      expect(result.passed).toBe(true);
      expect(result.detail).toContain('0 fields');
    });
  });

  describe('Permissions checkpoint', () => {
    const check = getCheckpoint('Permissions');

    it('passes when resource exists in permissions', () => {
      const ctx = createValidContext();
      const result = check(ctx);
      expect(result.passed).toBe(true);
      expect(result.detail).toContain('customers');
    });

    it('fails when permissionsJson is null', () => {
      const ctx = createEmptyContext();
      const result = check(ctx);
      expect(result.passed).toBe(false);
      expect(result.detail).toContain('Cannot read');
    });

    it('fails when resource not in permissions', () => {
      const ctx = createValidContext();
      ctx.permissionsJson = { resources: { other: {} } };
      const result = check(ctx);
      expect(result.passed).toBe(false);
      expect(result.detail).toContain('not in resources');
    });

    it('uses rlsResource from metadata if available', () => {
      const ctx = createValidContext();
      ctx.metadata.rlsResource = 'custom_resource';
      ctx.permissionsJson.resources.custom_resource = {};
      const result = check(ctx);
      expect(result.passed).toBe(true);
      expect(result.detail).toContain('custom_resource');
    });

    it('falls back to entityName + s when no rlsResource', () => {
      const ctx = createValidContext();
      delete ctx.metadata.rlsResource;
      const result = check(ctx);
      expect(result.passed).toBe(true);
      expect(result.detail).toContain('customers');
    });
  });

  describe('Dart enum checkpoint', () => {
    const check = getCheckpoint('Dart enum');

    it('passes when entity in Dart enum', () => {
      const ctx = createValidContext();
      const result = check(ctx);
      expect(result.passed).toBe(true);
      expect(result.detail).toContain('customers');
    });

    it('skips for excluded entities', () => {
      const ctx = createValidContext('file_attachment');
      const result = check(ctx);
      expect(result.skip).toBe(true);
      expect(result.detail).toContain('Excluded');
    });

    it('fails when dartContent is null', () => {
      const ctx = createValidContext();
      ctx.dartContent = null;
      const result = check(ctx);
      expect(result.passed).toBe(false);
      expect(result.detail).toContain('Cannot read');
    });

    it('fails when entity not in enum', () => {
      const ctx = createValidContext();
      ctx.dartContent = 'enum ResourceType { other, users }';
      const result = check(ctx);
      expect(result.passed).toBe(false);
      expect(result.detail).toContain('customers');
      expect(result.detail).toContain('not in enum');
    });
  });

  describe('Schema SQL checkpoint', () => {
    const check = getCheckpoint('Schema SQL');

    it('passes when CREATE TABLE exists', () => {
      const ctx = createValidContext();
      const result = check(ctx);
      expect(result.passed).toBe(true);
      expect(result.detail).toContain('CREATE TABLE customers');
    });

    it('fails when schemaContent is null', () => {
      const ctx = createEmptyContext();
      const result = check(ctx);
      expect(result.passed).toBe(false);
      expect(result.detail).toContain('Cannot read');
    });

    it('fails when table not in schema', () => {
      const ctx = createValidContext();
      ctx.schemaContent = 'CREATE TABLE other_table (id INT);';
      const result = check(ctx);
      expect(result.passed).toBe(false);
      expect(result.detail).toContain('not found');
    });

    it('matches table name case-insensitively', () => {
      const ctx = createValidContext();
      ctx.schemaContent = 'CREATE TABLE CUSTOMERS (id INT);';
      const result = check(ctx);
      expect(result.passed).toBe(true);
    });

    it('uses tableName from metadata', () => {
      const ctx = createValidContext();
      ctx.metadata.tableName = 'custom_table';
      ctx.schemaContent = 'CREATE TABLE custom_table (id INT);';
      const result = check(ctx);
      expect(result.passed).toBe(true);
      expect(result.detail).toContain('custom_table');
    });
  });

  describe('Entity registry checkpoint', () => {
    const check = getCheckpoint('Entity registry');

    it('passes when entity discovered as generic CRUD', () => {
      const ctx = createValidContext();
      const result = check(ctx);
      expect(result.passed).toBe(true);
      expect(result.detail).toBe('Generic CRUD');
    });

    it('passes when entity discovered as specialized', () => {
      const ctx = createValidContext('audit_log');
      ctx.registryEntities.all = ['audit_log', 'user'];
      ctx.registryEntities.genericCrud = ['user']; // audit_log is specialized
      const result = check(ctx);
      expect(result.passed).toBe(true);
      expect(result.detail).toBe('Specialized');
    });

    it('fails when registry not loaded', () => {
      const ctx = createEmptyContext();
      const result = check(ctx);
      expect(result.passed).toBe(false);
      expect(result.detail).toBe('Registry not loaded');
    });

    it('fails when entity not discovered', () => {
      const ctx = createValidContext('newentity');
      ctx.registryEntities.all = ['user', 'role'];
      const result = check(ctx);
      expect(result.passed).toBe(false);
      expect(result.detail).toBe('Not discovered');
    });
  });
});

// ============================================================================
// ORCHESTRATION TESTS
// ============================================================================

describe('entity-verifier orchestration', () => {
  describe('runCheckpoints', () => {
    it('runs all checkpoints and returns summary', () => {
      const ctx = createValidContext();
      const result = runCheckpoints(ctx);

      expect(result.entity).toBe('customer');
      expect(result.checks).toHaveLength(7);
      expect(result.passed).toBe(7);
      expect(result.failed).toBe(0);
    });

    it('counts failures correctly', () => {
      const ctx = createEmptyContext();
      const result = runCheckpoints(ctx);

      expect(result.failed).toBeGreaterThan(0);
      expect(result.passed + result.failed).toBeLessThanOrEqual(7);
    });

    it('handles skip status correctly', () => {
      const ctx = createValidContext('file_attachment');
      const result = runCheckpoints(ctx);

      const dartCheck = result.checks.find((c) => c.name === 'Dart enum');
      expect(dartCheck.status).toBe('skip');
    });

    it('preserves check order', () => {
      const ctx = createValidContext();
      const result = runCheckpoints(ctx);

      expect(result.checks[0].name).toBe('Metadata file');
      expect(result.checks[6].name).toBe('Entity registry');
    });
  });
});

// ============================================================================
// REPORT PHASE TESTS
// ============================================================================

describe('entity-verifier reporting', () => {
  describe('formatResult', () => {
    it('formats passing result with checkmarks', () => {
      const result = {
        entity: 'customer',
        checks: [{ name: 'Test', status: 'pass', detail: 'OK' }],
        passed: 1,
        failed: 0,
      };

      const output = formatResult(result);
      expect(output).toContain('[customer]');
      expect(output).toContain('✅');
      expect(output).toContain('1 checks passed');
    });

    it('formats failing result with X marks', () => {
      const result = {
        entity: 'customer',
        checks: [{ name: 'Test', status: 'fail', detail: 'Error' }],
        passed: 0,
        failed: 1,
      };

      const output = formatResult(result);
      expect(output).toContain('❌');
      expect(output).toContain('1 failed');
    });

    it('formats skipped checks with skip icon', () => {
      const result = {
        entity: 'file_attachment',
        checks: [{ name: 'Dart enum', status: 'skip', detail: 'Excluded' }],
        passed: 0,
        failed: 0,
      };

      const output = formatResult(result);
      expect(output).toContain('⏭️');
      expect(output).toContain('Excluded');
    });

    it('includes detail in parentheses', () => {
      const result = {
        entity: 'test',
        checks: [{ name: 'Check', status: 'pass', detail: 'Some detail' }],
        passed: 1,
        failed: 0,
      };

      const output = formatResult(result);
      expect(output).toContain('(Some detail)');
    });
  });

  describe('formatSummary', () => {
    it('formats summary for all passing', () => {
      const results = [
        { entity: 'a', failed: 0 },
        { entity: 'b', failed: 0 },
      ];

      const output = formatSummary(results);
      expect(output).toContain('2 entities OK');
      expect(output).toContain('0 with issues');
    });

    it('formats summary with failures', () => {
      const results = [
        { entity: 'a', failed: 0 },
        { entity: 'b', failed: 2 },
        { entity: 'c', failed: 1 },
      ];

      const output = formatSummary(results);
      expect(output).toContain('1 entities OK');
      expect(output).toContain('2 with issues');
    });

    it('includes separator lines', () => {
      const output = formatSummary([]);
      expect(output).toContain('═');
      expect(output).toContain('SUMMARY');
    });
  });
});
