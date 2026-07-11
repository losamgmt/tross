/**
 * GenericEntityService.delete() — Row-Level Security unit tests
 *
 * Guards the `delete-rls-bypass` fix at the service boundary: delete() must apply
 * the RLS filter to its in-transaction existence check so a caller cannot delete
 * rows outside their access scope. Internal/system callers (no rlsContext) keep
 * the unscoped behavior.
 *
 * db/connection is mocked; db/helpers/rls is intentionally REAL so we exercise the
 * actual buildRLSFilter against real `notification` metadata (RLS: own user_id).
 */

jest.mock('../../../db/connection', () => require('../../mocks').createDBMock());
jest.mock('../../../config/logger', () => ({
  logger: require('../../mocks').createLoggerMock(),
}));

const GenericEntityService = require('../../../services/entity/generic-entity-service');
const db = require('../../../db/connection');

describe('GenericEntityService.delete() — RLS scoping (delete-rls-bypass)', () => {
  let mockClient;
  const CUSTOMER_CTX = { role: 'customer', userId: 42, operation: 'delete' };

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = { query: jest.fn(), release: jest.fn() };
    db.getClient.mockResolvedValue(mockClient);
  });

  const queryText = () =>
    mockClient.query.mock.calls.map((c) =>
      typeof c[0] === 'string' ? c[0] : '',
    );

  const existenceCheck = () =>
    queryText().find((q) => /SELECT \* FROM notifications/i.test(q));

  test('applies the RLS clause to the existence check and returns null when it filters the row out', async () => {
    // BEGIN → RLS-scoped existence check returns no rows (out of scope) → ROLLBACK
    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // scoped SELECT (no match)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // ROLLBACK

    const result = await GenericEntityService.delete('notification', 999, {
      rlsContext: CUSTOMER_CTX,
    });

    expect(result).toBeNull();

    // The existence check carried the RLS condition (notifications.user_id)
    const check = existenceCheck();
    expect(check).toBeDefined();
    expect(check).toMatch(/user_id/);

    // Crucially: NO DELETE was issued, and the transaction rolled back.
    const allText = queryText().join(' | ');
    expect(allText).not.toMatch(/DELETE FROM/i);
    expect(allText).toMatch(/ROLLBACK/);
  });

  test('does NOT add an RLS clause when no rlsContext is supplied (internal/system caller)', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // unscoped SELECT (not found)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // ROLLBACK

    const result = await GenericEntityService.delete('notification', 999);

    expect(result).toBeNull();
    const check = existenceCheck();
    expect(check).toBeDefined();
    expect(check).not.toMatch(/user_id/);
    expect(check).toMatch(/WHERE id = \$1/);
  });
});
