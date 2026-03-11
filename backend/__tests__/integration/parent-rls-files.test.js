/**
 * Parent RLS for File Sub-Routes - Integration Tests
 *
 * Verifies file attachment endpoints correctly enforce RLS on parent entities.
 * SECURITY: Customers cannot access other customers' files.
 *
 * TEST SCENARIOS:
 * - Customer A can access files on their own work orders
 * - Customer A CANNOT access files on Customer B's work orders (returns 404)
 * - Technician can access files on assigned work orders
 * - Technician CANNOT access files on unassigned work orders (returns 404)
 * - Admin can access files on any work order (null filterConfig)
 */

const request = require('supertest');
const app = require('../../server');
const {
  setupTestDatabase,
  cleanupTestDatabase,
  getTestPool,
  createTestUser,
  createCustomerProfile,
  createTechnicianProfile,
  linkUserToCustomerProfile,
  linkUserToTechnicianProfile,
  createWorkOrder,
} = require('../helpers/test-db');
const { HTTP_STATUS } = require('../../config/constants');

describe('Parent RLS for File Sub-Routes', () => {
  let pool;

  // Test users
  let adminToken;
  let customerAToken, customerAProfileId;
  let customerBToken, customerBProfileId;
  let technicianToken, technicianProfileId;

  // Test work orders
  let workOrderA; // Belongs to Customer A
  let workOrderB; // Belongs to Customer B
  let workOrderAssigned; // Assigned to Technician

  beforeAll(async () => {
    await setupTestDatabase();
    pool = getTestPool();

    // Create admin user (no profile needed)
    const admin = await createTestUser('admin');
    adminToken = admin.token;

    // Create Customer A with profile
    customerAProfileId = await createCustomerProfile('CustomerA');
    const custA = await createTestUser({ role: 'customer' });
    customerAToken = custA.token;
    await linkUserToCustomerProfile(custA.user.id, customerAProfileId);

    // Create Customer B with profile
    customerBProfileId = await createCustomerProfile('CustomerB');
    const custB = await createTestUser({ role: 'customer' });
    customerBToken = custB.token;
    await linkUserToCustomerProfile(custB.user.id, customerBProfileId);

    // Create Technician with profile
    technicianProfileId = await createTechnicianProfile('TechOne');
    const tech = await createTestUser({ role: 'technician' });
    technicianToken = tech.token;
    await linkUserToTechnicianProfile(tech.user.id, technicianProfileId);

    // Create work orders
    workOrderA = await createWorkOrder(customerAProfileId);
    workOrderB = await createWorkOrder(customerBProfileId);
    workOrderAssigned = await createWorkOrder(customerAProfileId, technicianProfileId);
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  // ============================================================================
  // CUSTOMER RLS TESTS
  // ============================================================================

  describe('Customer RLS on Work Order Files', () => {
    test('Customer A can list files on their own work order', async () => {
      const response = await request(app)
        .get(`/api/work_orders/${workOrderA.id}/files`)
        .set('Authorization', `Bearer ${customerAToken}`);

      // Should succeed (200) or fail due to storage not configured (503)
      // Both are acceptable - we're testing RLS, not storage
      expect([HTTP_STATUS.OK, HTTP_STATUS.SERVICE_UNAVAILABLE]).toContain(
        response.status,
      );

      // The key point: NOT 404 (access denied)
      expect(response.status).not.toBe(HTTP_STATUS.NOT_FOUND);
    });

    test('Customer A CANNOT list files on Customer B work order (returns 404)', async () => {
      const response = await request(app)
        .get(`/api/work_orders/${workOrderB.id}/files`)
        .set('Authorization', `Bearer ${customerAToken}`);

      // SECURITY: Should return 404 to hide existence of work order
      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
    });

    test('Customer B CANNOT list files on Customer A work order (returns 404)', async () => {
      const response = await request(app)
        .get(`/api/work_orders/${workOrderA.id}/files`)
        .set('Authorization', `Bearer ${customerBToken}`);

      // SECURITY: Should return 404 to hide existence of work order
      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
    });

    test('Customer A CANNOT upload to Customer B work order (returns 404)', async () => {
      const response = await request(app)
        .post(`/api/work_orders/${workOrderB.id}/files`)
        .set('Authorization', `Bearer ${customerAToken}`)
        .set('Content-Type', 'text/plain')
        .set('X-Filename', 'test.txt')
        .send(Buffer.from('test content'));

      // SECURITY: Should return 404 to hide existence
      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
    });

    test('Customer A CANNOT delete file on Customer B work order (returns 404)', async () => {
      const response = await request(app)
        .delete(`/api/work_orders/${workOrderB.id}/files/1`)
        .set('Authorization', `Bearer ${customerAToken}`);

      // SECURITY: Should return 404 to hide existence
      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
    });
  });

  // ============================================================================
  // TECHNICIAN RLS TESTS
  // ============================================================================

  describe('Technician RLS on Work Order Files', () => {
    test('Technician can list files on assigned work order', async () => {
      const response = await request(app)
        .get(`/api/work_orders/${workOrderAssigned.id}/files`)
        .set('Authorization', `Bearer ${technicianToken}`);

      // Should succeed (200) or fail due to storage not configured (503)
      expect([HTTP_STATUS.OK, HTTP_STATUS.SERVICE_UNAVAILABLE]).toContain(
        response.status,
      );

      // The key point: NOT 404 (access denied)
      expect(response.status).not.toBe(HTTP_STATUS.NOT_FOUND);
    });

    test('Technician CANNOT list files on unassigned work order (returns 404)', async () => {
      const response = await request(app)
        .get(`/api/work_orders/${workOrderA.id}/files`)
        .set('Authorization', `Bearer ${technicianToken}`);

      // SECURITY: Should return 404 to hide existence
      // workOrderA is not assigned to this technician
      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
    });

    test('Technician CANNOT upload to unassigned work order (returns 404)', async () => {
      const response = await request(app)
        .post(`/api/work_orders/${workOrderA.id}/files`)
        .set('Authorization', `Bearer ${technicianToken}`)
        .set('Content-Type', 'text/plain')
        .set('X-Filename', 'test.txt')
        .send(Buffer.from('test content'));

      // SECURITY: Should return 404 to hide existence
      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
    });
  });

  // ============================================================================
  // ADMIN ACCESS TESTS
  // ============================================================================

  describe('Admin access (null filterConfig)', () => {
    test('Admin can list files on any work order', async () => {
      // Admin should be able to access Customer A's work order
      const responseA = await request(app)
        .get(`/api/work_orders/${workOrderA.id}/files`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([HTTP_STATUS.OK, HTTP_STATUS.SERVICE_UNAVAILABLE]).toContain(
        responseA.status,
      );
      expect(responseA.status).not.toBe(HTTP_STATUS.NOT_FOUND);

      // Admin should be able to access Customer B's work order
      const responseB = await request(app)
        .get(`/api/work_orders/${workOrderB.id}/files`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([HTTP_STATUS.OK, HTTP_STATUS.SERVICE_UNAVAILABLE]).toContain(
        responseB.status,
      );
      expect(responseB.status).not.toBe(HTTP_STATUS.NOT_FOUND);
    });

    test('Admin can access assigned and unassigned work orders', async () => {
      const response = await request(app)
        .get(`/api/work_orders/${workOrderAssigned.id}/files`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([HTTP_STATUS.OK, HTTP_STATUS.SERVICE_UNAVAILABLE]).toContain(
        response.status,
      );
      expect(response.status).not.toBe(HTTP_STATUS.NOT_FOUND);
    });
  });

  // ============================================================================
  // NON-EXISTENT WORK ORDER TESTS
  // ============================================================================

  describe('Non-existent work orders', () => {
    test('Should return 404 for non-existent work order (any role)', async () => {
      const nonExistentId = 999999;

      // Customer
      const customerResponse = await request(app)
        .get(`/api/work_orders/${nonExistentId}/files`)
        .set('Authorization', `Bearer ${customerAToken}`);
      expect(customerResponse.status).toBe(HTTP_STATUS.NOT_FOUND);

      // Admin
      const adminResponse = await request(app)
        .get(`/api/work_orders/${nonExistentId}/files`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminResponse.status).toBe(HTTP_STATUS.NOT_FOUND);
    });
  });
});
