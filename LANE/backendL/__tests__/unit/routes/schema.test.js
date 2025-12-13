/**
 * Schema Routes - Unit Tests
 *
 * Tests schema introspection API endpoints
 *
 * KISS: Test endpoint behavior, mock service
 */

const request = require('supertest');
const express = require('express');
const schemaRouter = require('../../../routes/schema');
const SchemaIntrospectionService = require('../../../services/schema-introspection');
const { authenticateToken } = require('../../../middleware/auth');

// Mock dependencies
jest.mock('../../../services/schema-introspection');
jest.mock('../../../middleware/auth');

describe('Schema Routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api/schema', schemaRouter);

    // Mock auth middleware to pass through
    authenticateToken.mockImplementation((req, res, next) => next());
  });

  describe('GET /api/schema', () => {
    it('should return list of tables', async () => {
      // Arrange
      const mockTables = [
        { name: 'users', displayName: 'Users', description: 'System users' },
        { name: 'roles', displayName: 'Roles', description: 'User roles' },
      ];
      SchemaIntrospectionService.getAllTables.mockResolvedValue(mockTables);

      // Act
      const response = await request(app).get('/api/schema');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: mockTables,
        timestamp: expect.any(String),
      });
    });

    it('should handle service errors', async () => {
      // Arrange
      SchemaIntrospectionService.getAllTables.mockRejectedValue(
        new Error('Database connection failed'),
      );

      // Act
      const response = await request(app).get('/api/schema');

      // Assert
      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        error: 'Schema Introspection Error',
        message: 'Database connection failed',
      });
    });
  });

  describe('GET /api/schema/:tableName', () => {
    it('should return table schema', async () => {
      // Arrange
      const mockSchema = {
        tableName: 'users',
        displayName: 'Users',
        columns: [
          {
            name: 'id',
            type: 'number',
            nullable: false,
            uiType: 'readonly',
            label: 'ID',
          },
          {
            name: 'email',
            type: 'string',
            nullable: false,
            uiType: 'email',
            label: 'Email Address',
          },
        ],
      };
      SchemaIntrospectionService.getTableSchema.mockResolvedValue(mockSchema);

      // Act
      const response = await request(app).get('/api/schema/users');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: mockSchema,
      });
      expect(SchemaIntrospectionService.getTableSchema).toHaveBeenCalledWith('users');
    });

    it('should return 404 for non-existent table', async () => {
      // Arrange
      SchemaIntrospectionService.getTableSchema.mockRejectedValue(
        new Error('Table "invalid_table" does not exist'),
      );

      // Act
      const response = await request(app).get('/api/schema/invalid_table');

      // Assert
      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        error: 'Not Found',
        message: expect.stringContaining('does not exist'),
      });
    });

    it('should handle other service errors as 500', async () => {
      // Arrange
      SchemaIntrospectionService.getTableSchema.mockRejectedValue(
        new Error('Query timeout'),
      );

      // Act
      const response = await request(app).get('/api/schema/users');

      // Assert
      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        error: 'Schema Introspection Error',
        message: 'Query timeout',
      });
    });
  });

  describe('GET /api/schema/:tableName/options/:column', () => {
    it('should return foreign key options', async () => {
      // Arrange
      const mockSchema = {
        tableName: 'users',
        columns: [
          {
            name: 'role_id',
            type: 'number',
            foreignKey: {
              table: 'roles',
              column: 'id',
            },
          },
        ],
      };
      const mockOptions = [
        { value: 1, label: 'Admin' },
        { value: 2, label: 'User' },
      ];

      SchemaIntrospectionService.getTableSchema.mockResolvedValue(mockSchema);
      SchemaIntrospectionService.getForeignKeyOptions.mockResolvedValue(mockOptions);

      // Act
      const response = await request(app).get('/api/schema/users/options/role_id');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: mockOptions,
      });
      expect(SchemaIntrospectionService.getForeignKeyOptions).toHaveBeenCalledWith(
        'roles',
      );
    });

    it('should return 400 for non-foreign-key column', async () => {
      // Arrange
      const mockSchema = {
        tableName: 'users',
        columns: [
          {
            name: 'email',
            type: 'string',
            foreignKey: null,
          },
        ],
      };

      SchemaIntrospectionService.getTableSchema.mockResolvedValue(mockSchema);

      // Act
      const response = await request(app).get('/api/schema/users/options/email');

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: 'Invalid Request',
        message: expect.stringContaining('not a foreign key'),
      });
    });

    it('should return 400 for non-existent column', async () => {
      // Arrange
      const mockSchema = {
        tableName: 'users',
        columns: [
          {
            name: 'role_id',
            type: 'number',
          },
        ],
      };

      SchemaIntrospectionService.getTableSchema.mockResolvedValue(mockSchema);

      // Act
      const response = await request(app).get(
        '/api/schema/users/options/invalid_column',
      );

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: 'Invalid Request',
        message: expect.stringContaining('not a foreign key'),
      });
    });

    it('should handle service errors', async () => {
      // Arrange
      SchemaIntrospectionService.getTableSchema.mockRejectedValue(
        new Error('Database error'),
      );

      // Act
      const response = await request(app).get('/api/schema/users/options/role_id');

      // Assert
      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        error: 'Schema Options Error',
        message: 'Database error',
      });
    });
  });
});
