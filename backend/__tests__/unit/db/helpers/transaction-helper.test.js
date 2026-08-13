/**
 * Unit Tests: db/helpers/transaction-helper.js
 *
 * Covers the canonical transaction primitive: own-transaction lifecycle,
 * transaction PROPAGATION (join a caller's client), error paths, the named-step
 * runner, and the row-locking existence check.
 */

jest.mock('../../../../db/connection', () => ({
  getClient: jest.fn(),
}));
jest.mock('../../../../config/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

const db = require('../../../../db/connection');
const {
  withTransaction,
  withTransactionSteps,
  checkAndLock,
} = require('../../../../db/helpers/transaction-helper');

function makeClient() {
  return {
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    release: jest.fn(),
  };
}

describe('db/helpers/transaction-helper', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('withTransaction - own transaction', () => {
    test('BEGIN -> callback -> COMMIT -> release, returns result', async () => {
      const client = makeClient();
      db.getClient.mockResolvedValue(client);

      const result = await withTransaction(async (c) => {
        expect(c).toBe(client);
        return 'ok';
      });

      expect(result).toBe('ok');
      const sql = client.query.mock.calls.map((c) => c[0]);
      expect(sql).toEqual(['BEGIN', 'COMMIT']);
      expect(client.release).toHaveBeenCalledTimes(1);
    });

    test('rolls back and releases on error, rethrows the original', async () => {
      const client = makeClient();
      db.getClient.mockResolvedValue(client);

      await expect(
        withTransaction(async () => {
          throw new Error('boom');
        }),
      ).rejects.toThrow('boom');

      const sql = client.query.mock.calls.map((c) => c[0]);
      expect(sql).toEqual(['BEGIN', 'ROLLBACK']);
      expect(client.release).toHaveBeenCalledTimes(1);
    });
  });

  describe('withTransaction - joined (propagation)', () => {
    test('joins the caller client: no BEGIN/COMMIT/getClient/release', async () => {
      const parent = makeClient();

      const result = await withTransaction(
        async (c) => {
          expect(c).toBe(parent);
          return 42;
        },
        { client: parent },
      );

      expect(result).toBe(42);
      expect(db.getClient).not.toHaveBeenCalled();
      const sql = parent.query.mock.calls.map((c) => c[0]);
      expect(sql).not.toContain('BEGIN');
      expect(sql).not.toContain('COMMIT');
      expect(parent.release).not.toHaveBeenCalled();
    });

    test('joined error rethrows without ROLLBACK/release (ancestor owns it)', async () => {
      const parent = makeClient();

      await expect(
        withTransaction(
          async () => {
            throw new Error('inner');
          },
          { client: parent },
        ),
      ).rejects.toThrow('inner');

      const sql = parent.query.mock.calls.map((c) => c[0]);
      expect(sql).not.toContain('ROLLBACK');
      expect(parent.release).not.toHaveBeenCalled();
    });
  });

  describe('withTransactionSteps', () => {
    test('runs named steps in order, returns a name->result map', async () => {
      db.getClient.mockResolvedValue(makeClient());

      const results = await withTransactionSteps([
        { name: 'a', operation: async () => 1 },
        { name: 'b', operation: async () => 2 },
      ]);

      expect(results).toEqual({ a: 1, b: 2 });
    });

    test('annotates the failed step (failedStep + completedSteps)', async () => {
      db.getClient.mockResolvedValue(makeClient());

      await expect(
        withTransactionSteps([
          { name: 'a', operation: async () => 1 },
          {
            name: 'b',
            operation: async () => {
              throw new Error('b failed');
            },
          },
        ]),
      ).rejects.toMatchObject({
        message: 'b failed',
        failedStep: 'b',
        completedSteps: ['a'],
      });
    });
  });

  describe('checkAndLock', () => {
    test('SELECT ... FOR UPDATE returns the row when found', async () => {
      const client = makeClient();
      client.query.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });

      const row = await checkAndLock(client, 'customers', 'id', 1);

      expect(row).toEqual({ id: 1 });
      expect(client.query.mock.calls[0][0]).toContain('FOR UPDATE');
    });

    test('returns null when not found', async () => {
      const client = makeClient();
      client.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      expect(await checkAndLock(client, 'customers', 'id', 999)).toBeNull();
    });

    test('omits FOR UPDATE when forUpdate=false', async () => {
      const client = makeClient();
      client.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      await checkAndLock(client, 'customers', 'id', 1, false);
      expect(client.query.mock.calls[0][0]).not.toContain('FOR UPDATE');
    });
  });
});
