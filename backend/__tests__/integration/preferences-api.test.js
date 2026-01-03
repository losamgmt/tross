/**
 * Preferences API - Integration Tests
 *
 * Tests preference endpoints with real server and database
 * Validates authentication, CRUD operations, and validation
 *
 * IMPORTANT: These tests require the preferences table to exist.
 * Run migrations 013 and 014 before running these tests.
 * Uses shared PK pattern: preferences.id = users.id
 */

const request = require('supertest');
const app = require('../../server');
const { createTestUser, cleanupTestDatabase } = require('../helpers/test-db');
const { HTTP_STATUS } = require('../../config/constants');
const { DEFAULT_PREFERENCES } = require('../../services/preferences-service');

describe('Preferences API Endpoints - Integration Tests', () => {
  let customerUser;
  let customerToken;
  let adminUser;
  let adminToken;

  beforeAll(async () => {
    // Create test users with tokens
    // createTestUser returns { user, token }
    const customerResult = await createTestUser('customer');
    customerUser = customerResult.user;
    customerToken = customerResult.token;
    
    const adminResult = await createTestUser('admin');
    adminUser = adminResult.user;
    adminToken = adminResult.token;
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('GET /api/preferences - Get Current User Preferences', () => {
    test('should return 401 without authentication', async () => {
      // Act
      const response = await request(app).get('/api/preferences');

      // Assert
      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
    });

    test('should return preferences with valid token (creates defaults if none)', async () => {
      // Act
      const response = await request(app)
        .get('/api/preferences')
        .set('Authorization', `Bearer ${customerToken}`);

      // Assert
      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: customerUser.id, // Shared PK: id = userId
          preferences: expect.objectContaining({
            theme: expect.any(String),
            notificationsEnabled: expect.any(Boolean),
          }),
        }),
      });
    });

    test('should include timestamps in response', async () => {
      // Act
      const response = await request(app)
        .get('/api/preferences')
        .set('Authorization', `Bearer ${customerToken}`);

      // Assert
      expect(response.body.data).toHaveProperty('created_at');
      expect(response.body.data).toHaveProperty('updated_at');
    });

    test('should return same preferences on multiple calls', async () => {
      // Act
      const response1 = await request(app)
        .get('/api/preferences')
        .set('Authorization', `Bearer ${customerToken}`);

      const response2 = await request(app)
        .get('/api/preferences')
        .set('Authorization', `Bearer ${customerToken}`);

      // Assert
      expect(response1.body.data.id).toBe(response2.body.data.id);
      expect(response1.body.data.preferences).toEqual(response2.body.data.preferences);
    });
  });

  describe('PUT /api/preferences - Update Multiple Preferences', () => {
    test('should return 401 without authentication', async () => {
      // Act
      const response = await request(app)
        .put('/api/preferences')
        .send({ theme: 'dark' });

      // Assert
      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
    });

    test('should update theme preference', async () => {
      // Act
      const response = await request(app)
        .put('/api/preferences')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ theme: 'dark' });

      // Assert
      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.data.preferences.theme).toBe('dark');
    });

    test('should update notificationsEnabled preference', async () => {
      // Act
      const response = await request(app)
        .put('/api/preferences')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ notificationsEnabled: false });

      // Assert
      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.data.preferences.notificationsEnabled).toBe(false);
    });

    test('should update multiple preferences at once', async () => {
      // Act
      const response = await request(app)
        .put('/api/preferences')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ theme: 'light', notificationsEnabled: true });

      // Assert
      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.data.preferences).toMatchObject({
        theme: 'light',
        notificationsEnabled: true,
      });
    });

    test('should return 400 for invalid theme value', async () => {
      // Act
      const response = await request(app)
        .put('/api/preferences')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ theme: 'invalid-theme' });

      // Assert
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toContain('theme must be one of');
    });

    test('should return 400 for invalid boolean type', async () => {
      // Act
      const response = await request(app)
        .put('/api/preferences')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ notificationsEnabled: 'not-a-boolean' });

      // Assert
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    });

    test('should return 400 for empty body', async () => {
      // Act
      const response = await request(app)
        .put('/api/preferences')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({});

      // Assert
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toContain('At least one preference');
    });

    test('should accept all valid theme values', async () => {
      const validThemes = ['system', 'light', 'dark'];

      for (const theme of validThemes) {
        const response = await request(app)
          .put('/api/preferences')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({ theme });

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(response.body.data.preferences.theme).toBe(theme);
      }
    });
  });

  describe('PUT /api/preferences/:key - Update Single Preference', () => {
    test('should update single theme preference', async () => {
      // Act
      const response = await request(app)
        .put('/api/preferences/theme')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ value: 'dark' });

      // Assert
      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.data.preferences.theme).toBe('dark');
    });

    test('should update single notificationsEnabled preference', async () => {
      // Act
      const response = await request(app)
        .put('/api/preferences/notificationsEnabled')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ value: false });

      // Assert
      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.data.preferences.notificationsEnabled).toBe(false);
    });

    test('should return 400 for unknown preference key', async () => {
      // Act
      const response = await request(app)
        .put('/api/preferences/unknownKey')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ value: 'anything' });

      // Assert
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toContain('Unknown preference key');
    });

    test('should return 400 for missing value', async () => {
      // Act
      const response = await request(app)
        .put('/api/preferences/theme')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({});

      // Assert
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toContain('Value is required');
    });
  });

  describe('POST /api/preferences/reset - Reset to Defaults', () => {
    test('should reset all preferences to defaults', async () => {
      // Arrange - Set custom preferences first
      await request(app)
        .put('/api/preferences')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ theme: 'dark', notificationsEnabled: false });

      // Act
      const response = await request(app)
        .post('/api/preferences/reset')
        .set('Authorization', `Bearer ${customerToken}`);

      // Assert
      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.data.preferences).toEqual(DEFAULT_PREFERENCES);
      expect(response.body.message).toContain('reset');
    });

    test('should return 401 without authentication', async () => {
      // Act
      const response = await request(app).post('/api/preferences/reset');

      // Assert
      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
    });
  });

  describe('GET /api/preferences/schema - Get Preference Schema', () => {
    test('should return schema without authentication (public endpoint)', async () => {
      // Act
      const response = await request(app).get('/api/preferences/schema');

      // Assert
      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.data).toHaveProperty('schema');
      expect(response.body.data).toHaveProperty('defaults');
    });

    test('should include theme schema definition', async () => {
      // Act
      const response = await request(app).get('/api/preferences/schema');

      // Assert
      expect(response.body.data.schema.theme).toMatchObject({
        type: 'enum',
        values: expect.arrayContaining(['system', 'light', 'dark']),
        default: 'system',
      });
    });

    test('should include notificationsEnabled schema definition', async () => {
      // Act
      const response = await request(app).get('/api/preferences/schema');

      // Assert
      expect(response.body.data.schema.notificationsEnabled).toMatchObject({
        type: 'boolean',
        default: true,
      });
    });

    test('should return defaults matching schema defaults', async () => {
      // Act
      const response = await request(app).get('/api/preferences/schema');

      // Assert
      const { schema, defaults } = response.body.data;
      expect(defaults.theme).toBe(schema.theme.default);
      expect(defaults.notificationsEnabled).toBe(schema.notificationsEnabled.default);
    });
  });

  describe('GET /api/preferences/user/:userId - Admin Access', () => {
    test('should return 401 without authentication', async () => {
      // Act
      const response = await request(app).get(`/api/preferences/user/${customerUser.id}`);

      // Assert
      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
    });

    test('should return 403 for non-admin users', async () => {
      // Act
      const response = await request(app)
        .get(`/api/preferences/user/${customerUser.id}`)
        .set('Authorization', `Bearer ${customerToken}`);

      // Assert
      expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
    });

    test('should allow admin to view other user preferences', async () => {
      // Act
      const response = await request(app)
        .get(`/api/preferences/user/${customerUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.data.id).toBe(customerUser.id); // Shared PK
    });
  });

  describe('User Isolation (RLS)', () => {
    test('different users should have separate preferences', async () => {
      // Arrange - Set different preferences for each user
      await request(app)
        .put('/api/preferences')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ theme: 'dark' });

      await request(app)
        .put('/api/preferences')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ theme: 'light' });

      // Act - Get each user's preferences
      const customerResponse = await request(app)
        .get('/api/preferences')
        .set('Authorization', `Bearer ${customerToken}`);

      const adminResponse = await request(app)
        .get('/api/preferences')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(customerResponse.body.data.preferences.theme).toBe('dark');
      expect(adminResponse.body.data.preferences.theme).toBe('light');
      expect(customerResponse.body.data.id).not.toBe(adminResponse.body.data.id); // Shared PK
    });
  });

  // ============================================================================
  // DEVELOPMENT USER HANDLING
  // Dev users get defaults from metadata, cannot persist preferences
  // ============================================================================
  describe('Development User Preferences', () => {
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

    const generateDevToken = (role = 'admin') => {
      return jwt.sign(
        {
          sub: `dev|${role}001`,
          email: `${role}@trossapp.dev`,
          role: role,
          provider: 'development',
        },
        JWT_SECRET,
        { expiresIn: '1h' },
      );
    };

    test('dev user GET should return defaults from metadata', async () => {
      const devToken = generateDevToken('admin');

      const response = await request(app)
        .get('/api/preferences')
        .set('Authorization', `Bearer ${devToken}`);

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.data).toMatchObject({
        id: null, // Dev users have no DB record
        preferences: {
          theme: 'system',  // Default from metadata
          notificationsEnabled: true,  // Default from metadata
        },
      });
      // Dev defaults have null timestamps (not from DB)
      expect(response.body.data.created_at).toBeNull();
      expect(response.body.data.updated_at).toBeNull();
    });

    test('dev user PUT should be blocked (read-only)', async () => {
      const devToken = generateDevToken('admin');

      const response = await request(app)
        .put('/api/preferences')
        .set('Authorization', `Bearer ${devToken}`)
        .send({ theme: 'dark' });

      expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
      expect(response.body.message).toContain('read-only');
    });

    test('dev user PUT single key should be blocked (read-only)', async () => {
      const devToken = generateDevToken('admin');

      const response = await request(app)
        .put('/api/preferences/theme')
        .set('Authorization', `Bearer ${devToken}`)
        .send({ value: 'dark' });

      expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
      expect(response.body.message).toContain('read-only');
    });

    test('dev user POST reset should be blocked (read-only)', async () => {
      const devToken = generateDevToken('admin');

      const response = await request(app)
        .post('/api/preferences/reset')
        .set('Authorization', `Bearer ${devToken}`);

      expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
      expect(response.body.message).toContain('read-only');
    });

    test('dev user defaults should match metadata schema', async () => {
      const devToken = generateDevToken('technician');
      const preferencesMetadata = require('../../config/models/preferences-metadata');

      const response = await request(app)
        .get('/api/preferences')
        .set('Authorization', `Bearer ${devToken}`);

      const schema = preferencesMetadata.preferenceSchema;
      const preferences = response.body.data.preferences;

      // Verify each preference matches its schema default
      expect(preferences.theme).toBe(schema.theme.default);
      expect(preferences.notificationsEnabled).toBe(schema.notificationsEnabled.default);
    });
  });
});
