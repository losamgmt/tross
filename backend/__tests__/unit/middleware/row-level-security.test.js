/**
 * Unit Tests: Row-Level Security Middleware
 *
 * Tests the enforceRLS middleware in isolation.
 * Validates RLS policy attachment and error handling.
 */

const { enforceRLS, validateRLSApplied } = require('../../../middleware/row-level-security');
const { getRLSRule } = require('../../../config/permissions-loader');
const { HTTP_STATUS } = require('../../../config/constants');

// Mock dependencies
jest.mock('../../../config/permissions-loader');
jest.mock('../../../config/logger', () => ({
  logSecurityEvent: jest.fn(),
}));
jest.mock('../../../utils/request-helpers', () => ({
  getClientIp: jest.fn(() => '127.0.0.1'),
  getUserAgent: jest.fn(() => 'test-agent'),
}));

describe('Row-Level Security Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      dbUser: { role: 'customer', id: 1 },
      url: '/api/customers',
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('enforceRLS(resource)', () => {
    it('should attach RLS policy to request when policy exists', () => {
      getRLSRule.mockReturnValue('own_record_only');

      const middleware = enforceRLS('customers');
      middleware(req, res, next);

      expect(req.rlsPolicy).toBe('own_record_only');
      expect(req.rlsResource).toBe('customers');
      expect(req.rlsUserId).toBe(1);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should attach null policy when no RLS defined', () => {
      getRLSRule.mockReturnValue(null);

      const middleware = enforceRLS('inventory');
      middleware(req, res, next);

      expect(req.rlsPolicy).toBeNull();
      expect(req.rlsResource).toBe('inventory');
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should handle different RLS policies for different resources', () => {
      getRLSRule.mockReturnValue('assigned_work_orders_only');

      const middleware = enforceRLS('work_orders');
      middleware(req, res, next);

      expect(req.rlsPolicy).toBe('assigned_work_orders_only');
      expect(req.rlsResource).toBe('work_orders');
      expect(next).toHaveBeenCalled();
    });

    it('should reject request when user has no role', () => {
      req.dbUser = { id: 1 }; // No role

      const middleware = enforceRLS('customers');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.FORBIDDEN);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Forbidden',
          message: 'User has no assigned role',
        }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request when user is missing', () => {
      req.dbUser = null;

      const middleware = enforceRLS('customers');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.FORBIDDEN);
      expect(next).not.toHaveBeenCalled();
    });

    it('should call getRLSRule with correct parameters', () => {
      getRLSRule.mockReturnValue('own_work_orders_only');
      req.dbUser.role = 'technician';

      const middleware = enforceRLS('work_orders');
      middleware(req, res, next);

      expect(getRLSRule).toHaveBeenCalledWith('technician', 'work_orders');
    });

    it('should handle null policy for roles with no access', () => {
      // Technicians have null access to contracts
      getRLSRule.mockReturnValue(null);
      req.dbUser.role = 'technician';

      const middleware = enforceRLS('contracts');
      middleware(req, res, next);

      expect(req.rlsPolicy).toBeNull();
      expect(req.rlsResource).toBe('contracts');
      expect(next).toHaveBeenCalled();
    });

    it('should preserve user ID for filtering', () => {
      getRLSRule.mockReturnValue('own_invoices_only');
      req.dbUser = { role: 'customer', id: 42 };

      const middleware = enforceRLS('invoices');
      middleware(req, res, next);

      expect(req.rlsUserId).toBe(42);
      expect(next).toHaveBeenCalled();
    });

    it('should handle dispatcher with all_records policy', () => {
      getRLSRule.mockReturnValue('all_records');
      req.dbUser.role = 'dispatcher';

      const middleware = enforceRLS('customers');
      middleware(req, res, next);

      expect(req.rlsPolicy).toBe('all_records');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('validateRLSApplied(req, result)', () => {
    beforeEach(() => {
      req.rlsResource = 'customers';
      req.rlsPolicy = 'own_record_only';
      req.rlsUserId = 1;
      req.dbUser = { role: 'customer' };
    });

    it('should pass when RLS was applied', () => {
      const result = { data: [], rlsApplied: true };
      expect(() => validateRLSApplied(req, result)).not.toThrow();
    });

    it('should throw when RLS was not applied', () => {
      const result = { data: [] }; // Missing rlsApplied flag
      expect(() => validateRLSApplied(req, result)).toThrow(/RLS validation failed/);
    });

    it('should pass when no RLS enforcement is required', () => {
      req.rlsResource = null; // No RLS on this route
      const result = { data: [] }; // No rlsApplied flag
      expect(() => validateRLSApplied(req, result)).not.toThrow();
    });

    it('should pass when RLS policy is null (no filtering required)', () => {
      req.rlsPolicy = null;
      const result = { data: [] }; // No rlsApplied flag
      expect(() => validateRLSApplied(req, result)).not.toThrow();
    });

    it('should throw when result is null', () => {
      expect(() => validateRLSApplied(req, null)).toThrow(/RLS validation failed/);
    });

    it('should throw when result is undefined', () => {
      expect(() => validateRLSApplied(req, undefined)).toThrow(/RLS validation failed/);
    });

    it('should include error context in exception', () => {
      const result = { data: [] };
      try {
        validateRLSApplied(req, result);
      } catch (error) {
        expect(error.message).toContain('customers');
        expect(error.message).toContain('own_record_only');
      }
    });
  });

  describe('Integration with Role Hierarchy', () => {
    it('should apply different policies for customer vs dispatcher', () => {
      // Customer gets own_record_only
      getRLSRule.mockReturnValue('own_record_only');
      req.dbUser = { role: 'customer', id: 1 };

      let middleware = enforceRLS('customers');
      middleware(req, res, next);
      expect(req.rlsPolicy).toBe('own_record_only');

      // Dispatcher gets all_records
      jest.clearAllMocks();
      getRLSRule.mockReturnValue('all_records');
      req.dbUser = { role: 'dispatcher', id: 2 };

      middleware = enforceRLS('customers');
      middleware(req, res, next);
      expect(req.rlsPolicy).toBe('all_records');
    });

    it('should handle work_orders with technician role', () => {
      getRLSRule.mockReturnValue('assigned_work_orders_only');
      req.dbUser = { role: 'technician', id: 3 };

      const middleware = enforceRLS('work_orders');
      middleware(req, res, next);

      expect(req.rlsPolicy).toBe('assigned_work_orders_only');
      expect(getRLSRule).toHaveBeenCalledWith('technician', 'work_orders');
    });

    it('should handle contracts with technician role (null access)', () => {
      getRLSRule.mockReturnValue(null);
      req.dbUser = { role: 'technician', id: 3 };

      const middleware = enforceRLS('contracts');
      middleware(req, res, next);

      expect(req.rlsPolicy).toBeNull();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Error Response Format', () => {
    it('should return standardized error structure', () => {
      req.dbUser = null;

      const middleware = enforceRLS('customers');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.FORBIDDEN);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Forbidden',
          message: expect.any(String),
          timestamp: expect.any(String),
        }),
      );
    });

    it('should include ISO timestamp in error response', () => {
      req.dbUser = { id: 1 }; // No role

      const middleware = enforceRLS('customers');
      middleware(req, res, next);

      const jsonCall = res.json.mock.calls[0][0];
      expect(() => new Date(jsonCall.timestamp)).not.toThrow();
    });
  });
});
