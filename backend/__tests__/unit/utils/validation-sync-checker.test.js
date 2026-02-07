/**
 * Unit Tests for utils/validation-sync-checker.js
 *
 * Tests that validation-rules.json enum definitions stay synchronized
 * with PostgreSQL CHECK constraints.
 * PURE TESTS: Input → Output, no string matching on messages.
 */

// Mock logger
jest.mock("../../../config/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock validation-loader with a function we can control per-test
const mockLoadValidationRules = jest.fn();
jest.mock("../../../utils/validation-loader", () => ({
  loadValidationRules: mockLoadValidationRules,
}));

describe("utils/validation-sync-checker.js", () => {
  let validateEnumSync;
  let getDbCheckConstraints;
  let ENTITY_FIELD_TO_DB_MAPPING;
  let mockPool;

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock for validation rules - uses entityFields structure
    mockLoadValidationRules.mockReturnValue({
      entityFields: {
        role: { status: { enum: ["active", "inactive"] } },
        user: { status: { enum: ["active", "inactive", "suspended"] } },
        work_order: {
          status: {
            enum: ["pending", "in_progress", "completed", "cancelled"],
          },
        },
      },
    });

    // Mock pool with query method
    mockPool = {
      query: jest.fn(),
    };

    // Require module (no resetModules - keep stable mock reference)
    const syncChecker = require("../../../utils/validation-sync-checker");
    validateEnumSync = syncChecker.validateEnumSync;
    getDbCheckConstraints = syncChecker.getDbCheckConstraints;
    ENTITY_FIELD_TO_DB_MAPPING = syncChecker.ENTITY_FIELD_TO_DB_MAPPING;
  });

  describe("getDbCheckConstraints()", () => {
    test("should extract enum values from CHECK constraints", async () => {
      // Arrange
      mockPool.query.mockResolvedValue({
        rows: [
          {
            table_name: "roles",
            column_name: "status",
            constraint_definition:
              "CHECK ((status)::text = ANY (ARRAY['active'::character varying, 'inactive'::character varying]))",
          },
        ],
      });

      // Act
      const result = await getDbCheckConstraints(mockPool);

      // Assert
      expect(result["roles.status"]).toBeDefined();
      expect(result["roles.status"]).toEqual(["active", "inactive"]);
    });

    test("should handle multiple constraints", async () => {
      // Arrange
      mockPool.query.mockResolvedValue({
        rows: [
          {
            table_name: "roles",
            column_name: "status",
            constraint_definition:
              "CHECK ((status)::text = ANY (ARRAY['active'::character varying, 'inactive'::character varying]))",
          },
          {
            table_name: "users",
            column_name: "status",
            constraint_definition:
              "CHECK ((status)::text = ANY (ARRAY['active'::character varying, 'inactive'::character varying, 'suspended'::character varying]))",
          },
        ],
      });

      // Act
      const result = await getDbCheckConstraints(mockPool);

      // Assert
      expect(Object.keys(result)).toHaveLength(2);
      expect(result["roles.status"]).toEqual(["active", "inactive"]);
      expect(result["users.status"]).toEqual([
        "active",
        "inactive",
        "suspended",
      ]);
    });

    test("should return empty object for no constraints", async () => {
      // Arrange
      mockPool.query.mockResolvedValue({ rows: [] });

      // Act
      const result = await getDbCheckConstraints(mockPool);

      // Assert
      expect(result).toEqual({});
    });

    test("should skip constraints without ARRAY match", async () => {
      // Arrange
      mockPool.query.mockResolvedValue({
        rows: [
          {
            table_name: "test",
            column_name: "value",
            constraint_definition: "CHECK (value > 0)",
          },
        ],
      });

      // Act
      const result = await getDbCheckConstraints(mockPool);

      // Assert
      expect(result).toEqual({});
    });
  });

  describe("validateEnumSync()", () => {
    describe("matching enums", () => {
      test("should return true when Joi and DB enums match", async () => {
        // Arrange
        mockPool.query.mockResolvedValue({
          rows: [
            {
              table_name: "roles",
              column_name: "status",
              constraint_definition:
                "CHECK ((status)::text = ANY (ARRAY['active'::character varying, 'inactive'::character varying]))",
            },
          ],
        });

        // Act
        const result = await validateEnumSync(mockPool);

        // Assert
        expect(result).toBe(true);
      });

      test("should handle order-independent enum comparison", async () => {
        // Arrange - DB returns in different order
        mockPool.query.mockResolvedValue({
          rows: [
            {
              table_name: "roles",
              column_name: "status",
              constraint_definition:
                "CHECK ((status)::text = ANY (ARRAY['inactive'::character varying, 'active'::character varying]))",
            },
          ],
        });

        // Act
        const result = await validateEnumSync(mockPool);

        // Assert
        expect(result).toBe(true);
      });
    });

    describe("mismatched enums", () => {
      test("should throw error when Joi enum has extra values", async () => {
        // Arrange - Joi has 'extra' but DB doesn't
        mockLoadValidationRules.mockReturnValue({
          entityFields: {
            role: { status: { enum: ["active", "inactive", "extra"] } },
          },
        });
        mockPool.query.mockResolvedValue({
          rows: [
            {
              table_name: "roles",
              column_name: "status",
              constraint_definition:
                "CHECK ((status)::text = ANY (ARRAY['active'::character varying, 'inactive'::character varying]))",
            },
          ],
        });

        // Act & Assert
        await expect(validateEnumSync(mockPool)).rejects.toThrow();
      });

      test("should throw error when DB enum has extra values", async () => {
        // Arrange - DB has value that Joi doesn't
        mockLoadValidationRules.mockReturnValue({
          entityFields: {
            role: { status: { enum: ["active"] } },
          },
        });
        mockPool.query.mockResolvedValue({
          rows: [
            {
              table_name: "roles",
              column_name: "status",
              constraint_definition:
                "CHECK ((status)::text = ANY (ARRAY['active'::character varying, 'inactive'::character varying]))",
            },
          ],
        });

        // Act & Assert
        await expect(validateEnumSync(mockPool)).rejects.toThrow();
      });
    });

    describe("missing definitions", () => {
      test("should warn and continue when field definition not found", async () => {
        // Arrange - field in mapping but not in validation rules
        mockLoadValidationRules.mockReturnValue({
          entityFields: {}, // Empty entityFields
        });
        mockPool.query.mockResolvedValue({ rows: [] });

        // Act
        const result = await validateEnumSync(mockPool);

        // Assert - should complete without error
        expect(result).toBe(true);
      });

      test("should warn and continue when field has no enum", async () => {
        // Arrange - field exists but no enum
        mockLoadValidationRules.mockReturnValue({
          entityFields: {
            role: { status: { type: "string" } }, // No enum
          },
        });
        mockPool.query.mockResolvedValue({ rows: [] });

        // Act
        const result = await validateEnumSync(mockPool);

        // Assert
        expect(result).toBe(true);
      });

      test("should warn and continue when no DB constraint found", async () => {
        // Arrange
        mockLoadValidationRules.mockReturnValue({
          entityFields: {
            role: { status: { enum: ["active", "inactive"] } },
          },
        });
        mockPool.query.mockResolvedValue({ rows: [] }); // No constraints

        // Act
        const result = await validateEnumSync(mockPool);

        // Assert
        expect(result).toBe(true);
      });
    });

    describe("error handling", () => {
      test("should throw wrapped error on database failure", async () => {
        // Arrange
        mockPool.query.mockRejectedValue(new Error("Connection failed"));

        // Act & Assert
        await expect(validateEnumSync(mockPool)).rejects.toThrow();
      });
    });
  });

  describe("ENTITY_FIELD_TO_DB_MAPPING", () => {
    test("should export entity field mapping object", () => {
      // Assert
      expect(ENTITY_FIELD_TO_DB_MAPPING).toBeDefined();
      expect(typeof ENTITY_FIELD_TO_DB_MAPPING).toBe("object");
    });

    test("should map entity.field to table.column format", () => {
      // Assert
      for (const [entity, fieldMappings] of Object.entries(
        ENTITY_FIELD_TO_DB_MAPPING,
      )) {
        expect(typeof entity).toBe("string");
        expect(typeof fieldMappings).toBe("object");
        for (const [field, dbKey] of Object.entries(fieldMappings)) {
          expect(typeof field).toBe("string");
          expect(dbKey).toMatch(/^\w+\.\w+$/); // table.column format
        }
      }
    });

    test("should include core entity status fields", () => {
      // Assert
      expect(ENTITY_FIELD_TO_DB_MAPPING).toHaveProperty("role");
      expect(ENTITY_FIELD_TO_DB_MAPPING.role).toHaveProperty(
        "status",
        "roles.status",
      );
      expect(ENTITY_FIELD_TO_DB_MAPPING).toHaveProperty("user");
      expect(ENTITY_FIELD_TO_DB_MAPPING.user).toHaveProperty(
        "status",
        "users.status",
      );
      expect(ENTITY_FIELD_TO_DB_MAPPING).toHaveProperty("work_order");
      expect(ENTITY_FIELD_TO_DB_MAPPING.work_order).toHaveProperty(
        "status",
        "work_orders.status",
      );
    });
  });
});
