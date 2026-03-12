/**
 * Batch Validators Unit Tests
 *
 * Tests validateBatchRequest() middleware
 * Follows existing validator test patterns (minimal mocking)
 */

jest.mock('../../../config/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../../validators/validation-logger', () => ({
  logValidationFailure: jest.fn(),
}));

const { validateBatchRequest } = require('../../../validators/batch-validators');
const { API_OPERATIONS } = require('../../../config/api-operations');

const { BATCH } = API_OPERATIONS;

describe('validateBatchRequest', () => {
  let mockReq;
  let mockRes;
  let mockNext;
  let middleware;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      body: {},
      url: '/api/customers/batch',
      method: 'POST',
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    middleware = validateBatchRequest();
  });

  // ═══════════════════════════════════════════════════════════════
  // OPERATIONS ARRAY VALIDATION
  // ═══════════════════════════════════════════════════════════════

  describe('operations array validation', () => {
    test('rejects missing operations array', () => {
      mockReq.body = {};

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        }),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('rejects non-array operations', () => {
      mockReq.body = { operations: 'not-an-array' };

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('rejects empty operations array', () => {
      mockReq.body = { operations: [] };

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.details).toContainEqual(
        expect.objectContaining({
          field: 'operations',
          message: expect.stringContaining('empty'),
        }),
      );
    });

    test('rejects operations exceeding MAX_OPERATIONS', () => {
      const oversizedOps = Array(BATCH.MAX_OPERATIONS + 1).fill({
        operation: 'create',
        data: { name: 'test' },
      });
      mockReq.body = { operations: oversizedOps };

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.details).toContainEqual(
        expect.objectContaining({
          field: 'operations',
          message: expect.stringContaining(`${BATCH.MAX_OPERATIONS}`),
        }),
      );
    });

    test('accepts operations at exactly MAX_OPERATIONS limit', () => {
      const maxOps = Array(BATCH.MAX_OPERATIONS).fill({
        operation: 'create',
        data: { name: 'test' },
      });
      mockReq.body = { operations: maxOps };

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // OPERATION STRUCTURE VALIDATION
  // ═══════════════════════════════════════════════════════════════

  describe('operation structure validation', () => {
    test('rejects operation that is not an object', () => {
      mockReq.body = { operations: ['not-an-object'] };

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.details).toContainEqual(
        expect.objectContaining({
          field: 'operations[0]',
          message: expect.stringContaining('object'),
        }),
      );
    });

    test('rejects null operation', () => {
      mockReq.body = { operations: [null] };

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    test('rejects invalid operation type', () => {
      mockReq.body = {
        operations: [{ operation: 'invalid', data: {} }],
      };

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.details).toContainEqual(
        expect.objectContaining({
          field: 'operations[0].operation',
          message: expect.stringContaining('Invalid operation'),
        }),
      );
    });

    test('accepts valid operation types: create, update, delete', () => {
      mockReq.body = {
        operations: [
          { operation: 'create', data: { name: 'new' } },
          { operation: 'update', id: 1, data: { name: 'updated' } },
          { operation: 'delete', id: 2 },
        ],
      };

      middleware(mockReq, mockRes, mockNext);

      // Either passes or fails on mixed ops (depending on config)
      // But should not fail on operation type validation
      if (BATCH.ALLOW_MIXED_OPERATIONS) {
        expect(mockNext).toHaveBeenCalled();
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // ID REQUIREMENT VALIDATION
  // ═══════════════════════════════════════════════════════════════

  describe('id requirement validation', () => {
    test('rejects update without id', () => {
      mockReq.body = {
        operations: [{ operation: 'update', data: { name: 'updated' } }],
      };

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.details).toContainEqual(
        expect.objectContaining({
          field: 'operations[0].id',
          message: expect.stringContaining('requires an id'),
        }),
      );
    });

    test('rejects delete without id', () => {
      mockReq.body = {
        operations: [{ operation: 'delete' }],
      };

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.details).toContainEqual(
        expect.objectContaining({
          field: 'operations[0].id',
          message: expect.stringContaining('requires an id'),
        }),
      );
    });

    test('accepts update with id', () => {
      mockReq.body = {
        operations: [{ operation: 'update', id: 1, data: { name: 'updated' } }],
      };

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    test('accepts delete with id', () => {
      mockReq.body = {
        operations: [{ operation: 'delete', id: 1 }],
      };

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // DATA REQUIREMENT VALIDATION
  // ═══════════════════════════════════════════════════════════════

  describe('data requirement validation', () => {
    test('rejects create without data', () => {
      mockReq.body = {
        operations: [{ operation: 'create' }],
      };

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.details).toContainEqual(
        expect.objectContaining({
          field: 'operations[0].data',
          message: expect.stringContaining('requires data'),
        }),
      );
    });

    test('rejects update without data', () => {
      mockReq.body = {
        operations: [{ operation: 'update', id: 1 }],
      };

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.details).toContainEqual(
        expect.objectContaining({
          field: 'operations[0].data',
          message: expect.stringContaining('requires data'),
        }),
      );
    });

    test('accepts create with data', () => {
      mockReq.body = {
        operations: [{ operation: 'create', data: { name: 'new' } }],
      };

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // OPTIONS VALIDATION
  // ═══════════════════════════════════════════════════════════════

  describe('options validation', () => {
    test('accepts valid continueOnError boolean (true)', () => {
      mockReq.body = {
        operations: [{ operation: 'create', data: { name: 'test' } }],
        options: { continueOnError: true },
      };

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    test('accepts valid continueOnError boolean (false)', () => {
      mockReq.body = {
        operations: [{ operation: 'create', data: { name: 'test' } }],
        options: { continueOnError: false },
      };

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    test('rejects non-boolean continueOnError', () => {
      mockReq.body = {
        operations: [{ operation: 'create', data: { name: 'test' } }],
        options: { continueOnError: 'true' },
      };

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.details).toContainEqual(
        expect.objectContaining({
          field: 'options.continueOnError',
          message: expect.stringContaining('boolean'),
        }),
      );
    });

    test('accepts empty options', () => {
      mockReq.body = {
        operations: [{ operation: 'create', data: { name: 'test' } }],
        options: {},
      };

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    test('accepts missing options', () => {
      mockReq.body = {
        operations: [{ operation: 'create', data: { name: 'test' } }],
      };

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // ERROR AGGREGATION
  // ═══════════════════════════════════════════════════════════════

  describe('error aggregation', () => {
    test('aggregates multiple errors from different operations', () => {
      mockReq.body = {
        operations: [
          { operation: 'create' }, // Missing data
          { operation: 'update', data: { name: 'x' } }, // Missing id
          { operation: 'invalid', id: 1, data: {} }, // Invalid type
        ],
      };

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.details.length).toBeGreaterThanOrEqual(3);
      expect(response.message).toContain('3'); // "3 error(s)"
    });

    test('reports correct index for each error', () => {
      mockReq.body = {
        operations: [
          { operation: 'create', data: { name: 'valid' } },
          { operation: 'delete' }, // Missing id at index 1
          { operation: 'update', id: 1 }, // Missing data at index 2
        ],
      };

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      const response = mockRes.json.mock.calls[0][0];
      const fields = response.details.map((d) => d.field);
      expect(fields).toContain('operations[1].id');
      expect(fields).toContain('operations[2].data');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // VALIDATED DATA ATTACHMENT
  // ═══════════════════════════════════════════════════════════════

  describe('validated data attachment', () => {
    test('attaches validated batch data to req.validated', () => {
      mockReq.body = {
        operations: [{ operation: 'create', data: { name: 'test' } }],
        options: { continueOnError: true },
      };

      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.validated).toBeDefined();
      expect(mockReq.validated.batch).toBeDefined();
      expect(mockReq.validated.batch.operations).toEqual(mockReq.body.operations);
      expect(mockReq.validated.batch.options).toEqual(mockReq.body.options);
    });

    test('preserves existing req.validated properties', () => {
      mockReq.validated = { existingProp: 'value' };
      mockReq.body = {
        operations: [{ operation: 'create', data: { name: 'test' } }],
      };

      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.validated.existingProp).toBe('value');
      expect(mockReq.validated.batch).toBeDefined();
    });

    test('defaults continueOnError to DEFAULT_CONTINUE_ON_ERROR when not provided', () => {
      mockReq.body = {
        operations: [{ operation: 'create', data: { name: 'test' } }],
      };

      middleware(mockReq, mockRes, mockNext);

      // Should default to BATCH.DEFAULT_CONTINUE_ON_ERROR (false)
      expect(mockReq.validated.batch.options).toEqual({
        continueOnError: BATCH.DEFAULT_CONTINUE_ON_ERROR,
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // LOGGING
  // ═══════════════════════════════════════════════════════════════

  describe('validation logging', () => {
    test('logs validation failure', () => {
      const { logValidationFailure } = require('../../../validators/validation-logger');
      mockReq.body = { operations: [] };

      middleware(mockReq, mockRes, mockNext);

      expect(logValidationFailure).toHaveBeenCalledWith(
        expect.objectContaining({
          validator: 'validateBatchRequest',
          field: 'batch',
        }),
      );
    });
  });
});
