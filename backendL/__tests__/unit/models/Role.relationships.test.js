/**
 * Unit Tests: Role Model - Relationships
 * Tests role-user relationships and foreign key constraints
 * Target: 90%+ code coverage
 */

const Role = require("../../../db/models/Role");
const db = require("../../../db/connection");

// Mock the database connection
jest.mock("../../../db/connection", () => ({
  query: jest.fn(),
}));

describe("Role Model - Relationships", () => {
  // Clear all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Restore all mocks after all tests complete
  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe("getUsersByRole()", () => {
    it("should return all active users for a role with pagination", async () => {
      const mockUsers = [
        {
          id: 1,
          email: "alice@example.com",
          first_name: "Alice",
          last_name: "Anderson",
          is_active: true,
          created_at: "2025-01-01",
        },
        {
          id: 2,
          email: "bob@example.com",
          first_name: "Bob",
          last_name: "Brown",
          is_active: true,
          created_at: "2025-01-02",
        },
      ];

      // Mock the count query and the data query
      db.query
        .mockResolvedValueOnce({ rows: [{ total: "2" }] }) // count query
        .mockResolvedValueOnce({ rows: mockUsers }); // data query

      const result = await Role.getUsersByRole(4);

      expect(result).toEqual({
        users: mockUsers,
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1,
        },
      });
      expect(db.query).toHaveBeenCalledTimes(2);
      expect(db.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("COUNT(*)"),
        [4],
      );
      expect(db.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("SELECT"),
        [4, 10, 0],
      );
    });

    it("should return empty array when no users have the role", async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ total: "0" }] }) // count query
        .mockResolvedValueOnce({ rows: [] }); // data query

      const result = await Role.getUsersByRole(999);

      expect(result).toEqual({
        users: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      });
    });

    it("should order users by first_name and last_name", async () => {
      const mockUsers = [
        { id: 1, first_name: "Alice", last_name: "Anderson" },
        { id: 2, first_name: "Bob", last_name: "Brown" },
      ];

      db.query
        .mockResolvedValueOnce({ rows: [{ total: "2" }] })
        .mockResolvedValueOnce({ rows: mockUsers });

      await Role.getUsersByRole(4);

      expect(db.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("ORDER BY u.first_name, u.last_name"),
        [4, 10, 0],
      );
    });

    it("should only return active users", async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ total: "0" }] })
        .mockResolvedValueOnce({ rows: [] });

      await Role.getUsersByRole(4);

      expect(db.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("is_active = true"),
        [4],
      );
      expect(db.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("is_active = true"),
        [4, 10, 0],
      );
    });

    it("should handle database errors", async () => {
      const dbError = new Error("Query failed");
      db.query.mockRejectedValue(dbError);

      await expect(Role.getUsersByRole(4)).rejects.toThrow("Query failed");
    });

    it("should accept string role ID and pagination options", async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ total: "0" }] })
        .mockResolvedValueOnce({ rows: [] });

      await Role.getUsersByRole("4", { page: 2, limit: 20 });

      expect(db.query).toHaveBeenNthCalledWith(1, expect.any(String), [4]);
      expect(db.query).toHaveBeenNthCalledWith(
        2,
        expect.any(String),
        [4, 20, 20],
      ); // offset = (page-1) * limit = (2-1) * 20 = 20
    });
  });
});
