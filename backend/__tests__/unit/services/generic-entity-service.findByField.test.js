/**
 * GenericEntityService.findByField() Unit Tests
 *
 * Tests the findByField method for looking up entities by arbitrary fields
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

describe("GenericEntityService.findByField()", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("validation", () => {
    test("should throw error for invalid entity name", async () => {
      await expect(
        GenericEntityService.findByField(
          "invalid_entity",
          "email",
          "test@test.com",
        ),
      ).rejects.toThrow("Unknown entity: invalid_entity");
    });

    test("should throw error for non-filterable field", async () => {
      // 'password' is not in user's filterableFields
      await expect(
        GenericEntityService.findByField("user", "password", "secret"),
      ).rejects.toThrow("Field 'password' is not filterable for user");
    });

    test("should throw error for field not in filterableFields", async () => {
      await expect(
        GenericEntityService.findByField("customer", "secret_field", "value"),
      ).rejects.toThrow("Field 'secret_field' is not filterable for customer");
    });
  });

  describe("successful queries", () => {
    test("should find user by email", async () => {
      const mockUser = { id: 1, email: "test@example.com", first_name: "Test" };
      db.query.mockResolvedValueOnce({ rows: [mockUser] });

      const result = await GenericEntityService.findByField(
        "user",
        "email",
        "test@example.com",
      );

      expect(result).toEqual(mockUser);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("email = $1"),
        ["test@example.com"],
      );
    });

    test("should find user by auth0_id with role JOIN (defaultIncludes)", async () => {
      const mockUser = {
        id: 1,
        email: "test@example.com",
        auth0_id: "auth0|abc123",
        role: "admin",
      };
      db.query.mockResolvedValueOnce({ rows: [mockUser] });

      const result = await GenericEntityService.findByField(
        "user",
        "auth0_id",
        "auth0|abc123",
      );

      // Should include role JOIN because user metadata has defaultIncludes: ['role']
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("LEFT JOIN roles"),
        ["auth0|abc123"],
      );
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("r.name as role"),
        ["auth0|abc123"],
      );
      // auth0_id should be filtered out in response
      expect(result.auth0_id).toBeUndefined();
      // role should be included
      expect(result.role).toBe("admin");
    });

    test("should find customer by email", async () => {
      const mockCustomer = {
        id: 1,
        email: "cust@example.com",
        company_name: "ACME",
      };
      db.query.mockResolvedValueOnce({ rows: [mockCustomer] });

      const result = await GenericEntityService.findByField(
        "customer",
        "email",
        "cust@example.com",
      );

      expect(result).toEqual(mockCustomer);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("customers.email = $1"),
        ["cust@example.com"],
      );
    });

    test("should find role by name", async () => {
      const mockRole = { id: 1, name: "admin", priority: 100 };
      db.query.mockResolvedValueOnce({ rows: [mockRole] });

      const result = await GenericEntityService.findByField(
        "role",
        "name",
        "admin",
      );

      expect(result).toEqual(mockRole);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("roles.name = $1"),
        ["admin"],
      );
    });

    test("should return null when not found", async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const result = await GenericEntityService.findByField(
        "user",
        "email",
        "nonexistent@example.com",
      );

      expect(result).toBeNull();
    });

    test("should include LIMIT 1 in query", async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      await GenericEntityService.findByField(
        "user",
        "email",
        "test@example.com",
      );

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("LIMIT 1"),
        expect.any(Array),
      );
    });
  });

  describe("with RLS context", () => {
    test("should apply RLS filter when context provided", async () => {
      const mockUser = { id: 1, email: "test@example.com" };
      db.query.mockResolvedValueOnce({ rows: [mockUser] });

      const rlsContext = {
        policy: "own_record_only",
        userId: 1,
      };

      await GenericEntityService.findByField(
        "user",
        "email",
        "test@example.com",
        rlsContext,
      );

      // Should have both email filter AND RLS filter
      const query = db.query.mock.calls[0][0];
      expect(query).toContain("email = $1");
      expect(query).toContain("AND");
    });

    test("should work without RLS context", async () => {
      const mockUser = { id: 1, email: "test@example.com" };
      db.query.mockResolvedValueOnce({ rows: [mockUser] });

      const result = await GenericEntityService.findByField(
        "user",
        "email",
        "test@example.com",
      );

      expect(result).toEqual(mockUser);
      // Only one parameter (the email)
      expect(db.query.mock.calls[0][1]).toEqual(["test@example.com"]);
    });
  });

  describe("output filtering", () => {
    test("should filter sensitive fields from response", async () => {
      const mockUser = {
        id: 1,
        email: "test@example.com",
        auth0_id: "auth0|secret",
        first_name: "Test",
      };
      db.query.mockResolvedValueOnce({ rows: [mockUser] });

      const result = await GenericEntityService.findByField(
        "user",
        "email",
        "test@example.com",
      );

      // auth0_id is in ALWAYS_SENSITIVE and should be filtered
      expect(result.auth0_id).toBeUndefined();
      expect(result.email).toBe("test@example.com");
      expect(result.first_name).toBe("Test");
    });
  });
});
