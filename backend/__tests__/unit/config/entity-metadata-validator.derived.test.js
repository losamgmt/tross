/**
 * Unit Tests: Entity Metadata Validator — `derived` field construct
 *
 * Focused coverage for validateDerived. Uses targeted field-path assertions so unrelated
 * validators (e.g. FK-reference checks against an empty allMetadata) don't interfere.
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

describe('Entity Metadata Validator: derived construct', () => {
  const allMetadata = {};

  test('accepts a well-formed lookup derivation', () => {
    const meta = baseMeta({
      unit_id: { type: 'foreignKey', references: 'unit' },
      property_id: {
        type: 'foreignKey',
        references: 'property',
        derived: { from: 'unit_id', via: 'lookup' },
      },
    });

    const result = validateEntity('test_entity', meta, allMetadata);

    expect(hasError(result, 'fields.property_id.derived.from')).toBe(false);
    expect(hasError(result, 'fields.property_id.derived.via')).toBe(false);
    expect(hasError(result, 'fields.property_id.derived')).toBe(false);
  });

  test('rejects derived.from referencing an unknown sibling field', () => {
    const meta = baseMeta({
      property_id: {
        type: 'foreignKey',
        references: 'property',
        derived: { from: 'nope', via: 'lookup' },
      },
    });

    const result = validateEntity('test_entity', meta, allMetadata);

    expect(hasError(result, 'fields.property_id.derived.from')).toBe(true);
  });

  test('rejects an unknown via method', () => {
    const meta = baseMeta({
      unit_id: { type: 'foreignKey', references: 'unit' },
      property_id: {
        type: 'foreignKey',
        references: 'property',
        derived: { from: 'unit_id', via: 'bogus' },
      },
    });

    const result = validateEntity('test_entity', meta, allMetadata);

    expect(hasError(result, 'fields.property_id.derived.via')).toBe(true);
  });

  test("rejects via:'lookup' when the source field is not a foreignKey", () => {
    const meta = baseMeta({
      some_text: { type: 'string' },
      target: {
        type: 'foreignKey',
        references: 'property',
        derived: { from: 'some_text', via: 'lookup' },
      },
    });

    const result = validateEntity('test_entity', meta, allMetadata);

    expect(hasError(result, 'fields.target.derived')).toBe(true);
  });

  test('fields without a derived construct produce no derived errors', () => {
    const meta = baseMeta({ status: { type: 'string' } });

    const result = validateEntity('test_entity', meta, allMetadata);

    expect(hasError(result, 'fields.status.derived.from')).toBe(false);
  });
});
