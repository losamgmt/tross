/**
 * Unit Tests: Invoice Model - CRUD Operations
 */

const Invoice = require('../../../db/models/Invoice');
const db = require('../../../db/connection');

jest.mock('../../../db/connection', () => require('../../mocks').createDBMock());

describe('Invoice Model - CRUD', () => {
  afterEach(() => jest.clearAllMocks());

  test('should find all invoices', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 });
    const result = await Invoice.findAll({ page: 1, limit: 50 });
    expect(result.data).toEqual([{ id: 1 }]);
  });

  test('should find by ID', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 });
    const result = await Invoice.findById(1);
    expect(result).toEqual({ id: 1 });
  });

  test('should create', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 });
    const result = await Invoice.create({ 
      invoice_number: 'INV-001',
      customer_id: 10, 
      amount: 100,
      total: 100
    });
    expect(result).toEqual({ id: 1 });
  });

  test('should update', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 1, status: 'paid' }], rowCount: 1 });
    const result = await Invoice.update(1, { status: 'paid' });
    expect(result.status).toBe('paid');
  });

  test('should delete', async () => {
    const { createMockClient } = require('../../mocks');
    const mockClient = createMockClient();
    db.getClient.mockResolvedValue(mockClient);
    
    const mockRecord = { id: 1, total_amount: 100 };
    
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [mockRecord] }) // SELECT invoice
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // DELETE audit_logs
      .mockResolvedValueOnce({ rows: [mockRecord], rowCount: 1 }) // DELETE invoice
      .mockResolvedValueOnce({ rows: [] }); // COMMIT
    
    const result = await Invoice.delete(1);
    
    expect(result).toEqual(mockRecord);
    expect(mockClient.release).toHaveBeenCalled();
  });
});
