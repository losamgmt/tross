/**
 * Unit Tests: Invoice Model - CRUD Operations
 */

const Invoice = require('../../../db/models/Invoice');
const db = require('../../../db/connection');

jest.mock('../../../db/connection');

describe('Invoice Model - CRUD', () => {
  afterEach(() => jest.clearAllMocks());

  it('should find all invoices', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 });
    const result = await Invoice.findAll({ page: 1, limit: 50 });
    expect(result.data).toEqual([{ id: 1 }]);
  });

  it('should find by ID', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 });
    const result = await Invoice.findById(1);
    expect(result).toEqual({ id: 1 });
  });

  it('should create', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 });
    const result = await Invoice.create({ 
      invoice_number: 'INV-001',
      customer_id: 10, 
      amount: 100,
      total: 100
    });
    expect(result).toEqual({ id: 1 });
  });

  it('should update', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 1, status: 'paid' }], rowCount: 1 });
    const result = await Invoice.update(1, { status: 'paid' });
    expect(result.status).toBe('paid');
  });

  it('should delete', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 });
    const result = await Invoice.delete(1);
    expect(result).toEqual({ id: 1 });
  });
});
