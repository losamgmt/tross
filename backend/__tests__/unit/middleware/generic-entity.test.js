/**
 * Generic Entity Middleware Tests
 *
 * Tests for the generic entity middleware stack:
 * - extractEntity
 * - genericRequirePermission
 * - genericEnforceRLS
 * - genericValidateBody
 */

const {
  extractEntity,
  genericRequirePermission,
  genericEnforceRLS,
  genericValidateBody,
  normalizeEntityName,
  ENTITY_URL_MAP,
} = require('../../../middleware/generic-entity');

// Mock dependencies
jest.mock('../../../services/generic-entity-service');
jest.mock('../../../config/permissions-loader');
jest.mock('../../../config/logger', () => ({
  logSecurityEvent: jest.fn(),
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const GenericEntityService = require('../../../services/generic-entity-service');
const { hasPermission, getRLSRule } = require('../../../config/permissions-loader');
const { logSecurityEvent } = require('../../../config/logger');

// =============================================================================
// TEST HELPERS
// =============================================================================

/**
 * Create mock Express request
 * NOTE: dbUser.role is REQUIRED for genericValidateBody (field-level security)
 */
const createMockReq = (overrides = {}) => ({
  params: {},
  body: {},
  headers: {},
  url: '/api/v2/test',
  dbUser: { id: 1, role: 'admin' }, // Default to admin for test flexibility
  ...overrides,
});

/**
 * Create mock Express response
 */
const createMockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

/**
 * Create mock next function
 */
const createMockNext = () => jest.fn();

// =============================================================================
// normalizeEntityName TESTS
// =============================================================================

describe('normalizeEntityName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('valid entity names', () => {
    test.each([
      ['customers', 'customer'],
      ['CUSTOMERS', 'customer'],
      ['Customers', 'customer'],
      ['customer', 'customer'],
      ['users', 'user'],
      ['roles', 'role'],
      ['technicians', 'technician'],
      ['work-orders', 'work_order'],
      ['work_orders', 'work_order'],
      ['invoices', 'invoice'],
      ['contracts', 'contract'],
      ['inventory', 'inventory'],
    ])('should normalize "%s" to "%s"', (input, expected) => {
      expect(normalizeEntityName(input)).toBe(expected);
    });

    test('should handle whitespace', () => {
      expect(normalizeEntityName('  customers  ')).toBe('customer');
    });
  });

  describe('invalid entity names', () => {
    test.each([
      [null, null],
      [undefined, null],
      ['', null],
      ['unknown', null],
      ['notanentity', null],
      ['user_roles', null],
    ])('should return null for "%s"', (input, expected) => {
      expect(normalizeEntityName(input)).toBe(expected);
    });
  });
});

// =============================================================================
// extractEntity TESTS
// =============================================================================

describe('extractEntity', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = createMockReq();
    mockRes = createMockRes();
    mockNext = createMockNext();
  });

  describe('successful extraction', () => {
    const mockMetadata = {
      tableName: 'customers',
      primaryKey: 'id',
      rlsResource: 'customers',
      requiredFields: ['email'],
      createableFields: ['email', 'phone'],
      updateableFields: ['phone', 'status'],
    };

    beforeEach(() => {
      GenericEntityService._getMetadata = jest.fn().mockReturnValue(mockMetadata);
    });

    test('should extract entity name and attach metadata', () => {
      mockReq.params.entity = 'customers';

      extractEntity(mockReq, mockRes, mockNext);

      expect(mockReq.entityName).toBe('customer');
      expect(mockReq.entityMetadata).toEqual(mockMetadata);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('should handle plural URL form', () => {
      mockReq.params.entity = 'work-orders';
      GenericEntityService._getMetadata = jest.fn().mockReturnValue({
        tableName: 'work_orders',
        rlsResource: 'work_orders',
      });

      extractEntity(mockReq, mockRes, mockNext);

      expect(mockReq.entityName).toBe('work_order');
      expect(mockNext).toHaveBeenCalled();
    });

    test('should validate and attach ID when present', () => {
      mockReq.params.entity = 'customers';
      mockReq.params.id = '123';

      extractEntity(mockReq, mockRes, mockNext);

      expect(mockReq.entityId).toBe(123);
      expect(mockNext).toHaveBeenCalled();
    });

    test('should handle string ID that is a valid number', () => {
      mockReq.params.entity = 'customers';
      mockReq.params.id = '  456  ';

      extractEntity(mockReq, mockRes, mockNext);

      expect(mockReq.entityId).toBe(456);
    });
  });

  describe('error handling', () => {
    test('should return 404 for unknown entity', () => {
      mockReq.params.entity = 'unknownentity';

      extractEntity(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Not Found',
          message: 'Unknown entity: unknownentity',
        }),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should return 400 for invalid ID', () => {
      mockReq.params.entity = 'customers';
      mockReq.params.id = 'abc';
      GenericEntityService._getMetadata = jest.fn().mockReturnValue({
        tableName: 'customers',
      });

      extractEntity(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Bad Request',
        }),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should return 400 for negative ID', () => {
      mockReq.params.entity = 'customers';
      mockReq.params.id = '-5';
      GenericEntityService._getMetadata = jest.fn().mockReturnValue({
        tableName: 'customers',
      });

      extractEntity(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should return 400 for zero ID', () => {
      mockReq.params.entity = 'customers';
      mockReq.params.id = '0';
      GenericEntityService._getMetadata = jest.fn().mockReturnValue({
        tableName: 'customers',
      });

      extractEntity(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should log security event for invalid entity', () => {
      mockReq.params.entity = 'hackme';

      extractEntity(mockReq, mockRes, mockNext);

      expect(logSecurityEvent).toHaveBeenCalledWith(
        'GENERIC_ENTITY_INVALID',
        expect.objectContaining({
          urlEntity: 'hackme',
          severity: 'WARN',
        }),
      );
    });
  });
});

// =============================================================================
// genericRequirePermission TESTS
// =============================================================================

describe('genericRequirePermission', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = createMockReq({
      entityName: 'customer',
      entityMetadata: { rlsResource: 'customers' },
      dbUser: { id: 1, role: 'admin' },
    });
    mockRes = createMockRes();
    mockNext = createMockNext();
  });

  describe('permission granted', () => {
    test('should call next when user has permission', () => {
      hasPermission.mockReturnValue(true);

      genericRequirePermission('read')(mockReq, mockRes, mockNext);

      expect(hasPermission).toHaveBeenCalledWith('admin', 'customers', 'read');
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('should log permission granted event', () => {
      hasPermission.mockReturnValue(true);

      genericRequirePermission('create')(mockReq, mockRes, mockNext);

      expect(logSecurityEvent).toHaveBeenCalledWith(
        'GENERIC_PERMISSION_GRANTED',
        expect.objectContaining({
          userId: 1,
          userRole: 'admin',
          resource: 'customers',
          operation: 'create',
        }),
      );
    });
  });

  describe('permission denied', () => {
    test('should return 403 when user lacks permission', () => {
      hasPermission.mockReturnValue(false);

      genericRequirePermission('delete')(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Forbidden',
          message: 'You do not have permission to delete customers',
        }),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should log permission denied event', () => {
      hasPermission.mockReturnValue(false);

      genericRequirePermission('delete')(mockReq, mockRes, mockNext);

      expect(logSecurityEvent).toHaveBeenCalledWith(
        'GENERIC_PERMISSION_DENIED',
        expect.objectContaining({
          userRole: 'admin',
          resource: 'customers',
          operation: 'delete',
          severity: 'WARN',
        }),
      );
    });
  });

  describe('defense-in-depth checks', () => {
    test('should return 500 if extractEntity not run', () => {
      mockReq.entityName = undefined;
      mockReq.entityMetadata = undefined;

      genericRequirePermission('read')(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Entity not extracted',
        }),
      );
    });

    test('should return 403 if user has no role', () => {
      mockReq.dbUser = { id: 1 }; // No role

      genericRequirePermission('read')(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User has no assigned role',
        }),
      );
    });

    test('should return 500 if metadata missing rlsResource', () => {
      mockReq.entityMetadata = { tableName: 'customers' }; // No rlsResource

      genericRequirePermission('read')(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Entity missing rlsResource configuration',
        }),
      );
    });
  });
});

// =============================================================================
// genericEnforceRLS TESTS
// =============================================================================

describe('genericEnforceRLS', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = createMockReq({
      entityName: 'customer',
      entityMetadata: { rlsResource: 'customers' },
      dbUser: { id: 1, role: 'customer' },
    });
    mockRes = createMockRes();
    mockNext = createMockNext();
  });

  describe('RLS policy attachment', () => {
    test('should attach RLS policy to request', () => {
      getRLSRule.mockReturnValue('own_record_only');

      genericEnforceRLS(mockReq, mockRes, mockNext);

      expect(getRLSRule).toHaveBeenCalledWith('customer', 'customers');
      expect(mockReq.rlsPolicy).toBe('own_record_only');
      expect(mockReq.rlsResource).toBe('customers');
      expect(mockReq.rlsUserId).toBe(1);
      expect(mockNext).toHaveBeenCalled();
    });

    test('should attach null policy for all_records', () => {
      getRLSRule.mockReturnValue(null);

      genericEnforceRLS(mockReq, mockRes, mockNext);

      expect(mockReq.rlsPolicy).toBeNull();
      expect(mockNext).toHaveBeenCalled();
    });

    test('should log RLS applied event', () => {
      getRLSRule.mockReturnValue('own_record_only');

      genericEnforceRLS(mockReq, mockRes, mockNext);

      expect(logSecurityEvent).toHaveBeenCalledWith(
        'GENERIC_RLS_APPLIED',
        expect.objectContaining({
          userId: 1,
          userRole: 'customer',
          entityName: 'customer',
          resource: 'customers',
          policy: 'own_record_only',
        }),
      );
    });
  });

  describe('defense-in-depth checks', () => {
    test('should return 500 if extractEntity not run', () => {
      mockReq.entityName = undefined;

      genericEnforceRLS(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should return 403 if user has no role', () => {
      mockReq.dbUser = { id: 1 }; // No role

      genericEnforceRLS(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});

// =============================================================================
// genericValidateBody TESTS
// =============================================================================

describe('genericValidateBody', () => {
  let mockReq, mockRes, mockNext;
  
  // Use real customer metadata to match validation-rules.json
  const mockMetadata = {
    requiredFields: ['email'],
    createableFields: ['email', 'phone', 'company_name', 'billing_address', 'service_address', 'status'],
    updateableFields: ['email', 'phone', 'company_name', 'billing_address', 'service_address', 'status', 'is_active'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = createMockReq({
      entityName: 'customer',
      entityMetadata: mockMetadata,
    });
    mockRes = createMockRes();
    mockNext = createMockNext();
  });

  describe('create validation', () => {
    test('should pass with all required fields', () => {
      mockReq.body = {
        email: 'test@example.com',
      };

      genericValidateBody('create')(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.validatedBody).toEqual({
        email: 'test@example.com',
      });
    });

    test('should strip unknown fields', () => {
      mockReq.body = {
        email: 'test@example.com',
        hacker_field: 'malicious',
        id: 999,
        created_at: '2020-01-01',
      };

      genericValidateBody('create')(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.validatedBody).toEqual({
        email: 'test@example.com',
      });
      expect(mockReq.validatedBody.hacker_field).toBeUndefined();
      expect(mockReq.validatedBody.id).toBeUndefined();
    });

    test('should fail if required field missing', () => {
      mockReq.body = {
        phone: '+15551234567',
        // email missing
      };

      genericValidateBody('create')(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation Error',
          // Joi provides specific error message from validation-rules.json
          message: expect.stringContaining('Email'),
        }),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should fail with invalid email format', () => {
      mockReq.body = {
        email: 'not-a-valid-email',
      };

      genericValidateBody('create')(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation Error',
          message: expect.stringContaining('email'),
        }),
      );
    });

    test('should fail if required field is empty string', () => {
      mockReq.body = {
        email: '',
      };

      genericValidateBody('create')(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation Error',
        }),
      );
    });

    test('should fail if required field is null', () => {
      mockReq.body = {
        email: null,
      };

      genericValidateBody('create')(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('update validation', () => {
    test('should pass with valid updateable field', () => {
      mockReq.body = {
        company_name: 'ACME Corp',
      };

      genericValidateBody('update')(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.validatedBody).toEqual({ company_name: 'ACME Corp' });
    });

    test('should pass with multiple updateable fields', () => {
      mockReq.body = {
        company_name: 'ACME Corp',
        is_active: false,
      };

      genericValidateBody('update')(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.validatedBody).toEqual({
        company_name: 'ACME Corp',
        is_active: false,
      });
    });

    test('should strip non-updateable fields', () => {
      mockReq.body = {
        company_name: 'ACME Corp',
        id: 999, // Never updateable
        created_at: '2020-01-01', // Never updateable
      };

      genericValidateBody('update')(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.validatedBody).toEqual({ company_name: 'ACME Corp' });
    });

    test('should fail if no valid updateable fields', () => {
      mockReq.body = {
        id: 999, // Not in updateableFields
        created_at: '2020-01-01', // Not in updateableFields
      };

      genericValidateBody('update')(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation Error',
        }),
      );
    });

    test('should fail with empty body', () => {
      mockReq.body = {};

      genericValidateBody('update')(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('body validation', () => {
    test('should fail if body is not an object', () => {
      mockReq.body = 'not an object';

      genericValidateBody('create')(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Request body must be a JSON object',
        }),
      );
    });

    test('should fail if body is an array', () => {
      mockReq.body = [{ email: 'test@example.com' }];

      genericValidateBody('create')(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    test('should fail if body is null', () => {
      mockReq.body = null;

      genericValidateBody('create')(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('defense-in-depth checks', () => {
    test('should return 500 if extractEntity not run', () => {
      mockReq.entityName = undefined;
      mockReq.entityMetadata = undefined;

      genericValidateBody('create')(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });
});

// =============================================================================
// ENTITY_URL_MAP TESTS
// =============================================================================

describe('ENTITY_URL_MAP', () => {
  test('should have all 8 entities mapped', () => {
    const internalNames = new Set(Object.values(ENTITY_URL_MAP));
    expect(internalNames.size).toBe(8);
    expect(internalNames).toContain('user');
    expect(internalNames).toContain('role');
    expect(internalNames).toContain('customer');
    expect(internalNames).toContain('technician');
    expect(internalNames).toContain('work_order');
    expect(internalNames).toContain('invoice');
    expect(internalNames).toContain('contract');
    expect(internalNames).toContain('inventory');
  });

  test('should support both singular and plural forms', () => {
    expect(ENTITY_URL_MAP['user']).toBe('user');
    expect(ENTITY_URL_MAP['users']).toBe('user');
    expect(ENTITY_URL_MAP['customer']).toBe('customer');
    expect(ENTITY_URL_MAP['customers']).toBe('customer');
  });

  test('should support hyphenated forms for work_orders', () => {
    expect(ENTITY_URL_MAP['work-orders']).toBe('work_order');
    expect(ENTITY_URL_MAP['work-order']).toBe('work_order');
    expect(ENTITY_URL_MAP['work_orders']).toBe('work_order');
  });
});
