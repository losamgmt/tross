/**
 * Customer Model - Validation Tests
 * Tests input validation, constraints, and error handling
 */

// Mock database
jest.mock('../../../db/connection', () => ({
  query: jest.fn(),
}));

const Customer = require('../../../db/models/Customer');
const db = require('../../../db/connection');

describe('Customer Model - Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Email Validation', () => {
    test('should reject duplicate email', async () => {
      db.query.mockRejectedValue({
        code: '23505',
        constraint: 'customers_email_key',
        message: 'duplicate key value violates unique constraint',
      });

      await expect(
        Customer.create({ email: 'existing@test.com' }),
      ).rejects.toThrow();
    });

    test('should reject null email', async () => {
      db.query.mockRejectedValue({
        code: '23502',
        message: 'null value in column "email" violates not-null constraint',
      });

      await expect(Customer.create({ email: null })).rejects.toThrow();
    });
  });

  describe('Status Validation', () => {
    test('should accept valid status values', async () => {
      const validStatuses = ['pending', 'active', 'suspended'];

      for (const status of validStatuses) {
        db.query.mockResolvedValueOnce({
          rows: [{ id: 1, email: 'test@test.com', status }],
        });

        const result = await Customer.create({ email: 'test@test.com', status });
        expect(result.status).toBe(status);
      }
    });

    test('should reject invalid status values', async () => {
      db.query.mockRejectedValue({
        code: '23514',
        message: 'new row for relation "customers" violates check constraint',
      });

      await expect(
        Customer.create({ email: 'test@test.com', status: 'invalid_status' }),
      ).rejects.toThrow();
    });
  });

  describe('Field Constraints', () => {
    test('should handle missing optional fields', async () => {
      db.query.mockResolvedValue({
        rows: [{ id: 1, email: 'minimal@test.com', phone: null, company_name: null }],
      });

      const result = await Customer.create({ email: 'minimal@test.com' });

      expect(result.email).toBe('minimal@test.com');
      expect(result.phone).toBeNull();
    });

    test('should accept JSONB fields for addresses', async () => {
      const address = { street: '123 Main St', city: 'Springfield', zip: '12345' };
      db.query.mockResolvedValue({
        rows: [{ id: 1, email: 'test@test.com', billing_address: address }],
      });

      const result = await Customer.create({
        email: 'test@test.com',
        billing_address: address,
      });

      expect(result.billing_address).toEqual(address);
    });
  });
});
