/**
 * Unit Tests: Role Model - Validation
 * Tests input validation, error handling, and constraints
 * Target: 90%+ code coverage
 */

const Role = require("../../../db/models/Role");
const db = require("../../../db/connection");
const { MODEL_ERRORS } = require("../../../config/constants");

// Mock the database connection with enhanced mock that supports both patterns
jest.mock("../../../db/connection", () => 
  require("../../mocks").createDBMock()
);

describe("Role Model - Validation", () => {
  let mockClient;

  // Clear all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Get the mock client for transaction tests
    mockClient = db.__getMockClient();
    
    // CRITICAL: Re-mock getClient after clearAllMocks (clearAllMocks removes the implementation)
    db.getClient.mockResolvedValue(mockClient);
  });

  // Restore all mocks after all tests complete
  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe("isProtected()", () => {
    test("should return true for admin role", () => {
      expect(Role.isProtected("admin")).toBe(true);
    });

    test("should return true for customer role", () => {
      expect(Role.isProtected("customer")).toBe(true);
    });

    test("should return true for admin role (uppercase)", () => {
      expect(Role.isProtected("ADMIN")).toBe(true);
    });

    test("should return true for customer role (mixed case)", () => {
      expect(Role.isProtected("Customer")).toBe(true);
    });

    test("should return false for non-protected roles", () => {
      expect(Role.isProtected("dispatcher")).toBe(false);
      expect(Role.isProtected("technician")).toBe(false);
      expect(Role.isProtected("manager")).toBe(false);
    });

    test("should return false for custom roles", () => {
      expect(Role.isProtected("custom_role")).toBe(false);
    });

    test("should handle empty string", () => {
      expect(Role.isProtected("")).toBe(false);
    });
  });

  describe("create() - Validation", () => {
    test("should reject null name", async () => {
      await expect(Role.create(null)).rejects.toThrow("Role name is required");
      expect(db.query).not.toHaveBeenCalled();
    });

    test("should reject undefined name", async () => {
      await expect(Role.create(undefined)).rejects.toThrow(
        "Role name is required",
      );
      expect(db.query).not.toHaveBeenCalled();
    });

    test("should reject non-string name", async () => {
      await expect(Role.create(123)).rejects.toThrow("Role name is required");
      expect(db.query).not.toHaveBeenCalled();
    });

    test("should reject empty string after trim", async () => {
      await expect(Role.create("   ")).rejects.toThrow(
        "Role name cannot be empty",
      );
      expect(db.query).not.toHaveBeenCalled();
    });

    test("should reject empty string", async () => {
      await expect(Role.create("")).rejects.toThrow("Role name is required");
      expect(db.query).not.toHaveBeenCalled();
    });

    test("should handle duplicate role name error", async () => {
      const dbError = new Error(
        "Duplicate key value violates unique constraint",
      );
      dbError.constraint = "roles_name_key";
      db.query.mockRejectedValue(dbError);

      await expect(Role.create("admin")).rejects.toThrow(
        "Role name already exists",
      );
    });

    test("should handle generic database errors", async () => {
      const dbError = new Error("Connection lost");
      db.query.mockRejectedValue(dbError);

      await expect(Role.create("new_role")).rejects.toThrow(
        "Failed to create role",
      );
    });
  });

  describe("update() - Validation", () => {
    test("should reject update with null ID", async () => {
      await expect(Role.update(null, "new_name")).rejects.toThrow(
        "Role ID and name are required",
      );
      expect(db.query).not.toHaveBeenCalled();
    });

    test("should reject update with null name", async () => {
      await expect(Role.update(1, null)).rejects.toThrow(
        "Role ID and name are required",
      );
      expect(db.query).not.toHaveBeenCalled();
    });

    test("should reject update with non-string name", async () => {
      await expect(Role.update(1, 123)).rejects.toThrow(
        "Role ID and name are required",
      );
      expect(db.query).not.toHaveBeenCalled();
    });

    test("should reject update with empty name after trim", async () => {
      await expect(Role.update(1, { name: "   " })).rejects.toThrow(
        "Role name cannot be empty",
      );
      expect(db.query).not.toHaveBeenCalled();
    });

    test("should reject update for non-existent role", async () => {
      db.query.mockResolvedValueOnce({ rows: [] }); // findById returns nothing

      await expect(Role.update(999, { name: "new_name" })).rejects.toThrow(
        "Role not found",
      );
      expect(db.query).toHaveBeenCalledTimes(1);
    });

    test("should reject update for protected role (admin)", async () => {
      const protectedRole = { id: 1, name: "admin", created_at: "2025-01-01" };
      db.query.mockResolvedValueOnce({ rows: [protectedRole] });

      await expect(Role.update(1, { name: "super_admin" })).rejects.toThrow(
        "Cannot modify protected role",
      );
      expect(db.query).toHaveBeenCalledTimes(1); // Only findById, no update
    });

    test("should reject update for protected role (customer)", async () => {
      const protectedRole = { id: 5, name: "customer", created_at: "2025-01-02" };
      db.query.mockResolvedValueOnce({ rows: [protectedRole] });

      await expect(Role.update(5, { name: "client" })).rejects.toThrow(
        "Cannot modify protected role",
      );
    });

    test("should handle duplicate name error", async () => {
      const existingRole = {
        id: 4,
        name: "dispatcher",
        created_at: "2025-01-04",
      };
      const dbError = new Error("Duplicate key");
      dbError.constraint = "roles_name_key";

      db.query
        .mockResolvedValueOnce({ rows: [existingRole] })
        .mockRejectedValueOnce(dbError);

      await expect(Role.update(4, { name: "admin" })).rejects.toThrow(
        "Role name already exists",
      );
    });

    test("should handle update returning no rows (race condition)", async () => {
      const existingRole = {
        id: 4,
        name: "dispatcher",
        created_at: "2025-01-04",
      };

      db.query
        .mockResolvedValueOnce({ rows: [existingRole] })
        .mockResolvedValueOnce({ rows: [] }); // UPDATE returns nothing

      await expect(Role.update(4, { name: "new_name" })).rejects.toThrow(
        "Role not found",
      );
    });

    test("should propagate other database errors", async () => {
      const existingRole = {
        id: 4,
        name: "dispatcher",
        created_at: "2025-01-04",
      };
      const dbError = new Error("Connection lost");

      db.query
        .mockResolvedValueOnce({ rows: [existingRole] })
        .mockRejectedValueOnce(dbError);

      await expect(Role.update(4, { name: "new_name" })).rejects.toThrow(
        "Connection lost",
      );
    });
  });

  describe("delete() - Validation", () => {
    test("should reject delete with null ID", async () => {
      await expect(Role.delete(null)).rejects.toThrow("Role ID is required");
      expect(db.getClient).not.toHaveBeenCalled();
    });

    test("should reject delete with undefined ID", async () => {
      await expect(Role.delete(undefined)).rejects.toThrow(
        "Role ID is required",
      );
      expect(db.getClient).not.toHaveBeenCalled();
    });

    test("should reject delete for non-existent role", async () => {
      // Mock sequence: BEGIN, SELECT (not found)
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // SELECT returns nothing

      await expect(Role.delete(999)).rejects.toThrow("Role not found");
      expect(mockClient.release).toHaveBeenCalled();
    });

    test("should reject delete for protected role (admin)", async () => {
      const protectedRole = { id: 1, name: "admin", created_at: "2025-01-01" };
      // Mock sequence: BEGIN, SELECT (found admin)
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({ rows: [protectedRole] }); // SELECT finds admin

      await expect(Role.delete(1)).rejects.toThrow(
        "Cannot delete protected role",
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    test("should reject delete for protected role (customer)", async () => {
      const protectedRole = { id: 5, name: "customer", created_at: "2025-01-02" };
      // Mock sequence: BEGIN, SELECT (found customer)
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({ rows: [protectedRole] }); // SELECT finds customer

      await expect(Role.delete(5)).rejects.toThrow(
        "Cannot delete protected role",
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    test("should reject delete when users are assigned to role", async () => {
      const roleWithUsers = {
        id: 4,
        name: "dispatcher",
        created_at: "2025-01-04",
      };

      // Mock sequence: BEGIN, SELECT (found role), SELECT COUNT (has users)
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({ rows: [roleWithUsers] }) // SELECT role
        .mockResolvedValueOnce({ rows: [{ count: "5" }] }); // SELECT COUNT

      await expect(Role.delete(4)).rejects.toThrow(
        MODEL_ERRORS.ROLE.USERS_ASSIGNED(5),
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    test("should handle count as integer string", async () => {
      const roleWithUsers = {
        id: 4,
        name: "dispatcher",
        created_at: "2025-01-04",
      };

      // Mock sequence: BEGIN, SELECT (found role), SELECT COUNT (string)
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({ rows: [roleWithUsers] }) // SELECT role
        .mockResolvedValueOnce({ rows: [{ count: "1" }] }); // SELECT COUNT as string

      await expect(Role.delete(4)).rejects.toThrow(
        MODEL_ERRORS.ROLE.USERS_ASSIGNED(1),
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    test("should handle count as integer number", async () => {
      const roleWithUsers = {
        id: 4,
        name: "dispatcher",
        created_at: "2025-01-04",
      };

      // Mock sequence: BEGIN, SELECT (found role), SELECT COUNT (number)
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({ rows: [roleWithUsers] }) // SELECT role
        .mockResolvedValueOnce({ rows: [{ count: 3 }] }); // SELECT COUNT as number

      await expect(Role.delete(4)).rejects.toThrow(
        MODEL_ERRORS.ROLE.USERS_ASSIGNED(3),
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    test("should handle DELETE returning no rows (race condition)", async () => {
      const roleToDelete = {
        id: 4,
        name: "dispatcher",
        created_at: "2025-01-04",
      };

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [] }) // DELETE audit_logs
          .mockResolvedValueOnce({ rows: [] }) // DELETE role - returns nothing
          .mockResolvedValueOnce({ rows: [] }), // ROLLBACK
        release: jest.fn(),
      };

      db.query.mockResolvedValueOnce({ rows: [roleToDelete] }) // findById
        .mockResolvedValueOnce({ rows: [{ count: "0" }] }); // count check
      db.getClient = jest.fn().mockResolvedValue(mockClient);

      await expect(Role.delete(4)).rejects.toThrow("Role not found");
      expect(mockClient.release).toHaveBeenCalled();
    });

    test("should propagate database errors", async () => {
      const roleToDelete = {
        id: 4,
        name: "dispatcher",
        created_at: "2025-01-04",
      };
      const dbError = new Error("Connection timeout");

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockRejectedValueOnce(dbError), // DELETE audit_logs - error
        release: jest.fn(),
      };

      db.query.mockResolvedValueOnce({ rows: [roleToDelete] }) // findById
        .mockResolvedValueOnce({ rows: [{ count: "0" }] }); // count check  
      db.getClient = jest.fn().mockResolvedValue(mockClient);

      await expect(Role.delete(4)).rejects.toThrow("Connection timeout");
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
