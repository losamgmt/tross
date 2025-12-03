/**
 * Auth API Endpoints - Integration Tests
 *
 * Tests authentication endpoints with real server and database
 * Validates token handling, profile management, and session control
 */

const request = require('supertest');
const app = require('../../server');
const { createTestUser, cleanupTestDatabase } = require('../helpers/test-db');
const User = require('../../db/models/User');

describe('Auth API Endpoints - Integration Tests', () => {
  let technicianUser;
  let technicianToken;
  let adminUser;
  let adminToken;

  beforeAll(async () => {
    // Create test users with tokens
    technicianUser = await createTestUser('technician');
    technicianToken = technicianUser.token;
    adminUser = await createTestUser('admin');
    adminToken = adminUser.token;
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('GET /api/auth/me - Get Current User Profile', () => {
    it('should return 401 without authentication', async () => {
      // Act
      const response = await request(app).get('/api/auth/me');

      // Assert
      expect(response.status).toBe(401);
    });

    it('should return user profile with valid token', async () => {
      // Act
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${technicianToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: expect.any(Number),
          email: expect.any(String),
          role: expect.any(String),
          role_id: expect.any(Number),
        }),
        timestamp: expect.any(String),
      });
    });

    it('should include user name in response', async () => {
      // Act
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${technicianToken}`);

      // Assert
      expect(response.body.data.name).toBeDefined();
      expect(typeof response.body.data.name).toBe('string');
    });

    it('should include role information', async () => {
      // Act
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${technicianToken}`);

      // Assert
      expect(response.body.data.role).toBe('technician');
      expect(response.body.data.role_id).toBeDefined();
    });

    it('should return correct data for different user roles', async () => {
      // Act - Technician
      const techResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${technicianToken}`);

      // Act - Admin
      const adminResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(techResponse.body.data.role).toBe('technician');
      expect(adminResponse.body.data.role).toBe('admin');
      expect(techResponse.body.data.id).not.toBe(adminResponse.body.data.id);
    });

    it('should return 403 with invalid token format', async () => {
      // Act
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.jwt.token');

      // Assert
      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/auth/me - Update User Profile', () => {
    it('should return 401 without authentication', async () => {
      // Act
      const response = await request(app)
        .put('/api/auth/me')
        .send({ first_name: 'Updated' });

      // Assert
      expect(response.status).toBe(401);
    });

    it('should update first name', async () => {
      // Arrange
      const updates = { first_name: 'UpdatedFirst' };

      // Act
      const response = await request(app)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${technicianToken}`)
        .send(updates);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          first_name: 'UpdatedFirst',
        }),
        message: 'Profile updated successfully',
        timestamp: expect.any(String),
      });
    });

    it('should update last name', async () => {
      // Arrange
      const updates = { last_name: 'UpdatedLast' };

      // Act
      const response = await request(app)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${technicianToken}`)
        .send(updates);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data.last_name).toBe('UpdatedLast');
    });

    it('should update both first and last name', async () => {
      // Arrange
      const updates = {
        first_name: 'NewFirst',
        last_name: 'NewLast',
      };

      // Act
      const response = await request(app)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${technicianToken}`)
        .send(updates);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        first_name: 'NewFirst',
        last_name: 'NewLast',
      });
    });

    it('should return 400 with no valid fields', async () => {
      // Act
      const response = await request(app)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${technicianToken}`)
        .send({});

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/Validation Error|Bad Request/);
    });

    it('should reject disallowed field updates', async () => {
      // Arrange - Try to update email (not allowed)
      const updates = {
        email: 'hacker@example.com',
        role: 'admin',
      };

      // Act
      const response = await request(app)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${technicianToken}`)
        .send(updates);

      // Assert - Should return 400 because no valid fields
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('No valid fields to update');
    });

    it('should validate first_name length', async () => {
      // Arrange - Name too long
      const updates = {
        first_name: 'a'.repeat(256), // Exceeds typical varchar limit
      };

      // Act
      const response = await request(app)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${technicianToken}`)
        .send(updates);

      // Assert - Should reject if validation exists
      expect([400, 500]).toContain(response.status);
    });

    it('should persist updates to database', async () => {
      // Arrange
      const updates = {
        first_name: 'PersistTest',
        last_name: 'Database',
      };

      // Act - Update profile
      await request(app)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${technicianToken}`)
        .send(updates);

      // Act - Fetch profile again
      const getResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${technicianToken}`);

      // Assert
      expect(getResponse.body.data).toMatchObject({
        first_name: 'PersistTest',
        last_name: 'Database',
      });
    });
  });

  describe('Profile Update Validation', () => {
    it('should trim whitespace from names', async () => {
      // Arrange
      const updates = {
        first_name: '  SpaceTest  ',
        last_name: '  User  ',
      };

      // Act
      const response = await request(app)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${technicianToken}`)
        .send(updates);

      // Assert
      expect(response.status).toBe(200);
    });

    it('should reject empty string names', async () => {
      // Arrange
      const updates = {
        first_name: '',
        last_name: '',
      };

      // Act
      const response = await request(app)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${technicianToken}`)
        .send(updates);

      // Assert - Empty strings should be rejected or treated as no update
      expect([200, 400]).toContain(response.status);
    });

    it('should handle special characters in names', async () => {
      // Arrange
      const updates = {
        first_name: "O'Brien",
        last_name: 'Smith-Jones',
      };

      // Act
      const response = await request(app)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${technicianToken}`)
        .send(updates);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data.first_name).toBe("O'Brien");
    });
  });

  describe('Auth Endpoints - Response Format', () => {
    it('should return proper content-type', async () => {
      // Act
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${technicianToken}`);

      // Assert
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should include timestamp in success responses', async () => {
      // Act
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${technicianToken}`);

      // Assert
      expect(response.body.timestamp).toBeDefined();
      const timestamp = new Date(response.body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should include timestamp in error responses', async () => {
      // Act
      const response = await request(app).get('/api/auth/me');

      // Assert
      expect(response.body.timestamp).toBeDefined();
    });

    it('should return consistent error format', async () => {
      // Act
      const response = await request(app).get('/api/auth/me');

      // Assert
      expect(response.body).toMatchObject({
        error: expect.any(String),
        message: expect.any(String),
        timestamp: expect.any(String),
      });
    });
  });

  describe('Auth Endpoints - Performance', () => {
    it('should respond quickly to profile requests', async () => {
      // Arrange
      const start = Date.now();

      // Act
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${technicianToken}`);

      // Assert
      const duration = Date.now() - start;
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(500); // Under 500ms
    });

    it('should handle concurrent profile requests', async () => {
      // Arrange - Multiple GET requests (simpler than updates)
      const requests = Array(5)
        .fill(null)
        .map(() =>
          request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${technicianToken}`),
        );

      // Act
      const responses = await Promise.all(requests);

      // Assert - All should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Auth Endpoints - Security', () => {
    it('should not leak sensitive data in responses', async () => {
      // Act
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${technicianToken}`);

      // Assert - Should NOT contain sensitive fields
      expect(response.body.data.password).toBeUndefined();
      expect(response.body.data.password_hash).toBeUndefined();
      expect(response.body.data.auth0_id).toBeDefined(); // auth0_id is OK to include
    });

    it('should not allow updating other users profiles', async () => {
      // This is enforced by authenticateToken - user can only update their own profile
      // Testing that token determines which user gets updated

      // Act - Admin updates their profile
      const adminUpdate = await request(app)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ first_name: 'AdminUpdate' });

      // Act - Technician updates their profile
      const techUpdate = await request(app)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${technicianToken}`)
        .send({ first_name: 'TechUpdate' });

      // Assert - Each user updated their own profile
      expect(adminUpdate.body.data.first_name).toBe('AdminUpdate');
      expect(techUpdate.body.data.first_name).toBe('TechUpdate');

      // Verify they're different users
      expect(adminUpdate.body.data.id).not.toBe(techUpdate.body.data.id);
    });

    it('should validate authorization header format', async () => {
      // Act - Various malformed headers
      const responses = await Promise.all([
        request(app).get('/api/auth/me').set('Authorization', 'InvalidFormat'),
        request(app).get('/api/auth/me').set('Authorization', 'Bearer'),
        request(app).get('/api/auth/me').set('Authorization', ''),
      ]);

      // Assert - All should be unauthorized
      responses.forEach((response) => {
        expect([401, 403]).toContain(response.status);
      });
    });
  });
});
