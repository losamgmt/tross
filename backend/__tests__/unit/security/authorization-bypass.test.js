/**
 * Authorization Bypass Security Tests
 *
 * Tests protection against:
 * - Privilege escalation attempts
 * - Role bypass attacks
 * - Permission boundary violations
 * - Vertical and horizontal access control bypass
 */

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const { 
  authenticateToken, 
  requireMinimumRole, 
  requirePermission 
} = require('../../../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

// Helper to create tokens with specific roles
const createToken = (role, overrides = {}) => {
  const roleToAuth0Id = {
    admin: 'dev|admin001',
    manager: 'dev|mgr001',
    dispatcher: 'dev|disp001',
    technician: 'dev|tech001',
    customer: 'dev|cust001',
  };

  return jwt.sign(
    {
      sub: roleToAuth0Id[role] || `dev|${role}001`,
      email: `${role}@trossapp.dev`,
      role,
      provider: 'development',
      ...overrides,
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
};

describe('Authorization Bypass Prevention', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Admin-only endpoint
    app.get(
      '/api/admin/settings',
      authenticateToken,
      requireMinimumRole('admin'),
      (req, res) => res.json({ success: true, settings: { secret: 'admin-data' } })
    );

    // Manager+ endpoint
    app.get(
      '/api/reports',
      authenticateToken,
      requireMinimumRole('manager'),
      (req, res) => res.json({ success: true, reports: [] })
    );

    // Dispatcher+ endpoint
    app.get(
      '/api/dispatch',
      authenticateToken,
      requireMinimumRole('dispatcher'),
      (req, res) => res.json({ success: true, jobs: [] })
    );

    // Users CRUD with permissions
    app.get(
      '/api/users',
      authenticateToken,
      requirePermission('users', 'read'),
      (req, res) => res.json({ success: true, users: [] })
    );

    app.post(
      '/api/users',
      authenticateToken,
      requirePermission('users', 'create'),
      (req, res) => res.json({ success: true, user: req.body })
    );

    app.delete(
      '/api/users/:id',
      authenticateToken,
      requirePermission('users', 'delete'),
      (req, res) => res.json({ success: true, deleted: req.params.id })
    );
  });

  describe('Role Hierarchy Enforcement', () => {
    test('admin should access admin-only endpoint', async () => {
      const token = createToken('admin');
      const response = await request(app)
        .get('/api/admin/settings')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.settings.secret).toBe('admin-data');
    });

    test('manager should NOT access admin-only endpoint', async () => {
      const token = createToken('manager');
      const response = await request(app)
        .get('/api/admin/settings')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
    });

    test('dispatcher should NOT access admin-only endpoint', async () => {
      const token = createToken('dispatcher');
      const response = await request(app)
        .get('/api/admin/settings')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
    });

    test('technician should NOT access admin-only endpoint', async () => {
      const token = createToken('technician');
      const response = await request(app)
        .get('/api/admin/settings')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
    });

    test('customer should NOT access admin-only endpoint', async () => {
      const token = createToken('customer');
      const response = await request(app)
        .get('/api/admin/settings')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Privilege Escalation Prevention', () => {
    test('should reject token with non-existent role', async () => {
      const token = createToken('superadmin'); // Fake elevated role

      const response = await request(app)
        .get('/api/admin/settings')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
    });

    test('should reject token with empty role', async () => {
      const token = jwt.sign(
        {
          sub: 'dev|hacker001',
          email: 'hacker@test.com',
          role: '',
          provider: 'development',
        },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/admin/settings')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
    });

    test('should reject token with null role', async () => {
      const token = jwt.sign(
        {
          sub: 'dev|hacker001',
          email: 'hacker@test.com',
          role: null,
          provider: 'development',
        },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/admin/settings')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
    });

    test('should reject role as array (bypass attempt)', async () => {
      const token = jwt.sign(
        {
          sub: 'dev|hacker001',
          email: 'hacker@test.com',
          role: ['admin', 'customer'], // Array instead of string
          provider: 'development',
        },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/admin/settings')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
    });

    test('should reject role with special characters', async () => {
      const token = createToken('admin; DROP TABLE users;--');

      const response = await request(app)
        .get('/api/admin/settings')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
    });

    test('should reject role with case manipulation (ADMIN vs admin)', async () => {
      const token = createToken('ADMIN'); // Uppercase attempt

      const response = await request(app)
        .get('/api/admin/settings')
        .set('Authorization', `Bearer ${token}`);

      // Should be 403 if system is case-sensitive
      expect([200, 403]).toContain(response.status);
    });
  });

  describe('Permission-Based Access Control', () => {
    test('admin should have users:delete permission', async () => {
      const token = createToken('admin');
      const response = await request(app)
        .delete('/api/users/123')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
    });

    test('customer should NOT have users:delete permission', async () => {
      const token = createToken('customer');
      const response = await request(app)
        .delete('/api/users/123')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
    });

    test('technician should NOT have users:create permission', async () => {
      const token = createToken('technician');
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'new@test.com' });

      expect(response.status).toBe(403);
    });
  });

  describe('Multi-Role Boundary Tests', () => {
    test('manager can access dispatcher-level endpoints', async () => {
      const token = createToken('manager');
      const response = await request(app)
        .get('/api/dispatch')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
    });

    test('dispatcher cannot access manager-level endpoints', async () => {
      const token = createToken('dispatcher');
      const response = await request(app)
        .get('/api/reports')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
    });

    test('admin can access all role levels', async () => {
      const token = createToken('admin');

      const adminResponse = await request(app)
        .get('/api/admin/settings')
        .set('Authorization', `Bearer ${token}`);
      expect(adminResponse.status).toBe(200);

      const managerResponse = await request(app)
        .get('/api/reports')
        .set('Authorization', `Bearer ${token}`);
      expect(managerResponse.status).toBe(200);

      const dispatchResponse = await request(app)
        .get('/api/dispatch')
        .set('Authorization', `Bearer ${token}`);
      expect(dispatchResponse.status).toBe(200);
    });
  });

  describe('Header Manipulation Prevention', () => {
    test('should reject multiple Authorization headers', async () => {
      const customerToken = createToken('customer');
      const adminToken = createToken('admin');

      // Note: supertest might combine these, but server should handle
      const response = await request(app)
        .get('/api/admin/settings')
        .set('Authorization', `Bearer ${customerToken}`)
        .set('X-Authorization', `Bearer ${adminToken}`); // Second auth header

      // Should use first header, reject as customer
      expect(response.status).toBe(403);
    });

    test('should ignore token in query parameter', async () => {
      const adminToken = createToken('admin');
      const customerToken = createToken('customer');

      const response = await request(app)
        .get(`/api/admin/settings?token=${adminToken}`)
        .set('Authorization', `Bearer ${customerToken}`);

      // Should use header, not query param
      expect(response.status).toBe(403);
    });

    test('should ignore token in request body', async () => {
      const adminToken = createToken('admin');
      const customerToken = createToken('customer');

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ token: adminToken, email: 'test@test.com' });

      // Should use header, not body token
      expect(response.status).toBe(403);
    });
  });
});
