/**
 * Unit Tests for validators/preferences-validators.js
 *
 * 100% METADATA-DRIVEN - No hardcoded preference field names.
 * Tests discover fields from PREFERENCE_SCHEMA and generate test cases dynamically.
 *
 * Follows AAA pattern (Arrange, Act, Assert).
 *
 * Test Coverage:
 * - validatePreferencesUpdate - batch update validation
 * - validateSinglePreferenceUpdate - single key update validation
 * - All preference types: enum, boolean, string, integer
 */

const {
  validatePreferencesUpdate,
  validateSinglePreferenceUpdate,
} = require('../../../validators/preferences-validators');

const { PREFERENCE_SCHEMA } = require('../../../services/preferences-service');

// Use shared field introspection from the factory
const {
  findFieldByType: factoryFindFieldByType,
  findAllFieldsByType,
  generateInvalidValue: factoryGenerateInvalidValue,
  getEntityFields,
} = require('../../factory/data/entity-factory');

// Mock ResponseFormatter
jest.mock('../../../utils/response-formatter', () => ({
  badRequest: jest.fn((res, message, details) => {
    res.status(400).json({ status: 'error', message, details });
  }),
}));

const ResponseFormatter = require('../../../utils/response-formatter');

// =============================================================================
// METADATA-DRIVEN TEST HELPERS
// Uses shared factory functions with PREFERENCE_SCHEMA
// =============================================================================

/**
 * Find first preference field of a specific type
 * Wraps the shared factory function with our local schema
 * @param {string} type - 'enum', 'boolean', 'string', 'integer'
 * @returns {{ key: string, def: object } | null}
 */
function findFieldByType(type) {
  const result = factoryFindFieldByType(null, type, PREFERENCE_SCHEMA);
  if (!result) return null;
  const [key, def] = result;
  return { key, def };
}

/**
 * Find first integer field with min/max constraints
 * @returns {{ key: string, def: object } | null}
 */
function findIntegerFieldWithBounds() {
  const intFields = findAllFieldsByType(null, 'integer', PREFERENCE_SCHEMA);
  for (const [key, def] of intFields) {
    if (def.min !== undefined && def.max !== undefined) {
      return { key, def };
    }
  }
  return null;
}

/**
 * Generate a valid value for a preference field based on its type
 * @param {object} def - Preference field definition
 * @returns {any} A valid value for this field type
 */
function generateValidValue(def) {
  switch (def.type) {
    case 'enum':
      return def.values[0]; // First valid enum value
    case 'boolean':
      return true;
    case 'string':
      return 'valid-string';
    case 'integer':
      return def.default ?? def.min ?? 0;
    default:
      return 'unknown';
  }
}

/**
 * Generate an invalid value for a preference field based on its type
 * Wraps the shared factory function
 * @param {object} def - Preference field definition
 * @param {string} fieldName - Field name for context
 * @returns {any} An invalid value for this field type
 */
function generateInvalidValue(def, fieldName = 'field') {
  // Use the shared factory's generateInvalidValue with schema override
  return factoryGenerateInvalidValue(fieldName, null, { [fieldName]: def });
}

/**
 * Build a valid preferences object with one field of each type that exists
 */
function buildValidPreferencesObject() {
  const prefs = {};
  const usedTypes = new Set();

  for (const [key, def] of Object.entries(PREFERENCE_SCHEMA)) {
    if (!usedTypes.has(def.type)) {
      prefs[key] = generateValidValue(def);
      usedTypes.add(def.type);
    }
  }

  return prefs;
}

/**
 * Get all preference keys
 */
function getAllPreferenceKeys() {
  return Object.keys(PREFERENCE_SCHEMA);
}

// =============================================================================
// TESTS
// =============================================================================

describe('validators/preferences-validators.js', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      body: {},
      params: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  // ===========================================================================
  // SCHEMA SANITY CHECKS
  // ===========================================================================

  describe('PREFERENCE_SCHEMA availability', () => {
    test('schema should be loaded and non-empty', () => {
      expect(PREFERENCE_SCHEMA).toBeDefined();
      expect(Object.keys(PREFERENCE_SCHEMA).length).toBeGreaterThan(0);
    });

    test('all schema entries should have a type', () => {
      for (const [key, def] of Object.entries(PREFERENCE_SCHEMA)) {
        expect(def.type).toBeDefined();
        expect(['enum', 'boolean', 'string', 'integer']).toContain(def.type);
      }
    });
  });

  // ===========================================================================
  // validatePreferencesUpdate - BATCH VALIDATION
  // ===========================================================================

  describe('validatePreferencesUpdate', () => {
    test('should pass valid preferences object to next()', () => {
      mockReq.body = buildValidPreferencesObject();

      validatePreferencesUpdate(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(ResponseFormatter.badRequest).not.toHaveBeenCalled();
    });

    test('should reject empty object (min 1 preference required)', () => {
      mockReq.body = {};

      validatePreferencesUpdate(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(ResponseFormatter.badRequest).toHaveBeenCalledWith(
        mockRes,
        expect.stringContaining('At least one preference must be provided'),
        expect.any(Array),
      );
    });

    test('should reject unknown preference keys', () => {
      const firstKey = getAllPreferenceKeys()[0];
      mockReq.body = {
        unknownPrefXYZ123: 'value',
        [firstKey]: generateValidValue(PREFERENCE_SCHEMA[firstKey]),
      };

      validatePreferencesUpdate(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(ResponseFormatter.badRequest).toHaveBeenCalled();
    });

    // Dynamic tests for each preference field
    describe.each(getAllPreferenceKeys())('field: %s', (key) => {
      const def = PREFERENCE_SCHEMA[key];

      test(`should accept valid ${def.type} value`, () => {
        mockReq.body = { [key]: generateValidValue(def) };

        validatePreferencesUpdate(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      test(`should reject invalid value for ${def.type} type`, () => {
        const invalidValue = generateInvalidValue(def);
        // Skip if we can't generate an invalid value for this type
        if (invalidValue === null) return;

        mockReq.body = { [key]: invalidValue };

        validatePreferencesUpdate(mockReq, mockRes, mockNext);

        expect(mockNext).not.toHaveBeenCalled();
        expect(ResponseFormatter.badRequest).toHaveBeenCalled();
      });
    });
  });

  // ===========================================================================
  // validateSinglePreferenceUpdate - SINGLE KEY VALIDATION
  // ===========================================================================

  describe('validateSinglePreferenceUpdate', () => {
    test('should reject unknown preference key', () => {
      mockReq.params = { key: 'unknownKeyXYZ' };
      mockReq.body = { value: 'anything' };

      validateSinglePreferenceUpdate(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(ResponseFormatter.badRequest).toHaveBeenCalledWith(
        mockRes,
        expect.stringContaining('Unknown preference key'),
        expect.any(Array),
      );
    });

    test('should reject missing value in body', () => {
      const firstKey = getAllPreferenceKeys()[0];
      mockReq.params = { key: firstKey };
      mockReq.body = {}; // No value

      validateSinglePreferenceUpdate(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(ResponseFormatter.badRequest).toHaveBeenCalledWith(
        mockRes,
        'Value is required',
        expect.any(Array),
      );
    });

    // Dynamic tests for each preference field
    describe.each(getAllPreferenceKeys())('field: %s', (key) => {
      const def = PREFERENCE_SCHEMA[key];

      test(`should accept valid ${def.type} value`, () => {
        mockReq.params = { key };
        mockReq.body = { value: generateValidValue(def) };

        validateSinglePreferenceUpdate(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      test(`should reject invalid value for ${def.type} type`, () => {
        const invalidValue = generateInvalidValue(def);
        // Skip if we can't generate an invalid value for this type
        if (invalidValue === null) return;

        mockReq.params = { key };
        mockReq.body = { value: invalidValue };

        validateSinglePreferenceUpdate(mockReq, mockRes, mockNext);

        expect(mockNext).not.toHaveBeenCalled();
        expect(ResponseFormatter.badRequest).toHaveBeenCalled();
      });
    });
  });

  // ===========================================================================
  // TYPE-SPECIFIC BOUNDARY TESTS
  // ===========================================================================

  describe('Type-specific validation (metadata-driven)', () => {
    describe('enum type validation', () => {
      const enumField = findFieldByType('enum');

      // Skip if no enum fields exist
      if (!enumField) {
        test.skip('no enum fields in schema', () => {});
      } else {
        test(`should accept all valid enum values for ${enumField.key}`, () => {
          enumField.def.values.forEach((value) => {
            jest.clearAllMocks();
            mockReq.body = { [enumField.key]: value };

            validatePreferencesUpdate(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
          });
        });

        test(`should reject invalid enum value for ${enumField.key}`, () => {
          mockReq.body = { [enumField.key]: 'invalid-enum-xyz' };

          validatePreferencesUpdate(mockReq, mockRes, mockNext);

          expect(mockNext).not.toHaveBeenCalled();
          expect(ResponseFormatter.badRequest).toHaveBeenCalledWith(
            mockRes,
            expect.stringContaining(`${enumField.key} must be one of`),
            expect.any(Array),
          );
        });
      }
    });

    describe('boolean type validation', () => {
      const boolField = findFieldByType('boolean');

      if (!boolField) {
        test.skip('no boolean fields in schema', () => {});
      } else {
        test(`should accept true and false for ${boolField.key}`, () => {
          [true, false].forEach((value) => {
            jest.clearAllMocks();
            mockReq.body = { [boolField.key]: value };

            validatePreferencesUpdate(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
          });
        });

        test(`should reject non-boolean for ${boolField.key}`, () => {
          mockReq.body = { [boolField.key]: 'yes' };

          validatePreferencesUpdate(mockReq, mockRes, mockNext);

          expect(mockNext).not.toHaveBeenCalled();
          expect(ResponseFormatter.badRequest).toHaveBeenCalledWith(
            mockRes,
            expect.stringContaining(`${boolField.key} must be a boolean`),
            expect.any(Array),
          );
        });
      }
    });

    describe('integer type with boundaries', () => {
      const intField = findIntegerFieldWithBounds();

      if (!intField) {
        test.skip('no integer fields with min/max in schema', () => {});
      } else {
        test(`should accept value at min boundary (${intField.def.min}) for ${intField.key}`, () => {
          mockReq.body = { [intField.key]: intField.def.min };

          validatePreferencesUpdate(mockReq, mockRes, mockNext);

          expect(mockNext).toHaveBeenCalled();
        });

        test(`should accept value at max boundary (${intField.def.max}) for ${intField.key}`, () => {
          mockReq.body = { [intField.key]: intField.def.max };

          validatePreferencesUpdate(mockReq, mockRes, mockNext);

          expect(mockNext).toHaveBeenCalled();
        });

        test(`should accept value in middle of range for ${intField.key}`, () => {
          const midValue = Math.floor((intField.def.min + intField.def.max) / 2);
          mockReq.body = { [intField.key]: midValue };

          validatePreferencesUpdate(mockReq, mockRes, mockNext);

          expect(mockNext).toHaveBeenCalled();
        });

        test(`should reject value below min for ${intField.key}`, () => {
          mockReq.body = { [intField.key]: intField.def.min - 1 };

          validatePreferencesUpdate(mockReq, mockRes, mockNext);

          expect(mockNext).not.toHaveBeenCalled();
          expect(ResponseFormatter.badRequest).toHaveBeenCalled();
        });

        test(`should reject value above max for ${intField.key}`, () => {
          mockReq.body = { [intField.key]: intField.def.max + 1 };

          validatePreferencesUpdate(mockReq, mockRes, mockNext);

          expect(mockNext).not.toHaveBeenCalled();
          expect(ResponseFormatter.badRequest).toHaveBeenCalled();
        });

        test(`should reject non-integer for ${intField.key}`, () => {
          mockReq.body = { [intField.key]: 'not-a-number' };

          validatePreferencesUpdate(mockReq, mockRes, mockNext);

          expect(mockNext).not.toHaveBeenCalled();
          expect(ResponseFormatter.badRequest).toHaveBeenCalled();
        });
      }
    });
  });
});
