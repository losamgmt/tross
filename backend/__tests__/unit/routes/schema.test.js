/**
 * Schema Routes - Unit Tests
 *
 * Tests schema introspection API endpoints
 *
 * KISS: Test endpoint behavior, mock service
 */

const request = require("supertest");
const express = require("express");
const schemaRouter = require("../../../routes/schema");
const SchemaIntrospectionService = require("../../../services/schema-introspection");
const { authenticateToken } = require("../../../middleware/auth");

// Mock dependencies
jest.mock("../../../services/schema-introspection");
jest.mock("../../../middleware/auth");

describe("Schema Routes", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Express app
    app = express();
    app.use(express.json());
    app.use("/api/schema", schemaRouter);

    // Global error handler - mimics server.js pattern-matching behavior
    // eslint-disable-next-line no-unused-vars
    app.use((err, req, res, next) => {
      const messageLower = (err.message || "").toLowerCase();
      let statusCode = 500;

      // Pattern match error messages to determine HTTP status (same as server.js)
      // Note: "Cannot read properties" is an internal JS error, NOT a 400 validation error
      if (
        messageLower.includes("not found") ||
        messageLower.includes("does not exist")
      ) {
        statusCode = 404;
      } else if (
        messageLower.includes("invalid") ||
        messageLower.includes("required") ||
        messageLower.includes("must be") ||
        messageLower.includes("already") ||
        messageLower.includes("yourself") ||
        messageLower.includes("not a foreign key") ||
        (messageLower.includes("cannot") &&
          !messageLower.includes("cannot read properties"))
      ) {
        statusCode = 400;
      } else if (
        messageLower.includes("expired") ||
        messageLower.includes("unauthorized")
      ) {
        statusCode = 401;
      } else if (
        messageLower.includes("permission") ||
        messageLower.includes("forbidden") ||
        messageLower.includes("access denied") ||
        messageLower.includes("not allowed")
      ) {
        statusCode = 403;
      }

      const errorMessage = err.message || "Internal server error";
      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        message: errorMessage,
        timestamp: new Date().toISOString(),
      });
    });

    // Mock auth middleware to pass through
    authenticateToken.mockImplementation((req, res, next) => next());
  });

  describe("GET /api/schema", () => {
    test("should return list of tables", async () => {
      // Arrange
      const mockTables = [
        { name: "users", displayName: "Users", description: "System users" },
        { name: "roles", displayName: "Roles", description: "User roles" },
      ];
      SchemaIntrospectionService.getAllTables.mockResolvedValue(mockTables);

      // Act
      const response = await request(app).get("/api/schema");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: mockTables,
        timestamp: expect.any(String),
      });
    });

    test("should handle service errors", async () => {
      // Arrange
      SchemaIntrospectionService.getAllTables.mockRejectedValue(
        new Error("Database connection failed"),
      );

      // Act
      const response = await request(app).get("/api/schema");

      // Assert
      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        error: expect.any(String),
        message: expect.any(String),
      });
    });
  });

  describe("GET /api/schema/:tableName", () => {
    test("should return table schema", async () => {
      // Arrange
      const mockSchema = {
        tableName: "users",
        displayName: "Users",
        columns: [
          {
            name: "id",
            type: "number",
            nullable: false,
            uiType: "readonly",
            label: "ID",
          },
          {
            name: "email",
            type: "string",
            nullable: false,
            uiType: "email",
            label: "Email Address",
          },
        ],
      };
      SchemaIntrospectionService.getTableSchema.mockResolvedValue(mockSchema);

      // Act
      const response = await request(app).get("/api/schema/users");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: mockSchema,
      });
      expect(SchemaIntrospectionService.getTableSchema).toHaveBeenCalledWith(
        "users",
      );
    });

    test("should return 404 for non-existent table", async () => {
      // Arrange
      SchemaIntrospectionService.getTableSchema.mockRejectedValue(
        new Error('Table "invalid_table" does not exist'),
      );

      // Act
      const response = await request(app).get("/api/schema/invalid_table");

      // Assert
      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        error: expect.stringContaining("does not exist"),
        message: expect.stringContaining("does not exist"),
      });
    });

    test("should handle other service errors as 500", async () => {
      // Arrange
      SchemaIntrospectionService.getTableSchema.mockRejectedValue(
        new Error("Query timeout"),
      );

      // Act
      const response = await request(app).get("/api/schema/users");

      // Assert
      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        error: expect.any(String),
        message: expect.any(String),
      });
    });
  });

  describe("GET /api/schema/:tableName/options/:column", () => {
    test("should return foreign key options", async () => {
      // Arrange
      const mockSchema = {
        tableName: "users",
        columns: [
          {
            name: "role_id",
            type: "number",
            foreignKey: {
              table: "roles",
              column: "id",
            },
          },
        ],
      };
      const mockOptions = [
        { value: 1, label: "Admin" },
        { value: 2, label: "User" },
      ];

      SchemaIntrospectionService.getTableSchema.mockResolvedValue(mockSchema);
      SchemaIntrospectionService.getForeignKeyOptions.mockResolvedValue(
        mockOptions,
      );

      // Act
      const response = await request(app).get(
        "/api/schema/users/options/role_id",
      );

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: mockOptions,
      });
      expect(
        SchemaIntrospectionService.getForeignKeyOptions,
      ).toHaveBeenCalledWith("roles");
    });

    test("should return 400 for non-foreign-key column", async () => {
      // Arrange
      const mockSchema = {
        tableName: "users",
        columns: [
          {
            name: "email",
            type: "string",
            foreignKey: null,
          },
        ],
      };

      SchemaIntrospectionService.getTableSchema.mockResolvedValue(mockSchema);

      // Act
      const response = await request(app).get(
        "/api/schema/users/options/email",
      );

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: expect.any(String),
        message: expect.stringContaining("not a foreign key"),
      });
    });

    test("should return 400 for non-existent column", async () => {
      // Arrange
      const mockSchema = {
        tableName: "users",
        columns: [
          {
            name: "role_id",
            type: "number",
          },
        ],
      };

      SchemaIntrospectionService.getTableSchema.mockResolvedValue(mockSchema);

      // Act
      const response = await request(app).get(
        "/api/schema/users/options/invalid_column",
      );

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: expect.any(String),
        message: expect.stringContaining("not a foreign key"),
      });
    });

    test("should handle service errors", async () => {
      // Arrange
      SchemaIntrospectionService.getTableSchema.mockRejectedValue(
        new Error("Database error"),
      );

      // Act
      const response = await request(app).get(
        "/api/schema/users/options/role_id",
      );

      // Assert
      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        error: expect.any(String),
        message: expect.any(String),
      });
    });
  });
});
