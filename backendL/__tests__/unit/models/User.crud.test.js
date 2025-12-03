/**
 * User Model - CRUD Operations Tests
 *
 * Tests core CRUD operations for the User model with mocked database connection.
 * Methods tested: create, createFromAuth0, findOrCreate, findById, findByAuth0Id, getAll, update, delete
 *
 * Part of User model test suite:
 * - User.crud.test.js (this file) - CRUD operations
 * - User.validation.test.js - Input validation and error handling
 * - User.relationships.test.js - Role relationships and foreign keys
 */

// Mock database BEFORE requiring User model
jest.mock("../../../db/connection");
jest.mock("../../../db/models/Role");

const User = require("../../../db/models/User");
const Role = require("../../../db/models/Role");
const db = require("../../../db/connection");

describe("User Model - CRUD Operations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // ===========================
  // READ: findByAuth0Id()
  // ===========================
  describe("findByAuth0Id()", () => {
    it("should find user by Auth0 ID with role", async () => {
      // Arrange
      const mockUser = {
        id: 1,
        auth0_id: "auth0|123456",
        email: "user@example.com",
        first_name: "John",
        last_name: "Doe",
        role_id: 2,
        role: "client",
        is_active: true,
      };
      db.query.mockResolvedValue({ rows: [mockUser] });

      // Act
      const user = await User.findByAuth0Id("auth0|123456");

      // Assert
      expect(user).toEqual(mockUser);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT u.*, r.name as role"),
        ["auth0|123456"],
      );
      expect(db.query).toHaveBeenCalledTimes(1);
    });

    it("should return null when user not found", async () => {
      // Arrange
      db.query.mockResolvedValue({ rows: [] });

      // Act
      const user = await User.findByAuth0Id("auth0|nonexistent");

      // Assert
      expect(user).toBeNull();
    });
  });

  // ===========================
  // READ: findById()
  // ===========================
  describe("findById()", () => {
    it("should find user by ID with role", async () => {
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

      // Assert
      expect(user).toEqual(mockUser);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT u.*, r.name as role, u.role_id"),
        [1],
      );
      expect(db.query).toHaveBeenCalledTimes(1);
    });

    it("should return null when user not found", async () => {
      // Arrange
      db.query.mockResolvedValue({ rows: [] });

      // Act
      const user = await User.findById(999);

      // Assert
      expect(user).toBeNull();
    });
  });

  // ===========================
  // READ: findAll() - Paginated
  // ===========================
  describe("findAll()", () => {
    it("should return paginated users with roles", async () => {
      // Arrange
      const mockUsers = [
        { id: 1, email: "admin@example.com", role: "admin" },
        { id: 2, email: "client@example.com", role: "client" },
        { id: 3, email: "manager@example.com", role: "manager" },
      ];
      db.query
        .mockResolvedValueOnce({ rows: [{ total: 3 }] }) // count query
        .mockResolvedValueOnce({ rows: mockUsers }); // data query

      // Act
      const result = await User.findAll({ page: 1, limit: 50 });

      // Assert
      expect(result.data).toEqual(mockUsers);
      expect(result.data).toHaveLength(3);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 50,
        total: 3,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });
      // Updated expectation: now passes parameters for filters
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT COUNT(*) as total"),
        expect.any(Array) // Now passes parameters array
      );
    });

    it("should return empty data array when no users exist", async () => {
      // Arrange
      db.query
        .mockResolvedValueOnce({ rows: [{ total: 0 }] }) // count query
        .mockResolvedValueOnce({ rows: [] }); // data query

      // Act
      const result = await User.findAll();

      // Assert
      expect(result.data).toEqual([]);
      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });
  });

  // ===========================
  // CREATE: createFromAuth0()
  // ===========================
  describe("createFromAuth0()", () => {
    it("should create user from Auth0 data with default client role", async () => {
      // Arrange
      const auth0Data = {
        sub: "auth0|123456",
        email: "newuser@example.com",
        given_name: "Jane",
        family_name: "Smith",
      };
      const mockCreatedUser = {
        id: 5,
        auth0_id: "auth0|123456",
        email: "newuser@example.com",
        first_name: "Jane",
        last_name: "Smith",
        role_id: 2,
      };
      db.query.mockResolvedValue({ rows: [mockCreatedUser] });

      // Act
      const user = await User.createFromAuth0(auth0Data);

      // Assert
      expect(user).toEqual(mockCreatedUser);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO users"),
        ["auth0|123456", "newuser@example.com", "Jane", "Smith", "client"],
      );
    });

    it("should create user with specified role from token", async () => {
      // Arrange
      const auth0Data = {
        sub: "auth0|admin123",
        email: "admin@example.com",
        given_name: "Admin",
        family_name: "User",
        role: "admin",
      };
      const mockCreatedUser = {
        id: 10,
        auth0_id: "auth0|admin123",
        role_id: 1,
      };
      db.query.mockResolvedValue({ rows: [mockCreatedUser] });

      // Act
      const user = await User.createFromAuth0(auth0Data);

      // Assert
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO users"),
        ["auth0|admin123", "admin@example.com", "Admin", "User", "admin"],
      );
    });

    it("should handle missing optional fields (names)", async () => {
      // Arrange
      const auth0Data = {
        sub: "auth0|minimal",
        email: "minimal@example.com",
      };
      const mockCreatedUser = {
        id: 6,
        auth0_id: "auth0|minimal",
        email: "minimal@example.com",
        first_name: "",
        last_name: "",
      };
      db.query.mockResolvedValue({ rows: [mockCreatedUser] });

      // Act
      const user = await User.createFromAuth0(auth0Data);

      // Assert
      expect(user).toEqual(mockCreatedUser);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO users"),
        ["auth0|minimal", "minimal@example.com", "", "", "client"],
      );
    });
  });

  // ===========================
  // CREATE: findOrCreate()
  // ===========================
  describe("findOrCreate()", () => {
    it("should return existing user when found", async () => {
      // Arrange
      const auth0Data = {
        sub: "auth0|existing",
        email: "existing@example.com",
      };
      const mockUser = {
        id: 1,
        auth0_id: "auth0|existing",
        email: "existing@example.com",
      };
      db.query.mockResolvedValue({ rows: [mockUser] });

      // Act
      const user = await User.findOrCreate(auth0Data);

      // Assert
      expect(user).toEqual(mockUser);
      expect(db.query).toHaveBeenCalledTimes(1); // Only findByAuth0Id
    });

    it("should create new user when not found", async () => {
      // Arrange
      const auth0Data = {
        sub: "auth0|new",
        email: "new@example.com",
        given_name: "New",
        family_name: "User",
      };
      const mockCreatedUser = {
        id: 10,
        auth0_id: "auth0|new",
        email: "new@example.com",
      };

      // Mock sequence: findByAuth0Id (not found) → email check (not found) → create → findByAuth0Id (fetch with role)
      db.query
        .mockResolvedValueOnce({ rows: [] }) // findByAuth0Id - not found
        .mockResolvedValueOnce({ rows: [] }) // email check - not found
        .mockResolvedValueOnce({ rows: [mockCreatedUser] }) // create
        .mockResolvedValueOnce({ rows: [mockCreatedUser] }); // findByAuth0Id - fetch with role

      // Act
      const user = await User.findOrCreate(auth0Data);

      // Assert
      expect(user).toEqual(mockCreatedUser);
      expect(db.query).toHaveBeenCalledTimes(4); // findByAuth0Id + email check + create + findByAuth0Id
    });
  });

  // ===========================
  // CREATE: create() (manual user creation)
  // ===========================
  describe("create()", () => {
    it("should create user with specified role_id", async () => {
      // Arrange
      const userData = {
        email: "manual@example.com",
        first_name: "Manual",
        last_name: "User",
        role_id: 3,
      };
      const mockCreatedUser = { id: 20, ...userData };
      const mockUserWithRole = { ...mockCreatedUser, role: "manager" };

      db.query
        .mockResolvedValueOnce({ rows: [mockCreatedUser] }) // create
        .mockResolvedValueOnce({ rows: [mockUserWithRole] }); // findById

      // Act
      const user = await User.create(userData);

      // Assert
      expect(user).toEqual(mockUserWithRole);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO users"),
        ["manual@example.com", "Manual", "User", 3, null, "pending_activation"],
      );
    });

    it("should default to client role when role_id not provided", async () => {
      // Arrange
      const userData = {
        email: "defaultrole@example.com",
        first_name: "Default",
        last_name: "User",
      };

      // Mock Role.getByName to return client role
      Role.getByName = jest.fn().mockResolvedValue({ id: 2, name: "client" });

      const mockCreatedUser = { id: 21, ...userData, role_id: 2 };
      const mockUserWithRole = { ...mockCreatedUser, role: "client" };

      db.query
        .mockResolvedValueOnce({ rows: [mockCreatedUser] }) // create
        .mockResolvedValueOnce({ rows: [mockUserWithRole] }); // findById

      // Act
      const user = await User.create(userData);

      // Assert
      expect(Role.getByName).toHaveBeenCalledWith("client");
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO users"),
        ["defaultrole@example.com", "Default", "User", 2, null, "pending_activation"],
      );
    });

    it("should handle missing optional fields", async () => {
      // Arrange
      const userData = { email: "minimal@example.com", role_id: 2 };
      const mockCreatedUser = {
        id: 22,
        email: "minimal@example.com",
        first_name: "",
        last_name: "",
        role_id: 2,
      };
      const mockUserWithRole = { ...mockCreatedUser, role: "client" };

      db.query
        .mockResolvedValueOnce({ rows: [mockCreatedUser] })
        .mockResolvedValueOnce({ rows: [mockUserWithRole] });

      // Act
      const user = await User.create(userData);

      // Assert
      expect(user).toEqual(mockUserWithRole);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO users"),
        ["minimal@example.com", "", "", 2, null, "pending_activation"],
      );
    });
  });

  // ===========================
  // UPDATE: update()
  // ===========================
  describe("update()", () => {
    it("should update user with valid fields", async () => {
      // Arrange
      const updates = {
        email: "updated@example.com",
        first_name: "Updated",
        last_name: "Name",
        is_active: false,
      };
      const mockUpdatedUser = { id: 1, ...updates };
      db.query.mockResolvedValue({ rows: [mockUpdatedUser] });

      // Act
      const user = await User.update(1, updates);

      // Assert
      expect(user).toEqual(mockUpdatedUser);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE users"),
        expect.arrayContaining([
          "updated@example.com",
          "Updated",
          "Name",
          false,
          1,
        ]),
      );
    });

    it("should update only provided fields", async () => {
      // Arrange
      const updates = { first_name: "NewFirst" };
      const mockUpdatedUser = { id: 1, first_name: "NewFirst" };
      db.query.mockResolvedValue({ rows: [mockUpdatedUser] });

      // Act
      const user = await User.update(1, updates);

      // Assert
      expect(user).toEqual(mockUpdatedUser);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("first_name = $1"),
        ["NewFirst", 1],
      );
    });

    it("should filter out non-allowed fields", async () => {
      // Arrange
      const updates = {
        email: "valid@example.com",
        password: "should-be-ignored", // Not allowed
        role_id: 999, // Not allowed
        auth0_id: "ignored", // Not allowed
      };
      const mockUpdatedUser = { id: 1, email: "valid@example.com" };
      db.query.mockResolvedValue({ rows: [mockUpdatedUser] });

      // Act
      const user = await User.update(1, updates);

      // Assert
      expect(user).toEqual(mockUpdatedUser);
      // Should only include email in the update
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("email = $1"),
        ["valid@example.com", 1],
      );
      expect(db.query).not.toHaveBeenCalledWith(
        expect.stringContaining("password"),
        expect.anything(),
      );
    });

    it("should ignore undefined values", async () => {
      // Arrange
      const updates = {
        email: "test@example.com",
        first_name: undefined, // Should be ignored
      };
      const mockUpdatedUser = { id: 1, email: "test@example.com" };
      db.query.mockResolvedValue({ rows: [mockUpdatedUser] });

      // Act
      const user = await User.update(1, updates);

      // Assert
      expect(user).toEqual(mockUpdatedUser);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("email = $1"),
        ["test@example.com", 1],
      );
    });

    // Contract v2.0: update() no longer auto-manages audit fields
    // Audit logging happens via AuditService (tested separately in deactivate/reactivate methods)
    it("should update is_active field without audit fields", async () => {
      // Arrange
      const updates = { is_active: false };
      const mockUpdatedUser = {
        id: 5,
        is_active: false,
      };
      db.query.mockResolvedValue({ rows: [mockUpdatedUser] });

      // Act
      const user = await User.update(5, updates);

      // Assert
      expect(user).toEqual(mockUpdatedUser);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE users"),
        expect.arrayContaining([
          false, // is_active
          5, // user id
        ]),
      );
    });

    it("should update fields normally", async () => {
      // Arrange
      const updates = { first_name: "Changed" };
      const mockUpdatedUser = { id: 5, first_name: "Changed" };
      db.query.mockResolvedValue({ rows: [mockUpdatedUser] });

      // Act
      const user = await User.update(5, updates);

      // Assert
      expect(user).toEqual(mockUpdatedUser);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("first_name = $1"),
        ["Changed", 5],
      );
    });
  });

  // ===========================
  // DELETE: delete()
  // ===========================
  describe("delete()", () => {
    it("should permanently delete user from database", async () => {
      // Arrange
      const mockDeletedUser = { id: 1, email: "deleted@example.com" };
      db.query.mockResolvedValue({ rows: [mockDeletedUser] });

      // Act
      const user = await User.delete(1);

      // Assert: DELETE = permanent removal
      expect(user).toEqual(mockDeletedUser);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM users"),
        [1],
      );
      expect(db.query).not.toHaveBeenCalledWith(
        expect.stringContaining("UPDATE"),
        expect.anything(),
      );
    });

    it("should throw error when user not found", async () => {
      // Arrange
      db.query.mockResolvedValue({ rows: [] });

      // Act & Assert
      await expect(User.delete(999)).rejects.toThrow("User not found");
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM users"),
        [999],
      );
    });
  });
});