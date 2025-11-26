/**
 * Unit Tests: Inventory Model - CRUD Operations
 */

const Inventory = require('../../../db/models/Inventory');
const db = require('../../../db/connection');

jest.mock('../../../db/connection', () => require('../../mocks').createDBMock());

describe('Inventory Model - CRUD', () => {
  afterEach(() => jest.clearAllMocks());

  test('should find all inventory items', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 1, name: 'Widget' }], rowCount: 1 });
    const result = await Inventory.findAll({ page: 1, limit: 50 });
    expect(result.data).toEqual([{ id: 1, name: 'Widget' }]);
  });

  test('should find by ID', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 });
    const result = await Inventory.findById(1);
    expect(result).toEqual({ id: 1 });
  });

  test('should create', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 });
    const result = await Inventory.create({ name: 'Widget', sku: 'WDG-001', quantity: 50 });
    expect(result).toEqual({ id: 1 });
  });

  test('should update', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 1, quantity: 45 }], rowCount: 1 });
    const result = await Inventory.update(1, { quantity: 45 });
    expect(result.quantity).toBe(45);
  });

  test('should delete', async () => {
    const { createMockClient } = require('../../mocks');
    const mockClient = createMockClient();
    db.getClient.mockResolvedValue(mockClient);
    
    const mockRecord = { id: 1, name: 'Widget', quantity: 50 };
    
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [mockRecord] }) // SELECT inventory item
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // DELETE audit_logs
      .mockResolvedValueOnce({ rows: [mockRecord], rowCount: 1 }) // DELETE inventory
      .mockResolvedValueOnce({ rows: [] }); // COMMIT
    
    const result = await Inventory.delete(1);
    
    expect(result).toEqual(mockRecord);
    expect(mockClient.release).toHaveBeenCalled();
  });
});
