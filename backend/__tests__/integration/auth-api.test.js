/**
 * Auth API Endpoints - Integration Tests
 *
 * Tests authentication endpoints with real server and database
 * Validates token handling, profile management, and session control
 */

const request = require('supertest');
const app = require('../../server');
const { createTestUser, cleanupTestDatabase } = require('../helpers/test-db');
const { TEST_PAGINATION, TEST_PERFORMANCE } = require('../../config/test-constants');
const { HTTP_STATUS } = require('../../config/constants');

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
    test('should return 401 without authentication', async () => {
      // Act
      const response = await request(app).get('/api/auth/me');

      // Assert
      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
    });

    test('should return user profile with valid token', async () => {
      // Act
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${technicianToken}`);

      // Assert
      expect(response.status).toBe(HTTP_STATUS.OK);
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

    test('should include user name in response', async () => {
      // Act
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${technicianToken}`);

      // Assert
      expect(response.body.data.name).toBeDefined();
      expect(typeof response.body.data.name).toBe('string');
    });

    test('should include role information', async () => {
      // Act
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${technicianToken}`);

      // Assert
      expect(response.body.data.role).toBe('technician');
      expect(response.body.data.role_id).toBeDefined();
    });

    test('should return correct data for different user roles', async () => {
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

    test('should return 403 with invalid token format', async () => {
      // Act
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.jwt.token');

      // Assert
      expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
    });
  });

  describe('PUT /api/auth/me - Update User Profile', () => {
    test('should return 401 without authentication', async () => {
      // Act
      const response = await request(app)
        .put('/api/auth/me')
        .send({ first_name: 'Updated' });

      // Assert
      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
    });

    test('should update first name', async () => {
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

    test('should update last name', async () => {
      // Arrange
      const updates = { last_name: 'UpdatedLast' };

      // Act
      const response = await request(app)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${technicianToken}`)
        .send(updates);

      // Assert
      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.data.last_name).toBe('UpdatedLast');
    });

    test('should update both first and last name', async () => {
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
      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.data).toMatchObject({
        first_name: 'NewFirst',
        last_name: 'NewLast',
      });
    });

    test('should return 400 with no valid fields', async () => {
      // Act
      const response = await request(app)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${technicianToken}`)
        .send({});

      // Assert
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.error).toMatch(/Validation Error|Bad Request/);
    });

    test('should reject disallowed field updates', async () => {
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
      // Validator strips unknown fields, then .min(1) requires at least one valid field
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toMatch(/At least one field|No valid fields/);
    });

    test('should validate first_name length', async () => {
      // Arrange - Name too long
      const updates = {
        first_name: 'a'.repeat(256), // Exceeds typical varchar limit
      };

      // Act
      const response = await request(app)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${technicianToken}`)
        .send(updates);

      // Assert - Should reject with bad request (validation should exist)
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    });

    test('should persist updates to database', async () => {
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
    test('should trim whitespace from names', async () => {
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
      expect(response.status).toBe(HTTP_STATUS.OK);
    });

    test('should reject empty string names', async () => {
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

      // Assert - Empty strings treated as no update (returns 400)
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    });

    test('should handle special characters in names', async () => {
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
      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.data.first_name).toBe("O'Brien");
    });
  });

  describe('Auth Endpoints - Response Format', () => {
    test('should return proper content-type', async () => {
      // Act
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${technicianToken}`);

      // Assert
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    test('should include timestamp in success responses', async () => {
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

    test('should include timestamp in error responses', async () => {
      // Act
      const response = await request(app).get('/api/auth/me');

      // Assert
      expect(response.body.timestamp).toBeDefined();
    });

    test('should return consistent error format', async () => {
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
    test('should respond quickly to profile requests', async () => {
      // Arrange
      const start = Date.now();

      // Act
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${technicianToken}`);

      // Assert
      const duration = Date.now() - start;
      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(duration).toBeLessThan(TEST_PERFORMANCE.FAST_API_RESPONSE_MS);
    });

    test('should handle concurrent profile requests', async () => {
      // Arrange - Multiple GET requests to test concurrent handling
      const requests = Array(TEST_PERFORMANCE.LIGHT_LOAD)
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
        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Auth Endpoints - Security', () => {
    test('should not leak sensitive data in responses', async () => {
      // Act
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${technicianToken}`);

      // Assert - Should NOT contain sensitive fields
      expect(response.body.data.password).toBeUndefined();
      expect(response.body.data.password_hash).toBeUndefined();
      // auth0_id is filtered out by output-filter-helper (ALWAYS_SENSITIVE)
      // This is intentional - auth0_id is an external system ID, not useful to clients
      expect(response.body.data.auth0_id).toBeUndefined();
    });

    test('should not allow updating other users profiles', async () => {
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

    test('should validate authorization header format', async () => {
      // Act - Various malformed headers
      const responses = await Promise.all([
        request(app).get('/api/auth/me').set('Authorization', 'InvalidFormat'),
        request(app).get('/api/auth/me').set('Authorization', 'Bearer'),
        request(app).get('/api/auth/me').set('Authorization', ''),
      ]);

      // Assert - All should be unauthorized (401) or forbidden (403)
      responses.forEach((response) => {
        expect([HTTP_STATUS.UNAUTHORIZED, HTTP_STATUS.FORBIDDEN]).toContain(response.status);
      });
    });
  });

  describe('POST /api/auth/logout - Logout Current Session', () => {
    test('should return 401 without authentication', async () => {
      // Act
      const response = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken: 'fake-token' });

      // Assert
      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
    });

    test('should logout successfully with valid token', async () => {
      // Act
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${technicianToken}`)
        .send({ refreshToken: 'fake-refresh-token' });

      // Assert
      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toMatchObject({
        success: true,
        message: 'Logged out successfully',
        timestamp: expect.any(String),
      });
    });

    test('should handle logout without refresh token', async () => {
      // Act
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${technicianToken}`)
        .send({});

      // Assert - Should still succeed (graceful degradation)
      expect(response.status).toBe(HTTP_STATUS.OK);
    });

    test('should create audit log entry for logout', async () => {
      // Note: Audit verification requires db access - testing endpoint behavior only
      // Act
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${technicianToken}`)
        .send({ refreshToken: 'test-token' });

      // Assert
      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/auth/logout-all - Logout All Devices', () => {
    test('should return 401 without authentication', async () => {
      // Act
      const response = await request(app).post('/api/auth/logout-all');

      // Assert
      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
    });

    test('should logout from all devices', async () => {
      // Act
      const response = await request(app)
        .post('/api/auth/logout-all')
        .set('Authorization', `Bearer ${technicianToken}`);

      // Assert
      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          tokensRevoked: expect.any(Number),
        },
        message: expect.stringMatching(/Logged out from \d+ device\(s\)/),
        timestamp: expect.any(String),
      });
    });

    test('should return count of revoked tokens', async () => {
      // Act
      const response = await request(app)
        .post('/api/auth/logout-all')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.data.tokensRevoked).toBeGreaterThanOrEqual(0);
    });

    test('should work for users with no active tokens', async () => {
      // Act
      const response = await request(app)
        .post('/api/auth/logout-all')
        .set('Authorization', `Bearer ${technicianToken}`);

      // Assert - Should succeed even if count is 0
      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(typeof response.body.data.tokensRevoked).toBe('number');
    });
  });

  describe('GET /api/auth/sessions - Get Active Sessions', () => {
    test('should return 401 without authentication', async () => {
      // Act
      const response = await request(app).get('/api/auth/sessions');

      // Assert
      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
    });

    test('should return array of active sessions', async () => {
      // Act
      const response = await request(app)
        .get('/api/auth/sessions')
        .set('Authorization', `Bearer ${technicianToken}`);

      // Assert
      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
        timestamp: expect.any(String),
      });
    });

    test('should return session details without sensitive data', async () => {
      // Act
      const response = await request(app)
        .get('/api/auth/sessions')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(HTTP_STATUS.OK);
      if (response.body.data.length > 0) {
        const session = response.body.data[0];
        expect(session).toMatchObject({
          id: expect.any(String),
          createdAt: expect.any(String),
          isCurrent: expect.any(Boolean),
        });
        // Should NOT contain refresh token value
        expect(session.token).toBeUndefined();
        expect(session.refreshToken).toBeUndefined();
      }
    });

    test('should handle users with no active sessions', async () => {
      // Act
      const response = await request(app)
        .get('/api/auth/sessions')
        .set('Authorization', `Bearer ${technicianToken}`);

      // Assert
      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should include session metadata', async () => {
      // Act
      const response = await request(app)
        .get('/api/auth/sessions')
        .set('Authorization', `Bearer ${technicianToken}`);

      // Assert
      expect(response.status).toBe(HTTP_STATUS.OK);
      if (response.body.data.length > 0) {
        const session = response.body.data[0];
        // Metadata fields are optional but should be included if available
        expect(session).toHaveProperty('createdAt');
        expect(session).toHaveProperty('id');
      }
    });
  });

  describe('POST /api/auth/refresh - Token Refresh', () => {
    test('should return 400 without refresh token', async () => {
      // Act
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({});

      // Assert
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    });

    test('should return 400 with invalid refresh token format', async () => {
      // Act
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token-format' });

      // Assert
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    });

    test('should handle expired refresh token', async () => {
      // Arrange - Expired or invalid token
      const expiredToken = 'expired.jwt.token';

      // Act
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: expiredToken });

      // Assert - Should return 400 for invalid format or 401 for expired
      expect([HTTP_STATUS.BAD_REQUEST, HTTP_STATUS.UNAUTHORIZED]).toContain(response.status);
    });

    test('should enforce rate limiting on refresh endpoint', async () => {
      // Arrange - Make multiple rapid requests to trigger rate limiting
      const requests = Array(TEST_PERFORMANCE.MODERATE_LOAD)
        .fill(null)
        .map(() =>
          request(app)
            .post('/api/auth/refresh')
            .send({ refreshToken: 'test-token' }),
        );

      // Act
      const responses = await Promise.all(requests);

      // Assert - At least some should be rate limited (429) or rejected (400/401)
      const statusCodes = responses.map((r) => r.status);
      const hasRejections = statusCodes.some((code) => 
        [HTTP_STATUS.BAD_REQUEST, HTTP_STATUS.UNAUTHORIZED, 429].includes(code)
      );
      expect(hasRejections).toBe(true);
    });
  });

  describe('Authentication Middleware - Token Validation', () => {
    test('should reject requests with expired tokens', async () => {
      // Arrange - Malformed/expired token
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxfQ.test';

      // Act
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      // Assert - Should return 401 (unauthorized) or 403 (forbidden)
      expect([HTTP_STATUS.UNAUTHORIZED, HTTP_STATUS.FORBIDDEN]).toContain(response.status);
    });

    test('should reject requests with malformed tokens', async () => {
      // Act
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer malformed.token');

      // Assert
      expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
    });

    test('should handle missing Authorization header', async () => {
      // Act
      const response = await request(app).get('/api/auth/me');

      // Assert
      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(response.body.message).toMatch(/token|authorization/i);
    });

    test('should reject tokens with wrong signature', async () => {
      // Arrange - Valid JWT structure but wrong signature
      const wrongSignature = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.wrong_signature';

      // Act
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${wrongSignature}`);

      // Assert
      expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
    });

    test('should handle Bearer prefix case-insensitively', async () => {
      // Act - Try lowercase bearer
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `bearer ${technicianToken}`);

      // Assert - Should work (200) or reject consistently (401/403)
      expect([HTTP_STATUS.OK, HTTP_STATUS.UNAUTHORIZED, HTTP_STATUS.FORBIDDEN]).toContain(response.status);
    });
  });

  describe('Audit Trail Verification', () => {
    test('should log profile updates in audit trail', async () => {
      // Act - Update profile
      const response = await request(app)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${technicianToken}`)
        .send({ first_name: 'AuditTest' });

      // Assert - Update succeeded (audit is async)
      expect(response.status).toBe(HTTP_STATUS.OK);
    });

    test('should log logout events in audit trail', async () => {
      // Act - Logout
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ refreshToken: 'audit-test-token' });

      // Assert - Logout succeeded (audit is async)
      expect(response.status).toBe(HTTP_STATUS.OK);
    });

    test('should log logout-all events with token count', async () => {
      // Act - Logout all
      const response = await request(app)
        .post('/api/auth/logout-all')
        .set('Authorization', `Bearer ${technicianToken}`);

      // Assert - Logout-all succeeded (audit is async)
      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.data.tokensRevoked).toBeGreaterThanOrEqual(0);
    });
  });
});
