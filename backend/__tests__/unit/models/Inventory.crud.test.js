/**
 * Unit Tests: Inventory Model - CRUD Operations
 */

const Inventory = require('../../../db/models/Inventory');
const db = require('../../../db/connection');

jest.mock('../../../db/connection');

describe('Inventory Model - CRUD', () => {
  afterEach(() => jest.clearAllMocks());

  it('should find all inventory items', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 1, name: 'Widget' }], rowCount: 1 });
    const result = await Inventory.findAll({ page: 1, limit: 50 });
    expect(result.data).toEqual([{ id: 1, name: 'Widget' }]);
  });

  it('should find by ID', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 });
    const result = await Inventory.findById(1);
    expect(result).toEqual({ id: 1 });
  });

  it('should create', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 });
    const result = await Inventory.create({ name: 'Widget', sku: 'WDG-001', quantity: 50 });
    expect(result).toEqual({ id: 1 });
  });

  it('should update', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 1, quantity: 45 }], rowCount: 1 });
    const result = await Inventory.update(1, { quantity: 45 });
    expect(result.quantity).toBe(45);
  });

  it('should delete', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 });
    const result = await Inventory.delete(1);
    expect(result).toEqual({ id: 1 });
  });
});
