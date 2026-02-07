/**
 * GenericEntityService.count() Unit Tests
 *
 * Tests the count method for counting entities with filters
 */

jest.mock("../../../db/connection", () => ({
  query: jest.fn(),
  pool: {
    connect: jest.fn(),
  },
}));

jest.mock("../../../config/logger", () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const GenericEntityService = require("../../../services/generic-entity-service");
const db = require("../../../db/connection");

describe("GenericEntityService.count()", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("validation", () => {
    test("should throw error for invalid entity name", async () => {
      await expect(
        GenericEntityService.count("invalid_entity"),
      ).rejects.toThrow("Unknown entity: invalid_entity");
    });
  });

  describe("count without filters", () => {
    test("should count all users", async () => {
      db.query.mockResolvedValueOnce({ rows: [{ total: "42" }] });

      const result = await GenericEntityService.count("user");

      expect(result).toBe(42);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT COUNT(*) as total FROM users"),
        [],
      );
    });

    test("should count all customers", async () => {
      db.query.mockResolvedValueOnce({ rows: [{ total: "100" }] });

      const result = await GenericEntityService.count("customer");

      expect(result).toBe(100);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("FROM customers"),
        [],
      );
    });

    test("should return 0 when no records", async () => {
      db.query.mockResolvedValueOnce({ rows: [{ total: "0" }] });

      const result = await GenericEntityService.count("user");

      expect(result).toBe(0);
    });
  });

  describe("count with filters", () => {
    test("should count users by role_id", async () => {
      db.query.mockResolvedValueOnce({ rows: [{ total: "10" }] });

      const result = await GenericEntityService.count("user", { role_id: 5 });

      expect(result).toBe(10);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE"),
        expect.arrayContaining([5]),
      );
    });

    test("should count active users", async () => {
      db.query.mockResolvedValueOnce({ rows: [{ total: "35" }] });

      const result = await GenericEntityService.count("user", {
        is_active: true,
      });

      expect(result).toBe(35);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("is_active"),
        [true],
      );
    });

    test("should count with multiple filters", async () => {
      db.query.mockResolvedValueOnce({ rows: [{ total: "5" }] });

      const result = await GenericEntityService.count("user", {
        role_id: 3,
        is_active: true,
      });

      expect(result).toBe(5);
      // Should have 2 params for the 2 filters
      expect(db.query.mock.calls[0][1]).toHaveLength(2);
    });

    test("should ignore non-filterable fields in filters", async () => {
      db.query.mockResolvedValueOnce({ rows: [{ total: "20" }] });

      // 'password' is not filterable, should be ignored
      const result = await GenericEntityService.count("user", {
        is_active: true,
        password: "secret",
      });

      expect(result).toBe(20);
      // Should only have 1 param (is_active), password ignored
      expect(db.query.mock.calls[0][1]).toHaveLength(1);
    });
  });

  describe("count with RLS context", () => {
    test("should apply RLS filter when context provided", async () => {
      db.query.mockResolvedValueOnce({ rows: [{ total: "3" }] });

      const rlsContext = {
        policy: "own_work_orders_only",
        userId: 1,
      };

      const result = await GenericEntityService.count(
        "work_order",
        {},
        rlsContext,
      );

      expect(result).toBe(3);
      // Should have RLS filter in WHERE clause
      const query = db.query.mock.calls[0][0];
      expect(query).toContain("WHERE");
    });

    test("should combine filters with RLS", async () => {
      db.query.mockResolvedValueOnce({ rows: [{ total: "2" }] });

      const rlsContext = {
        policy: "own_work_orders_only",
        userId: 1,
      };

      await GenericEntityService.count(
        "work_order",
        { status: "pending" },
        rlsContext,
      );

      // Should have both status filter AND RLS filter
      const query = db.query.mock.calls[0][0];
      expect(query).toContain("WHERE");
      expect(query).toContain("AND");
    });
  });

  describe("return type", () => {
    test("should return integer, not string", async () => {
      db.query.mockResolvedValueOnce({ rows: [{ total: "123" }] });

      const result = await GenericEntityService.count("user");

      expect(typeof result).toBe("number");
      expect(result).toBe(123);
    });

    test("should handle large counts", async () => {
      db.query.mockResolvedValueOnce({ rows: [{ total: "1000000" }] });

      const result = await GenericEntityService.count("user");

      expect(result).toBe(1000000);
    });
  });
});
