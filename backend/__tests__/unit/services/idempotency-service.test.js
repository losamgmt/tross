/**
 * IdempotencyService Unit Tests
 *
 * Tests both pure functions (no mocks) and DB operations (mocked)
 *
 * STRUCTURE:
 * - Pure tests: hashBody, validateKey (no mocking needed)
 * - DB tests: find, store, cleanup (mocked db)
 */

jest.mock('../../../db/connection', () => ({
  query: jest.fn(),
}));

jest.mock('../../../config/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const IdempotencyService = require('../../../services/idempotency-service');
const AppError = require('../../../utils/app-error');
const db = require('../../../db/connection');
const { API_OPERATIONS } = require('../../../config/api-operations');

const { IDEMPOTENCY } = API_OPERATIONS;

describe('IdempotencyService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════
  // PURE FUNCTION TESTS (no mocks)
  // ═══════════════════════════════════════════════════════════════

  describe('hashBody (pure)', () => {
    test('returns consistent hash for same payload', () => {
      const payload = { name: 'test', count: 42 };

      const hash1 = IdempotencyService.hashBody(payload);
      const hash2 = IdempotencyService.hashBody(payload);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex = 64 chars
    });

    test('returns different hash for different payloads', () => {
      const payload1 = { name: 'test' };
      const payload2 = { name: 'different' };

      const hash1 = IdempotencyService.hashBody(payload1);
      const hash2 = IdempotencyService.hashBody(payload2);

      expect(hash1).not.toBe(hash2);
    });

    test('handles null payload', () => {
      const hash = IdempotencyService.hashBody(null);

      expect(hash).toHaveLength(64);
      // null should hash to same as empty object (JSON.stringify(null || {}) = '{}')
      expect(hash).toBe(IdempotencyService.hashBody({}));
    });

    test('handles undefined payload', () => {
      const hash = IdempotencyService.hashBody(undefined);

      expect(hash).toHaveLength(64);
      expect(hash).toBe(IdempotencyService.hashBody({}));
    });

    test('handles empty object', () => {
      const hash = IdempotencyService.hashBody({});

      expect(hash).toHaveLength(64);
    });

    test('is deterministic for nested objects', () => {
      const payload = {
        user: { id: 1, name: 'test' },
        items: [{ id: 1 }, { id: 2 }],
      };

      const hash1 = IdempotencyService.hashBody(payload);
      const hash2 = IdempotencyService.hashBody(payload);

      expect(hash1).toBe(hash2);
    });

    test('produces different hash for objects with same keys, different values', () => {
      const payload1 = { a: 1, b: 2 };
      const payload2 = { a: 2, b: 1 };

      const hash1 = IdempotencyService.hashBody(payload1);
      const hash2 = IdempotencyService.hashBody(payload2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('validateKey (pure)', () => {
    test('accepts valid UUID format', () => {
      expect(() => {
        IdempotencyService.validateKey('550e8400-e29b-41d4-a716-446655440000');
      }).not.toThrow();
    });

    test('accepts alphanumeric with hyphens and underscores', () => {
      expect(() => {
        IdempotencyService.validateKey('my_request-key_123');
      }).not.toThrow();
    });

    test('accepts max length key (255 chars)', () => {
      const maxKey = 'a'.repeat(IDEMPOTENCY.MAX_KEY_LENGTH);

      expect(() => {
        IdempotencyService.validateKey(maxKey);
      }).not.toThrow();
    });

    test('rejects key exceeding 255 characters', () => {
      const oversizedKey = 'a'.repeat(IDEMPOTENCY.MAX_KEY_LENGTH + 1);

      expect(() => {
        IdempotencyService.validateKey(oversizedKey);
      }).toThrow(AppError);
    });

    test('rejects empty string', () => {
      expect(() => {
        IdempotencyService.validateKey('');
      }).toThrow(AppError);

      try {
        IdempotencyService.validateKey('');
      } catch (error) {
        expect(error.statusCode).toBe(400);
      }
    });

    test('rejects null', () => {
      expect(() => {
        IdempotencyService.validateKey(null);
      }).toThrow(AppError);
    });

    test('rejects undefined', () => {
      expect(() => {
        IdempotencyService.validateKey(undefined);
      }).toThrow(AppError);
    });

    test('rejects keys with special characters', () => {
      const invalidKeys = ['key@invalid', 'has space', 'key.with.dots', 'key/slash'];

      for (const key of invalidKeys) {
        expect(() => {
          IdempotencyService.validateKey(key);
        }).toThrow(AppError);
      }
    });

    test('rejects non-string types', () => {
      const invalidTypes = [123, {}, [], true];

      for (const key of invalidTypes) {
        expect(() => {
          IdempotencyService.validateKey(key);
        }).toThrow(AppError);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // DATABASE OPERATION TESTS (mocked)
  // ═══════════════════════════════════════════════════════════════

  describe('find', () => {
    const testKey = 'test-key-123';
    const testUserId = 42;

    test('returns record when found and not expired', async () => {
      const storedRecord = {
        idempotency_key: testKey,
        request_body_hash: 'abc123',
        response_status: 201,
        response_body: { success: true, data: { id: 1 } },
        created_at: new Date(),
      };

      db.query.mockResolvedValue({ rows: [storedRecord] });

      const result = await IdempotencyService.find(testKey, testUserId);

      expect(result).toEqual(storedRecord);
      expect(db.query).toHaveBeenCalledTimes(1);

      // Verify query params include TTL cutoff
      const [, params] = db.query.mock.calls[0];
      expect(params[0]).toBe(testKey);
      expect(params[1]).toBe(testUserId);
      expect(params[2]).toBeInstanceOf(Date);
    });

    test('returns null when record not found', async () => {
      db.query.mockResolvedValue({ rows: [] });

      const result = await IdempotencyService.find(testKey, testUserId);

      expect(result).toBeNull();
    });

    test('scopes lookup to user_id', async () => {
      db.query.mockResolvedValue({ rows: [] });

      await IdempotencyService.find(testKey, testUserId);

      const [query, params] = db.query.mock.calls[0];
      expect(query).toContain('user_id = $2');
      expect(params[1]).toBe(testUserId);
    });

    test('enforces TTL in query (expired records not returned)', async () => {
      db.query.mockResolvedValue({ rows: [] });

      await IdempotencyService.find(testKey, testUserId);

      const [query, params] = db.query.mock.calls[0];
      // Query should include TTL check
      expect(query).toContain('created_at > $3');
      // TTL cutoff should be in the past
      const cutoff = params[2];
      expect(cutoff.getTime()).toBeLessThan(Date.now());
    });
  });

  describe('store', () => {
    const storeParams = {
      key: 'test-key-123',
      userId: 42,
      method: 'POST',
      path: '/api/customers',
      bodyHash: 'hash123',
      statusCode: 201,
      responseBody: { success: true, data: { id: 1 } },
    };

    test('inserts new idempotency record', async () => {
      db.query.mockResolvedValue({ rowCount: 1 });

      await IdempotencyService.store(storeParams);

      expect(db.query).toHaveBeenCalledTimes(1);

      const [query, params] = db.query.mock.calls[0];
      expect(query).toContain('INSERT INTO idempotency_keys');
      expect(params).toEqual([
        storeParams.key,
        storeParams.userId,
        storeParams.method,
        storeParams.path,
        storeParams.bodyHash,
        storeParams.statusCode,
        storeParams.responseBody,
      ]);
    });

    test('uses ON CONFLICT DO NOTHING for idempotent insert', async () => {
      db.query.mockResolvedValue({ rowCount: 0 }); // Conflict occurred

      // Should not throw
      await IdempotencyService.store(storeParams);

      const [query] = db.query.mock.calls[0];
      expect(query).toContain('ON CONFLICT');
      expect(query).toContain('DO NOTHING');
    });
  });

  describe('cleanup', () => {
    test('deletes records older than TTL', async () => {
      db.query.mockResolvedValue({ rowCount: 5 });

      const deleted = await IdempotencyService.cleanup();

      expect(deleted).toBe(5);
      expect(db.query).toHaveBeenCalledTimes(1);

      const [query, params] = db.query.mock.calls[0];
      expect(query).toContain('DELETE FROM idempotency_keys');
      expect(query).toContain('created_at < $1');
      expect(params[0]).toBeInstanceOf(Date);
    });

    test('returns 0 when no expired records', async () => {
      db.query.mockResolvedValue({ rowCount: 0 });

      const deleted = await IdempotencyService.cleanup();

      expect(deleted).toBe(0);
    });

    test('logs when records are deleted', async () => {
      const { logger } = require('../../../config/logger');
      db.query.mockResolvedValue({ rowCount: 10 });

      await IdempotencyService.cleanup();

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Removed expired keys'),
        expect.objectContaining({ deleted: 10 }),
      );
    });

    test('does not log when no records deleted', async () => {
      const { logger } = require('../../../config/logger');
      db.query.mockResolvedValue({ rowCount: 0 });

      await IdempotencyService.cleanup();

      expect(logger.info).not.toHaveBeenCalled();
    });
  });
});
