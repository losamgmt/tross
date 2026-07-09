/**
 * Unit Tests: Entity Metadata Validator — field trait/type conflicts
 *
 * Enforced: default+derived, searchable-on-non-text.
 * Explicitly allowed (valid live patterns): required+readonly, readonly+immutable.
 */

const { validateEntity } = require('../../../config/entity-metadata-validator');

function baseMeta(fields) {
  return {
    entityKey: 'test_entity',
    tableName: 'test_entities',
    primaryKey: 'id',
    identityField: 'name',
    displayField: 'name',
    fields: {
      id: { type: 'integer' },
      name: { type: 'string' },
      ...fields,
    },
  };
}

const hasError = (result, field) =>
  !!result && !!result.errors && result.errors.some((e) => e.field === field);

describe('Entity Metadata Validator: field trait/type conflicts', () => {
  const allMetadata = {};

  test("rejects a field declaring both 'default' and 'derived'", () => {
    const meta = baseMeta({
      unit_id: { type: 'foreignKey', references: 'unit' },
      property_id: {
        type: 'foreignKey',
        references: 'property',
        default: 5,
        derived: { from: 'unit_id', via: 'lookup' },
      },
    });

    const result = validateEntity('test_entity', meta, allMetadata);

    expect(hasError(result, 'fields.property_id')).toBe(true);
  });

  test("rejects 'searchable' on a non-text type", () => {
    const meta = baseMeta({ count: { type: 'integer', searchable: true } });

    const result = validateEntity('test_entity', meta, allMetadata);

    expect(hasError(result, 'fields.count')).toBe(true);
  });

  test("accepts 'searchable' on a text-like type", () => {
    const meta = baseMeta({ title: { type: 'string', searchable: true } });

    const result = validateEntity('test_entity', meta, allMetadata);

    expect(hasError(result, 'fields.title')).toBe(false);
  });

  test('accepts required + readonly (system-generated required fields)', () => {
    const meta = baseMeta({
      number: { type: 'string', required: true, readonly: true },
    });

    const result = validateEntity('test_entity', meta, allMetadata);

    expect(hasError(result, 'fields.number')).toBe(false);
  });

  test('accepts readonly + immutable (redundant but valid)', () => {
    const meta = baseMeta({
      locked: { type: 'string', readonly: true, immutable: true },
    });

    const result = validateEntity('test_entity', meta, allMetadata);

    expect(hasError(result, 'fields.locked')).toBe(false);
  });
});
