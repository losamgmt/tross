/**
 * Unit Tests: db/helpers/cascade-helper.js
 *
 * Tests generic cascade delete helper.
 * SRP: Verify cascade operations work correctly for all dependency types.
 */

// Mock dependencies BEFORE requiring the helper
jest.mock("../../../config/logger");

const {
  cascadeDeleteDependents,
} = require("../../../db/helpers/cascade-helper");
const { createMockClient } = require("../../mocks");

describe("db/helpers/cascade-helper.js", () => {
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = createMockClient();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // =============================================================================
  // BASIC FUNCTIONALITY
  // =============================================================================
  describe("Basic cascade operations", () => {
    test("should return empty result when no dependents defined", async () => {
      const metadata = {
        tableName: "inventory",
        dependents: [],
      };

      const result = await cascadeDeleteDependents(mockClient, metadata, 1);

      expect(result).toEqual({
        totalDeleted: 0,
        details: [],
      });
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    test("should return empty result when dependents is undefined", async () => {
      const metadata = {
        tableName: "inventory",
        // dependents not defined
      };

      const result = await cascadeDeleteDependents(mockClient, metadata, 1);

      expect(result).toEqual({
        totalDeleted: 0,
        details: [],
      });
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    test("should handle single polymorphic dependent", async () => {
      const metadata = {
        tableName: "roles",
        dependents: [
          {
            table: "audit_logs",
            foreignKey: "resource_id",
            polymorphicType: { column: "resource_type", value: "roles" },
          },
        ],
      };

      mockClient.query.mockResolvedValue({ rowCount: 5 });

      const result = await cascadeDeleteDependents(mockClient, metadata, 123);

      expect(result).toEqual({
        totalDeleted: 5,
        details: [
          {
            table: "audit_logs",
            foreignKey: "resource_id",
            polymorphic: true,
            deleted: 5,
          },
        ],
      });

      expect(mockClient.query).toHaveBeenCalledWith(
        "DELETE FROM audit_logs WHERE resource_id = $1 AND resource_type = $2",
        [123, "roles"],
      );
    });

    test("should handle single non-polymorphic dependent", async () => {
      const metadata = {
        tableName: "customers",
        dependents: [
          {
            table: "notes",
            foreignKey: "customer_id",
          },
        ],
      };

      mockClient.query.mockResolvedValue({ rowCount: 3 });

      const result = await cascadeDeleteDependents(mockClient, metadata, 456);

      expect(result).toEqual({
        totalDeleted: 3,
        details: [
          {
            table: "notes",
            foreignKey: "customer_id",
            polymorphic: false,
            deleted: 3,
          },
        ],
      });

      expect(mockClient.query).toHaveBeenCalledWith(
        "DELETE FROM notes WHERE customer_id = $1",
        [456],
      );
    });
  });

  // =============================================================================
  // MULTIPLE DEPENDENTS
  // =============================================================================
  describe("Multiple dependents", () => {
    test("should cascade delete multiple dependents in order", async () => {
      const metadata = {
        tableName: "users",
        dependents: [
          {
            table: "audit_logs",
            foreignKey: "resource_id",
            polymorphicType: { column: "resource_type", value: "users" },
          },
          {
            table: "user_sessions",
            foreignKey: "user_id",
          },
        ],
      };

      mockClient.query
        .mockResolvedValueOnce({ rowCount: 10 }) // audit_logs
        .mockResolvedValueOnce({ rowCount: 2 }); // user_sessions

      const result = await cascadeDeleteDependents(mockClient, metadata, 789);

      expect(result).toEqual({
        totalDeleted: 12,
        details: [
          {
            table: "audit_logs",
            foreignKey: "resource_id",
            polymorphic: true,
            deleted: 10,
          },
          {
            table: "user_sessions",
            foreignKey: "user_id",
            polymorphic: false,
            deleted: 2,
          },
        ],
      });

      expect(mockClient.query).toHaveBeenCalledTimes(2);
    });

    test("should accumulate total deleted count correctly", async () => {
      const metadata = {
        tableName: "customers",
        dependents: [
          {
            table: "audit_logs",
            foreignKey: "resource_id",
            polymorphicType: { column: "resource_type", value: "customers" },
          },
          { table: "notes", foreignKey: "customer_id" },
          { table: "preferences", foreignKey: "customer_id" },
        ],
      };

      mockClient.query
        .mockResolvedValueOnce({ rowCount: 5 })
        .mockResolvedValueOnce({ rowCount: 3 })
        .mockResolvedValueOnce({ rowCount: 1 });

      const result = await cascadeDeleteDependents(mockClient, metadata, 1);

      expect(result.totalDeleted).toBe(9);
      expect(result.details).toHaveLength(3);
    });
  });

  // =============================================================================
  // EDGE CASES
  // =============================================================================
  describe("Edge cases", () => {
    test("should handle zero rows deleted gracefully", async () => {
      const metadata = {
        tableName: "roles",
        dependents: [
          {
            table: "audit_logs",
            foreignKey: "resource_id",
            polymorphicType: { column: "resource_type", value: "roles" },
          },
        ],
      };

      mockClient.query.mockResolvedValue({ rowCount: 0 });

      const result = await cascadeDeleteDependents(mockClient, metadata, 999);

      expect(result).toEqual({
        totalDeleted: 0,
        details: [
          {
            table: "audit_logs",
            foreignKey: "resource_id",
            polymorphic: true,
            deleted: 0,
          },
        ],
      });
    });

    test("should propagate database errors", async () => {
      const metadata = {
        tableName: "roles",
        dependents: [
          {
            table: "audit_logs",
            foreignKey: "resource_id",
            polymorphicType: { column: "resource_type", value: "roles" },
          },
        ],
      };

      const dbError = new Error("Connection lost");
      mockClient.query.mockRejectedValue(dbError);

      await expect(
        cascadeDeleteDependents(mockClient, metadata, 123),
      ).rejects.toThrow("Connection lost");
    });

    test("should handle partial cascade failure", async () => {
      const metadata = {
        tableName: "users",
        dependents: [
          {
            table: "audit_logs",
            foreignKey: "resource_id",
            polymorphicType: { column: "resource_type", value: "users" },
          },
          { table: "user_sessions", foreignKey: "user_id" },
        ],
      };

      mockClient.query
        .mockResolvedValueOnce({ rowCount: 5 }) // First succeeds
        .mockRejectedValueOnce(new Error("Table does not exist")); // Second fails

      await expect(
        cascadeDeleteDependents(mockClient, metadata, 123),
      ).rejects.toThrow("Table does not exist");
    });
  });

  // =============================================================================
  // QUERY STRUCTURE VALIDATION
  // =============================================================================
  describe("Query structure", () => {
    test("should build correct polymorphic DELETE query", async () => {
      const metadata = {
        tableName: "technicians",
        dependents: [
          {
            table: "audit_logs",
            foreignKey: "resource_id",
            polymorphicType: { column: "resource_type", value: "technicians" },
          },
        ],
      };

      mockClient.query.mockResolvedValue({ rowCount: 0 });

      await cascadeDeleteDependents(mockClient, metadata, 42);

      expect(mockClient.query).toHaveBeenCalledWith(
        "DELETE FROM audit_logs WHERE resource_id = $1 AND resource_type = $2",
        [42, "technicians"],
      );
    });

    test("should build correct simple FK DELETE query", async () => {
      const metadata = {
        tableName: "work_orders",
        dependents: [
          {
            table: "line_items",
            foreignKey: "work_order_id",
          },
        ],
      };

      mockClient.query.mockResolvedValue({ rowCount: 0 });

      await cascadeDeleteDependents(mockClient, metadata, 99);

      expect(mockClient.query).toHaveBeenCalledWith(
        "DELETE FROM line_items WHERE work_order_id = $1",
        [99],
      );
    });

    test("should preserve exact polymorphic type value from metadata", async () => {
      const metadata = {
        tableName: "inventory",
        dependents: [
          {
            table: "audit_logs",
            foreignKey: "resource_id",
            polymorphicType: { column: "resource_type", value: "inventory" },
          },
        ],
      };

      mockClient.query.mockResolvedValue({ rowCount: 0 });

      await cascadeDeleteDependents(mockClient, metadata, 1);

      // Verify the exact value is used (not inferred from tableName)
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.any(String),
        [1, "inventory"], // Uses 'inventory' from polymorphicType.value
      );
    });
  });
});
