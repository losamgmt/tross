/**
 * Unit Tests: Entity Metadata Validator
 *
 * Tests the validation logic for entity metadata,
 * particularly nav placement validation (navGroup/navOrder).
 */

const {
  validateEntity,
  VALID_NAV_GROUPS,
} = require('../../../config/entity-metadata-validator');

/**
 * Creates a minimal valid entity metadata object for testing.
 * Override specific fields to test validation behavior.
 */
function createMinimalMetadata(overrides = {}) {
  return {
    entityKey: 'test_entity',
    tableName: 'test_entities',
    primaryKey: 'id',
    identityField: 'name',
    displayField: 'name',
    identityFieldUnique: true,
    rlsResource: 'test_entities',
    rlsPolicy: { customer: null },
    icon: 'settings',
    navVisibility: null, // Not shown in nav by default
    supportsFileAttachments: false,
    summaryConfig: null, // No aggregation support by default
    fields: {
      id: {
        type: 'integer',
        label: 'ID',
        access: { create: 'hidden', edit: 'hidden', view: 'read' },
      },
      name: {
        type: 'string',
        label: 'Name',
        access: { create: 'required', edit: 'editable', view: 'read' },
      },
    },
    defaultSort: { field: 'name', direction: 'ASC' },
    searchFields: ['name'],
    ...overrides,
  };
}

/**
 * Checks if error result contains a specific field error
 */
function hasFieldError(result, fieldName) {
  if (!result || !result.errors) return false;
  return result.errors.some((e) => e.field === fieldName);
}

describe('Entity Metadata Validator', () => {
  // Empty allMetadata for isolated tests (no foreign key validation needed)
  const allMetadata = {};

  describe('validateNavPlacement', () => {
    describe('entities without navVisibility', () => {
      test('navGroup and navOrder are not required when navVisibility is null', () => {
        const meta = createMinimalMetadata({ navVisibility: null });
        const result = validateEntity('test_entity', meta, allMetadata);
        expect(result.hasErrors()).toBe(false);
      });

      test('navGroup is ignored when navVisibility is null', () => {
        const meta = createMinimalMetadata({
          navVisibility: null,
          navGroup: 'customers', // Should be ignored
        });
        const result = validateEntity('test_entity', meta, allMetadata);
        expect(result.hasErrors()).toBe(false);
      });
    });

    describe('entities with navVisibility', () => {
      test('requires navGroup when navVisibility is set', () => {
        const meta = createMinimalMetadata({
          navVisibility: 'dispatcher', // Valid role-based visibility
          navOrder: 1,
          // navGroup missing
        });
        const result = validateEntity('test_entity', meta, allMetadata);
        expect(result.hasErrors()).toBe(true);
        expect(hasFieldError(result, 'navGroup')).toBe(true);
      });

      test('requires navOrder when navVisibility is set', () => {
        const meta = createMinimalMetadata({
          navVisibility: 'technician',
          navGroup: 'customers',
          // navOrder missing
        });
        const result = validateEntity('test_entity', meta, allMetadata);
        expect(result.hasErrors()).toBe(true);
        expect(hasFieldError(result, 'navOrder')).toBe(true);
      });

      test('passes when both navGroup and navOrder are present', () => {
        const meta = createMinimalMetadata({
          navVisibility: 'customer',
          navGroup: 'work',
          navOrder: 2,
        });
        const result = validateEntity('test_entity', meta, allMetadata);
        expect(result.hasErrors()).toBe(false);
      });
    });

    describe('navGroup validation', () => {
      test('accepts all valid navGroup values', () => {
        for (const group of VALID_NAV_GROUPS) {
          const meta = createMinimalMetadata({
            navVisibility: 'dispatcher',
            navGroup: group,
            navOrder: 1,
          });
          const result = validateEntity('test_entity', meta, allMetadata);
          expect(result.hasErrors()).toBe(false);
        }
      });

      test('valid navGroups include customers, work, resources, finance, admin', () => {
        expect(VALID_NAV_GROUPS.has('customers')).toBe(true);
        expect(VALID_NAV_GROUPS.has('work')).toBe(true);
        expect(VALID_NAV_GROUPS.has('resources')).toBe(true);
        expect(VALID_NAV_GROUPS.has('finance')).toBe(true);
        expect(VALID_NAV_GROUPS.has('admin')).toBe(true);
      });

      test('rejects invalid navGroup values', () => {
        const meta = createMinimalMetadata({
          navVisibility: 'dispatcher',
          navGroup: 'invalid_group',
          navOrder: 1,
        });
        const result = validateEntity('test_entity', meta, allMetadata);
        expect(result.hasErrors()).toBe(true);
        expect(hasFieldError(result, 'navGroup')).toBe(true);
      });
    });

    describe('navOrder validation', () => {
      test('accepts zero as navOrder', () => {
        const meta = createMinimalMetadata({
          navVisibility: 'dispatcher',
          navGroup: 'customers',
          navOrder: 0,
        });
        const result = validateEntity('test_entity', meta, allMetadata);
        expect(result.hasErrors()).toBe(false);
      });

      test('accepts positive integers as navOrder', () => {
        const meta = createMinimalMetadata({
          navVisibility: 'dispatcher',
          navGroup: 'customers',
          navOrder: 99,
        });
        const result = validateEntity('test_entity', meta, allMetadata);
        expect(result.hasErrors()).toBe(false);
      });

      test('rejects negative navOrder', () => {
        const meta = createMinimalMetadata({
          navVisibility: 'dispatcher',
          navGroup: 'customers',
          navOrder: -1,
        });
        const result = validateEntity('test_entity', meta, allMetadata);
        expect(result.hasErrors()).toBe(true);
        expect(hasFieldError(result, 'navOrder')).toBe(true);
      });

      test('rejects non-integer navOrder', () => {
        const meta = createMinimalMetadata({
          navVisibility: 'dispatcher',
          navGroup: 'customers',
          navOrder: 1.5,
        });
        const result = validateEntity('test_entity', meta, allMetadata);
        expect(result.hasErrors()).toBe(true);
        expect(hasFieldError(result, 'navOrder')).toBe(true);
      });

      test('rejects string navOrder', () => {
        const meta = createMinimalMetadata({
          navVisibility: 'dispatcher',
          navGroup: 'customers',
          navOrder: '1',
        });
        const result = validateEntity('test_entity', meta, allMetadata);
        expect(result.hasErrors()).toBe(true);
        expect(hasFieldError(result, 'navOrder')).toBe(true);
      });
    });
  });
});
