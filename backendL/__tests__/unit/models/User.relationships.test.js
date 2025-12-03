/**
 * User Model - Relationships Tests
 *
 * Tests role relationships, foreign key constraints, and user-role associations.
 * Methods tested: setRole and role-related queries
 *
 * Part of User model test suite:
 * - User.crud.test.js - CRUD operations
 * - User.validation.test.js - Input validation and error handling
 * - User.relationships.test.js (this file) - Role relationships and foreign keys
 */

// Setup centralized mocks FIRST
const { setupModuleMocks } = require("../../setup/test-setup");
setupModuleMocks();

// NOW import modules
const User = require("../../../db/models/User");
const db = require("../../../db/connection");

describe("User Model - Relationships", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // ===========================
  // setRole() - Role Assignment
  // ===========================
  describe("setRole()", () => {
    it("should set user role successfully", async () => {
      // Arrange
      const mockUpdatedUser = { id: 1, role_id: 3 };
      const mockUserWithRole = { id: 1, role_id: 3, role: "manager" };
      db.query
        .mockResolvedValueOnce({ rows: [mockUpdatedUser] }) // UPDATE
        .mockResolvedValueOnce({ rows: [mockUserWithRole] }); // findById

      // Act
      const user = await User.setRole(1, 3);

      // Assert
      expect(user).toEqual(mockUserWithRole);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE users"),
        [3, 1],
      );
      expect(db.query).toHaveBeenCalledTimes(2); // UPDATE + findById
    });

    it("should throw error when user ID is missing", async () => {
      // Act & Assert - behavior: throws and doesn't query
      await expect(User.setRole(null, 3)).rejects.toThrow();
      await expect(User.setRole(undefined, 3)).rejects.toThrow();
      expect(db.query).not.toHaveBeenCalled();
    });

    it("should throw error when role ID is missing", async () => {
      // Act & Assert - behavior: throws and doesn't query
      await expect(User.setRole(1, null)).rejects.toThrow();
      await expect(User.setRole(1, undefined)).rejects.toThrow();
      expect(db.query).not.toHaveBeenCalled();
    });

    it("should throw error when user not found", async () => {
      // Arrange
      db.query.mockResolvedValue({ rows: [] });

      // Act & Assert
      await expect(User.setRole(999, 3)).rejects.toThrow("User not found");
    });

    it("should handle database errors", async () => {
      // Arrange
      db.query.mockRejectedValue(new Error("Database error"));

      // Act & Assert
      await expect(User.setRole(1, 3)).rejects.toThrow("Database error");
    });
  });

  // ===========================
  // Role Queries - findById includes role
  // ===========================
  describe("Role Data in Queries", () => {
    it("should include role name in findById results", async () => {
      // Arrange
      const mockUser = {
        id: 1,
        email: "user@example.com",
        first_name: "John",
        last_name: "Doe",
        role_id: 2,
        role: "client", // Role name from JOIN
        is_active: true,
      };
      db.query.mockResolvedValue({ rows: [mockUser] });

      // Act
      const user = await User.findById(1);

      // Assert
      expect(user).toEqual(mockUser);
      expect(user.role).toBe("client");
      expect(user.role_id).toBe(2);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT u.*, r.name as role, u.role_id"),
        [1],
      );
    });

    it("should include role name in findByAuth0Id results", async () => {
      // Arrange
      const mockUser = {
        id: 1,
        auth0_id: "auth0|123456",
        email: "user@example.com",
        role_id: 3,
        role: "manager", // Role name from JOIN
        is_active: true,
      };
      db.query.mockResolvedValue({ rows: [mockUser] });

      // Act
      const user = await User.findByAuth0Id("auth0|123456");

      // Assert
      expect(user).toEqual(mockUser);
      expect(user.role).toBe("manager");
      expect(user.role_id).toBe(3);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT u.*, r.name as role"),
        ["auth0|123456"],
      );
    });

    it("should include role name in findAll results", async () => {
      // Arrange
      const mockUsers = [
        { id: 1, email: "admin@example.com", role_id: 1, role: "admin" },
        { id: 2, email: "client@example.com", role_id: 2, role: "client" },
        { id: 3, email: "manager@example.com", role_id: 3, role: "manager" },
      ];
      db.query
        .mockResolvedValueOnce({ rows: [{ total: 3 }] }) // count query
        .mockResolvedValueOnce({ rows: mockUsers }); // data query

      // Act
      const result = await User.findAll();

      // Assert
      expect(result.data).toEqual(mockUsers);
      result.data.forEach((user) => {
        expect(user.role).toBeDefined();
        expect(user.role_id).toBeDefined();
      });
      // Updated expectation: now passes parameters for filters
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT COUNT(*) as total"),
        expect.any(Array) // Now passes parameters array
      );
    });
  });

  // ===========================
  // Foreign Key Relationships
  // ===========================
  describe("Foreign Key Constraints", () => {
    it("should handle invalid role_id when creating user", async () => {
      // Arrange
      const userData = {
        email: "test@example.com",
        first_name: "Test",
        last_name: "User",
        role_id: 999, // Non-existent role
      };
      const dbError = new Error("Foreign key violation");
      dbError.constraint = "users_role_id_fkey";
      db.query.mockRejectedValue(dbError);

      // Act & Assert
      await expect(User.create(userData)).rejects.toThrow(
        "Failed to create user",
      );
    });

    it("should handle invalid role_id when setting role", async () => {
      // Arrange
      const dbError = new Error("Foreign key violation");
      dbError.constraint = "users_role_id_fkey";
      db.query.mockRejectedValue(dbError);

      // Act & Assert
      await expect(User.setRole(1, 999)).rejects.toThrow(
        "Foreign key violation",
      );
    });
  });

  // ===========================
  // Role Changes
  // ===========================
  describe("Role Assignment Operations", () => {
    it("should successfully change user from client to manager", async () => {
      // Arrange
      const mockUpdatedUser = { id: 1, role_id: 3 };
      const mockUserWithRole = { id: 1, role_id: 3, role: "manager" };
      db.query
        .mockResolvedValueOnce({ rows: [mockUpdatedUser] })
        .mockResolvedValueOnce({ rows: [mockUserWithRole] });

      // Act
      const user = await User.setRole(1, 3);

      // Assert
      expect(user.role_id).toBe(3);
      expect(user.role).toBe("manager");
    });

    it("should successfully promote user to admin", async () => {
      // Arrange
      const mockUpdatedUser = { id: 1, role_id: 1 };
      const mockUserWithRole = { id: 1, role_id: 1, role: "admin" };
      db.query
        .mockResolvedValueOnce({ rows: [mockUpdatedUser] })
        .mockResolvedValueOnce({ rows: [mockUserWithRole] });

      // Act
      const user = await User.setRole(1, 1);

      // Assert
      expect(user.role_id).toBe(1);
      expect(user.role).toBe("admin");
    });

    it("should successfully demote user to client", async () => {
      // Arrange
      const mockUpdatedUser = { id: 5, role_id: 2 };
      const mockUserWithRole = { id: 5, role_id: 2, role: "client" };
      db.query
        .mockResolvedValueOnce({ rows: [mockUpdatedUser] })
        .mockResolvedValueOnce({ rows: [mockUserWithRole] });

      // Act
      const user = await User.setRole(5, 2);

      // Assert
      expect(user.role_id).toBe(2);
      expect(user.role).toBe("client");
    });
  });
});
