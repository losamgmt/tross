/**
 * UDN P4a/P5 — HUMAN entities expose a generated display `name` field.
 *
 * P2 added the DB-generated `name` column (first + last) at the schema level.
 * P4a declares that column in metadata so it syncs to the frontend and is a
 * first-class field; P5 makes it sortable + filterable. This pins the contract
 * for the three HUMAN entities (customer, technician, user).
 */

const {
  getFieldsWithTrait,
  FIELD_TRAIT,
} = require('../../../config/metadata-accessors');
const { filterDataByRole } = require('../../../utils/field-access-controller');

const customer = require('../../../config/models/customer-metadata');
const technician = require('../../../config/models/technician-metadata');
const user = require('../../../config/models/user-metadata');

// Read role mirrors each entity's own name-field (first_name/last_name) visibility.
const HUMAN_ENTITIES = [
  { entity: 'customer', meta: customer, readRole: 'customer' },
  { entity: 'technician', meta: technician, readRole: 'technician' },
  { entity: 'user', meta: user, readRole: 'customer' },
];

describe('UDN HUMAN `name` field contract (P4a/P5)', () => {
  describe.each(HUMAN_ENTITIES)('$entity', ({ meta, readRole }) => {
    test('declares a generated `name` field: string, readonly, optional, VARCHAR(255)', () => {
      const field = meta.fields.name;
      expect(field).toBeDefined();
      expect(field.type).toBe('string');
      expect(field.readonly).toBe(true);
      expect(field.required).toBeFalsy();
      expect(field.maxLength).toBe(255);
    });

    test('`name` is sortable AND filterable (P5), but NOT searchable', () => {
      expect(meta.fields.name.sortable).toBe(true);
      expect(meta.fields.name.filterable).toBe(true);
      expect(meta.fields.name.searchable).toBeFalsy();

      // Accessors are what the list route + query builder consult.
      expect(getFieldsWithTrait(meta, FIELD_TRAIT.SORTABLE)).toContain('name');
      expect(getFieldsWithTrait(meta, FIELD_TRAIT.FILTERABLE)).toContain('name');
      expect(getFieldsWithTrait(meta, FIELD_TRAIT.SEARCHABLE)).not.toContain('name');
    });

    test('fieldAccess makes `name` read-only and non-writable', () => {
      const access = meta.fieldAccess.name;
      expect(access).toBeDefined();
      expect(access.create).toBe('none');
      expect(access.update).toBe('none');
      expect(access.delete).toBe('none');
      expect(access.read).toBe(readRole);
    });
  });

  describe('read redaction honors `name` visibility', () => {
    test('technician `name` reaches a technician but is stripped from a customer', () => {
      const row = { id: 1, first_name: 'Jane', last_name: 'Smith', name: 'Jane Smith' };

      expect(filterDataByRole(row, technician, 'technician', 'read').name).toBe('Jane Smith');
      expect(filterDataByRole(row, technician, 'customer', 'read').name).toBeUndefined();
    });

    test('customer `name` reaches a customer (public-readable)', () => {
      const row = { id: 2, first_name: 'Ann', last_name: 'Lee', name: 'Ann Lee' };
      expect(filterDataByRole(row, customer, 'customer', 'read').name).toBe('Ann Lee');
    });
  });
});
