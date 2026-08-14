/**
 * GenericEntityService — write atomicity (REL-1 Unit of Work, ADR 013)
 *
 * The capstone for REL-1 Stage 1: proves that create/update/delete compose the
 * single canonical withTransaction primitive so that the WRITE, its afterChange
 * reactive step, and its audit row are ONE atomic Unit of Work:
 *   - Option A: a failing afterChange hook ROLLS BACK the write (nothing persists).
 *   - No committed change without its audit row: a failing audit ROLLS BACK too.
 *   - Propagation: when joined to a caller's transaction, the primitive does NOT
 *     roll back or release — the owning ancestor does (cascades never self-commit).
 *
 * Failures are injected at the real seams (hook-service.runAfterChangeHooks and
 * audit-helper.logEntityAuditIfEnabled) — the same mocking strategy the existing
 * delete/batch rollback unit tests use. Happy-path + batch rollback are covered
 * end-to-end by the integration suite; no entity declares afterChange hooks today,
 * so the failure path is exercised here by injection.
 */

jest.mock('../../../db/connection', () =>
  require('../../mocks').createDBMock({
    rows: [
      {
        id: 1,
        first_name: 'Ada',
        last_name: 'Lovelace',
        email: 'ada@test.com',
        organization_name: 'Analytical Engines',
      },
    ],
  }),
);

jest.mock('../../../config/logger', () => ({
  logger: require('../../mocks').createLoggerMock(),
}));

const mockEvaluateBeforeHooks = jest.fn();
const mockRunAfterChangeHooks = jest.fn();
jest.mock('../../../services/entity/hook-service', () => ({
  evaluateBeforeHooks: mockEvaluateBeforeHooks,
  runAfterChangeHooks: mockRunAfterChangeHooks,
}));

const mockLogEntityAuditIfEnabled = jest.fn();
jest.mock('../../../db/helpers/audit-helper', () => ({
  logEntityAuditIfEnabled: mockLogEntityAuditIfEnabled,
}));

jest.mock('../../../db/helpers/cascade-helper', () => ({
  cascadeDeleteDependents: jest.fn().mockResolvedValue({ totalDeleted: 0 }),
}));

const GenericEntityService = require('../../../services/entity/generic-entity-service');
const db = require('../../../db/connection');

const VALID_CUSTOMER = {
  first_name: 'Ada',
  last_name: 'Lovelace',
  email: 'ada@test.com',
  organization_name: 'Analytical Engines',
};

describe('GenericEntityService — write atomicity (Unit of Work, ADR 013)', () => {
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockEvaluateBeforeHooks.mockResolvedValue({ allowed: true });
    mockRunAfterChangeHooks.mockResolvedValue(undefined);
    mockLogEntityAuditIfEnabled.mockResolvedValue(undefined);
    // createDBMock's own-transaction client (BEGIN/COMMIT/ROLLBACK land here).
    mockClient = db.__getMockClient();
  });

  // Transaction-control statements issued on the owned client.
  const txnCalls = () =>
    mockClient.query.mock.calls
      .map((c) => (typeof c[0] === 'string' ? c[0].trim() : ''))
      .filter((s) => /^(BEGIN|COMMIT|ROLLBACK)/.test(s));

  // ==========================================================================
  // create()
  // ==========================================================================
  describe('create()', () => {
    test('rolls back the INSERT when an afterChange hook fails (Option A)', async () => {
      mockRunAfterChangeHooks.mockRejectedValueOnce(new Error('hook boom'));

      await expect(
        GenericEntityService.create('customer', VALID_CUSTOMER, {
          auditContext: { userId: 1 },
        }),
      ).rejects.toThrow('hook boom');

      const calls = txnCalls();
      expect(calls).toContain('BEGIN');
      expect(calls).toContain('ROLLBACK');
      expect(calls).not.toContain('COMMIT');
      // The write never reached the audit step.
      expect(mockLogEntityAuditIfEnabled).not.toHaveBeenCalled();
    });

    test('rolls back the INSERT when the audit write fails (no committed change without its audit row)', async () => {
      mockLogEntityAuditIfEnabled.mockRejectedValueOnce(new Error('audit boom'));

      await expect(
        GenericEntityService.create('customer', VALID_CUSTOMER, {
          auditContext: { userId: 1 },
        }),
      ).rejects.toThrow('audit boom');

      const calls = txnCalls();
      expect(calls).toContain('ROLLBACK');
      expect(calls).not.toContain('COMMIT');
    });

    test('commits once the write, hooks and audit all succeed', async () => {
      const result = await GenericEntityService.create('customer', VALID_CUSTOMER, {
        auditContext: { userId: 1 },
      });

      const calls = txnCalls();
      expect(calls).toContain('BEGIN');
      expect(calls).toContain('COMMIT');
      expect(calls).not.toContain('ROLLBACK');
      expect(mockRunAfterChangeHooks).toHaveBeenCalledTimes(1);
      expect(mockLogEntityAuditIfEnabled).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expect.objectContaining({ id: 1 }));
    });

    test('when joined to a caller transaction (propagation), does NOT roll back or release — the owner does', async () => {
      mockRunAfterChangeHooks.mockRejectedValueOnce(new Error('hook boom'));
      const externalClient = {
        query: jest.fn().mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 }),
        release: jest.fn(),
      };

      await expect(
        GenericEntityService.create('customer', VALID_CUSTOMER, {
          client: externalClient,
          auditContext: { userId: 1 },
        }),
      ).rejects.toThrow('hook boom');

      const extCalls = externalClient.query.mock.calls.map((c) => c[0]);
      expect(extCalls).not.toContain('BEGIN');
      expect(extCalls).not.toContain('COMMIT');
      expect(extCalls).not.toContain('ROLLBACK');
      expect(externalClient.release).not.toHaveBeenCalled();
      // The owned pool client was never touched (no self-managed transaction).
      expect(db.getClient).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // update()
  // ==========================================================================
  describe('update()', () => {
    test('rolls back the UPDATE when an afterChange hook fails (Option A)', async () => {
      mockRunAfterChangeHooks.mockRejectedValueOnce(new Error('hook boom'));

      await expect(
        GenericEntityService.update(
          'customer',
          1,
          { first_name: 'Grace' },
          { auditContext: { userId: 1 } },
        ),
      ).rejects.toThrow('hook boom');

      const calls = txnCalls();
      expect(calls).toContain('BEGIN');
      expect(calls).toContain('ROLLBACK');
      expect(calls).not.toContain('COMMIT');
    });

    test('rolls back the UPDATE when the audit write fails', async () => {
      mockLogEntityAuditIfEnabled.mockRejectedValueOnce(new Error('audit boom'));

      await expect(
        GenericEntityService.update(
          'customer',
          1,
          { first_name: 'Grace' },
          { auditContext: { userId: 1 } },
        ),
      ).rejects.toThrow('audit boom');

      const calls = txnCalls();
      expect(calls).toContain('ROLLBACK');
      expect(calls).not.toContain('COMMIT');
    });

    test('commits once the write, hooks and audit all succeed', async () => {
      const result = await GenericEntityService.update(
        'customer',
        1,
        { first_name: 'Grace' },
        { auditContext: { userId: 1 } },
      );

      const calls = txnCalls();
      expect(calls).toContain('COMMIT');
      expect(calls).not.toContain('ROLLBACK');
      expect(result).toEqual(expect.objectContaining({ id: 1 }));
    });
  });

  // ==========================================================================
  // delete() — audit moved in-transaction under Stage 1.4b
  // ==========================================================================
  describe('delete()', () => {
    test('rolls back the DELETE when the audit write fails (audit now joins the delete txn)', async () => {
      mockLogEntityAuditIfEnabled.mockRejectedValueOnce(new Error('audit boom'));

      await expect(
        GenericEntityService.delete('customer', 1, {
          auditContext: { userId: 1 },
        }),
      ).rejects.toThrow('audit boom');

      const calls = txnCalls();
      expect(calls).toContain('ROLLBACK');
      expect(calls).not.toContain('COMMIT');
    });

    test('commits when the delete and its audit succeed', async () => {
      const result = await GenericEntityService.delete('customer', 1, {
        auditContext: { userId: 1 },
      });

      const calls = txnCalls();
      expect(calls).toContain('COMMIT');
      expect(calls).not.toContain('ROLLBACK');
      expect(result).toEqual(expect.objectContaining({ id: 1 }));
    });
  });
});
