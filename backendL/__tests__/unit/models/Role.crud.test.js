/**
 * Unit Tests: Role Model - CRUD Operations
 * Tests core CRUD methods: findAll, findById, getByName, create, update, delete
 * Target: 90%+ code coverage
 */

const Role = require("../../../db/models/Role");
const db = require("../../../db/connection");

// Mock the database connection
jest.mock("../../../db/connection", () => ({
  query: jest.fn(),
}));

describe("Role Model - CRUD Operations", () => {
  // Clear all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Restore all mocks after all tests complete
  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe("findAll()", () => {
    it("should return paginated roles ordered by priority", async () => {
      const mockRoles = [
        { id: 1, name: "admin", priority: 5, description: "Full system access", is_active: true, created_at: "2025-01-01" },
        { id: 3, name: "dispatcher", priority: 3, description: "Medium access", is_active: true, created_at: "2025-01-03" },
        { id: 2, name: "client", priority: 1, description: "Basic access", is_active: true, created_at: "2025-01-02" },
      ];

      db.query
        .mockResolvedValueOnce({ rows: [{ total: 3 }] }) // count query
        .mockResolvedValueOnce({ rows: mockRoles }); // data query

      const result = await Role.findAll({ page: 1, limit: 50 });

      expect(result.data).toEqual(mockRoles);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 50,
        total: 3,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });
      expect(db.query).toHaveBeenCalledTimes(2); // count + data
    });

    it("should return empty data array when no roles exist", async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ total: 0 }] }) // count query
        .mockResolvedValueOnce({ rows: [] }); // data query

      const result = await Role.findAll();

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(db.query).toHaveBeenCalledTimes(2);
    });

    it("should handle database errors", async () => {
      const dbError = new Error("Database connection failed");
      db.query.mockRejectedValue(dbError);

      await expect(Role.findAll()).rejects.toThrow(
        "Failed to retrieve roles",
      );
      expect(db.query).toHaveBeenCalledTimes(1);
    });
  });

  describe("findById()", () => {
    it("should return role by ID", async () => {
      const mockRole = { id: 1, name: "admin", priority: 5, description: "Full system access", created_at: "2025-01-01" };
      db.query.mockResolvedValue({ rows: [mockRole] });

      const result = await Role.findById(1);

      expect(result).toEqual(mockRole);
      expect(db.query).toHaveBeenCalledWith(
        "SELECT * FROM roles WHERE id = $1",
        [1],
      );
      expect(db.query).toHaveBeenCalledTimes(1);
    });

    it("should return undefined for non-existent role ID", async () => {
      db.query.mockResolvedValue({ rows: [] });

      const result = await Role.findById(999);

      expect(result).toBeUndefined();
      expect(db.query).toHaveBeenCalledWith(
        "SELECT * FROM roles WHERE id = $1",
        [999],
      );
    });

    it("should handle database errors", async () => {
      const dbError = new Error("Connection timeout");
      db.query.mockRejectedValue(dbError);

      await expect(Role.findById(1)).rejects.toThrow("Connection timeout");
    });

    it("should accept string ID (parameterized query handles conversion)", async () => {
      const mockRole = { id: 1, name: "admin", created_at: "2025-01-01" };
      db.query.mockResolvedValue({ rows: [mockRole] });

      const result = await Role.findById("1");

      // Test behavior: it works with string IDs and returns the role
      expect(result).toEqual(mockRole);
      expect(db.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([expect.any(Number)]), // Coerced to number
      );
    });
  });

  describe("getByName()", () => {
    it("should return role by name (case-sensitive query)", async () => {
      const mockRole = { id: 1, name: "admin", priority: 5, description: "Full system access", created_at: "2025-01-01" };
      db.query.mockResolvedValue({ rows: [mockRole] });

      const result = await Role.getByName("admin");

      expect(result).toEqual(mockRole);
      expect(db.query).toHaveBeenCalledWith(
        "SELECT * FROM roles WHERE name = $1",
        ["admin"],
      );
    });

    it("should return undefined for non-existent role name", async () => {
      db.query.mockResolvedValue({ rows: [] });

      const result = await Role.getByName("nonexistent");

      expect(result).toBeUndefined();
    });

    it("should handle database errors", async () => {
      db.query.mockRejectedValue(new Error("Query failed"));

      await expect(Role.getByName("admin")).rejects.toThrow("Query failed");
    });

    it("should query with exact name provided (no normalization)", async () => {
      const mockRole = { id: 2, name: "client", created_at: "2025-01-02" };
      db.query.mockResolvedValue({ rows: [mockRole] });

      await Role.getByName("CLIENT");

      expect(db.query).toHaveBeenCalledWith(
        expect.any(String),
        ["CLIENT"], // Not normalized in getByName
      );
    });
  });

  describe("create()", () => {
    it("should create new role with normalized name and default priority", async () => {
      const mockCreatedRole = {
        id: 4,
        name: "dispatcher",
        priority: 50,
        created_at: "2025-01-04",
      };
      db.query.mockResolvedValue({ rows: [mockCreatedRole] });

      const result = await Role.create("Dispatcher");

      expect(result).toEqual(mockCreatedRole);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO roles (name, priority)"),
        ["dispatcher", 50], // Normalized to lowercase, default priority
      );
    });

    it("should normalize role name to lowercase", async () => {
      const mockCreatedRole = {
        id: 5,
        name: "manager",
        priority: 50,
        created_at: "2025-01-05",
      };
      db.query.mockResolvedValue({ rows: [mockCreatedRole] });

      await Role.create("MANAGER");

      expect(db.query).toHaveBeenCalledWith(expect.any(String), ["manager", 50]);
    });

    it("should trim whitespace from role name", async () => {
      const mockCreatedRole = {
        id: 6,
        name: "technician",
        priority: 50,
        created_at: "2025-01-06",
      };
      db.query.mockResolvedValue({ rows: [mockCreatedRole] });

      await Role.create("  Technician  ");

      expect(db.query).toHaveBeenCalledWith(expect.any(String), ["technician", 50]);
    });
  });

  describe("update()", () => {
    it("should update role name successfully", async () => {
      const existingRole = {
        id: 4,
        name: "dispatcher",
        created_at: "2025-01-04",
      };
      const updatedRole = {
        id: 4,
        name: "senior_dispatcher",
        created_at: "2025-01-04",
      };

      // Mock findById call
      db.query
        .mockResolvedValueOnce({ rows: [existingRole] }) // findById
        .mockResolvedValueOnce({ rows: [updatedRole] }); // UPDATE query

      const result = await Role.update(4, { name: "Senior_Dispatcher" });

      expect(result).toEqual(updatedRole);
      expect(db.query).toHaveBeenCalledTimes(2);
      expect(db.query).toHaveBeenNthCalledWith(
        1,
        "SELECT * FROM roles WHERE id = $1",
        [4],
      );
      expect(db.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("UPDATE roles"),
        ["senior_dispatcher", 4],
      );
    });

    it("should normalize updated name to lowercase", async () => {
      const existingRole = {
        id: 4,
        name: "dispatcher",
        created_at: "2025-01-04",
      };
      const updatedRole = {
        id: 4,
        name: "lead_dispatcher",
        created_at: "2025-01-04",
      };

      db.query
        .mockResolvedValueOnce({ rows: [existingRole] })
        .mockResolvedValueOnce({ rows: [updatedRole] });

      await Role.update(4, { name: "LEAD_DISPATCHER" });

      expect(db.query).toHaveBeenNthCalledWith(2, expect.any(String), [
        "lead_dispatcher",
        4,
      ]);
    });

    it("should trim whitespace from updated name", async () => {
      const existingRole = {
        id: 4,
        name: "dispatcher",
        created_at: "2025-01-04",
      };
      const updatedRole = {
        id: 4,
        name: "field_technician",
        created_at: "2025-01-04",
      };

      db.query
        .mockResolvedValueOnce({ rows: [existingRole] })
        .mockResolvedValueOnce({ rows: [updatedRole] });

      await Role.update(4, { name: "  Field_Technician  " });

      expect(db.query).toHaveBeenNthCalledWith(2, expect.any(String), [
        "field_technician",
        4,
      ]);
    });

    // Contract v2.0: update() no longer auto-manages audit fields
    // Audit logging happens via AuditService (tested separately in deactivate/reactivate methods)
    it("should update is_active field without audit fields", async () => {
      const existingRole = {
        id: 4,
        name: "dispatcher",
        is_active: true,
        created_at: "2025-01-04",
      };
      const updatedRole = {
        id: 4,
        name: "dispatcher",
        is_active: false,
      };

      db.query
        .mockResolvedValueOnce({ rows: [existingRole] })
        .mockResolvedValueOnce({ rows: [updatedRole] });

      const result = await Role.update(4, { is_active: false });

      expect(result).toEqual(updatedRole);
      expect(db.query).toHaveBeenNthCalledWith(2, expect.any(String), [
        false, // is_active
        4, // role id
      ]);
    });

    it("should update multiple fields including is_active", async () => {
      const existingRole = {
        id: 4,
        name: "dispatcher",
        description: "Old description",
        is_active: true,
        created_at: "2025-01-04",
      };
      // Contract v2.0: No deactivated_at/by fields
      const updatedRole = {
        id: 4,
        name: "senior_dispatcher",
        description: "New description",
        is_active: false,
      };

      db.query
        .mockResolvedValueOnce({ rows: [existingRole] })
        .mockResolvedValueOnce({ rows: [updatedRole] });

      const result = await Role.update(4, {
        name: "Senior_Dispatcher",
        description: "New description",
        is_active: false,
      });

      expect(result).toEqual(updatedRole);
      expect(db.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("UPDATE roles"),
        expect.arrayContaining([
          "senior_dispatcher", // normalized name
          "New description",
          false, // is_active
          4, // role id
        ]),
      );
    });
  });

  describe("delete()", () => {
    it("should delete unprotected role with no assigned users", async () => {
      const roleToDelete = {
        id: 4,
        name: "dispatcher",
        created_at: "2025-01-04",
      };

      db.query
        .mockResolvedValueOnce({ rows: [roleToDelete] }) // findById
        .mockResolvedValueOnce({ rows: [{ count: "0" }] }) // Check user count
        .mockResolvedValueOnce({ rows: [roleToDelete] }); // DELETE

      const result = await Role.delete(4);

      // Role.delete() now returns { role, affectedUsers }
      expect(result).toEqual({
        role: roleToDelete,
        affectedUsers: 0,
      });
      expect(db.query).toHaveBeenCalledTimes(3);
      expect(db.query).toHaveBeenNthCalledWith(
        2,
        "SELECT COUNT(*) as count FROM users WHERE role_id = $1",
        [4],
      );
      expect(db.query).toHaveBeenNthCalledWith(
        3,
        "DELETE FROM roles WHERE id = $1 RETURNING *",
        [4],
      );
    });
  });
});
