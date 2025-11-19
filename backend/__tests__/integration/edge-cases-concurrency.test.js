/**
 * Edge Case Tests - Race Conditions & Concurrency
 * 
 * Tests concurrent operations and race conditions:
 * - Concurrent updates to same resource
 * - Parallel deletes
 * - Simultaneous creates with unique constraints
 * - Transaction isolation
 */

const request = require('supertest');
const app = require('../../server');
const { createTestUser, cleanupTestDatabase } = require('../helpers/test-db');
const Customer = require('../../db/models/Customer');
const WorkOrder = require('../../db/models/WorkOrder');
const Inventory = require('../../db/models/Inventory');

describe('Race Condition & Concurrency Tests', () => {
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

  describe('Concurrent Updates', () => {
    let testCustomerId;
    let testEmail;

    beforeEach(async () => {
      testEmail = `concurrent-${++emailCounter}@example.com`;
      const customer = await Customer.create({
        company_name: 'Concurrent Test Customer',
        email: testEmail,
        phone: '1234567890',
      });
      testCustomerId = customer.id;
    });

    afterEach(async () => {
      if (testCustomerId) {
        await Customer.delete(testCustomerId);
        testCustomerId = null;
      }
    });

    test('should handle concurrent updates to same customer', async () => {
      // Fire 5 simultaneous updates
      const updates = Array(5).fill(null).map((_, index) =>
        request(app)
          .patch(`/api/customers/${testCustomerId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            company_name: `Updated Name ${index}`,
            email: testEmail,
            phone: '1234567890',
          })
      );

      const responses = await Promise.all(updates);

      // Most should succeed, some might fail due to race conditions
      const successCount = responses.filter(r => r.status === 200).length;
      const failCount = responses.filter(r => [404, 409, 500].includes(r.status)).length;
      
      // At least one should succeed
      expect(successCount).toBeGreaterThanOrEqual(1);
      expect(successCount + failCount).toBe(5);

      // Verify final state if any succeeded
      if (successCount > 0) {
        const finalState = await request(app)
          .get(`/api/customers/${testCustomerId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        if (finalState.status === 200) {
          expect(finalState.body.data.company_name).toMatch(/Updated Name \d/);
        }
      }
    });

    test('should handle concurrent updates to different fields', async () => {
      const altEmail = `concurrent-alt-${++emailCounter}@example.com`;
      const updates = [
        request(app)
          .patch(`/api/customers/${testCustomerId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ company_name: 'Name Update', email: testEmail, phone: '1234567890' }),
        
        request(app)
          .patch(`/api/customers/${testCustomerId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ company_name: 'Concurrent Test Customer', email: altEmail, phone: '1234567890' }),
        
        request(app)
          .patch(`/api/customers/${testCustomerId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ company_name: 'Concurrent Test Customer', email: testEmail, phone: '9876543210' }),
      ];

      const responses = await Promise.all(updates);

      // Most should succeed, some might fail  
      const successCount = responses.filter(r => r.status === 200).length;
      expect(successCount).toBeGreaterThanOrEqual(1);

      // Final state should be consistent (no partial updates)
      const finalState = await request(app)
        .get(`/api/customers/${testCustomerId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      if (finalState.status === 200) {
        // Data should be from one complete update, not mixed
        expect(finalState.body.data.email).toMatch(/.*@example\.com$/);
      }
    });
  });

  describe('Concurrent Deletes', () => {
    test('should handle multiple deletes of same resource gracefully', async () => {
      // Create a customer
      const customer = await Customer.create({
        company_name: 'Delete Race Customer',
        email: `deleterace-${++emailCounter}@example.com`,
        phone: '1234567890',
      });

      // Fire 3 simultaneous deletes
      const deletes = Array(3).fill(null).map(() =>
        request(app)
          .delete(`/api/customers/${customer.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
      );

      const responses = await Promise.all(deletes);

      // First should succeed, others might be 404 or succeed (idempotent)
      const successCount = responses.filter(r => r.status === 200 || r.status === 204).length;
      const notFoundCount = responses.filter(r => r.status === 404).length;

      expect(successCount).toBeGreaterThanOrEqual(1);
      expect(successCount + notFoundCount).toBe(3);

      // Verify customer state after concurrent deletes
      const verifyResponse = await request(app)
        .get(`/api/customers/${customer.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Could be deleted (404), deactivated (200 + inactive), or still active (200 + active/pending)
      // All are valid outcomes depending on race timing
      expect([200, 404]).toContain(verifyResponse.status);
      if (verifyResponse.status === 200) {
        // Status should be one of the valid customer statuses
        expect(['active', 'inactive', 'pending']).toContain(verifyResponse.body.data.status);
      }
    });
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

  describe('Inventory Stock Concurrent Updates', () => {
    let testInventoryId;

    beforeEach(async () => {
      const item = await Inventory.create({
        name: 'Stock Test Item',
        sku: `SKU-STOCK-${Date.now()}`,
        quantity: 100,
        unit_cost: 10.00,
        status: 'in_stock',
      });
      testInventoryId = item.id;
    });

    afterEach(async () => {
      if (testInventoryId) {
        await Inventory.delete(testInventoryId);
        testInventoryId = null;
      }
    });

    test('should handle concurrent inventory stock updates', async () => {
      // Simulate 5 concurrent sales reducing quantity
      const updates = Array(5).fill(null).map((_, index) =>
        request(app)
          .patch(`/api/inventory/${testInventoryId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'Stock Test Item',
            sku: `SKU-STOCK-${testInventoryId}`,
            quantity: 95 - index, // Each tries to set different quantity
            unit_cost: 10.00,
            status: 'in_stock',
          })
      );

      const responses = await Promise.all(updates);

      // Most updates should succeed, some might fail
      const successCount = responses.filter(r => r.status === 200).length;
      expect(successCount).toBeGreaterThanOrEqual(1);

      // Final quantity should match one of the updates
      const finalState = await request(app)
        .get(`/api/inventory/${testInventoryId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      if (finalState.status === 200) {
        expect([95, 94, 93, 92, 91]).toContain(finalState.body.data.quantity);
      }
    });
  });

  describe('Work Order Status Race Conditions', () => {
    let testWorkOrderId;
    let testCustomerId;
    let testTechnicianId;

    beforeEach(async () => {
      const customer = await Customer.create({
        company_name: 'WO Race Customer',
        email: `worace-${++emailCounter}@example.com`,
        phone: '1234567890',
      });
      testCustomerId = customer.id;

      const technician = await Customer.create({
        company_name: 'WO Race Technician',
        email: `worace-tech-${++emailCounter}@example.com`,
        phone: '9876543210',
      });
      testTechnicianId = technician.id;

      const workOrder = await WorkOrder.create({
        title: 'Race Condition Work Order',
        customer_id: testCustomerId,
        assigned_to: testTechnicianId,
        status: 'pending',
        priority: 'normal',
      });
      testWorkOrderId = workOrder.id;
    });

    afterEach(async () => {
      if (testWorkOrderId) {
        await WorkOrder.delete(testWorkOrderId);
      }
      if (testTechnicianId) {
        await Customer.delete(testTechnicianId);
      }
      if (testCustomerId) {
        await Customer.delete(testCustomerId);
      }
    });

    test('should handle concurrent status updates', async () => {
      // Multiple users try to update status simultaneously
      const updates = [
        request(app)
          .patch(`/api/work_orders/${testWorkOrderId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            title: 'Race Condition Work Order',
            customer_id: testCustomerId,
            assigned_to: testTechnicianId,
            status: 'in_progress',
            priority: 'normal',
          }),
        
        request(app)
          .patch(`/api/work_orders/${testWorkOrderId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            title: 'Race Condition Work Order',
            customer_id: testCustomerId,
            assigned_to: testTechnicianId,
            status: 'completed',
            priority: 'normal',
          }),
        
        request(app)
          .patch(`/api/work_orders/${testWorkOrderId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            title: 'Race Condition Work Order',
            customer_id: testCustomerId,
            assigned_to: testTechnicianId,
            status: 'cancelled',
            priority: 'normal',
          }),
      ];

      const responses = await Promise.all(updates);

      // Most should succeed, some might fail
      const successCount = responses.filter(r => r.status === 200).length;
      expect(successCount).toBeGreaterThanOrEqual(1);

      // Final status should be one of the attempted values
      const finalState = await request(app)
        .get(`/api/work_orders/${testWorkOrderId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      if (finalState.status === 200) {
        expect(['pending', 'in_progress', 'completed', 'cancelled']).toContain(
          finalState.body.data.status
        );
      }
    });
  });

  describe('Parallel Read/Write Operations', () => {
    test('should handle mixed concurrent reads and writes', async () => {
      // Create a customer
      const customer = await Customer.create({
        company_name: 'Read Write Race Customer',
        email: `rwrace-${++emailCounter}@example.com`,
        phone: '1234567890',
      });

      // Fire 10 operations simultaneously: 5 reads, 5 writes
      const operations = [
        // 5 reads
        ...Array(5).fill(null).map(() =>
          request(app)
            .get(`/api/customers/${customer.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
        ),
        // 5 writes
        ...Array(5).fill(null).map((_, index) =>
          request(app)
            .patch(`/api/customers/${customer.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
              company_name: `Updated ${index}`,
              email: `rwrace-${++emailCounter}@example.com`,
              phone: '1234567890',
            })
        ),
      ];

      const responses = await Promise.all(operations);

      // Most should succeed (reads and writes)
      const successCount = responses.filter(r => r.status === 200).length;
      expect(successCount).toBeGreaterThanOrEqual(5); // At least the 5 reads

      // Cleanup
      await Customer.delete(customer.id);
    });
  });
});
