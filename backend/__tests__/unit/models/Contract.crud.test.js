/**
 * Unit Tests: Contract Model - CRUD Operations
 */

const Contract = require('../../../db/models/Contract');
const db = require('../../../db/connection');

jest.mock('../../../db/connection', () => require('../../mocks').createDBMock());

describe('Contract Model - CRUD', () => {
  afterEach(() => jest.clearAllMocks());

  test('should find all contracts', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 });
    const result = await Contract.findAll({ page: 1, limit: 50 });
    expect(result.data).toEqual([{ id: 1 }]);
  });

  test('should find by ID', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 });
    const result = await Contract.findById(1);
    expect(result).toEqual({ id: 1 });
  });

  test('should create', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 });
    const result = await Contract.create({ 
      contract_number: 'CNT-001', 
      customer_id: 10, 
      start_date: '2025-01-01' 
    });
    expect(result).toEqual({ id: 1 });
  });

  test('should update', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 1, status: 'active' }], rowCount: 1 });
    const result = await Contract.update(1, { status: 'active' });
    expect(result.status).toBe('active');
  });

  test('should delete', async () => {
    const { createMockClient } = require('../../mocks');
    const mockClient = createMockClient();
    db.getClient.mockResolvedValue(mockClient);
    
    const mockRecord = { id: 1, contract_number: 'CNT-001' };
    
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [mockRecord] }) // SELECT contract
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // DELETE audit_logs
      .mockResolvedValueOnce({ rows: [mockRecord], rowCount: 1 }) // DELETE contract
      .mockResolvedValueOnce({ rows: [] }); // COMMIT
    
    const result = await Contract.delete(1);
    
    expect(result).toEqual(mockRecord);
    expect(mockClient.release).toHaveBeenCalled();
  });
});
