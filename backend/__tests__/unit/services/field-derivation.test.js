/**
 * Unit Tests: Field Derivation engine (applyDerived)
 *
 * Covers the shared engine semantics and the `lookup` method. The engine reads the real
 * entity metadata (for the source entity's table name) but the DB is mocked.
 */

jest.mock('../../../db/connection', () => ({
  oneOrNone: jest.fn(),
}));
jest.mock('../../../config/logger', () => ({
  logger: require('../../mocks').createLoggerMock(),
}));

const db = require('../../../db/connection');
const { applyDerived } = require('../../../services/entity/field-derivation');

// Minimal metadata with a `lookup`-derived FK field. property_id derives from unit_id
// (a FK → real 'unit' entity); the engine reads 'unit' metadata for its table name,
// then calls the (mocked) db.
function metadataFixture() {
  return {
    fields: {
      unit_id: { type: 'foreignKey', references: 'unit' },
      property_id: {
        type: 'foreignKey',
        references: 'property',
        derived: { from: 'unit_id', via: 'lookup' },
      },
      name: { type: 'string' },
    },
  };
}

describe('field-derivation: applyDerived', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('via: lookup', () => {
    test('derives a blank target from the related entity when the source is set', async () => {
      db.oneOrNone.mockResolvedValue({ property_id: 42 });
      const data = { unit_id: 7, name: 'WO' };

      await applyDerived('work_order', data, metadataFixture());

      expect(data.property_id).toBe(42);
      expect(db.oneOrNone).toHaveBeenCalledTimes(1);
      const [sql, params] = db.oneOrNone.mock.calls[0];
      expect(sql).toContain('SELECT property_id FROM units');
      expect(params).toEqual([7]);
    });

    test('explicit target value wins (no lookup performed)', async () => {
      const data = { unit_id: 7, property_id: 99 };

      await applyDerived('work_order', data, metadataFixture());

      expect(data.property_id).toBe(99);
      expect(db.oneOrNone).not.toHaveBeenCalled();
    });

    test('skips when the source field is blank', async () => {
      const data = { name: 'WO' };

      await applyDerived('work_order', data, metadataFixture());

      expect(data.property_id).toBeUndefined();
      expect(db.oneOrNone).not.toHaveBeenCalled();
    });

    test('leaves the target unset (and does not throw) when the lookup fails', async () => {
      db.oneOrNone.mockRejectedValue(new Error('db down'));
      const data = { unit_id: 7 };

      await expect(
        applyDerived('work_order', data, metadataFixture()),
      ).resolves.toBe(data);
      expect(data.property_id).toBeUndefined();
    });

    test('does not assign when the related record has no value', async () => {
      db.oneOrNone.mockResolvedValue(null);
      const data = { unit_id: 7 };

      await applyDerived('work_order', data, metadataFixture());

      expect(data.property_id).toBeUndefined();
    });
  });

  test('fields without a `derived` construct are untouched', async () => {
    db.oneOrNone.mockResolvedValue({ property_id: 42 });
    const data = { unit_id: 7, name: 'WO' };

    await applyDerived('work_order', data, metadataFixture());

    expect(data.name).toBe('WO');
    expect(data.unit_id).toBe(7);
  });

  test('an unknown `via` method is ignored (no throw, no assignment)', async () => {
    const meta = {
      fields: {
        unit_id: { type: 'foreignKey', references: 'unit' },
        property_id: {
          type: 'foreignKey',
          references: 'property',
          derived: { from: 'unit_id', via: 'nope' },
        },
      },
    };
    const data = { unit_id: 7 };

    await applyDerived('work_order', data, meta);

    expect(data.property_id).toBeUndefined();
    expect(db.oneOrNone).not.toHaveBeenCalled();
  });
});
