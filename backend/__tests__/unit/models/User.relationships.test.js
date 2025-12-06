/**
 * User Model - Relationships Tests
 *
 * Tests BEHAVIOR of role relationships and user-role associations:
 * - Users can have their role updated
 * - Queries return role information
 * - Foreign key constraints are enforced
 *
 * NOTE: Tests focus on BEHAVIOR not implementation details.
 * We test what the user/API gets back, not internal SQL queries.
 *
 * Part of User model test suite:
 * - User.crud.test.js - CRUD operations
 * - User.validation.test.js - Input validation and error handling
 * - User.relationships.test.js (this file) - Role relationships
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
  // Role Assignment via update()
  // ===========================
  describe("Role Assignment via update()", () => {
    test("should allow updating user role_id", async () => {
      // Arrange
      const mockUpdatedUser = { id: 1, role_id: 3, role: "manager" };
      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // UPDATE
        .mockResolvedValueOnce({ rows: [mockUpdatedUser] }); // findById

      // Act
      const user = await User.update(1, { role_id: 3 });

      // Assert BEHAVIOR: returned user has new role
      expect(user.role_id).toBe(3);
      expect(user.role).toBe("manager");
    });

    test("should accept role_id as a valid update field", async () => {
      // Arrange
      const mockUpdatedUser = { id: 5, role_id: 2, role: "technician" };
      db.query
        .mockResolvedValueOnce({ rows: [{ id: 5 }] })
        .mockResolvedValueOnce({ rows: [mockUpdatedUser] });

      // Act & Assert - should NOT throw "no valid fields"
      await expect(User.update(5, { role_id: 2 })).resolves.toBeDefined();
    });
  });

  // ===========================
  // Role Data in Queries
  // ===========================
  describe("Role Data in Queries", () => {
    test("should include role name when fetching user by ID", async () => {
      // Arrange
      const mockUser = {
        id: 1,
        email: "user@example.com",
        first_name: "John",
        last_name: "Doe",
        role_id: 2,
        role: "client",
        is_active: true,
      };
      db.query.mockResolvedValue({ rows: [mockUser] });

      // Act
      const user = await User.findById(1);

      // Assert BEHAVIOR: user object has both role_id and role name
      expect(user.role).toBe("client");
      expect(user.role_id).toBe(2);
    });

    test("should include role name when listing users", async () => {
      // Arrange
      const mockUsers = [
        { id: 1, email: "admin@example.com", role_id: 1, role: "admin" },
        { id: 2, email: "client@example.com", role_id: 2, role: "client" },
      ];
      db.query
        .mockResolvedValueOnce({ rows: [{ total: 2 }] })
        .mockResolvedValueOnce({ rows: mockUsers });

      // Act
      const result = await User.findAll();

      // Assert BEHAVIOR: each user has role information
      result.data.forEach((user) => {
        expect(user).toHaveProperty("role");
        expect(user).toHaveProperty("role_id");
      });
    });
  });

  // ===========================
  // Foreign Key Constraints
  // ===========================
  describe("Foreign Key Constraints", () => {
    test("should reject invalid role_id when creating user", async () => {
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

      // Act & Assert BEHAVIOR: operation fails
      await expect(User.create(userData)).rejects.toThrow();
    });

    test("should reject invalid role_id when updating user", async () => {
      // Arrange
      const dbError = new Error("Foreign key violation");
      dbError.constraint = "users_role_id_fkey";
      db.query.mockRejectedValue(dbError);

      // Act & Assert BEHAVIOR: operation fails
      await expect(User.update(1, { role_id: 999 })).rejects.toThrow();
    });
  });
});
