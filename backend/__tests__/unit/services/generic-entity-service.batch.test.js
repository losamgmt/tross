/**
 * GenericEntityService.batch() Unit Tests
 *
 * Tests batch operations with mocked database
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

jest.mock("../../../db/helpers/cascade-helper", () => ({
  cascadeDeleteDependents: jest.fn().mockResolvedValue({ totalDeleted: 0 }),
}));

jest.mock("../../../db/helpers/audit-helper", () => ({
  logEntityAudit: jest.fn(),
  isAuditEnabled: jest.fn().mockReturnValue(true),
}));

const GenericEntityService = require("../../../services/generic-entity-service");
const db = require("../../../db/connection");
const {
  cascadeDeleteDependents,
} = require("../../../db/helpers/cascade-helper");

describe("GenericEntityService.batch()", () => {
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock client for transactions
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    db.pool.connect.mockResolvedValue(mockClient);
  });

  describe("validation", () => {
    test("should throw error for empty operations array", async () => {
      await expect(GenericEntityService.batch("customer", [])).rejects.toThrow(
        "Operations must be a non-empty array",
      );
    });

    test("should throw error for non-array operations", async () => {
      await expect(
        GenericEntityService.batch("customer", "not-array"),
      ).rejects.toThrow("Operations must be a non-empty array");
    });

    test("should throw error for null operations", async () => {
      await expect(
        GenericEntityService.batch("customer", null),
      ).rejects.toThrow("Operations must be a non-empty array");
    });

    test("should throw error for invalid operation type", async () => {
      await expect(
        GenericEntityService.batch("customer", [
          { operation: "invalid", data: {} },
        ]),
      ).rejects.toThrow("Invalid operation 'invalid' at index 0");
    });

    test("should throw error for update without id", async () => {
      await expect(
        GenericEntityService.batch("customer", [
          { operation: "update", data: { phone: "555" } },
        ]),
      ).rejects.toThrow("Operation 'update' at index 0 requires an id");
    });

    test("should throw error for delete without id", async () => {
      await expect(
        GenericEntityService.batch("customer", [{ operation: "delete" }]),
      ).rejects.toThrow("Operation 'delete' at index 0 requires an id");
    });

    test("should throw error for create without data", async () => {
      await expect(
        GenericEntityService.batch("customer", [{ operation: "create" }]),
      ).rejects.toThrow("Operation 'create' at index 0 requires data");
    });

    test("should throw error for invalid entity name", async () => {
      await expect(
        GenericEntityService.batch("invalid_entity", [
          { operation: "create", data: { email: "test@test.com" } },
        ]),
      ).rejects.toThrow("Unknown entity: invalid_entity");
    });
  });

  describe("create operations", () => {
    test("should create multiple records in transaction", async () => {
      // Setup mock responses
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              first_name: "Alice",
              last_name: "Test",
              email: "a@test.com",
              organization_name: "A Corp",
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 2,
              first_name: "Bob",
              last_name: "Test",
              email: "b@test.com",
              organization_name: "B Corp",
            },
          ],
        })
        .mockResolvedValueOnce({}); // COMMIT

      const result = await GenericEntityService.batch("customer", [
        {
          operation: "create",
          data: {
            first_name: "Alice",
            last_name: "Test",
            email: "a@test.com",
            organization_name: "A Corp",
          },
        },
        {
          operation: "create",
          data: {
            first_name: "Bob",
            last_name: "Test",
            email: "b@test.com",
            organization_name: "B Corp",
          },
        },
      ]);

      expect(result.success).toBe(true);
      expect(result.stats.created).toBe(2);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].result.email).toBe("a@test.com");
      expect(result.results[1].result.email).toBe("b@test.com");

      // Verify transaction was used
      expect(mockClient.query).toHaveBeenCalledWith("BEGIN");
      expect(mockClient.query).toHaveBeenCalledWith("COMMIT");
      expect(mockClient.release).toHaveBeenCalled();
    });

    test("should fail on missing required fields", async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}); // ROLLBACK

      const result = await GenericEntityService.batch("customer", [
        { operation: "create", data: { phone: "555-1234" } }, // Missing email
      ]);

      expect(result.success).toBe(false);
      expect(result.stats.failed).toBe(1);
      expect(result.errors[0].error).toContain("Missing required fields");
    });
  });

  describe("update operations", () => {
    test("should update record and return new values", async () => {
      const oldRecord = {
        id: 1,
        email: "old@test.com",
        company_name: "Old Corp",
      };
      const newRecord = {
        id: 1,
        email: "old@test.com",
        company_name: "New Corp",
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [oldRecord] }) // SELECT for old values
        .mockResolvedValueOnce({ rows: [newRecord] }) // UPDATE
        .mockResolvedValueOnce({}); // COMMIT

      const result = await GenericEntityService.batch("customer", [
        { operation: "update", id: 1, data: { company_name: "New Corp" } },
      ]);

      expect(result.success).toBe(true);
      expect(result.stats.updated).toBe(1);
      expect(result.results[0].result.company_name).toBe("New Corp");
    });

    test("should fail if record not found", async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // SELECT - not found
        .mockResolvedValueOnce({}); // ROLLBACK

      const result = await GenericEntityService.batch("customer", [
        { operation: "update", id: 999, data: { phone: "555-9999" } },
      ]);

      expect(result.success).toBe(false);
      expect(result.errors[0].error).toContain("Record not found");
    });
  });

  describe("delete operations", () => {
    test("should delete with cascade", async () => {
      const record = { id: 1, email: "delete@test.com" };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [record] }) // SELECT for old values
        .mockResolvedValueOnce({ rows: [record] }) // DELETE
        .mockResolvedValueOnce({}); // COMMIT

      const result = await GenericEntityService.batch("customer", [
        { operation: "delete", id: 1 },
      ]);

      expect(result.success).toBe(true);
      expect(result.stats.deleted).toBe(1);
      expect(cascadeDeleteDependents).toHaveBeenCalled();
    });
  });

  describe("mixed operations", () => {
    test("should handle create, update, delete in order", async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [
            {
              id: 10,
              first_name: "New",
              last_name: "User",
              email: "new@test.com",
              organization_name: "New",
            },
          ],
        }) // CREATE
        .mockResolvedValueOnce({ rows: [{ id: 5, phone: "555-1111" }] }) // SELECT for update
        .mockResolvedValueOnce({ rows: [{ id: 5, phone: "555-9999" }] }) // UPDATE
        .mockResolvedValueOnce({ rows: [{ id: 3, email: "del@test.com" }] }) // SELECT for delete
        .mockResolvedValueOnce({ rows: [{ id: 3, email: "del@test.com" }] }) // DELETE
        .mockResolvedValueOnce({}); // COMMIT

      const result = await GenericEntityService.batch("customer", [
        {
          operation: "create",
          data: {
            first_name: "New",
            last_name: "User",
            email: "new@test.com",
            organization_name: "New",
          },
        },
        { operation: "update", id: 5, data: { phone: "555-9999" } },
        { operation: "delete", id: 3 },
      ]);

      expect(result.success).toBe(true);
      expect(result.stats).toEqual({
        created: 1,
        updated: 1,
        deleted: 1,
        failed: 0,
      });
      expect(result.results).toHaveLength(3);
    });
  });

  describe("error handling", () => {
    test("should rollback all on error (default behavior)", async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              first_name: "Good",
              last_name: "User",
              email: "good@test.com",
              organization_name: "Good",
            },
          ],
        }) // First CREATE
        .mockRejectedValueOnce(new Error("DB error")) // Second CREATE fails
        .mockResolvedValueOnce({}); // ROLLBACK

      const result = await GenericEntityService.batch("customer", [
        {
          operation: "create",
          data: {
            first_name: "Good",
            last_name: "User",
            email: "good@test.com",
            organization_name: "Good",
          },
        },
        {
          operation: "create",
          data: {
            first_name: "Bad",
            last_name: "User",
            email: "bad@test.com",
            organization_name: "Bad",
          },
        },
      ]);

      expect(result.success).toBe(false);
      expect(result.message).toContain("Batch aborted at operation 1");
      expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK");
    });

    test("should continue on error when continueOnError=true", async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              first_name: "Good",
              last_name: "User",
              email: "good@test.com",
              organization_name: "Good",
            },
          ],
        }) // First CREATE
        .mockResolvedValueOnce({ rows: [] }) // Second: SELECT not found
        .mockResolvedValueOnce({
          rows: [
            {
              id: 3,
              first_name: "Also",
              last_name: "User",
              email: "also@test.com",
              organization_name: "Also",
            },
          ],
        }) // Third CREATE
        .mockResolvedValueOnce({}); // COMMIT

      const result = await GenericEntityService.batch(
        "customer",
        [
          {
            operation: "create",
            data: {
              first_name: "Good",
              last_name: "User",
              email: "good@test.com",
              organization_name: "Good",
            },
          },
          { operation: "update", id: 999, data: { phone: "555" } }, // Will fail - not found
          {
            operation: "create",
            data: {
              first_name: "Also",
              last_name: "User",
              email: "also@test.com",
              organization_name: "Also",
            },
          },
        ],
        { continueOnError: true },
      );

      expect(result.success).toBe(false);
      expect(result.stats.created).toBe(2);
      expect(result.stats.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].index).toBe(1);

      // Should still commit successful operations
      expect(mockClient.query).toHaveBeenCalledWith("COMMIT");
    });
  });

  describe("transaction guarantees", () => {
    test("should always release client on success", async () => {
      mockClient.query
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({});

      await GenericEntityService.batch("customer", [
        {
          operation: "create",
          data: {
            first_name: "Test",
            last_name: "User",
            email: "test@test.com",
            organization_name: "Test",
          },
        },
      ]);

      expect(mockClient.release).toHaveBeenCalled();
    });

    test("should always release client on error", async () => {
      mockClient.query
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error("DB error"))
        .mockResolvedValueOnce({});

      await GenericEntityService.batch("customer", [
        {
          operation: "create",
          data: {
            first_name: "Test",
            last_name: "User",
            email: "test@test.com",
            organization_name: "Test",
          },
        },
      ]);

      expect(mockClient.release).toHaveBeenCalled();
    });

    test("should rollback on transaction error", async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error("Catastrophic failure"));

      // Batch catches operation errors and returns them in results
      const result = await GenericEntityService.batch("customer", [
        {
          operation: "create",
          data: {
            first_name: "Test",
            last_name: "User",
            email: "test@test.com",
            organization_name: "Test",
          },
        },
      ]);

      expect(result.success).toBe(false);
      expect(result.errors[0].error).toBe("Catastrophic failure");
      expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK");
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe("result structure", () => {
    test("should return detailed results for each operation", async () => {
      mockClient.query
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              first_name: "A",
              last_name: "User",
              email: "a@test.com",
              organization_name: "A",
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 2,
              first_name: "B",
              last_name: "User",
              email: "b@test.com",
              organization_name: "B",
            },
          ],
        })
        .mockResolvedValueOnce({});

      const result = await GenericEntityService.batch("customer", [
        {
          operation: "create",
          data: {
            first_name: "A",
            last_name: "User",
            email: "a@test.com",
            organization_name: "A",
          },
        },
        {
          operation: "create",
          data: {
            first_name: "B",
            last_name: "User",
            email: "b@test.com",
            organization_name: "B",
          },
        },
      ]);

      expect(result).toMatchObject({
        success: true,
        results: [
          {
            index: 0,
            operation: "create",
            success: true,
            result: expect.any(Object),
          },
          {
            index: 1,
            operation: "create",
            success: true,
            result: expect.any(Object),
          },
        ],
        errors: [],
        stats: { created: 2, updated: 0, deleted: 0, failed: 0 },
        message: expect.stringContaining("2 created"),
      });
    });

    test("should include error details in results", async () => {
      mockClient.query
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [] }) // not found
        .mockResolvedValueOnce({});

      const result = await GenericEntityService.batch("customer", [
        { operation: "update", id: 999, data: { phone: "555" } },
      ]);

      expect(result.results[0]).toMatchObject({
        index: 0,
        operation: "update",
        success: false,
        error: "Record not found: 999",
      });
    });
  });
});
