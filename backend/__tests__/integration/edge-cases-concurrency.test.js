/**
 * Edge Case Tests - Unique Constraint Enforcement
 * 
 * Tests that unique constraints are properly enforced under concurrent load.
 * These tests have DETERMINISTIC outcomes - exactly one success, rest fail.
 * 
 * Non-deterministic "stress tests" have been removed - they don't test
 * business logic and produce flaky results.
 */

const request = require('supertest');
const app = require('../../server');
const { createTestUser, cleanupTestDatabase } = require('../helpers/test-db');
const Customer = require('../../db/models/Customer');

describe('Unique Constraint Enforcement Tests', () => {
  let adminUser;
  let adminToken;
  let emailCounter = 0;

  beforeAll(async () => {
    adminUser = await createTestUser('admin');
    adminToken = adminUser.token;
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('Unique Constraint Races', () => {
    test('should prevent duplicate email creation in concurrent requests', async () => {
      const testEmail = `uniquerace-${++emailCounter}@example.com`;
      
      // Fire 3 simultaneous creates with same email
      const creates = Array(3).fill(null).map((_, index) =>
        request(app)
          .post('/api/customers')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            company_name: `Duplicate Email ${index}`,
            email: testEmail,
            phone: '1234567890',
          })
      );

      const responses = await Promise.all(creates);

      // Only one should succeed, others should fail with 409
      const successCount = responses.filter(r => r.status === 201).length;
      const conflictCount = responses.filter(r => r.status === 409).length;

      expect(successCount).toBe(1);
      expect(conflictCount).toBe(2);
      
      // Clean up created customer(s)
      const result = await Customer.findAll({ email: testEmail });
      if (result && result.data) {
        for (const customer of result.data) {
          await Customer.delete(customer.id);
        }
      }
    });
  });
});
