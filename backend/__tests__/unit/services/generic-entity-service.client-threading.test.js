/**
 * GenericEntityService - optional transaction-client threading (S6a, Commit A)
 *
 * Pins the additive client-threading contract that batch() will rely on:
 * - when options.client is passed, mutations and their reads run ON that client
 * - delete() does NOT open/close its own transaction when a client is threaded
 * - without a client, delete() still self-manages BEGIN/COMMIT + release (unchanged)
 *
 * These are isolation tests for the plumbing; end-to-end coverage lands with
 * batch() delegation (Commit B) and its integration tests.
 */

jest.mock("../../../db/connection", () => require("../../mocks").createDBMock());

jest.mock("../../../config/logger", () => ({
  logger: require("../../mocks").createLoggerMock(),
}));

jest.mock("../../../db/helpers/cascade-helper", () => ({
  cascadeDeleteDependents: jest.fn().mockResolvedValue({ totalDeleted: 0 }),
}));

const GenericEntityService = require("../../../services/entity/generic-entity-service");
const db = require("../../../db/connection");

describe("GenericEntityService - transaction-client threading (S6a)", () => {
  let client;

  beforeEach(() => {
    jest.clearAllMocks();
    client = { query: jest.fn(), release: jest.fn() };
  });

  describe("create(client)", () => {
    test("runs the INSERT on the threaded client, not the pool", async () => {
      client.query.mockResolvedValueOnce({
        rows: [
          { id: 5, email: "c@test.com", first_name: "Ada", last_name: "Byron" },
        ],
      });

      const result = await GenericEntityService.create(
        "customer",
        { email: "c@test.com", first_name: "Ada", last_name: "Byron" },
        { client, skipHooks: true },
      );

      expect(client.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO"),
        expect.any(Array),
      );
      expect(db.query).not.toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ id: 5 }));
    });
  });

  describe("update(client)", () => {
    test("runs the UPDATE and its re-fetches on the threaded client", async () => {
      client.query
        .mockResolvedValueOnce({
          rows: [{ id: 7, email: "o@test.com", phone: "555-0000" }],
        }) // oldRecord (findByField)
        .mockResolvedValueOnce({ rows: [{ id: 7 }] }) // UPDATE RETURNING id
        .mockResolvedValueOnce({
          rows: [{ id: 7, email: "o@test.com", phone: "555-1234" }],
        }); // re-fetch (findByField)

      const result = await GenericEntityService.update(
        "customer",
        7,
        { phone: "555-1234" },
        { client, skipHooks: true },
      );

      expect(db.query).not.toHaveBeenCalled();
      const sqls = client.query.mock.calls.map((c) => c[0]);
      expect(sqls.some((s) => /UPDATE/.test(s))).toBe(true);
      expect(result).toEqual(expect.objectContaining({ id: 7 }));
    });
  });

  describe("delete(client)", () => {
    test("runs on the threaded client and does NOT open its own transaction", async () => {
      client.query
        .mockResolvedValueOnce({ rows: [{ id: 1, email: "a@test.com" }] }) // existence check
        .mockResolvedValueOnce({ rows: [{ id: 1, email: "a@test.com" }] }); // DELETE RETURNING *

      const result = await GenericEntityService.delete("customer", 1, {
        client,
      });

      expect(db.getClient).not.toHaveBeenCalled();
      const sqls = client.query.mock.calls.map((c) => c[0]);
      expect(sqls.some((s) => s.includes("BEGIN"))).toBe(false);
      expect(sqls.some((s) => s.includes("COMMIT"))).toBe(false);
      expect(sqls.some((s) => s.includes("ROLLBACK"))).toBe(false);
      expect(sqls.some((s) => /DELETE FROM/.test(s))).toBe(true);
      expect(client.release).not.toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ id: 1 }));
    });

    test("without a client, self-manages a transaction (BEGIN/COMMIT + release)", async () => {
      const ownClient = { query: jest.fn(), release: jest.fn() };
      ownClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 2, email: "b@test.com" }] }) // existence check
        .mockResolvedValueOnce({ rows: [{ id: 2, email: "b@test.com" }] }) // DELETE RETURNING *
        .mockResolvedValueOnce({ rows: [] }); // COMMIT
      db.getClient.mockResolvedValue(ownClient);

      const result = await GenericEntityService.delete("customer", 2);

      expect(db.getClient).toHaveBeenCalledTimes(1);
      const sqls = ownClient.query.mock.calls.map((c) => c[0]);
      expect(sqls).toContain("BEGIN");
      expect(sqls).toContain("COMMIT");
      expect(ownClient.release).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expect.objectContaining({ id: 2 }));
    });
  });

  describe("findByField(client)", () => {
    test("reads on the threaded client, not the pool", async () => {
      client.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: "x@test.com" }],
      });

      const result = await GenericEntityService.findByField(
        "customer",
        "email",
        "x@test.com",
        { client },
      );

      expect(client.query).toHaveBeenCalledTimes(1);
      expect(db.query).not.toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ id: 1 }));
    });
  });
});
