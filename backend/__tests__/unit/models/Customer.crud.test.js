/**
 * Customer Model - CRUD Operations Tests
 * Tests core CRUD operations with mocked database connection
 * Methods: findAll, findById, create, update, delete
 */

// Mock database BEFORE requiring Customer model - use enhanced mock
jest.mock('../../../db/connection', () => require('../../mocks').createDBMock());

const Customer = require('../../../db/models/Customer');
const db = require('../../../db/connection');

describe('Customer Model - CRUD Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll()', () => {
    test('should return paginated customers', async () => {
      const mockCustomers = [
        { id: 1, email: 'customer1@test.com', company_name: 'ACME Corp', is_active: true },
        { id: 2, email: 'customer2@test.com', company_name: 'Beta LLC', is_active: true },
      ];
      db.query.mockResolvedValueOnce({ rows: [{ count: '2' }] });
      db.query.mockResolvedValueOnce({ rows: mockCustomers });

      const result = await Customer.findAll({ page: 1, limit: 50 });

      expect(result.data).toEqual(mockCustomers);
      expect(result.pagination.total).toBe(2);
      expect(db.query).toHaveBeenCalledTimes(2);
    });

    test('should handle empty results', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ count: '0' }] });
      db.query.mockResolvedValueOnce({ rows: [] });

      const result = await Customer.findAll({ page: 1, limit: 50 });

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('findById()', () => {
    test('should return customer by ID', async () => {
      const mockCustomer = {
        id: 1,
        email: 'customer@test.com',
        company_name: 'ACME Corp',
        is_active: true,
      };
      db.query.mockResolvedValue({ rows: [mockCustomer] });

      const customer = await Customer.findById(1);

      expect(customer).toEqual(mockCustomer);
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SELECT'), [1]);
    });

    test('should return null for non-existent customer', async () => {
      db.query.mockResolvedValue({ rows: [] });

      const customer = await Customer.findById(999);

      expect(customer).toBeNull();
    });
  });

  describe('create()', () => {
    test('should create a new customer', async () => {
      const newCustomer = {
        email: 'new@test.com',
        company_name: 'New Corp',
        phone: '555-0100',
      };
      const createdCustomer = { id: 3, ...newCustomer, is_active: true };
      db.query.mockResolvedValue({ rows: [createdCustomer] });

      const result = await Customer.create(newCustomer);

      expect(result).toEqual(createdCustomer);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO customers'),
        expect.arrayContaining([newCustomer.email]),
      );
    });
  });

  describe('update()', () => {
    test('should update a customer', async () => {
      const updateData = { company_name: 'Updated Corp' };
      const updatedCustomer = { id: 1, email: 'test@test.com', ...updateData };
      db.query.mockResolvedValue({ rows: [updatedCustomer] });

      const result = await Customer.update(1, updateData);

      expect(result).toEqual(updatedCustomer);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE customers'),
        expect.any(Array),
      );
    });
  });

  describe('delete()', () => {
    test('should hard delete a customer', async () => {
      const deletedCustomer = { id: 1, email: 'deleted@example.com', is_active: false };
      
      const { createMockClient } = require('../../mocks');
      const mockClient = createMockClient();
      db.getClient.mockResolvedValue(mockClient);
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [deletedCustomer] }) // SELECT customer
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // DELETE audit_logs
        .mockResolvedValueOnce({ rows: [deletedCustomer], rowCount: 1 }) // DELETE customer
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await Customer.delete(1);

      expect(result).toEqual(deletedCustomer);
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should throw error if customer not found', async () => {
      const { createMockClient } = require('../../mocks');
      const mockClient = createMockClient();
      db.getClient.mockResolvedValue(mockClient);
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // SELECT customer - not found
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      await expect(Customer.delete(999)).rejects.toThrow('Customer not found');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
