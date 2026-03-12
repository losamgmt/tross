/**
 * Idempotency Middleware Unit Tests
 *
 * Tests checkIdempotency and saveIdempotencyResponse
 * Uses mock req/res/next pattern from existing middleware tests
 */

jest.mock('../../../services/idempotency-service', () => ({
  hashBody: jest.fn(),
  validateKey: jest.fn(),
  find: jest.fn(),
  store: jest.fn(),
}));

jest.mock('../../../config/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const { checkIdempotency, saveIdempotencyResponse } = require('../../../middleware/idempotency');
const IdempotencyService = require('../../../services/idempotency-service');
const { API_OPERATIONS } = require('../../../config/api-operations');
const AppError = require('../../../utils/app-error');

const { IDEMPOTENCY } = API_OPERATIONS;

describe('checkIdempotency middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      method: 'POST',
      get: jest.fn(),
      body: { name: 'test' },
      dbUser: { id: 42 },
      originalUrl: '/api/customers',
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    // Default mock implementations
    IdempotencyService.hashBody.mockReturnValue('mock-hash-123');
    IdempotencyService.validateKey.mockImplementation(() => {});
    IdempotencyService.find.mockResolvedValue(null);
  });

  // ═══════════════════════════════════════════════════════════════
  // METHOD FILTERING
  // ═══════════════════════════════════════════════════════════════

  describe('method filtering', () => {
    test('skips GET requests', () => {
      mockReq.method = 'GET';

      checkIdempotency(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(IdempotencyService.find).not.toHaveBeenCalled();
    });

    test('skips HEAD requests', () => {
      mockReq.method = 'HEAD';

      checkIdempotency(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(IdempotencyService.find).not.toHaveBeenCalled();
    });

    test('skips OPTIONS requests', () => {
      mockReq.method = 'OPTIONS';

      checkIdempotency(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(IdempotencyService.find).not.toHaveBeenCalled();
    });

    test('processes POST requests', () => {
      mockReq.method = 'POST';
      mockReq.get.mockReturnValue('test-key');

      checkIdempotency(mockReq, mockRes, mockNext);

      // Should at least validate key (async flow continues)
      expect(IdempotencyService.validateKey).toHaveBeenCalled();
    });

    test('processes PUT requests', () => {
      mockReq.method = 'PUT';
      mockReq.get.mockReturnValue('test-key');

      checkIdempotency(mockReq, mockRes, mockNext);

      expect(IdempotencyService.validateKey).toHaveBeenCalled();
    });

    test('processes PATCH requests', () => {
      mockReq.method = 'PATCH';
      mockReq.get.mockReturnValue('test-key');

      checkIdempotency(mockReq, mockRes, mockNext);

      expect(IdempotencyService.validateKey).toHaveBeenCalled();
    });

    test('processes DELETE requests', () => {
      mockReq.method = 'DELETE';
      mockReq.get.mockReturnValue('test-key');

      checkIdempotency(mockReq, mockRes, mockNext);

      expect(IdempotencyService.validateKey).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // NO KEY PROVIDED
  // ═══════════════════════════════════════════════════════════════

  describe('no key provided', () => {
    test('calls next() without key header', () => {
      mockReq.get.mockReturnValue(undefined);

      checkIdempotency(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(IdempotencyService.find).not.toHaveBeenCalled();
    });

    test('does not attach idempotencyContext without key', () => {
      mockReq.get.mockReturnValue(undefined);

      checkIdempotency(mockReq, mockRes, mockNext);

      expect(mockReq.idempotencyContext).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // KEY VALIDATION
  // ═══════════════════════════════════════════════════════════════

  describe('key validation', () => {
    test('returns 400 for invalid key format', () => {
      mockReq.get.mockReturnValue('invalid@key');
      IdempotencyService.validateKey.mockImplementation(() => {
        throw new AppError('Invalid key', 400, 'BAD_REQUEST');
      });

      checkIdempotency(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('calls validateKey with header value', () => {
      const key = 'valid-key-123';
      mockReq.get.mockReturnValue(key);

      checkIdempotency(mockReq, mockRes, mockNext);

      expect(IdempotencyService.validateKey).toHaveBeenCalledWith(key);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // AUTHENTICATION REQUIREMENT
  // ═══════════════════════════════════════════════════════════════

  describe('authentication requirement', () => {
    test('returns 400 when no user (dbUser missing)', () => {
      mockReq.get.mockReturnValue('valid-key');
      mockReq.dbUser = undefined;
      mockReq.user = undefined;

      checkIdempotency(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.message).toContain('authenticated user');
    });

    test('accepts dbUser.id', async () => {
      mockReq.get.mockReturnValue('valid-key');
      mockReq.dbUser = { id: 42 };

      checkIdempotency(mockReq, mockRes, mockNext);

      // Wait for async promise
      await new Promise(setImmediate);

      expect(IdempotencyService.find).toHaveBeenCalledWith('valid-key', 42);
    });

    test('falls back to user.userId when dbUser missing', async () => {
      mockReq.get.mockReturnValue('valid-key');
      mockReq.dbUser = undefined;
      mockReq.user = { userId: 99 };

      checkIdempotency(mockReq, mockRes, mockNext);

      await new Promise(setImmediate);

      expect(IdempotencyService.find).toHaveBeenCalledWith('valid-key', 99);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // CACHE HIT (EXISTING KEY)
  // ═══════════════════════════════════════════════════════════════

  describe('cache hit', () => {
    test('returns cached response when found', async () => {
      const cachedResponse = {
        request_body_hash: 'mock-hash-123',
        response_status: 201,
        response_body: { success: true, data: { id: 1 } },
      };
      mockReq.get.mockReturnValue('valid-key');
      IdempotencyService.find.mockResolvedValue(cachedResponse);

      checkIdempotency(mockReq, mockRes, mockNext);

      await new Promise(setImmediate);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(cachedResponse.response_body);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('returns cached 200 response', async () => {
      const cachedResponse = {
        request_body_hash: 'mock-hash-123',
        response_status: 200,
        response_body: { success: true },
      };
      mockReq.get.mockReturnValue('valid-key');
      IdempotencyService.find.mockResolvedValue(cachedResponse);

      checkIdempotency(mockReq, mockRes, mockNext);

      await new Promise(setImmediate);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PAYLOAD MISMATCH
  // ═══════════════════════════════════════════════════════════════

  describe('payload mismatch (strict mode)', () => {
    test('returns 422 when body hash does not match', async () => {
      const cachedResponse = {
        request_body_hash: 'different-hash',
        response_status: 201,
        response_body: { success: true },
      };
      mockReq.get.mockReturnValue('valid-key');
      IdempotencyService.find.mockResolvedValue(cachedResponse);
      // mockHash is 'mock-hash-123' which differs from 'different-hash'

      checkIdempotency(mockReq, mockRes, mockNext);

      await new Promise(setImmediate);

      expect(mockRes.status).toHaveBeenCalledWith(IDEMPOTENCY.STATUS_CONFLICT);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.code).toBe('IDEMPOTENCY_MISMATCH');
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('logs warning on payload mismatch', async () => {
      const { logger } = require('../../../config/logger');
      const cachedResponse = {
        request_body_hash: 'different-hash',
        response_status: 201,
        response_body: {},
      };
      mockReq.get.mockReturnValue('valid-key');
      IdempotencyService.find.mockResolvedValue(cachedResponse);

      checkIdempotency(mockReq, mockRes, mockNext);

      await new Promise(setImmediate);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Payload mismatch'),
        expect.any(Object),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // CACHE MISS (NEW KEY)
  // ═══════════════════════════════════════════════════════════════

  describe('cache miss', () => {
    test('attaches idempotencyContext to req on miss', async () => {
      mockReq.get.mockReturnValue('valid-key');
      IdempotencyService.find.mockResolvedValue(null);

      checkIdempotency(mockReq, mockRes, mockNext);

      await new Promise(setImmediate);

      expect(mockReq.idempotencyContext).toBeDefined();
      expect(mockReq.idempotencyContext.key).toBe('valid-key');
      expect(mockReq.idempotencyContext.userId).toBe(42);
      expect(mockReq.idempotencyContext.method).toBe('POST');
      expect(mockReq.idempotencyContext.path).toBe('/api/customers');
      expect(mockReq.idempotencyContext.bodyHash).toBe('mock-hash-123');
    });

    test('calls next() on cache miss', async () => {
      mockReq.get.mockReturnValue('valid-key');
      IdempotencyService.find.mockResolvedValue(null);

      checkIdempotency(mockReq, mockRes, mockNext);

      await new Promise(setImmediate);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // ERROR HANDLING
  // ═══════════════════════════════════════════════════════════════

  describe('error handling', () => {
    test('calls next(error) on service error', async () => {
      const serviceError = new Error('Database error');
      mockReq.get.mockReturnValue('valid-key');
      IdempotencyService.find.mockRejectedValue(serviceError);

      checkIdempotency(mockReq, mockRes, mockNext);

      await new Promise(setImmediate);

      expect(mockNext).toHaveBeenCalledWith(serviceError);
    });
  });
});

// ═════════════════════════════════════════════════════════════════════
// saveIdempotencyResponse
// ═════════════════════════════════════════════════════════════════════

describe('saveIdempotencyResponse', () => {
  let mockReq;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {};
    IdempotencyService.store.mockResolvedValue();
  });

  describe('when idempotencyContext present', () => {
    test('stores response via IdempotencyService', async () => {
      mockReq.idempotencyContext = {
        key: 'test-key',
        userId: 42,
        method: 'POST',
        path: '/api/customers',
        bodyHash: 'hash123',
      };
      const statusCode = 201;
      const responseBody = { success: true, data: { id: 1 } };

      await saveIdempotencyResponse(mockReq, statusCode, responseBody);

      expect(IdempotencyService.store).toHaveBeenCalledWith({
        key: 'test-key',
        userId: 42,
        method: 'POST',
        path: '/api/customers',
        bodyHash: 'hash123',
        statusCode: 201,
        responseBody: { success: true, data: { id: 1 } },
      });
    });

    test('does not log on successful store (silent success)', async () => {
      const { logger } = require('../../../config/logger');
      mockReq.idempotencyContext = {
        key: 'test-key',
        userId: 42,
        method: 'POST',
        path: '/api/customers',
        bodyHash: 'hash123',
      };

      await saveIdempotencyResponse(mockReq, 201, {});

      // No logging on success - only IdempotencyService.store logs internally
      expect(logger.error).not.toHaveBeenCalled();
    });
  });

  describe('when idempotencyContext absent', () => {
    test('does nothing when no idempotencyContext', async () => {
      mockReq.idempotencyContext = undefined;

      await saveIdempotencyResponse(mockReq, 201, { data: {} });

      expect(IdempotencyService.store).not.toHaveBeenCalled();
    });

    test('does nothing when idempotencyContext is null', async () => {
      mockReq.idempotencyContext = null;

      await saveIdempotencyResponse(mockReq, 201, { data: {} });

      expect(IdempotencyService.store).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    test('logs error but does not throw on store failure', async () => {
      const { logger } = require('../../../config/logger');
      mockReq.idempotencyContext = {
        key: 'test-key',
        userId: 42,
        method: 'POST',
        path: '/api/customers',
        bodyHash: 'hash123',
      };
      IdempotencyService.store.mockRejectedValue(new Error('DB error'));

      // Should not throw
      await saveIdempotencyResponse(mockReq, 201, {});

      expect(logger.error).toHaveBeenCalled();
    });
  });
});
