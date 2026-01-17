/**
 * Preferences API - Integration Tests
 *
 * 100% METADATA-DRIVEN: All field references are discovered from PREFERENCE_SCHEMA.
 * Tests preference endpoints with real server and database.
 * Validates authentication, CRUD operations, and validation.
 *
 * IMPORTANT: These tests require the preferences table to exist.
 * Run migrations 013 and 014 before running these tests.
 * Uses shared PK pattern: preferences.id = users.id
 */

const request = require('supertest');
const app = require('../../server');
const { createTestUser, cleanupTestDatabase } = require('../helpers/test-db');
const { HTTP_STATUS } = require('../../config/constants');
const { DEFAULT_PREFERENCES, PREFERENCE_SCHEMA } = require('../../services/preferences-service');

// Use shared field introspection from the factory
const {
  findFieldByType: factoryFindFieldByType,
  generateInvalidValue: factoryGenerateInvalidValue,
  getExpectedTypes: factoryGetExpectedTypes,
} = require('../factory/data/entity-factory');

// ============================================================================
// METADATA-DRIVEN HELPERS
// Use shared factory functions with PREFERENCE_SCHEMA
// ============================================================================

/**
 * Find first field of a given type in PREFERENCE_SCHEMA
 * Wraps the shared factory function with our local schema
 */
function findFieldByType(type) {
  const result = factoryFindFieldByType(null, type, PREFERENCE_SCHEMA);
  if (!result) return null;
  const [key, def] = result;
  return { key, def };
}

/**
 * Find first enum field (most common for validation tests)
 */
function findEnumField() {
  return findFieldByType('enum');
}

/**
 * Find first boolean field
 */
function findBooleanField() {
  return findFieldByType('boolean');
}

/**
 * Generate a valid value for a field based on its type
 */
function generateValidValue(def) {
  switch (def.type) {
    case 'enum': return def.values[0];
    case 'boolean': return true;
    case 'integer': return def.min !== undefined ? def.min : 0;
    case 'string': return 'test-value';
    default: return 'test';
  }
}

/**
 * Generate an invalid value for a field based on its type
 * Wraps the shared factory function
 */
function generateInvalidValue(def, fieldName = 'field') {
  // Use the shared factory's generateInvalidValue with schema override
  return factoryGenerateInvalidValue(fieldName, null, { [fieldName]: def });
}

/**
 * Build an object with one valid preference
 */
function buildSinglePreference() {
  const field = findEnumField() || findBooleanField();
  if (!field) throw new Error('No testable fields in PREFERENCE_SCHEMA');
  return { key: field.key, value: generateValidValue(field.def) };
}

/**
 * Get expected types for response validation
 * Uses shared factory function
 */
function getExpectedTypes() {
  return factoryGetExpectedTypes(null, PREFERENCE_SCHEMA);
}

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

      // Assert structure
      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', customerUser.id);
      expect(response.body.data).toHaveProperty('preferences');
      expect(typeof response.body.data.preferences).toBe('object');

      // Validate that returned preferences have correct types based on schema
      const prefs = response.body.data.preferences;
      for (const [key, value] of Object.entries(prefs)) {
        const def = PREFERENCE_SCHEMA[key];
        if (def) {
          if (def.type === 'boolean') expect(typeof value).toBe('boolean');
          if (def.type === 'enum' || def.type === 'string') expect(typeof value).toBe('string');
          if (def.type === 'integer') expect(typeof value).toBe('number');
        }
      }
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
      // Build valid payload from schema
      const { key, value } = buildSinglePreference();

      // Act
      const response = await request(app)
        .put('/api/preferences')
        .send({ [key]: value });

      // Assert
      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
    });

    test('should update an enum preference', async () => {
      const enumField = findEnumField();
      if (!enumField) return; // Skip if no enum fields exist

      const newValue = enumField.def.values[enumField.def.values.length - 1]; // Use last value

      // Act
      const response = await request(app)
        .put('/api/preferences')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ [enumField.key]: newValue });

      // Assert
      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.data.preferences[enumField.key]).toBe(newValue);
    });

    test('should update a boolean preference', async () => {
      const boolField = findBooleanField();
      if (!boolField) return; // Skip if no boolean fields exist

      // Act
      const response = await request(app)
        .put('/api/preferences')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ [boolField.key]: false });

      // Assert
      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.data.preferences[boolField.key]).toBe(false);
    });

    test('should update multiple preferences at once', async () => {
      // Build payload with multiple different types from schema
      const enumField = findEnumField();
      const boolField = findBooleanField();
      
      const payload = {};
      const expected = {};
      
      if (enumField) {
        const val = enumField.def.values[0];
        payload[enumField.key] = val;
        expected[enumField.key] = val;
      }
      if (boolField) {
        payload[boolField.key] = true;
        expected[boolField.key] = true;
      }

      if (Object.keys(payload).length < 2) {
        // Can't test multi-update without 2+ fields
        return;
      }

      // Act
      const response = await request(app)
        .put('/api/preferences')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(payload);

      // Assert
      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.data.preferences).toMatchObject(expected);
    });

    test('should return 400 for invalid enum value', async () => {
      const enumField = findEnumField();
      if (!enumField) return;

      // Act
      const response = await request(app)
        .put('/api/preferences')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ [enumField.key]: 'invalid-not-in-enum' });

      // Assert
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toContain(`${enumField.key} must be one of`);
    });

    test('should return 400 for invalid boolean type', async () => {
      const boolField = findBooleanField();
      if (!boolField) return;

      // Act
      const response = await request(app)
        .put('/api/preferences')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ [boolField.key]: 'not-a-boolean' });

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

    test('should accept all valid enum values', async () => {
      const enumField = findEnumField();
      if (!enumField) return;

      for (const value of enumField.def.values) {
        const response = await request(app)
          .put('/api/preferences')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({ [enumField.key]: value });

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(response.body.data.preferences[enumField.key]).toBe(value);
      }
    });
  });

  describe('PUT /api/preferences/:key - Update Single Preference', () => {
    test('should update single enum preference', async () => {
      const enumField = findEnumField();
      if (!enumField) return;

      const newValue = enumField.def.values[enumField.def.values.length - 1];

      // Act
      const response = await request(app)
        .put(`/api/preferences/${enumField.key}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ value: newValue });

      // Assert
      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.data.preferences[enumField.key]).toBe(newValue);
    });

    test('should update single boolean preference', async () => {
      const boolField = findBooleanField();
      if (!boolField) return;

      // Act
      const response = await request(app)
        .put(`/api/preferences/${boolField.key}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ value: false });

      // Assert
      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.data.preferences[boolField.key]).toBe(false);
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
      const enumField = findEnumField();
      if (!enumField) return;

      // Act
      const response = await request(app)
        .put(`/api/preferences/${enumField.key}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({});

      // Assert
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toContain('Value is required');
    });
  });

  describe('POST /api/preferences/reset - Reset to Defaults', () => {
    test('should reset all preferences to defaults', async () => {
      // Arrange - Set custom preferences first using schema-derived values
      const enumField = findEnumField();
      const boolField = findBooleanField();
      const payload = {};
      if (enumField) payload[enumField.key] = enumField.def.values[enumField.def.values.length - 1];
      if (boolField) payload[boolField.key] = false;

      await request(app)
        .put('/api/preferences')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(payload);

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

    test('should include all schema fields from PREFERENCE_SCHEMA', async () => {
      // Act
      const response = await request(app).get('/api/preferences/schema');

      // Assert - all fields from schema should be present
      for (const key of Object.keys(PREFERENCE_SCHEMA)) {
        expect(response.body.data.schema).toHaveProperty(key);
      }
    });

    test('should include enum field schema definition', async () => {
      const enumField = findEnumField();
      if (!enumField) return;

      // Act
      const response = await request(app).get('/api/preferences/schema');

      // Assert
      expect(response.body.data.schema[enumField.key]).toMatchObject({
        type: 'enum',
        values: expect.arrayContaining(enumField.def.values),
        default: enumField.def.default,
      });
    });

    test('should include boolean field schema definition', async () => {
      const boolField = findBooleanField();
      if (!boolField) return;

      // Act
      const response = await request(app).get('/api/preferences/schema');

      // Assert
      expect(response.body.data.schema[boolField.key]).toMatchObject({
        type: 'boolean',
        default: boolField.def.default,
      });
    });

    test('should return defaults matching schema defaults', async () => {
      // Act
      const response = await request(app).get('/api/preferences/schema');

      // Assert - defaults returned by API should match their schema definitions
      const { schema, defaults } = response.body.data;
      
      // Check that every default key has a matching schema entry
      for (const [key, defaultValue] of Object.entries(defaults)) {
        expect(schema[key]).toBeDefined();
        expect(defaultValue).toBe(schema[key].default);
      }
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
      const enumField = findEnumField();
      if (!enumField || enumField.def.values.length < 2) return;

      const value1 = enumField.def.values[0];
      const value2 = enumField.def.values[1];

      // Arrange - Set different preferences for each user
      await request(app)
        .put('/api/preferences')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ [enumField.key]: value1 });

      await request(app)
        .put('/api/preferences')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ [enumField.key]: value2 });

      // Act - Get each user's preferences
      const customerResponse = await request(app)
        .get('/api/preferences')
        .set('Authorization', `Bearer ${customerToken}`);

      const adminResponse = await request(app)
        .get('/api/preferences')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(customerResponse.body.data.preferences[enumField.key]).toBe(value1);
      expect(adminResponse.body.data.preferences[enumField.key]).toBe(value2);
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

      // Build expected defaults from schema
      const expectedDefaults = {};
      for (const [key, def] of Object.entries(PREFERENCE_SCHEMA)) {
        expectedDefaults[key] = def.default;
      }

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.data).toMatchObject({
        id: null, // Dev users have no DB record
        preferences: expectedDefaults,
      });
      // Dev defaults have null timestamps (not from DB)
      expect(response.body.data.created_at).toBeNull();
      expect(response.body.data.updated_at).toBeNull();
    });

    test('dev user PUT should be blocked (read-only)', async () => {
      const devToken = generateDevToken('admin');
      const { key, value } = buildSinglePreference();

      const response = await request(app)
        .put('/api/preferences')
        .set('Authorization', `Bearer ${devToken}`)
        .send({ [key]: value });

      expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
      expect(response.body.message).toContain('read-only');
    });

    test('dev user PUT single key should be blocked (read-only)', async () => {
      const devToken = generateDevToken('admin');
      const enumField = findEnumField();
      if (!enumField) return;

      const response = await request(app)
        .put(`/api/preferences/${enumField.key}`)
        .set('Authorization', `Bearer ${devToken}`)
        .send({ value: enumField.def.values[0] });

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

      // Verify each preference matches its schema default (metadata-driven)
      for (const [key, def] of Object.entries(schema)) {
        expect(preferences[key]).toBe(def.default);
      }
    });
  });
});
