/**
 * Unit Tests for Relationship Loader
 *
 * Tests the loadRelationships function that loads M:M, hasMany,
 * and hasOne relationships after initial entity retrieval.
 */

const {
  loadRelationships,
  validateRelationshipNames,
  loadManyToMany,
  loadHasMany,
  loadHasOne,
  groupByKey,
} = require('../../../../db/helpers/relationship-loader');

// Mock the database connection
jest.mock('../../../../db/connection', () => ({
  query: jest.fn(),
}));

// Mock the logger
jest.mock('../../../../config/logger', () => ({
  logger: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock the metadata
jest.mock('../../../../config/models', () => ({
  customer: {
    tableName: 'customers',
    primaryKey: 'id',
    relationships: {
      units: {
        type: 'manyToMany',
        table: 'units',
        through: 'customer_units',
        foreignKey: 'customer_id',
        targetKey: 'unit_id',
      },
      invoices: {
        type: 'hasMany',
        table: 'invoices',
        foreignKey: 'customer_id',
      },
      user: {
        type: 'belongsTo',
        table: 'users',
        foreignKey: 'user_id',
      },
    },
  },
  technician: {
    tableName: 'technicians',
    primaryKey: 'id',
    relationships: {
      user: {
        type: 'hasOne',
        table: 'users',
        foreignKey: 'technician_id',
      },
    },
  },
}));

const db = require('../../../../db/connection');

describe('RelationshipLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // groupByKey
  // ==========================================================================
  describe('groupByKey', () => {
    it('should group records by a key field', () => {
      const records = [
        { parent_id: 1, value: 'a' },
        { parent_id: 1, value: 'b' },
        { parent_id: 2, value: 'c' },
      ];

      const result = groupByKey(records, 'parent_id');

      expect(result.get(1)).toHaveLength(2);
      expect(result.get(2)).toHaveLength(1);
    });

    it('should skip records with null/undefined keys', () => {
      const records = [
        { parent_id: 1, value: 'a' },
        { parent_id: null, value: 'b' },
        { parent_id: undefined, value: 'c' },
      ];

      const result = groupByKey(records, 'parent_id');

      expect(result.size).toBe(1);
      expect(result.get(1)).toHaveLength(1);
    });
  });

  // ==========================================================================
  // validateRelationshipNames
  // ==========================================================================
  describe('validateRelationshipNames', () => {
    it('should return valid relationships that exist in metadata', () => {
      const result = validateRelationshipNames('customer', ['units', 'invoices']);

      expect(result.valid).toEqual(['units', 'invoices']);
      expect(result.invalid).toEqual([]);
    });

    it('should separate invalid relationships', () => {
      const result = validateRelationshipNames('customer', ['units', 'nonexistent']);

      expect(result.valid).toEqual(['units']);
      expect(result.invalid).toEqual(['nonexistent']);
    });

    it('should skip belongsTo relationships (handled by JOINs)', () => {
      // 'user' is a belongsTo relationship on customer
      const result = validateRelationshipNames('customer', ['units', 'user']);

      // belongsTo is skipped (not in valid or invalid)
      expect(result.valid).toEqual(['units']);
      expect(result.invalid).toEqual([]);
    });

    it('should return all invalid when entity not found', () => {
      const result = validateRelationshipNames('nonexistent', ['units', 'invoices']);

      expect(result.valid).toEqual([]);
      expect(result.invalid).toEqual(['units', 'invoices']);
    });

    it('should handle empty include array', () => {
      const result = validateRelationshipNames('customer', []);

      expect(result.valid).toEqual([]);
      expect(result.invalid).toEqual([]);
    });
  });

  // ==========================================================================
  // loadManyToMany
  // ==========================================================================
  describe('loadManyToMany', () => {
    it('should load M:M relationships via junction table', async () => {
      const relationshipDef = {
        type: 'manyToMany',
        table: 'units',
        through: 'customer_units',
        foreignKey: 'customer_id',
        targetKey: 'unit_id',
      };

      db.query.mockResolvedValueOnce({
        rows: [
          { id: 10, unit_number: 'A1', _parent_id: 1 },
          { id: 11, unit_number: 'A2', _parent_id: 1 },
          { id: 12, unit_number: 'B1', _parent_id: 2 },
        ],
      });

      const result = await loadManyToMany(
        'units',
        relationshipDef,
        [1, 2],
      );

      // Verify query structure
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM units t'),
        [1, 2],
      );
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INNER JOIN customer_units j'),
        [1, 2],
      );
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE j.customer_id IN'),
        [1, 2],
      );

      // Verify result grouping
      expect(result.get(1)).toHaveLength(2);
      expect(result.get(2)).toHaveLength(1);
      // _parent_id should be removed
      expect(result.get(1)[0]._parent_id).toBeUndefined();
    });

    it('should return empty map when parent ids empty', async () => {
      const result = await loadManyToMany('units', { through: 'x', targetKey: 'y' }, []);

      expect(result.size).toBe(0);
      expect(db.query).not.toHaveBeenCalled();
    });

    it('should return empty map when through/targetKey missing', async () => {
      const result = await loadManyToMany('units', {}, [1, 2]);

      expect(result.size).toBe(0);
      expect(db.query).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // loadHasMany
  // ==========================================================================
  describe('loadHasMany', () => {
    it('should load hasMany relationships', async () => {
      const relationshipDef = {
        type: 'hasMany',
        table: 'invoices',
        foreignKey: 'customer_id',
      };

      db.query.mockResolvedValueOnce({
        rows: [
          { id: 100, customer_id: 1, total: 500 },
          { id: 101, customer_id: 1, total: 300 },
          { id: 102, customer_id: 2, total: 200 },
        ],
      });

      const result = await loadHasMany('invoices', relationshipDef, [1, 2]);

      // Check that query was called with proper structure
      expect(db.query).toHaveBeenCalled();
      const [query, params] = db.query.mock.calls[0];
      expect(query).toContain('FROM invoices');
      expect(query).toContain('WHERE customer_id IN');
      expect(params).toEqual([1, 2]);

      expect(result.get(1)).toHaveLength(2);
      expect(result.get(2)).toHaveLength(1);
    });

    it('should return empty map when parent ids empty', async () => {
      const result = await loadHasMany('invoices', { table: 'invoices', foreignKey: 'customer_id' }, []);

      expect(result.size).toBe(0);
      expect(db.query).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // loadHasOne
  // ==========================================================================
  describe('loadHasOne', () => {
    it('should load hasOne relationships (single record per parent)', async () => {
      const relationshipDef = {
        type: 'hasOne',
        table: 'users',
        foreignKey: 'technician_id',
      };

      db.query.mockResolvedValueOnce({
        rows: [
          { id: 42, technician_id: 1, email: 'user42@test.com' },
          { id: 43, technician_id: 2, email: 'user43@test.com' },
        ],
      });

      const result = await loadHasOne('user', relationshipDef, [1, 2]);

      // hasOne returns single objects, not arrays
      expect(result.get(1).email).toBe('user42@test.com');
      expect(result.get(2).email).toBe('user43@test.com');
    });
  });

  // ==========================================================================
  // loadRelationships (main function)
  // ==========================================================================
  describe('loadRelationships', () => {
    it('should attach M:M relationship data to parent records', async () => {
      const parentRecords = [
        { id: 1, name: 'Customer A' },
        { id: 2, name: 'Customer B' },
      ];

      // Mock M:M query
      db.query.mockResolvedValueOnce({
        rows: [
          { id: 10, unit_number: 'A1', _parent_id: 1 },
          { id: 11, unit_number: 'B1', _parent_id: 2 },
        ],
      });

      const result = await loadRelationships('customer', ['units'], parentRecords);

      expect(result[0].units).toBeDefined();
      expect(result[0].units).toHaveLength(1);
      expect(result[0].units[0].unit_number).toBe('A1');

      expect(result[1].units).toBeDefined();
      expect(result[1].units).toHaveLength(1);
    });

    it('should attach hasMany relationship data to parent records', async () => {
      const parentRecords = [
        { id: 1, name: 'Customer A' },
        { id: 2, name: 'Customer B' },
      ];

      // Mock hasMany query
      db.query.mockResolvedValueOnce({
        rows: [
          { id: 100, customer_id: 1, total: 500 },
          { id: 101, customer_id: 1, total: 300 },
          { id: 102, customer_id: 2, total: 200 },
        ],
      });

      const result = await loadRelationships('customer', ['invoices'], parentRecords);

      expect(result[0].invoices).toHaveLength(2);
      expect(result[1].invoices).toHaveLength(1);
    });

    it('should return original records when include is empty', async () => {
      const parentRecords = [{ id: 1, name: 'Test' }];

      const result = await loadRelationships('customer', [], parentRecords);

      expect(result).toBe(parentRecords);
      expect(db.query).not.toHaveBeenCalled();
    });

    it('should return original records when parent array is empty', async () => {
      const result = await loadRelationships('customer', ['units'], []);

      expect(result).toEqual([]);
      expect(db.query).not.toHaveBeenCalled();
    });

    it('should return original records for unknown entity', async () => {
      const parentRecords = [{ id: 1, name: 'Test' }];

      const result = await loadRelationships('nonexistent', ['units'], parentRecords);

      expect(result).toBe(parentRecords);
      expect(db.query).not.toHaveBeenCalled();
    });

    it('should initialize empty arrays for parents with no relationships', async () => {
      const parentRecords = [
        { id: 1, name: 'Customer A' },
        { id: 2, name: 'Customer B' },
      ];

      // Mock query returning data only for customer 1
      db.query.mockResolvedValueOnce({
        rows: [
          { id: 10, unit_number: 'A1', _parent_id: 1 },
        ],
      });

      const result = await loadRelationships('customer', ['units'], parentRecords);

      expect(result[0].units).toHaveLength(1);
      expect(result[1].units).toEqual([]); // Empty array, not undefined
    });
  });
});
