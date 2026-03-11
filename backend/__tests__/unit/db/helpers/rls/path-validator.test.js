/**
 * RLS Path Validator Unit Tests
 *
 * Tests for startup rule validation.
 */

const {
  validateAllRules,
  validateRule,
  validateAccess,
  validateJunctionAccess,
  validateParentAccess,
  validatePolymorphicConfig,
  countHops,
  detectCycle,
  detectParentCycle,
  countParentHops,
} = require('../../../../../db/helpers/rls/path-validator');
const { RLS_ENGINE } = require('../../../../../config/constants');

describe('RLS Path Validator', () => {
  describe('validateAllRules', () => {
    it('should return valid for empty metadata', () => {
      const result = validateAllRules({});

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should return valid for metadata without rlsRules', () => {
      const metadata = {
        users: { tableName: 'users' },
        orders: { tableName: 'orders' },
      };
      const result = validateAllRules(metadata);

      expect(result.valid).toBe(true);
    });

    it('should return valid for correct rules', () => {
      const metadata = {
        users: {
          rlsRules: [
            { id: 'admin-all', roles: ['admin'], operations: '*', access: null },
            { id: 'owner-read', roles: ['customer'], operations: ['read'], access: { type: 'direct', field: 'user_id' } },
          ],
        },
      };
      const result = validateAllRules(metadata);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should return errors for exceeding MAX_RULES_PER_ENTITY', () => {
      const rules = [];
      for (let i = 0; i <= RLS_ENGINE.MAX_RULES_PER_ENTITY; i++) {
        rules.push({ id: `rule_${i}`, roles: '*', operations: '*', access: null });
      }

      const metadata = { users: { rlsRules: rules } };
      const result = validateAllRules(metadata);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('exceeds max rules'))).toBe(true);
    });

    it('should accumulate errors from multiple entities', () => {
      const metadata = {
        users: { rlsRules: [{ roles: '*', operations: '*' }] }, // missing id
        orders: { rlsRules: [{ id: 'x', operations: '*' }] }, // missing roles
      };
      const result = validateAllRules(metadata);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('validateRule', () => {
    const entityType = 'test_entity';
    const allMetadata = {};

    it('should return error for missing id', () => {
      const rule = { roles: '*', operations: '*', access: null };
      const errors = validateRule(rule, entityType, allMetadata);

      expect(errors.some(e => e.includes('missing id'))).toBe(true);
    });

    it('should return error for missing roles', () => {
      const rule = { id: 'test', operations: '*', access: null };
      const errors = validateRule(rule, entityType, allMetadata);

      expect(errors.some(e => e.includes('missing roles'))).toBe(true);
    });

    it('should return error for missing operations', () => {
      const rule = { id: 'test', roles: '*', access: null };
      const errors = validateRule(rule, entityType, allMetadata);

      expect(errors.some(e => e.includes('missing operations'))).toBe(true);
    });

    it('should return error for invalid roles type', () => {
      const rule = { id: 'test', roles: 123, operations: '*', access: null };
      const errors = validateRule(rule, entityType, allMetadata);

      expect(errors.some(e => e.includes('roles must be string or array'))).toBe(true);
    });

    it('should return error for invalid operations type', () => {
      const rule = { id: 'test', roles: '*', operations: {}, access: null };
      const errors = validateRule(rule, entityType, allMetadata);

      expect(errors.some(e => e.includes('operations must be string or array'))).toBe(true);
    });

    it('should accept valid rule with null access', () => {
      const rule = { id: 'test', roles: ['admin'], operations: ['read'], access: null };
      const errors = validateRule(rule, entityType, allMetadata);

      expect(errors).toEqual([]);
    });

    it('should accept valid rule with direct access', () => {
      const rule = {
        id: 'test',
        roles: 'customer',
        operations: 'read',
        access: { type: 'direct', field: 'user_id' },
      };
      const errors = validateRule(rule, entityType, allMetadata);

      expect(errors).toEqual([]);
    });
  });

  describe('validateAccess', () => {
    const prefix = 'test/rule';
    const allMetadata = {};

    it('should return error for non-object access', () => {
      const errors = validateAccess('invalid', prefix, allMetadata);
      expect(errors.some(e => e.includes('access must be object or null'))).toBe(true);
    });

    it('should return error for missing type', () => {
      const errors = validateAccess({}, prefix, allMetadata);
      expect(errors.some(e => e.includes('access missing type'))).toBe(true);
    });

    it('should return error for invalid type', () => {
      const errors = validateAccess({ type: 'unknown' }, prefix, allMetadata);
      expect(errors.some(e => e.includes('unknown access type'))).toBe(true);
      expect(errors.some(e => e.includes('valid:'))).toBe(true);
    });

    it('should return error for parent access without foreignKey', () => {
      const errors = validateAccess({ type: 'parent' }, prefix, allMetadata);
      expect(errors.some(e => e.includes('parent access missing foreignKey'))).toBe(true);
    });

    it('should accept valid parent access with foreignKey', () => {
      const errors = validateAccess({ type: 'parent', foreignKey: 'unit_id', parentEntity: 'unit' }, prefix, {
        unit: { tableName: 'units', rlsRules: [] }
      });
      expect(errors).toEqual([]);
    });

    it('should return error for direct access without field', () => {
      const errors = validateAccess({ type: 'direct' }, prefix, allMetadata);
      expect(errors.some(e => e.includes('direct access missing field'))).toBe(true);
    });

    it('should return error for invalid direct field name', () => {
      const errors = validateAccess({ type: 'direct', field: 'DROP TABLE' }, prefix, allMetadata);
      expect(errors.some(e => e.includes('invalid direct access field'))).toBe(true);
    });

    it('should accept valid direct access', () => {
      const errors = validateAccess({ type: 'direct', field: 'user_id' }, prefix, allMetadata);
      expect(errors).toEqual([]);
    });

    it('should delegate junction validation', () => {
      const errors = validateAccess({ type: 'junction' }, prefix, allMetadata);
      expect(errors.some(e => e.includes('junction'))).toBe(true);
    });
  });

  describe('validateJunctionAccess', () => {
    const prefix = 'test/rule';

    it('should return error for missing junction config', () => {
      const errors = validateJunctionAccess({ type: 'junction' }, prefix);
      expect(errors.some(e => e.includes('missing junction config'))).toBe(true);
    });

    it('should return error for missing table', () => {
      const access = { type: 'junction', junction: { localKey: 'id', foreignKey: 'ref_id' } };
      const errors = validateJunctionAccess(access, prefix);
      expect(errors.some(e => e.includes('junction missing table'))).toBe(true);
    });

    it('should return error for missing localKey', () => {
      const access = { type: 'junction', junction: { table: 'test', foreignKey: 'ref_id' } };
      const errors = validateJunctionAccess(access, prefix);
      expect(errors.some(e => e.includes('junction missing localKey'))).toBe(true);
    });

    it('should return error for missing foreignKey', () => {
      const access = { type: 'junction', junction: { table: 'test', localKey: 'id' } };
      const errors = validateJunctionAccess(access, prefix);
      expect(errors.some(e => e.includes('junction missing foreignKey'))).toBe(true);
    });

    it('should return error for invalid table name', () => {
      const access = {
        type: 'junction',
        junction: { table: 'DROP TABLE users', localKey: 'id', foreignKey: 'ref_id' },
      };
      const errors = validateJunctionAccess(access, prefix);
      expect(errors.some(e => e.includes('invalid junction table'))).toBe(true);
    });

    it('should return error for exceeding MAX_FILTER_CONDITIONS', () => {
      const filter = {};
      for (let i = 0; i <= RLS_ENGINE.MAX_FILTER_CONDITIONS; i++) {
        filter[`field_${i}`] = i;
      }

      const access = {
        type: 'junction',
        junction: { table: 'test', localKey: 'id', foreignKey: 'ref_id', filter },
      };
      const errors = validateJunctionAccess(access, prefix);
      expect(errors.some(e => e.includes(`exceeds ${RLS_ENGINE.MAX_FILTER_CONDITIONS}`))).toBe(true);
    });

    it('should return error for invalid filter field name', () => {
      const access = {
        type: 'junction',
        junction: {
          table: 'test',
          localKey: 'id',
          foreignKey: 'ref_id',
          filter: { 'invalid-field': 'value' },
        },
      };
      const errors = validateJunctionAccess(access, prefix);
      expect(errors.some(e => e.includes('invalid filter field'))).toBe(true);
    });

    it('should accept valid junction access', () => {
      const access = {
        type: 'junction',
        junction: {
          table: 'customer_units',
          localKey: 'id',
          foreignKey: 'unit_id',
          filter: { customer_profile_id: 'customerProfileId' },
        },
      };
      const errors = validateJunctionAccess(access, prefix);
      expect(errors).toEqual([]);
    });
  });

  describe('countHops', () => {
    it('should return 1 for single hop', () => {
      const junction = { table: 'a', localKey: 'id', foreignKey: 'a_id' };
      expect(countHops(junction)).toBe(1);
    });

    it('should return 2 for two hops', () => {
      const junction = {
        table: 'a',
        localKey: 'id',
        foreignKey: 'a_id',
        through: { table: 'b', localKey: 'id', foreignKey: 'b_id' },
      };
      expect(countHops(junction)).toBe(2);
    });

    it('should count multiple hops correctly', () => {
      const junction = {
        table: 'a',
        through: {
          table: 'b',
          through: {
            table: 'c',
            through: {
              table: 'd',
            },
          },
        },
      };
      expect(countHops(junction)).toBe(4);
    });
  });

  describe('detectCycle', () => {
    it('should return null for no cycle', () => {
      const junction = {
        table: 'a',
        through: { table: 'b', through: { table: 'c' } },
      };
      expect(detectCycle(junction)).toBeNull();
    });

    it('should detect simple cycle', () => {
      const junction = {
        table: 'a',
        through: { table: 'b', through: { table: 'a' } },
      };
      const error = detectCycle(junction);
      expect(error).toContain('cycle detected');
      expect(error).toContain("'a'");
    });

    it('should detect longer cycle', () => {
      const junction = {
        table: 'a',
        through: {
          table: 'b',
          through: {
            table: 'c',
            through: { table: 'b' },
          },
        },
      };
      const error = detectCycle(junction);
      expect(error).toContain('cycle detected');
      expect(error).toContain("'b'");
    });
  });

  describe('hop limit validation', () => {
    it('should return error when exceeding MAX_HOPS', () => {
      // Build a chain longer than MAX_HOPS
      let junction = { table: 'last', localKey: 'id', foreignKey: 'ref' };
      for (let i = 0; i < RLS_ENGINE.MAX_HOPS; i++) {
        junction = { table: `hop_${i}`, localKey: 'id', foreignKey: 'ref', through: junction };
      }

      const access = { type: 'junction', junction };
      const errors = validateJunctionAccess(access, 'test');
      expect(errors.some(e => e.includes(`exceeds ${RLS_ENGINE.MAX_HOPS}`))).toBe(true);
    });

    it('should accept exactly MAX_HOPS', () => {
      // Build a chain of exactly MAX_HOPS
      let junction = { table: 'last', localKey: 'id', foreignKey: 'ref' };
      for (let i = 1; i < RLS_ENGINE.MAX_HOPS; i++) {
        junction = { table: `hop_${i}`, localKey: 'id', foreignKey: 'ref', through: junction };
      }

      const access = { type: 'junction', junction };
      const errors = validateJunctionAccess(access, 'test');
      expect(errors.some(e => e.includes('exceeds'))).toBe(false);
    });
  });

  describe('validateParentAccess', () => {
    const prefix = 'test/rule1';

    it('should return error for missing foreignKey', () => {
      const errors = validateParentAccess({ type: 'parent' }, prefix, {});
      expect(errors.some(e => e.includes('parent access missing foreignKey'))).toBe(true);
    });

    it('should return error for invalid foreignKey', () => {
      const errors = validateParentAccess({ type: 'parent', foreignKey: 'DROP TABLE' }, prefix, {});
      expect(errors.some(e => e.includes('invalid parent foreignKey'))).toBe(true);
    });

    it('should return error for non-string parentEntity', () => {
      const errors = validateParentAccess({ type: 'parent', foreignKey: 'unit_id', parentEntity: 123 }, prefix, {});
      expect(errors.some(e => e.includes('parentEntity must be a string'))).toBe(true);
    });

    it('should return error for parentEntity not found in metadata', () => {
      const errors = validateParentAccess(
        { type: 'parent', foreignKey: 'unit_id', parentEntity: 'nonexistent' },
        prefix,
        { unit: { tableName: 'units' } }
      );
      expect(errors.some(e => e.includes("parentEntity 'nonexistent' not found"))).toBe(true);
    });

    it('should accept valid parent access with existing parentEntity', () => {
      const errors = validateParentAccess(
        { type: 'parent', foreignKey: 'unit_id', parentEntity: 'unit' },
        prefix,
        { unit: { tableName: 'units' } }
      );
      expect(errors).toEqual([]);
    });

    it('should return error when both parentEntity and polymorphic specified', () => {
      const errors = validateParentAccess(
        {
          type: 'parent',
          foreignKey: 'entity_id',
          parentEntity: 'unit',
          polymorphic: { typeColumn: 'entity_type' },
        },
        prefix,
        { unit: { tableName: 'units' } }
      );
      expect(errors.some(e => e.includes('cannot have both parentEntity and polymorphic'))).toBe(true);
    });

    it('should return error when neither parentEntity nor polymorphic specified', () => {
      const errors = validateParentAccess(
        { type: 'parent', foreignKey: 'entity_id' },
        prefix,
        {}
      );
      expect(errors.some(e => e.includes('requires parentEntity or polymorphic config'))).toBe(true);
    });

    it('should accept valid polymorphic parent access', () => {
      const errors = validateParentAccess(
        {
          type: 'parent',
          foreignKey: 'entity_id',
          polymorphic: { typeColumn: 'entity_type' },
        },
        prefix,
        {}
      );
      expect(errors).toEqual([]);
    });

    it('should return error for polymorphic missing typeColumn', () => {
      const errors = validateParentAccess(
        {
          type: 'parent',
          foreignKey: 'entity_id',
          polymorphic: {},
        },
        prefix,
        {}
      );
      expect(errors.some(e => e.includes('polymorphic missing typeColumn'))).toBe(true);
    });

    it('should return error for polymorphic invalid typeColumn', () => {
      const errors = validateParentAccess(
        {
          type: 'parent',
          foreignKey: 'entity_id',
          polymorphic: { typeColumn: 'DROP TABLE' },
        },
        prefix,
        {}
      );
      expect(errors.some(e => e.includes('invalid polymorphic typeColumn'))).toBe(true);
    });

    it('should return error for polymorphic non-array allowedTypes', () => {
      const errors = validateParentAccess(
        {
          type: 'parent',
          foreignKey: 'entity_id',
          polymorphic: { typeColumn: 'entity_type', allowedTypes: 'work_order' },
        },
        prefix,
        {}
      );
      expect(errors.some(e => e.includes('allowedTypes must be an array'))).toBe(true);
    });

    it('should return error for polymorphic empty allowedTypes', () => {
      const errors = validateParentAccess(
        {
          type: 'parent',
          foreignKey: 'entity_id',
          polymorphic: { typeColumn: 'entity_type', allowedTypes: [] },
        },
        prefix,
        {}
      );
      expect(errors.some(e => e.includes('allowedTypes cannot be empty'))).toBe(true);
    });

    it('should return error for polymorphic allowedTypes with invalid entity', () => {
      const errors = validateParentAccess(
        {
          type: 'parent',
          foreignKey: 'entity_id',
          polymorphic: {
            typeColumn: 'entity_type',
            allowedTypes: ['work_order', 'nonexistent'],
          },
        },
        prefix,
        { work_order: { tableName: 'work_orders' } }
      );
      expect(errors.some(e => e.includes("allowedTypes entity 'nonexistent' not found"))).toBe(true);
    });

    it('should accept valid polymorphic with allowedTypes', () => {
      const errors = validateParentAccess(
        {
          type: 'parent',
          foreignKey: 'entity_id',
          polymorphic: {
            typeColumn: 'entity_type',
            allowedTypes: ['work_order', 'asset'],
          },
        },
        prefix,
        {
          work_order: { tableName: 'work_orders' },
          asset: { tableName: 'assets' },
        }
      );
      expect(errors).toEqual([]);
    });
  });

  describe('detectParentCycle', () => {
    it('should return null for entity without parent rules', () => {
      const metadata = {
        asset: { rlsRules: [{ id: 'rule1', access: { type: 'direct', field: 'user_id' } }] }
      };
      expect(detectParentCycle('asset', metadata)).toBeNull();
    });

    it('should return null for simple parent chain without cycle', () => {
      const metadata = {
        asset: {
          rlsRules: [{ id: 'rule1', access: { type: 'parent', foreignKey: 'unit_id', parentEntity: 'unit' } }]
        },
        unit: {
          rlsRules: [{ id: 'rule1', access: { type: 'direct', field: 'owner_id' } }]
        }
      };
      expect(detectParentCycle('asset', metadata)).toBeNull();
    });

    it('should detect simple parent cycle', () => {
      const metadata = {
        a: { rlsRules: [{ id: 'rule1', access: { type: 'parent', foreignKey: 'b_id', parentEntity: 'b' } }] },
        b: { rlsRules: [{ id: 'rule1', access: { type: 'parent', foreignKey: 'a_id', parentEntity: 'a' } }] }
      };
      const error = detectParentCycle('a', metadata);
      expect(error).toContain('parent cycle detected');
    });

    it('should detect longer parent cycle', () => {
      const metadata = {
        a: { rlsRules: [{ id: 'rule1', access: { type: 'parent', foreignKey: 'b_id', parentEntity: 'b' } }] },
        b: { rlsRules: [{ id: 'rule1', access: { type: 'parent', foreignKey: 'c_id', parentEntity: 'c' } }] },
        c: { rlsRules: [{ id: 'rule1', access: { type: 'parent', foreignKey: 'a_id', parentEntity: 'a' } }] }
      };
      const error = detectParentCycle('a', metadata);
      expect(error).toContain('parent cycle detected');
    });
  });

  describe('countParentHops', () => {
    it('should return 0 for entity without parent rules', () => {
      const metadata = {
        asset: { rlsRules: [{ id: 'rule1', access: { type: 'direct', field: 'user_id' } }] }
      };
      expect(countParentHops('asset', metadata)).toBe(0);
    });

    it('should return 1 for single parent hop', () => {
      const metadata = {
        asset: { rlsRules: [{ id: 'rule1', access: { type: 'parent', foreignKey: 'unit_id', parentEntity: 'unit' } }] },
        unit: { rlsRules: [{ id: 'rule1', access: { type: 'direct', field: 'owner_id' } }] }
      };
      expect(countParentHops('asset', metadata)).toBe(1);
    });

    it('should count multiple parent hops', () => {
      const metadata = {
        a: { rlsRules: [{ id: 'rule1', access: { type: 'parent', foreignKey: 'b_id', parentEntity: 'b' } }] },
        b: { rlsRules: [{ id: 'rule1', access: { type: 'parent', foreignKey: 'c_id', parentEntity: 'c' } }] },
        c: { rlsRules: [{ id: 'rule1', access: { type: 'direct', field: 'user_id' } }] }
      };
      expect(countParentHops('a', metadata)).toBe(2);
    });

    it('should return max hops when multiple parent rules exist', () => {
      const metadata = {
        a: {
          rlsRules: [
            { id: 'rule1', access: { type: 'parent', foreignKey: 'b_id', parentEntity: 'b' } },
            { id: 'rule2', access: { type: 'parent', foreignKey: 'c_id', parentEntity: 'c' } }
          ]
        },
        b: { rlsRules: [{ id: 'rule1', access: { type: 'direct', field: 'user_id' } }] },
        c: {
          rlsRules: [{ id: 'rule1', access: { type: 'parent', foreignKey: 'd_id', parentEntity: 'd' } }]
        },
        d: { rlsRules: [{ id: 'rule1', access: { type: 'direct', field: 'user_id' } }] }
      };
      expect(countParentHops('a', metadata)).toBe(2); // a -> c -> d = 2 hops (longer path)
    });
  });
});
