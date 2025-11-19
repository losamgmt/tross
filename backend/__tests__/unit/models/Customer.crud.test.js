/**
 * Customer Model - CRUD Operations Tests
 * Tests core CRUD operations with mocked database connection
 * Methods: findAll, findById, create, update, delete
 */

// Mock database BEFORE requiring Customer model
jest.mock('../../../db/connection', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
}));

const Customer = require('../../../db/models/Customer');
const db = require('../../../db/connection');

describe('Customer Model - CRUD Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll()', () => {
    it('should return paginated customers', async () => {
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

    it('should handle empty results', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ count: '0' }] });
      db.query.mockResolvedValueOnce({ rows: [] });

      const result = await Customer.findAll({ page: 1, limit: 50 });

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('findById()', () => {
    it('should return customer by ID', async () => {
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

    it('should return null for non-existent customer', async () => {
      db.query.mockResolvedValue({ rows: [] });

      const customer = await Customer.findById(999);

      expect(customer).toBeNull();
    });
  });

  describe('create()', () => {
    it('should create a new customer', async () => {
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
    it('should update a customer', async () => {
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
    it('should hard delete a customer', async () => {
      const deletedCustomer = { id: 1, email: 'deleted@example.com', is_active: false };
      db.query.mockResolvedValue({ rows: [deletedCustomer] });

      const result = await Customer.delete(1);

      expect(result).toEqual(deletedCustomer);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM customers'),
        [1],
      );
    });

    it('should throw error if customer not found', async () => {
      db.query.mockResolvedValue({ rows: [] });

      await expect(Customer.delete(999)).rejects.toThrow('Failed to delete customer');
    });
  });
});
