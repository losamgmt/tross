/**
 * Generic field-trait accessors — getFieldsWithTrait / fieldHasTrait / FIELD_TRAIT.
 *
 * The canonical, field-level-only API that replaces the 5x get*Fields + 5x isField*.
 * Deliberately has NO legacy entity-level-array bridge (see the "ignores a legacy array" case).
 */

const {
  getFieldsWithTrait,
  fieldHasTrait,
  FIELD_TRAIT,
} = require('../../../config/metadata-accessors');

const meta = {
  fields: {
    id: { type: 'integer' },
    name: { type: 'string', required: true, searchable: true, sortable: true },
    email: { type: 'string', required: true, filterable: true },
    created_at: { type: 'timestamp', sortable: true, immutable: true },
    notes: { type: 'text' },
  },
};

describe('FIELD_TRAIT vocabulary', () => {
  test('is a frozen map of the 5 queryable traits to their field property names', () => {
    expect(FIELD_TRAIT).toEqual({
      REQUIRED: 'required',
      IMMUTABLE: 'immutable',
      SEARCHABLE: 'searchable',
      FILTERABLE: 'filterable',
      SORTABLE: 'sortable',
    });
    expect(Object.isFrozen(FIELD_TRAIT)).toBe(true);
  });
});

describe('getFieldsWithTrait', () => {
  test.each([
    [FIELD_TRAIT.REQUIRED, ['name', 'email']],
    [FIELD_TRAIT.IMMUTABLE, ['created_at']],
    [FIELD_TRAIT.SEARCHABLE, ['name']],
    [FIELD_TRAIT.FILTERABLE, ['email']],
    [FIELD_TRAIT.SORTABLE, ['name', 'created_at']],
  ])('returns the fields carrying %s', (trait, expected) => {
    expect(getFieldsWithTrait(meta, trait)).toEqual(expected);
  });

  test('returns [] when no field carries the trait', () => {
    expect(
      getFieldsWithTrait({ fields: { a: { type: 'string' } } }, FIELD_TRAIT.SEARCHABLE),
    ).toEqual([]);
  });

  test('returns [] for metadata with no fields', () => {
    expect(getFieldsWithTrait({}, FIELD_TRAIT.REQUIRED)).toEqual([]);
  });

  test('ignores a legacy entity-level array (field-trait only, no bridge)', () => {
    const legacy = {
      requiredFields: ['ghost'], // legacy array must NOT influence the result
      fields: { name: { required: true } },
    };
    expect(getFieldsWithTrait(legacy, FIELD_TRAIT.REQUIRED)).toEqual(['name']);
  });
});

describe('fieldHasTrait', () => {
  test('true when the field carries the trait', () => {
    expect(fieldHasTrait(meta, 'name', FIELD_TRAIT.REQUIRED)).toBe(true);
    expect(fieldHasTrait(meta, 'created_at', FIELD_TRAIT.SORTABLE)).toBe(true);
  });

  test('false when the field lacks the trait', () => {
    expect(fieldHasTrait(meta, 'name', FIELD_TRAIT.FILTERABLE)).toBe(false);
  });

  test('false for an unknown field', () => {
    expect(fieldHasTrait(meta, 'nope', FIELD_TRAIT.REQUIRED)).toBe(false);
  });
});
