/**
 * GenericEntityService.update() — Row-Level Security unit tests (defense-in-depth)
 *
 * The PATCH route already pre-checks access via findById({rlsContext}), so this is
 * NOT a live vuln — but that leaves update() insecure if ever reached without the
 * pre-check. These tests pin the SERVICE-level hardening: update() scopes its UPDATE
 * statement by the RLS filter so an out-of-scope row cannot be mutated (0 rows ->
 * null -> 404). Internal/system callers (no rlsContext) keep the unscoped behavior.
 *
 * db/connection is mocked; db/helpers/rls is REAL so we exercise the actual
 * buildRLSFilter against real `notification` metadata (RLS: own user_id).
 */

jest.mock('../../../db/connection', () => require('../../mocks').createDBMock());
jest.mock('../../../config/logger', () => ({
  logger: require('../../mocks').createLoggerMock(),
}));

const GenericEntityService = require('../../../services/entity/generic-entity-service');
const db = require('../../../db/connection');

describe('GenericEntityService.update() — RLS scoping (defense-in-depth)', () => {
  const CUSTOMER_CTX = { role: 'customer', userId: 42, operation: 'update' };
  const OLD_ROW = { id: 999, user_id: 7, title: 'x', is_read: false };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const updateStatement = () =>
    db.query.mock.calls
      .map((c) => (typeof c[0] === 'string' ? c[0] : ''))
      .find((q) => /UPDATE notifications/i.test(q));

  test('scopes the UPDATE by RLS and returns null when the row is out of scope', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [OLD_ROW] }) // oldRecord fetch (findById SELECT)
      .mockResolvedValueOnce({ rows: [] }); // RLS-scoped UPDATE -> 0 rows (out of scope)

    const result = await GenericEntityService.update(
      'notification',
      999,
      { is_read: true },
      { rlsContext: CUSTOMER_CTX },
    );

    expect(result).toBeNull();
    const upd = updateStatement();
    expect(upd).toBeDefined();
    expect(upd).toMatch(/user_id/); // RLS clause applied to the UPDATE WHERE
  });

  test('does NOT scope the UPDATE when no rlsContext is supplied (internal/system caller)', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [OLD_ROW] }) // oldRecord fetch
      .mockResolvedValueOnce({ rows: [] }); // UPDATE -> 0 rows

    const result = await GenericEntityService.update('notification', 999, {
      is_read: true,
    });

    expect(result).toBeNull();
    const upd = updateStatement();
    expect(upd).toBeDefined();
    expect(upd).not.toMatch(/user_id/);
  });
});
