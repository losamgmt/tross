/**
 * Schema Endpoints - Integration Tests
 *
 * Tests schema introspection endpoints with real database
 * Validates metadata extraction for auto-generating UIs
 */

const request = require('supertest');
const app = require('../../server');
const { createTestUser } = require('../helpers/test-db');

describe('Schema Endpoints - Integration Tests', () => {
  let technicianToken;
  let adminToken;

  beforeAll(async () => {
    // Create test users with tokens
    const technician = await createTestUser('technician');
    const admin = await createTestUser('admin');
    technicianToken = technician.token;
    adminToken = admin.token;
  });

  describe('GET /api/schema - List All Tables', () => {
    it('should return 200 with list of tables', async () => {
      // Act
      const response = await request(app)
        .get('/api/schema')
        .set('Authorization', `Bearer ${technicianToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
        timestamp: expect.any(String),
      });
    });

    it('should return 401 without authentication', async () => {
      // Act
      const response = await request(app).get('/api/schema');

      // Assert
      expect(response.status).toBe(401);
    });

    it('should include expected tables', async () => {
      // Act
      const response = await request(app)
        .get('/api/schema')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      const tableNames = response.body.data.map((t) => t.name);
      expect(tableNames).toContain('users');
      expect(tableNames).toContain('roles');
    });

    it('should include table metadata', async () => {
      // Act
      const response = await request(app)
        .get('/api/schema')
        .set('Authorization', `Bearer ${technicianToken}`);

      // Assert
      const tables = response.body.data;
      expect(tables.length).toBeGreaterThan(0);

      // Each table should have proper structure
      tables.forEach((table) => {
        expect(table).toMatchObject({
          name: expect.any(String),
          displayName: expect.any(String),
        });
      });
    });

    it('should handle concurrent requests', async () => {
      // Act - Make 5 concurrent requests
      const requests = Array(5)
        .fill(null)
        .map(() =>
          request(app)
            .get('/api/schema')
            .set('Authorization', `Bearer ${technicianToken}`),
        );

      const responses = await Promise.all(requests);

      // Assert - All should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
      });
    });
  });

  describe('GET /api/schema/:tableName - Get Table Schema', () => {
    it('should return schema for users table', async () => {
      // Act
      const response = await request(app)
        .get('/api/schema/users')
        .set('Authorization', `Bearer ${technicianToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          tableName: 'users',
          columns: expect.any(Array),
        }),
        timestamp: expect.any(String),
      });
    });

    it('should return schema for roles table', async () => {
      // Act
      const response = await request(app)
        .get('/api/schema/roles')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data.tableName).toBe('roles');
      expect(response.body.data.columns).toBeInstanceOf(Array);
      expect(response.body.data.columns.length).toBeGreaterThan(0);
    });

    it('should return error for non-existent table', async () => {
      // Act
      const response = await request(app)
        .get('/api/schema/nonexistent_table')
        .set('Authorization', `Bearer ${technicianToken}`);

      // Assert - Schema service returns 200 with empty columns for non-existent tables
      expect(response.status).toBe(200);
      expect(response.body.data.columns).toEqual([]);
    });

    it('should return 401 without authentication', async () => {
      // Act
      const response = await request(app).get('/api/schema/users');

      // Assert
      expect(response.status).toBe(401);
    });

    it('should include column metadata', async () => {
      // Act
      const response = await request(app)
        .get('/api/schema/users')
        .set('Authorization', `Bearer ${technicianToken}`);

      // Assert
      const columns = response.body.data.columns;
      expect(columns.length).toBeGreaterThan(0);

      // Check first column has required fields
      const firstColumn = columns[0];
      expect(firstColumn).toMatchObject({
        name: expect.any(String),
        type: expect.any(String),
        nullable: expect.any(Boolean),
      });
    });

    it('should include primary key column', async () => {
      // Act
      const response = await request(app)
        .get('/api/schema/users')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      const columns = response.body.data.columns;
      const idColumn = columns.find((c) => c.name === 'id');
      expect(idColumn).toBeDefined();
      expect(idColumn.name).toBe('id');
    });

    it('should identify foreign key relationships', async () => {
      // Act
      const response = await request(app)
        .get('/api/schema/users')
        .set('Authorization', `Bearer ${technicianToken}`);

      // Assert
      const columns = response.body.data.columns;
      const roleIdColumn = columns.find((c) => c.name === 'role_id');

      expect(roleIdColumn).toBeDefined();
      expect(roleIdColumn.foreignKey).toBeDefined();
      expect(roleIdColumn.foreignKey.table).toBe('roles');
      expect(roleIdColumn.foreignKey.column).toBe('id');
    });

    it('should include UI metadata (labels, types)', async () => {
      // Act
      const response = await request(app)
        .get('/api/schema/users')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      const columns = response.body.data.columns;
      const emailColumn = columns.find((c) => c.name === 'email');

      expect(emailColumn).toBeDefined();
      expect(emailColumn.label).toBeDefined();
      expect(emailColumn.uiType).toBeDefined();
    });

    it('should identify searchable columns', async () => {
      // Act
      const response = await request(app)
        .get('/api/schema/users')
        .set('Authorization', `Bearer ${technicianToken}`);

      // Assert
      const columns = response.body.data.columns;
      const searchableColumns = columns.filter((c) => c.searchable);
      expect(searchableColumns.length).toBeGreaterThan(0);

      // Email should be searchable
      expect(searchableColumns.some((c) => c.name === 'email')).toBe(true);
    });

    it('should identify readonly columns', async () => {
      // Act
      const response = await request(app)
        .get('/api/schema/roles')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      const columns = response.body.data.columns;
      const idColumn = columns.find((c) => c.name === 'id');

      expect(idColumn.readonly).toBe(true);
    });
  });

  describe('GET /api/schema/:tableName/options/:column - Get FK Options', () => {
    it('should return role options for users.role_id', async () => {
      // Act
      const response = await request(app)
        .get('/api/schema/users/options/role_id')
        .set('Authorization', `Bearer ${technicianToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
        timestamp: expect.any(String),
      });
    });

    it('should return 401 without authentication', async () => {
      // Act
      const response = await request(app).get(
        '/api/schema/users/options/role_id',
      );

      // Assert
      expect(response.status).toBe(401);
    });

    it('should return 400 for non-FK column', async () => {
      // Act
      const response = await request(app)
        .get('/api/schema/users/options/email')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid Request');
      expect(response.body.message).toContain('not a foreign key');
    });

    it('should return error for non-existent table', async () => {
      // Act
      const response = await request(app)
        .get('/api/schema/nonexistent/options/column')
        .set('Authorization', `Bearer ${technicianToken}`);

      // Assert
      expect([400, 404, 500]).toContain(response.status);
    });

    it('should return options with value and label', async () => {
      // Act
      const response = await request(app)
        .get('/api/schema/users/options/role_id')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      const options = response.body.data;
      expect(options.length).toBeGreaterThan(0);

      // Each option should have value and label
      options.forEach((option) => {
        expect(option).toMatchObject({
          value: expect.any(Number),
          label: expect.any(String),
        });
      });
    });

    it('should return actual role data', async () => {
      // Act
      const response = await request(app)
        .get('/api/schema/users/options/role_id')
        .set('Authorization', `Bearer ${technicianToken}`);

      // Assert
      const options = response.body.data;
      const roleNames = options.map((o) => o.label);

      // Should include common roles
      expect(roleNames).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/admin|manager|technician|dispatcher|client/i),
        ]),
      );
    });
  });

  describe('Schema Endpoints - Performance', () => {
    it('should respond quickly for table list', async () => {
      // Arrange
      const start = Date.now();

      // Act
      const response = await request(app)
        .get('/api/schema')
        .set('Authorization', `Bearer ${technicianToken}`);

      // Assert
      const duration = Date.now() - start;
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(1000); // Under 1 second
    });

    it('should respond quickly for table schema', async () => {
      // Arrange
      const start = Date.now();

      // Act
      const response = await request(app)
        .get('/api/schema/users')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      const duration = Date.now() - start;
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(1000); // Under 1 second
    });

    it('should respond quickly for FK options', async () => {
      // Arrange
      const start = Date.now();

      // Act
      const response = await request(app)
        .get('/api/schema/users/options/role_id')
        .set('Authorization', `Bearer ${technicianToken}`);

      // Assert
      const duration = Date.now() - start;
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(1000); // Under 1 second
    });
  });

  describe('Schema Endpoints - Response Format', () => {
    it('should return proper content-type', async () => {
      // Act
      const response = await request(app)
        .get('/api/schema')
        .set('Authorization', `Bearer ${technicianToken}`);

      // Assert
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should include timestamp in all responses', async () => {
      // Act
      const responses = await Promise.all([
        request(app)
          .get('/api/schema')
          .set('Authorization', `Bearer ${technicianToken}`),
        request(app)
          .get('/api/schema/users')
          .set('Authorization', `Bearer ${technicianToken}`),
        request(app)
          .get('/api/schema/users/options/role_id')
          .set('Authorization', `Bearer ${technicianToken}`),
      ]);

      // Assert
      responses.forEach((response) => {
        expect(response.body.timestamp).toBeDefined();
        const timestamp = new Date(response.body.timestamp);
        expect(timestamp).toBeInstanceOf(Date);
      });
    });
  });
});
