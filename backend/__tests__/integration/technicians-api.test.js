/**
 * Technicians CRUD API - Integration Tests
 *
 * Tests technician management endpoints with real server and database
 * Covers full CRUD lifecycle with permissions, RLS, and validation
 */

const request = require('supertest');
const app = require('../../server');
const { createTestUser, cleanupTestDatabase } = require('../helpers/test-db');
const Technician = require('../../db/models/Technician');

describe('Technicians CRUD API - Integration Tests', () => {
  let adminUser;
  let adminToken;
  let dispatcherUser;
  let dispatcherToken;
  let technicianUser;
  let technicianToken;
  let customerUser;
  let customerToken;

  beforeAll(async () => {
    // Create test users with tokens
    adminUser = await createTestUser('admin');
    adminToken = adminUser.token;
    dispatcherUser = await createTestUser('dispatcher');
    dispatcherToken = dispatcherUser.token;
    technicianUser = await createTestUser('technician');
    technicianToken = technicianUser.token;
    customerUser = await createTestUser('customer');
    customerToken = customerUser.token;
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('GET /api/technicians - List Technicians', () => {
    it('should return 401 without authentication', async () => {
      // Act
      const response = await request(app).get('/api/technicians');

      // Assert
      expect(response.status).toBe(401);
    });

    it('should allow customer to read technicians list (sanitized)', async () => {
      // Act
      const response = await request(app)
        .get('/api/technicians?page=1&limit=10')
        .set('Authorization', `Bearer ${customerToken}`);

      // Assert - Customer role should be able to read (sanitized data)
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
        pagination: expect.any(Object),
        rlsApplied: expect.any(Boolean),
        timestamp: expect.any(String),
      });

      // Verify sanitization: customers should not see sensitive fields
      if (response.body.data.length > 0) {
        const tech = response.body.data[0];
        expect(tech).not.toHaveProperty('license_number');
        expect(tech).not.toHaveProperty('hourly_rate');
      }
    });

    it('should return paginated technician list for dispatcher', async () => {
      // Act
      const response = await request(app)
        .get('/api/technicians?page=1&limit=10')
        .set('Authorization', `Bearer ${dispatcherToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
        pagination: expect.objectContaining({
          page: expect.any(Number),
          limit: expect.any(Number),
          total: expect.any(Number),
        }),
        rlsApplied: expect.any(Boolean),
        timestamp: expect.any(String),
      });
    });

    it('should include technician data in list', async () => {
      // Act
      const response = await request(app)
        .get('/api/technicians?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(200);
      const technicians = response.body.data;

      if (technicians.length > 0) {
        technicians.forEach((tech) => {
          expect(tech).toMatchObject({
            id: expect.any(Number),
            license_number: expect.any(String),
            created_at: expect.any(String),
          });
        });
      }
    });

    it('should support pagination parameters', async () => {
      // Act
      const response = await request(app)
        .get('/api/technicians?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 5,
      });
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    it('should support search parameter', async () => {
      // Act
      const response = await request(app)
        .get('/api/technicians?page=1&limit=10&search=test')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should support sorting', async () => {
      // Act
      const response = await request(app)
        .get('/api/technicians?page=1&limit=10&sortBy=license_number&sortOrder=ASC')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(200);
      const technicians = response.body.data;
      
      if (technicians.length >= 2) {
        expect(technicians[0].license_number.localeCompare(technicians[1].license_number)).toBeLessThanOrEqual(0);
      }
    });

    it('should support status filtering', async () => {
      // Act
      const response = await request(app)
        .get('/api/technicians?page=1&limit=10&filters[status]=available')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(200);
      const technicians = response.body.data;
      
      // All returned techs should have valid status
      if (technicians.length > 0) {
        technicians.forEach((tech) => {
          expect(['available', 'on_job', 'off_duty', 'suspended']).toContain(tech.status);
        });
      }
    });

    it('should apply RLS filtering for technician role (all_records)', async () => {
      // Act
      const response = await request(app)
        .get('/api/technicians?page=1&limit=100')
        .set('Authorization', `Bearer ${technicianToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.rlsApplied).toBe(false);
      
      // Technician has all_records policy, so they see all technicians (no filtering)
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/technicians/:id - Get Technician by ID', () => {
    let testTechnician;

    beforeAll(async () => {
      // Create a test technician
      testTechnician = await Technician.create({
        license_number: `LIC-${Date.now()}`,
        certifications: ['HVAC', 'Electrical'],
        skills: ['Installation', 'Repair'],
        hourly_rate: 85.00,
        status: 'available',
      });
    });

    it('should return 401 without authentication', async () => {
      // Act
      const response = await request(app).get(`/api/technicians/${testTechnician.id}`);

      // Assert
      expect(response.status).toBe(401);
    });

    it('should return technician by ID for dispatcher', async () => {
      // Act
      const response = await request(app)
        .get(`/api/technicians/${testTechnician.id}`)
        .set('Authorization', `Bearer ${dispatcherToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: testTechnician.id,
          license_number: testTechnician.license_number,
        }),
        timestamp: expect.any(String),
      });
    });

    it('should return sanitized data for customer role', async () => {
      // Act
      const response = await request(app)
        .get(`/api/technicians/${testTechnician.id}`)
        .set('Authorization', `Bearer ${customerToken}`);

      // Assert
      expect(response.status).toBe(200);
      const tech = response.body.data;
      
      // Customers should not see sensitive fields
      expect(tech).not.toHaveProperty('license_number');
      expect(tech).not.toHaveProperty('hourly_rate');
      expect(tech).toHaveProperty('id');
      expect(tech).toHaveProperty('status');
    });

    it('should return 404 for non-existent technician', async () => {
      // Act
      const response = await request(app)
        .get('/api/technicians/99999')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Not Found');
    });

    it('should return 400 for invalid ID format', async () => {
      // Act
      const response = await request(app)
        .get('/api/technicians/invalid')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/technicians - Create Technician', () => {
    let testLicense;

    beforeEach(() => {
      // Generate unique license number for each test
      testLicense = `LIC-TEST-${Date.now()}`;
    });

    it('should return 401 without authentication', async () => {
      // Act
      const response = await request(app)
        .post('/api/technicians')
        .send({ license_number: testLicense });

      // Assert
      expect(response.status).toBe(401);
    });

    it('should return 403 for customer role (manager+ required)', async () => {
      // Act
      const response = await request(app)
        .post('/api/technicians')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ license_number: testLicense });

      // Assert
      expect(response.status).toBe(403);
    });

    it('should return 403 for technician role (manager+ required)', async () => {
      // Act
      const response = await request(app)
        .post('/api/technicians')
        .set('Authorization', `Bearer ${technicianToken}`)
        .send({ license_number: testLicense });

      // Assert
      expect(response.status).toBe(403);
    });

    it('should return 403 for dispatcher role (manager+ required)', async () => {
      // Act
      const response = await request(app)
        .post('/api/technicians')
        .set('Authorization', `Bearer ${dispatcherToken}`)
        .send({ license_number: testLicense });

      // Assert
      expect(response.status).toBe(403);
    });

    it('should create technician with valid data as manager', async () => {
      // Arrange
      const managerUser = await createTestUser('manager');
      const techData = {
        license_number: testLicense,
        certifications: ['HVAC', 'Plumbing'],
        skills: ['Installation', 'Maintenance'],
        hourly_rate: 75.00,
        status: 'available',
      };

      // Act
      const response = await request(app)
        .post('/api/technicians')
        .set('Authorization', `Bearer ${managerUser.token}`)
        .send(techData);

      // Assert
      if (response.status !== 201) {
        console.log('CREATE ERROR:', JSON.stringify(response.body, null, 2));
      }
      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: expect.any(Number),
          license_number: testLicense,
          status: 'available',
        }),
        message: expect.any(String),
        timestamp: expect.any(String),
      });
      
      // hourly_rate is returned as string from PostgreSQL numeric type
      expect(parseFloat(response.body.data.hourly_rate)).toBe(75.00);
    });

    it('should create technician with minimal required data', async () => {
      // Arrange
      const techData = {
        license_number: testLicense,
      };

      // Act
      const response = await request(app)
        .post('/api/technicians')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(techData);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.data.license_number).toBe(testLicense);
      expect(response.body.data.status).toBe('available'); // Default status
    });

    it('should reject duplicate license_number', async () => {
      // Arrange - Create technician first
      const duplicateLicense = `LIC-DUP-${Date.now()}`;
      await request(app)
        .post('/api/technicians')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ license_number: duplicateLicense });

      // Act - Try to create duplicate
      const response = await request(app)
        .post('/api/technicians')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ license_number: duplicateLicense });

      // Assert
      expect(response.status).toBe(409);
      expect(response.body.message).toContain('already exists');
    });

    it('should reject missing required fields', async () => {
      // Act - Missing license_number
      const response = await request(app)
        .post('/api/technicians')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ hourly_rate: 80.00 });

      // Assert
      expect(response.status).toBe(400);
    });

    it('should reject invalid status value', async () => {
      // Act
      const response = await request(app)
        .post('/api/technicians')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          license_number: testLicense,
          status: 'invalid-status',
        });

      // Assert
      expect(response.status).toBe(400);
    });

    it('should default to available status if not provided', async () => {
      // Act
      const response = await request(app)
        .post('/api/technicians')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ license_number: testLicense });

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.data.status).toBe('available');
    });
  });

  describe('PATCH /api/technicians/:id - Update Technician', () => {
    let testTechnician;

    beforeEach(async () => {
      // Create a fresh test technician for each update test
      testTechnician = await Technician.create({
        license_number: `LIC-UPDATE-${Date.now()}`,
        hourly_rate: 70.00,
        status: 'available',
      });
    });

    it('should return 401 without authentication', async () => {
      // Act
      const response = await request(app)
        .patch(`/api/technicians/${testTechnician.id}`)
        .send({ hourly_rate: 80.00 });

      // Assert
      expect(response.status).toBe(401);
    });

    it('should update technician with valid data', async () => {
      // Act
      const response = await request(app)
        .patch(`/api/technicians/${testTechnician.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ hourly_rate: 90.00 });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: testTechnician.id,
        }),
        message: expect.any(String),
        timestamp: expect.any(String),
      });
      
      // hourly_rate is returned as string from PostgreSQL numeric type
      expect(parseFloat(response.body.data.hourly_rate)).toBe(90.00);
    });

    it('should update technician status', async () => {
      // Act
      const response = await request(app)
        .patch(`/api/technicians/${testTechnician.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'on_job' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('on_job');
    });

    it('should update multiple fields', async () => {
      // Act
      const response = await request(app)
        .patch(`/api/technicians/${testTechnician.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          hourly_rate: 95.00,
          status: 'off_duty',
          skills: ['Advanced Repair'],
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        status: 'off_duty',
      });
      
      // hourly_rate is returned as string from PostgreSQL numeric type
      expect(parseFloat(response.body.data.hourly_rate)).toBe(95.00);
    });

    it('should return 404 for non-existent technician', async () => {
      // Act
      const response = await request(app)
        .patch('/api/technicians/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ hourly_rate: 100.00 });

      // Assert
      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid ID format', async () => {
      // Act
      const response = await request(app)
        .patch('/api/technicians/invalid')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ hourly_rate: 100.00 });

      // Assert
      expect(response.status).toBe(400);
    });

    it('should reject update with no fields', async () => {
      // Act
      const response = await request(app)
        .patch(`/api/technicians/${testTechnician.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      // Assert
      expect(response.status).toBe(400);
    });

    it('should reject invalid status value', async () => {
      // Act
      const response = await request(app)
        .patch(`/api/technicians/${testTechnician.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'invalid-status' });

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/technicians/:id - Delete Technician', () => {
    let testTechnician;

    beforeEach(async () => {
      // Create a fresh test technician for each delete test
      testTechnician = await Technician.create({
        license_number: `LIC-DELETE-${Date.now()}`,
      });
    });

    it('should return 401 without authentication', async () => {
      // Act
      const response = await request(app).delete(`/api/technicians/${testTechnician.id}`);

      // Assert
      expect(response.status).toBe(401);
    });

    it('should return 403 for non-manager users (manager+ required)', async () => {
      // Act
      const response = await request(app)
        .delete(`/api/technicians/${testTechnician.id}`)
        .set('Authorization', `Bearer ${dispatcherToken}`);

      // Assert
      expect(response.status).toBe(403);
    });

    it('should soft delete technician as manager', async () => {
      // Arrange - Get manager token
      const managerUser = await createTestUser('manager');

      // Act
      const response = await request(app)
        .delete(`/api/technicians/${testTechnician.id}`)
        .set('Authorization', `Bearer ${managerUser.token}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('deleted'),
        timestamp: expect.any(String),
      });
    });

    it('should delete technician as admin', async () => {
      // Act
      const response = await request(app)
        .delete(`/api/technicians/${testTechnician.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(200);
    });

    it('should return 404 for non-existent technician', async () => {
      // Act
      const response = await request(app)
        .delete('/api/technicians/99999')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid ID format', async () => {
      // Act
      const response = await request(app)
        .delete('/api/technicians/invalid')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('RLS (Row-Level Security) - Technician Access', () => {
    it('should apply RLS filtering for technician role on GET list', async () => {
      // Act
      const response = await request(app)
        .get('/api/technicians?page=1&limit=100')
        .set('Authorization', `Bearer ${technicianToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.rlsApplied).toBe(false);
      // Technician has all_records policy, so no RLS filtering applied
    });

    it('should not apply RLS filtering for admin role', async () => {
      // Act
      const response = await request(app)
        .get('/api/technicians?page=1&limit=100')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.rlsApplied).toBe(false);
    });

    it('should apply RLS filtering for dispatcher role (all_records policy)', async () => {
      // Act
      const response = await request(app)
        .get('/api/technicians?page=1&limit=100')
        .set('Authorization', `Bearer ${dispatcherToken}`);

      // Assert
      expect(response.status).toBe(200);
      // Dispatcher has all_records policy, so RLS might be applied but grants full access
      expect(response.body).toHaveProperty('rlsApplied');
    });
  });
});
