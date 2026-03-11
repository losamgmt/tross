/**
 * RLS Clause Builder Unit Tests
 *
 * Tests for SQL clause generation.
 */

const {
  buildAccessClause,
  buildDirectClause,
  buildJunctionClause,
  buildParentClause,
  combineClausesOr,
  resolveFilterValues,
} = require('../../../../../db/helpers/rls/clause-builder');
const { RLS_ENGINE } = require('../../../../../config/constants');

describe('RLS Clause Builder', () => {
  // Use snake_case for profile IDs to match production context format
  const baseContext = {
    userId: 1,
    customer_profile_id: 100,
    technician_profile_id: 200,
  };

  describe('buildAccessClause', () => {
    it('should return TRUE for null access (full access)', () => {
      const result = buildAccessClause(null, baseContext, 't', 1, 0);

      expect(result.clause).toBe('TRUE');
      expect(result.params).toEqual([]);
      expect(result.nextOffset).toBe(1);
      expect(result.nextAliasCounter).toBe(0);
    });

    it('should delegate to buildDirectClause for direct type', () => {
      const access = { type: 'direct', field: 'user_id', value: 'userId' };
      const result = buildAccessClause(access, baseContext, 't', 1, 0);

      expect(result.clause).toBe('t.user_id = $1');
      expect(result.params).toEqual([1]);
    });

    it('should delegate to buildJunctionClause for junction type', () => {
      const access = {
        type: 'junction',
        junction: {
          table: 'user_roles',
          localKey: 'id',
          foreignKey: 'user_id',
          filter: { role: 'admin' },
        },
      };
      const result = buildAccessClause(access, baseContext, 't', 1, 0);

      expect(result.clause).toContain('EXISTS');
      expect(result.clause).toContain('user_roles');
    });

    it('should throw AppError for unknown access type', () => {
      const access = { type: 'unknown' };

      expect(() => buildAccessClause(access, baseContext, 't', 1, 0)).toThrow('Unknown RLS access type');
    });
  });

  describe('buildDirectClause', () => {
    it('should build parameterized condition with context value', () => {
      const access = { type: 'direct', field: 'customer_profile_id', value: 'customer_profile_id' };
      const result = buildDirectClause(access, baseContext, 't', 1, 0);

      expect(result.clause).toBe('t.customer_profile_id = $1');
      expect(result.params).toEqual([100]);
      expect(result.nextOffset).toBe(2);
    });

    it('should default to userId when value not specified', () => {
      const access = { type: 'direct', field: 'owner_id' };
      const result = buildDirectClause(access, baseContext, 't', 1, 0);

      expect(result.clause).toBe('t.owner_id = $1');
      expect(result.params).toEqual([1]); // userId
    });

    it('should throw AppError when field is missing', () => {
      const access = { type: 'direct' };

      expect(() => buildDirectClause(access, baseContext, 't', 1, 0)).toThrow('Direct access requires field');
    });

    it('should return FALSE when context value is undefined', () => {
      const access = { type: 'direct', field: 'owner_id', value: 'nonExistent' };
      const result = buildDirectClause(access, baseContext, 't', 1, 0);

      expect(result.clause).toBe('FALSE');
      expect(result.params).toEqual([]);
    });

    it('should return FALSE when context value is null', () => {
      const contextWithNull = { ...baseContext, customer_profile_id: null };
      const access = { type: 'direct', field: 'profile_id', value: 'customer_profile_id' };
      const result = buildDirectClause(access, contextWithNull, 't', 1, 0);

      expect(result.clause).toBe('FALSE');
    });

    it('should handle missing table alias', () => {
      const access = { type: 'direct', field: 'user_id', value: 'userId' };
      const result = buildDirectClause(access, baseContext, null, 1, 0);

      expect(result.clause).toBe('user_id = $1');
    });

    it('should respect parameter offset', () => {
      const access = { type: 'direct', field: 'user_id', value: 'userId' };
      const result = buildDirectClause(access, baseContext, 't', 5, 0);

      expect(result.clause).toBe('t.user_id = $5');
      expect(result.nextOffset).toBe(6);
    });

    it('should preserve aliasCounter (direct does not use aliases)', () => {
      const access = { type: 'direct', field: 'user_id', value: 'userId' };
      const result = buildDirectClause(access, baseContext, 't', 1, 3);

      expect(result.nextAliasCounter).toBe(3);
    });
  });

  describe('buildJunctionClause', () => {
    it('should build EXISTS subquery', () => {
      const access = {
        type: 'junction',
        junction: {
          table: 'customer_units',
          localKey: 'id',
          foreignKey: 'unit_id',
          filter: { customer_profile_id: 'customer_profile_id' },
        },
      };
      const result = buildJunctionClause(access, baseContext, 't', 1, 0);

      expect(result.clause).toContain('EXISTS');
      expect(result.clause).toContain('SELECT 1 FROM customer_units j0');
      expect(result.clause).toContain('j0.unit_id = t.id');
      expect(result.clause).toContain('j0.customer_profile_id = $1');
      expect(result.params).toEqual([100]);
    });

    it('should throw AppError when junction config is missing', () => {
      const access = { type: 'junction' };

      expect(() => buildJunctionClause(access, baseContext, 't', 1, 0)).toThrow('Junction access requires junction config');
    });

    it('should throw AppError when required fields are missing', () => {
      const access = { type: 'junction', junction: { table: 'test' } };

      expect(() => buildJunctionClause(access, baseContext, 't', 1, 0)).toThrow('Junction requires table, localKey, and foreignKey');
    });

    it('should generate unique aliases using counter', () => {
      const access = {
        type: 'junction',
        junction: {
          table: 'test_table',
          localKey: 'id',
          foreignKey: 'test_id',
        },
      };

      const result0 = buildJunctionClause(access, baseContext, 't', 1, 0);
      expect(result0.clause).toContain('test_table j0');
      expect(result0.nextAliasCounter).toBe(1);

      const result1 = buildJunctionClause(access, baseContext, 't', 1, 1);
      expect(result1.clause).toContain('test_table j1');
      expect(result1.nextAliasCounter).toBe(2);

      const result5 = buildJunctionClause(access, baseContext, 't', 1, 5);
      expect(result5.clause).toContain('test_table j5');
      expect(result5.nextAliasCounter).toBe(6);
    });

    it('should handle junction without filter', () => {
      const access = {
        type: 'junction',
        junction: {
          table: 'user_roles',
          localKey: 'id',
          foreignKey: 'user_id',
        },
      };
      const result = buildJunctionClause(access, baseContext, 't', 1, 0);

      expect(result.clause).toBe('EXISTS (SELECT 1 FROM user_roles j0 WHERE j0.user_id = t.id)');
      expect(result.params).toEqual([]);
    });

    it('should resolve context references in filter', () => {
      const access = {
        type: 'junction',
        junction: {
          table: 'assignments',
          localKey: 'id',
          foreignKey: 'task_id',
          filter: { technician_id: 'technician_profile_id' },
        },
      };
      const result = buildJunctionClause(access, baseContext, 't', 1, 0);

      expect(result.params).toEqual([200]); // technician_profile_id value
    });

    it('should handle missing table alias', () => {
      const access = {
        type: 'junction',
        junction: {
          table: 'test',
          localKey: 'id',
          foreignKey: 'ref_id',
        },
      };
      const result = buildJunctionClause(access, baseContext, null, 1, 0);

      expect(result.clause).toContain('j0.ref_id = id');
    });

    it('should build nested junction with through config', () => {
      // Property accessible via units that customer owns
      const access = {
        type: 'junction',
        junction: {
          table: 'units',
          localKey: 'id',
          foreignKey: 'property_id',
          through: {
            table: 'customer_units',
            localKey: 'id',
            foreignKey: 'unit_id',
            filter: { customer_id: 'customer_profile_id' },
          },
        },
      };
      const result = buildJunctionClause(access, baseContext, 't', 1, 0);

      // Should build nested EXISTS
      expect(result.clause).toContain('EXISTS (SELECT 1 FROM units j0');
      expect(result.clause).toContain('j0.property_id = t.id');
      expect(result.clause).toContain('EXISTS (SELECT 1 FROM customer_units j1');
      expect(result.clause).toContain('j1.unit_id = j0.id');
      expect(result.params).toEqual([100]); // customer_profile_id
      expect(result.nextAliasCounter).toBe(2);
    });

    it('should thread offset through nested junction', () => {
      const access = {
        type: 'junction',
        junction: {
          table: 'middle',
          localKey: 'id',
          foreignKey: 'parent_id',
          filter: { org_id: 'userId' },
          through: {
            table: 'leaf',
            localKey: 'id',
            foreignKey: 'middle_id',
            filter: { user_id: 'technician_profile_id' },
          },
        },
      };
      // Start at offset 3
      const result = buildJunctionClause(access, baseContext, 't', 3, 0);

      // First filter gets $3, second filter gets $4
      expect(result.clause).toContain('$3');
      expect(result.clause).toContain('$4');
      expect(result.params).toEqual([1, 200]); // userId, technician_profile_id
      expect(result.nextOffset).toBe(5);
    });
  });

  describe('combineClausesOr', () => {
    it('should return FALSE for empty array', () => {
      const result = combineClausesOr([]);

      expect(result.clause).toBe('FALSE');
      expect(result.params).toEqual([]);
    });

    it('should return single clause as-is', () => {
      const clauses = [{ clause: 't.x = $1', params: [1] }];
      const result = combineClausesOr(clauses);

      expect(result.clause).toBe('t.x = $1');
      expect(result.params).toEqual([1]);
    });

    it('should combine multiple clauses with OR', () => {
      const clauses = [
        { clause: 't.x = $1', params: [1] },
        { clause: 't.y = $2', params: [2] },
      ];
      const result = combineClausesOr(clauses);

      expect(result.clause).toBe('(t.x = $1) OR (t.y = $2)');
      expect(result.params).toEqual([1, 2]);
    });

    it('should filter out FALSE clauses', () => {
      const clauses = [
        { clause: 'FALSE', params: [] },
        { clause: 't.x = $1', params: [1] },
        { clause: 'FALSE', params: [] },
      ];
      const result = combineClausesOr(clauses);

      expect(result.clause).toBe('t.x = $1');
      expect(result.params).toEqual([1]);
    });

    it('should return FALSE when all clauses are FALSE', () => {
      const clauses = [
        { clause: 'FALSE', params: [] },
        { clause: 'FALSE', params: [] },
      ];
      const result = combineClausesOr(clauses);

      expect(result.clause).toBe('FALSE');
    });

    it('should short-circuit to TRUE when any clause is TRUE', () => {
      const clauses = [
        { clause: 't.x = $1', params: [1] },
        { clause: 'TRUE', params: [] },
        { clause: 't.y = $2', params: [2] },
      ];
      const result = combineClausesOr(clauses);

      expect(result.clause).toBe('TRUE');
      expect(result.params).toEqual([]);
    });
  });

  describe('resolveFilterValues', () => {
    it('should resolve context references', () => {
      const filter = { customer_id: 'customer_profile_id' };
      const result = resolveFilterValues(filter, baseContext);

      expect(result).toEqual({ customer_id: 100 });
    });

    it('should preserve literal values', () => {
      const filter = { status: 'active' };
      const result = resolveFilterValues(filter, baseContext);

      expect(result).toEqual({ status: 'active' });
    });

    it('should handle mixed resolution', () => {
      const filter = {
        owner_id: 'userId',
        status: 'active',
        count: 5,
      };
      const result = resolveFilterValues(filter, baseContext);

      expect(result).toEqual({
        owner_id: 1,
        status: 'active',
        count: 5,
      });
    });

    it('should keep undefined context refs as literal', () => {
      const filter = { unknown: 'literalString' };
      const result = resolveFilterValues(filter, baseContext);

      // literalString is not a context key, so it stays as-is
      expect(result.unknown).toBe('literalString');
    });
  });

  describe('buildParentClause', () => {
    const allMetadata = {
      unit: {
        tableName: 'units',
        primaryKey: 'id',
        rlsRules: [
          {
            id: 'staff-full-access',
            roles: ['admin', 'manager'],
            operations: '*',
            access: null,
          },
          {
            id: 'customer-junction',
            roles: 'customer',
            operations: '*',
            access: {
              type: 'junction',
              junction: {
                table: 'customer_units',
                localKey: 'id',
                foreignKey: 'unit_id',
                filter: { customer_profile_id: 'customer_profile_id' },
              },
            },
          },
        ],
      },
      property: {
        tableName: 'properties',
        primaryKey: 'id',
        rlsRules: [
          {
            id: 'staff-full-access',
            roles: ['admin', 'manager'],
            operations: '*',
            access: null,
          },
        ],
      },
    };

    it('should throw AppError when foreignKey is missing', () => {
      const access = { type: 'parent', parentEntity: 'unit' };
      
      expect(() => buildParentClause(access, baseContext, 't', 1, 0, allMetadata))
        .toThrow('Parent access requires foreignKey');
    });

    it('should throw AppError when parentEntity is missing', () => {
      const access = { type: 'parent', foreignKey: 'unit_id' };
      
      expect(() => buildParentClause(access, baseContext, 't', 1, 0, allMetadata))
        .toThrow('parentEntity');
    });

    it('should throw AppError when parent metadata not found', () => {
      const access = { type: 'parent', foreignKey: 'foo_id', parentEntity: 'nonexistent' };
      
      expect(() => buildParentClause(access, baseContext, 't', 1, 0, allMetadata))
        .toThrow("Parent entity 'nonexistent' not found");
    });

    it('should build EXISTS clause for admin with full access on parent', () => {
      const access = { type: 'parent', foreignKey: 'unit_id', parentEntity: 'unit' };
      const adminContext = { ...baseContext, role: 'admin', operation: 'read' };
      
      const result = buildParentClause(access, adminContext, 'assets', 1, 0, allMetadata);
      
      // Admin has null access on unit = full access, so no condition in subquery
      expect(result.clause).toContain('EXISTS');
      expect(result.clause).toContain('SELECT 1 FROM units p0');
      expect(result.clause).toContain('p0.id = assets.unit_id');
      expect(result.params).toEqual([]);
      expect(result.nextAliasCounter).toBe(1);
    });

    it('should build EXISTS clause with parent RLS for customer', () => {
      const access = { type: 'parent', foreignKey: 'unit_id', parentEntity: 'unit' };
      const customerContext = { ...baseContext, role: 'customer', operation: 'read', customer_profile_id: 100 };
      
      const result = buildParentClause(access, customerContext, 'assets', 1, 0, allMetadata);
      
      // Customer has junction access on unit
      expect(result.clause).toContain('EXISTS');
      expect(result.clause).toContain('units p0');
      expect(result.clause).toContain('p0.id = assets.unit_id');
      // Should include junction subquery for customer access
      expect(result.clause).toContain('customer_units');
      expect(result.params.length).toBeGreaterThan(0);
    });

    it('should return FALSE when no matching rules on parent', () => {
      const access = { type: 'parent', foreignKey: 'unit_id', parentEntity: 'unit' };
      const unknownRoleContext = { ...baseContext, role: 'unknown_role', operation: 'read' };
      
      const result = buildParentClause(access, unknownRoleContext, 'assets', 1, 0, allMetadata);
      
      expect(result.clause).toBe('FALSE');
      expect(result.params).toEqual([]);
    });

    it('should generate unique parent aliases', () => {
      const access = { type: 'parent', foreignKey: 'property_id', parentEntity: 'property' };
      const adminContext = { ...baseContext, role: 'admin', operation: 'read' };
      
      const result0 = buildParentClause(access, adminContext, 't', 1, 0, allMetadata);
      expect(result0.clause).toContain('p0');
      expect(result0.nextAliasCounter).toBe(1);

      const result5 = buildParentClause(access, adminContext, 't', 1, 5, allMetadata);
      expect(result5.clause).toContain('p5');
      expect(result5.nextAliasCounter).toBe(6);
    });

    it('should handle missing table alias', () => {
      const access = { type: 'parent', foreignKey: 'property_id', parentEntity: 'property' };
      const adminContext = { ...baseContext, role: 'admin', operation: 'read' };
      
      const result = buildParentClause(access, adminContext, null, 1, 0, allMetadata);
      
      expect(result.clause).toContain('p0.id = property_id');
    });
  });

  describe('buildAccessClause with parent type', () => {
    const allMetadata = {
      unit: {
        tableName: 'units',
        primaryKey: 'id',
        rlsRules: [
          { id: 'staff', roles: 'admin', operations: '*', access: null },
        ],
      },
    };

    it('should delegate to buildParentClause for parent type', () => {
      const access = { type: 'parent', foreignKey: 'unit_id', parentEntity: 'unit' };
      const adminContext = { ...baseContext, role: 'admin', operation: 'read' };
      
      const result = buildAccessClause(access, adminContext, 't', 1, 0, allMetadata);
      
      expect(result.clause).toContain('EXISTS');
      expect(result.clause).toContain('units');
    });
  });

  describe('buildPolymorphicParentClause', () => {
    const allMetadata = {
      work_order: {
        tableName: 'work_orders',
        primaryKey: 'id',
        rlsRules: [
          {
            id: 'customer-own',
            roles: 'customer',
            operations: '*',
            access: { type: 'direct', field: 'customer_id', value: 'customer_profile_id' },
          },
          {
            id: 'staff-full-access',
            roles: ['admin', 'manager'],
            operations: '*',
            access: null,
          },
        ],
      },
      asset: {
        tableName: 'assets',
        primaryKey: 'id',
        rlsRules: [
          {
            id: 'customer-junction',
            roles: 'customer',
            operations: '*',
            access: {
              type: 'junction',
              junction: {
                table: 'customer_assets',
                localKey: 'id',
                foreignKey: 'asset_id',
                filter: { customer_profile_id: 'customer_profile_id' },
              },
            },
          },
          {
            id: 'staff-full-access',
            roles: 'admin',
            operations: '*',
            access: null,
          },
        ],
      },
    };

    it('should throw when polymorphic context is missing', () => {
      const access = {
        type: 'parent',
        foreignKey: 'entity_id',
        polymorphic: { typeColumn: 'entity_type' },
      };
      const contextWithoutPolymorphic = { ...baseContext, role: 'customer', operation: 'read' };

      expect(() => buildParentClause(access, contextWithoutPolymorphic, 't', 1, 0, allMetadata))
        .toThrow('Polymorphic parent access requires parent type in context');
    });

    it('should throw when parentType is missing in polymorphic context', () => {
      const access = {
        type: 'parent',
        foreignKey: 'entity_id',
        polymorphic: { typeColumn: 'entity_type' },
      };
      const contextWithEmptyPoly = { ...baseContext, role: 'customer', operation: 'read', polymorphic: {} };

      expect(() => buildParentClause(access, contextWithEmptyPoly, 't', 1, 0, allMetadata))
        .toThrow('Polymorphic parent access requires parent type in context');
    });

    it('should build EXISTS clause with type check for admin', () => {
      const access = {
        type: 'parent',
        foreignKey: 'entity_id',
        polymorphic: { typeColumn: 'entity_type' },
      };
      const adminContext = {
        ...baseContext,
        role: 'admin',
        operation: 'read',
        polymorphic: { parentType: 'work_order', parentId: 123 },
      };

      const result = buildParentClause(access, adminContext, 'files', 1, 0, allMetadata);

      // Should include type check AND EXISTS
      expect(result.clause).toContain("files.entity_type = 'work_order'");
      expect(result.clause).toContain('EXISTS');
      expect(result.clause).toContain('SELECT 1 FROM work_orders p0');
      expect(result.clause).toContain('p0.id = files.entity_id');
      expect(result.params).toEqual([]);
    });

    it('should build EXISTS clause with parent RLS for customer via work_order', () => {
      const access = {
        type: 'parent',
        foreignKey: 'entity_id',
        polymorphic: { typeColumn: 'entity_type' },
      };
      const customerContext = {
        ...baseContext,
        role: 'customer',
        operation: 'read',
        customer_profile_id: 100,
        polymorphic: { parentType: 'work_order', parentId: 123 },
      };

      const result = buildParentClause(access, customerContext, 't', 1, 0, allMetadata);

      // Should include type check, EXISTS, and work_order's direct RLS
      expect(result.clause).toContain("t.entity_type = 'work_order'");
      expect(result.clause).toContain('EXISTS');
      expect(result.clause).toContain('work_orders p0');
      expect(result.clause).toContain('p0.customer_id = $1');
      expect(result.params).toEqual([100]);
    });

    it('should build EXISTS clause with parent RLS for customer via asset (junction)', () => {
      const access = {
        type: 'parent',
        foreignKey: 'entity_id',
        polymorphic: { typeColumn: 'entity_type' },
      };
      const customerContext = {
        ...baseContext,
        role: 'customer',
        operation: 'read',
        customer_profile_id: 100,
        polymorphic: { parentType: 'asset', parentId: 456 },
      };

      const result = buildParentClause(access, customerContext, 't', 1, 0, allMetadata);

      // Should include type check, EXISTS, and asset's junction RLS
      expect(result.clause).toContain("t.entity_type = 'asset'");
      expect(result.clause).toContain('EXISTS');
      expect(result.clause).toContain('assets p0');
      expect(result.clause).toContain('customer_assets');
    });

    it('should return FALSE when parentType not in allowedTypes', () => {
      const access = {
        type: 'parent',
        foreignKey: 'entity_id',
        polymorphic: {
          typeColumn: 'entity_type',
          allowedTypes: ['work_order'], // asset not allowed
        },
      };
      const customerContext = {
        ...baseContext,
        role: 'customer',
        operation: 'read',
        polymorphic: { parentType: 'asset', parentId: 456 },
      };

      const result = buildParentClause(access, customerContext, 't', 1, 0, allMetadata);

      expect(result.clause).toBe('FALSE');
      expect(result.params).toEqual([]);
    });

    it('should return FALSE when parentType not found in metadata', () => {
      const access = {
        type: 'parent',
        foreignKey: 'entity_id',
        polymorphic: { typeColumn: 'entity_type' },
      };
      const customerContext = {
        ...baseContext,
        role: 'customer',
        operation: 'read',
        polymorphic: { parentType: 'nonexistent', parentId: 123 },
      };

      const result = buildParentClause(access, customerContext, 't', 1, 0, allMetadata);

      expect(result.clause).toBe('FALSE');
      expect(result.params).toEqual([]);
    });

    it('should return FALSE when no matching rules on parent for role', () => {
      const access = {
        type: 'parent',
        foreignKey: 'entity_id',
        polymorphic: { typeColumn: 'entity_type' },
      };
      const unknownRoleContext = {
        ...baseContext,
        role: 'unknown_role',
        operation: 'read',
        polymorphic: { parentType: 'work_order', parentId: 123 },
      };

      const result = buildParentClause(access, unknownRoleContext, 't', 1, 0, allMetadata);

      expect(result.clause).toBe('FALSE');
    });

    it('should handle missing table alias', () => {
      const access = {
        type: 'parent',
        foreignKey: 'entity_id',
        polymorphic: { typeColumn: 'entity_type' },
      };
      const adminContext = {
        ...baseContext,
        role: 'admin',
        operation: 'read',
        polymorphic: { parentType: 'work_order', parentId: 123 },
      };

      const result = buildParentClause(access, adminContext, null, 1, 0, allMetadata);

      // Without table alias, column refs should not have prefix
      expect(result.clause).toContain("entity_type = 'work_order'");
      expect(result.clause).toContain('p0.id = entity_id');
    });

    it('should thread alias counter through polymorphic clause', () => {
      const access = {
        type: 'parent',
        foreignKey: 'entity_id',
        polymorphic: { typeColumn: 'entity_type' },
      };
      const adminContext = {
        ...baseContext,
        role: 'admin',
        operation: 'read',
        polymorphic: { parentType: 'work_order', parentId: 123 },
      };

      // Start with aliasCounter = 5
      const result = buildParentClause(access, adminContext, 't', 1, 5, allMetadata);

      expect(result.clause).toContain('p5');
      expect(result.nextAliasCounter).toBe(6);
    });
  });
});
