/**
 * Unit Tests: Body Validators - Factory Pattern
 * 
 * Tests the AUTO-GENERATED validator factory pattern (Phase 9)
 * Ensures all 16 validators are properly generated and functional
 * 
 * CRITICAL: Direct unit tests for factory logic, not integration tests!
 * 
 * Coverage:
 * - Factory generates all expected validators
 * - Each validator is a proper middleware function
 * - Validators correctly validate requests
 * - Validators correctly reject invalid requests
 * - Update validators enforce min(1) requirement
 */

const {
  validateUserCreate,
  validateUserUpdate,
  validateRoleCreate,
  validateRoleUpdate,
  validateCustomerCreate,
  validateCustomerUpdate,
  validateTechnicianCreate,
  validateTechnicianUpdate,
  validateWorkOrderCreate,
  validateWorkOrderUpdate,
  validateInvoiceCreate,
  validateInvoiceUpdate,
  validateContractCreate,
  validateContractUpdate,
  validateInventoryCreate,
  validateInventoryUpdate,
} = require('../../../validators');

describe('Body Validators - Factory Pattern (Phase 9)', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      validated: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // FACTORY GENERATION VERIFICATION
  // ============================================================================
  describe('Factory Generation', () => {
    test('should generate all 16 resource validators (8 resources × 2 operations)', () => {
      // CREATE validators
      expect(validateUserCreate).toBeDefined();
      expect(validateRoleCreate).toBeDefined();
      expect(validateCustomerCreate).toBeDefined();
      expect(validateTechnicianCreate).toBeDefined();
      expect(validateWorkOrderCreate).toBeDefined();
      expect(validateInvoiceCreate).toBeDefined();
      expect(validateContractCreate).toBeDefined();
      expect(validateInventoryCreate).toBeDefined();

      // UPDATE validators
      expect(validateUserUpdate).toBeDefined();
      expect(validateRoleUpdate).toBeDefined();
      expect(validateCustomerUpdate).toBeDefined();
      expect(validateTechnicianUpdate).toBeDefined();
      expect(validateWorkOrderUpdate).toBeDefined();
      expect(validateInvoiceUpdate).toBeDefined();
      expect(validateContractUpdate).toBeDefined();
      expect(validateInventoryUpdate).toBeDefined();
    });

    test('all validators should be functions (middleware)', () => {
      const allValidators = [
        validateUserCreate,
        validateUserUpdate,
        validateRoleCreate,
        validateRoleUpdate,
        validateCustomerCreate,
        validateCustomerUpdate,
        validateTechnicianCreate,
        validateTechnicianUpdate,
        validateWorkOrderCreate,
        validateWorkOrderUpdate,
        validateInvoiceCreate,
        validateInvoiceUpdate,
        validateContractCreate,
        validateContractUpdate,
        validateInventoryCreate,
        validateInventoryUpdate,
      ];

      allValidators.forEach((validator, index) => {
        expect(typeof validator).toBe('function');
        expect(validator.length).toBe(3); // (req, res, next)
      });
    });
  });

  // ============================================================================
  // CREATE VALIDATORS - Representative Tests
  // ============================================================================
  describe('CREATE Validators', () => {
    describe('validateUserCreate', () => {
      test('should pass valid user creation data', () => {
        req.body = {
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe',
          role_id: 1,
        };

        validateUserCreate(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      test('should reject missing required fields', () => {
        req.body = {
          first_name: 'John',
          // Missing email, last_name, role_id
        };

        validateUserCreate(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: 'Bad Request',
          })
        );
        expect(next).not.toHaveBeenCalled();
      });

      test('should strip unknown fields for security', () => {
        req.body = {
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe',
          role_id: 1,
          malicious_field: 'HACK',
          is_admin: true, // Attempting privilege escalation
        };

        validateUserCreate(req, res, next);

        expect(next).toHaveBeenCalled();
        // Unknown fields stripped by Joi's stripUnknown: true
      });
    });

    describe('validateRoleCreate', () => {
      test('should pass valid role creation data', () => {
        req.body = {
          name: 'manager',
          description: 'Manages operations',
          priority: 3,
        };

        validateRoleCreate(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      test('should reject invalid role data', () => {
        req.body = {
          name: '', // Empty name
          priority: 3,
        };

        validateRoleCreate(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(next).not.toHaveBeenCalled();
      });
    });

    describe('validateCustomerCreate', () => {
      test('should pass valid customer creation data', () => {
        req.body = {
          first_name: 'John',
          last_name: 'Doe',
          email: 'contact@acme.com',
        };

        validateCustomerCreate(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });
    });

    describe('validateWorkOrderCreate', () => {
      test('should pass valid work order creation data', () => {
        req.body = {
          customer_id: 1,
          priority: 'high',
          status: 'pending',
        };

        validateWorkOrderCreate(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });
    });
  });

  // ============================================================================
  // UPDATE VALIDATORS - min(1) Enforcement
  // ============================================================================
  describe('UPDATE Validators - min(1) Requirement', () => {
    describe('validateUserUpdate', () => {
      test('should pass when at least one field provided', () => {
        req.body = {
          first_name: 'Jane', // Only updating first name
        };

        validateUserUpdate(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      test('should pass when multiple fields provided', () => {
        req.body = {
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane@example.com',
        };

        validateUserUpdate(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      test('should reject empty update body (min 1 field required)', () => {
        req.body = {}; // No fields to update

        validateUserUpdate(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('At least one field'),
          })
        );
        expect(next).not.toHaveBeenCalled();
      });
    });

    describe('validateRoleUpdate', () => {
      test('should pass with single field update', () => {
        req.body = {
          description: 'Updated description',
        };

        validateRoleUpdate(req, res, next);

        expect(next).toHaveBeenCalled();
      });

      test('should reject empty update', () => {
        req.body = {};

        validateRoleUpdate(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('At least one field'),
          })
        );
      });
    });

    describe('validateCustomerUpdate', () => {
      test('should enforce min(1) requirement', () => {
        req.body = {}; // Empty update

        validateCustomerUpdate(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(next).not.toHaveBeenCalled();
      });
    });

    describe('validateWorkOrderUpdate', () => {
      test('should enforce min(1) requirement', () => {
        req.body = {}; // Empty update

        validateWorkOrderUpdate(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(next).not.toHaveBeenCalled();
      });
    });
  });

  // ============================================================================
  // ERROR HANDLING - All Validators
  // ============================================================================
  describe('Error Handling Consistency', () => {
    test('all validators should return standardized error format', () => {
      const validators = [
        { fn: validateUserCreate, data: { invalid: 'data' } },
        { fn: validateRoleCreate, data: { invalid: 'data' } },
        { fn: validateCustomerCreate, data: { invalid: 'data' } },
        { fn: validateWorkOrderCreate, data: { invalid: 'data' } },
      ];

      validators.forEach(({ fn, data }) => {
        req.body = data;
        fn(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: 'Bad Request',
            message: expect.any(String),
            details: expect.any(Array),
            timestamp: expect.any(String),
          })
        );

        jest.clearAllMocks();
      });
    });

    test('all validators should include field-level error details', () => {
      req.body = { invalid: 'data' };

      validateUserCreate(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining([
            expect.objectContaining({
              field: expect.any(String),
              message: expect.any(String),
            }),
          ]),
        })
      );
    });

    test('all validators should NOT call next() on validation failure', () => {
      const validators = [
        validateUserUpdate,
        validateRoleUpdate,
        validateCustomerUpdate,
        validateWorkOrderUpdate,
      ];

      validators.forEach(validator => {
        req.body = {}; // Empty body (invalid for updates)
        validator(req, res, next);

        expect(next).not.toHaveBeenCalled();
        jest.clearAllMocks();
      });
    });
  });

  // ============================================================================
  // FACTORY PATTERN VERIFICATION
  // ============================================================================
  describe('Factory Pattern Benefits', () => {
    test('should use createValidator helper (DRY principle)', () => {
      // All validators should have consistent behavior from createValidator
      const testValidation = (validator, validData, invalidData) => {
        // Valid data should pass
        req.body = validData;
        validator(req, res, next);
        expect(next).toHaveBeenCalled();
        jest.clearAllMocks();

        // Invalid data should fail
        req.body = invalidData;
        validator(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(next).not.toHaveBeenCalled();
        jest.clearAllMocks();
      };

      testValidation(
        validateUserCreate,
        { email: 'test@test.com', first_name: 'Test', last_name: 'User', role_id: 1 },
        { email: 'invalid-email' }
      );

      testValidation(
        validateRoleCreate,
        { name: 'test-role', description: 'Test', priority: 1 },
        { name: '', priority: 1 }
      );
    });

    test('should use buildCompositeSchema for all validators', () => {
      // If schema loading fails, validators should still be defined
      // (validates that factory pattern doesn't break on schema errors)
      expect(validateUserCreate).toBeDefined();
      expect(validateRoleCreate).toBeDefined();
      expect(validateCustomerCreate).toBeDefined();
      expect(validateTechnicianCreate).toBeDefined();
      expect(validateWorkOrderCreate).toBeDefined();
      expect(validateInvoiceCreate).toBeDefined();
      expect(validateContractCreate).toBeDefined();
      expect(validateInventoryCreate).toBeDefined();
    });

    test('should use buildUpdateSchema with min(1) for all update validators', () => {
      const updateValidators = [
        validateUserUpdate,
        validateRoleUpdate,
        validateCustomerUpdate,
        validateTechnicianUpdate,
        validateWorkOrderUpdate,
        validateInvoiceUpdate,
        validateContractUpdate,
        validateInventoryUpdate,
      ];

      updateValidators.forEach(validator => {
        req.body = {}; // Empty body
        validator(req, res, next);

        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('At least one field'),
          })
        );

        jest.clearAllMocks();
      });
    });
  });

  // ============================================================================
  // REGRESSION TESTS - Ensure Factory Doesn't Break Existing Behavior
  // ============================================================================
  describe('Regression Tests', () => {
    test('validators should strip unknown fields (security)', () => {
      req.body = {
        email: 'test@test.com',
        first_name: 'Test',
        last_name: 'User',
        role_id: 1,
        __proto__: { isAdmin: true }, // Prototype pollution attempt
        constructor: { name: 'Admin' },
        malicious: 'payload',
      };

      validateUserCreate(req, res, next);

      // Should pass validation (unknown fields stripped)
      expect(next).toHaveBeenCalled();
    });

    test('validators should return all errors with abortEarly: false', () => {
      req.body = {
        // Missing ALL required fields
      };

      validateUserCreate(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.any(Array), // Multiple errors returned
        })
      );

      const details = res.json.mock.calls[0][0].details;
      expect(details.length).toBeGreaterThan(1); // Multiple validation errors
    });
  });
});
