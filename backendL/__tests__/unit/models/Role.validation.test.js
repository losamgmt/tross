/**
 * Unit Tests: Role Model - Validation
 * Tests input validation, error handling, and constraints
 * Target: 90%+ code coverage
 */

const Role = require("../../../db/models/Role");
const db = require("../../../db/connection");
const { MODEL_ERRORS } = require("../../../config/constants");

// Mock the database connection
jest.mock("../../../db/connection", () => ({
  query: jest.fn(),
}));

describe("Role Model - Validation", () => {
  // Clear all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Restore all mocks after all tests complete
  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe("isProtected()", () => {
    it("should return true for admin role", () => {
      expect(Role.isProtected("admin")).toBe(true);
    });

    it("should return true for client role", () => {
      expect(Role.isProtected("client")).toBe(true);
    });

    it("should return true for admin role (uppercase)", () => {
      expect(Role.isProtected("ADMIN")).toBe(true);
    });

    it("should return true for client role (mixed case)", () => {
      expect(Role.isProtected("Client")).toBe(true);
    });

    it("should return false for non-protected roles", () => {
      expect(Role.isProtected("dispatcher")).toBe(false);
      expect(Role.isProtected("technician")).toBe(false);
      expect(Role.isProtected("manager")).toBe(false);
    });

    it("should return false for custom roles", () => {
      expect(Role.isProtected("custom_role")).toBe(false);
    });

    it("should handle empty string", () => {
      expect(Role.isProtected("")).toBe(false);
    });
  });

  describe("create() - Validation", () => {
    it("should reject null name", async () => {
      await expect(Role.create(null)).rejects.toThrow("Role name is required");
      expect(db.query).not.toHaveBeenCalled();
    });

    it("should reject undefined name", async () => {
      await expect(Role.create(undefined)).rejects.toThrow(
        "Role name is required",
      );
      expect(db.query).not.toHaveBeenCalled();
    });

    it("should reject non-string name", async () => {
      await expect(Role.create(123)).rejects.toThrow("Role name is required");
      expect(db.query).not.toHaveBeenCalled();
    });

    it("should reject empty string after trim", async () => {
      await expect(Role.create("   ")).rejects.toThrow(
        "Role name cannot be empty",
      );
      expect(db.query).not.toHaveBeenCalled();
    });

    it("should reject empty string", async () => {
      await expect(Role.create("")).rejects.toThrow("Role name is required");
      expect(db.query).not.toHaveBeenCalled();
    });

    it("should handle duplicate role name error", async () => {
      const dbError = new Error(
        "Duplicate key value violates unique constraint",
      );
      dbError.constraint = "roles_name_key";
      db.query.mockRejectedValue(dbError);

      await expect(Role.create("admin")).rejects.toThrow(
        "Role name already exists",
      );
    });

    it("should handle generic database errors", async () => {
      const dbError = new Error("Connection lost");
      db.query.mockRejectedValue(dbError);

      await expect(Role.create("new_role")).rejects.toThrow(
        "Failed to create role",
      );
    });
  });

  describe("update() - Validation", () => {
    it("should reject update with null ID", async () => {
      await expect(Role.update(null, "new_name")).rejects.toThrow(
        "Role ID and name are required",
      );
      expect(db.query).not.toHaveBeenCalled();
    });

    it("should reject update with null name", async () => {
      await expect(Role.update(1, null)).rejects.toThrow(
        "Role ID and name are required",
      );
      expect(db.query).not.toHaveBeenCalled();
    });

    it("should reject update with non-string name", async () => {
      await expect(Role.update(1, 123)).rejects.toThrow(
        "Role ID and name are required",
      );
      expect(db.query).not.toHaveBeenCalled();
    });

    it("should reject update with empty name after trim", async () => {
      await expect(Role.update(1, { name: "   " })).rejects.toThrow(
        "Role name cannot be empty",
      );
      expect(db.query).not.toHaveBeenCalled();
    });

    it("should reject update for non-existent role", async () => {
      db.query.mockResolvedValueOnce({ rows: [] }); // findById returns nothing

      await expect(Role.update(999, { name: "new_name" })).rejects.toThrow(
        "Role not found",
      );
      expect(db.query).toHaveBeenCalledTimes(1);
    });

    it("should reject update for protected role (admin)", async () => {
      const protectedRole = { id: 1, name: "admin", created_at: "2025-01-01" };
      db.query.mockResolvedValueOnce({ rows: [protectedRole] });

      await expect(Role.update(1, { name: "super_admin" })).rejects.toThrow(
        "Cannot modify protected role",
      );
      expect(db.query).toHaveBeenCalledTimes(1); // Only findById, no update
    });

    it("should reject update for protected role (client)", async () => {
      const protectedRole = { id: 2, name: "client", created_at: "2025-01-02" };
      db.query.mockResolvedValueOnce({ rows: [protectedRole] });

      await expect(Role.update(2, { name: "customer" })).rejects.toThrow(
        "Cannot modify protected role",
      );
    });

    it("should handle duplicate name error", async () => {
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

    it("should handle update returning no rows (race condition)", async () => {
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

    it("should propagate other database errors", async () => {
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
    it("should reject delete with null ID", async () => {
      await expect(Role.delete(null)).rejects.toThrow("Role ID is required");
      expect(db.query).not.toHaveBeenCalled();
    });

    it("should reject delete with undefined ID", async () => {
      await expect(Role.delete(undefined)).rejects.toThrow(
        "Role ID is required",
      );
      expect(db.query).not.toHaveBeenCalled();
    });

    it("should reject delete for non-existent role", async () => {
      db.query.mockResolvedValueOnce({ rows: [] }); // findById returns nothing

      await expect(Role.delete(999)).rejects.toThrow("Role not found");
      expect(db.query).toHaveBeenCalledTimes(1);
    });

    it("should reject delete for protected role (admin)", async () => {
      const protectedRole = { id: 1, name: "admin", created_at: "2025-01-01" };
      db.query.mockResolvedValueOnce({ rows: [protectedRole] });

      await expect(Role.delete(1)).rejects.toThrow(
        "Cannot delete protected role",
      );
      expect(db.query).toHaveBeenCalledTimes(1); // Only findById
    });

    it("should reject delete for protected role (client)", async () => {
      const protectedRole = { id: 2, name: "client", created_at: "2025-01-02" };
      db.query.mockResolvedValueOnce({ rows: [protectedRole] });

      await expect(Role.delete(2)).rejects.toThrow(
        "Cannot delete protected role",
      );
    });

    it("should reject delete when users are assigned to role", async () => {
      const roleWithUsers = {
        id: 4,
        name: "dispatcher",
        created_at: "2025-01-04",
      };

      db.query
        .mockResolvedValueOnce({ rows: [roleWithUsers] })
        .mockResolvedValueOnce({ rows: [{ count: "5" }] }); // 5 users assigned

      await expect(Role.delete(4)).rejects.toThrow(
        MODEL_ERRORS.ROLE.USERS_ASSIGNED(5),
      );
      expect(db.query).toHaveBeenCalledTimes(2); // findById + count check, no delete
    });

    it("should handle count as integer string", async () => {
      const roleWithUsers = {
        id: 4,
        name: "dispatcher",
        created_at: "2025-01-04",
      };

      db.query
        .mockResolvedValueOnce({ rows: [roleWithUsers] })
        .mockResolvedValueOnce({ rows: [{ count: "1" }] }); // String '1'

      await expect(Role.delete(4)).rejects.toThrow(
        MODEL_ERRORS.ROLE.USERS_ASSIGNED(1),
      );
    });

    it("should handle count as integer number", async () => {
      const roleWithUsers = {
        id: 4,
        name: "dispatcher",
        created_at: "2025-01-04",
      };

      db.query
        .mockResolvedValueOnce({ rows: [roleWithUsers] })
        .mockResolvedValueOnce({ rows: [{ count: 3 }] }); // Number 3

      await expect(Role.delete(4)).rejects.toThrow(
        MODEL_ERRORS.ROLE.USERS_ASSIGNED(3),
      );
    });

    it("should handle DELETE returning no rows (race condition)", async () => {
      const roleToDelete = {
        id: 4,
        name: "dispatcher",
        created_at: "2025-01-04",
      };

      db.query
        .mockResolvedValueOnce({ rows: [roleToDelete] })
        .mockResolvedValueOnce({ rows: [{ count: "0" }] })
        .mockResolvedValueOnce({ rows: [] }); // DELETE returns nothing

      await expect(Role.delete(4)).rejects.toThrow("Role not found");
    });

    it("should propagate database errors", async () => {
      const roleToDelete = {
        id: 4,
        name: "dispatcher",
        created_at: "2025-01-04",
      };
      const dbError = new Error("Connection timeout");

      db.query
        .mockResolvedValueOnce({ rows: [roleToDelete] })
        .mockRejectedValueOnce(dbError);

      await expect(Role.delete(4)).rejects.toThrow("Connection timeout");
    });
  });
});
