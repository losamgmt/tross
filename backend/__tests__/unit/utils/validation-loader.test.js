/**
 * Unit Tests for utils/validation-loader.js
 *
 * DERIVED TESTS: Tests are derived FROM the TYPE_BUILDERS registry and FIELD definitions.
 * When you add a new type to TYPE_BUILDERS, tests automatically cover it.
 * No hardcoded type lists - everything flows from the SSOT.
 */

const {
  loadValidationRules,
  buildFieldSchema,
  getValidationMetadata,
  clearValidationCache,
  // Registry exports for derived testing
  TYPE_BUILDERS,
  STRING_TYPES,
  NUMERIC_TYPES,
} = require('../../../utils/validation-loader');

// FIELD definitions - the SSOT for field standards
const { FIELD } = require('../../../config/field-type-standards');

// Also need to clear the deriver's cache for proper isolation
const { clearCache: clearDeriverCache } = require('../../../config/validation-deriver');

// =============================================================================
// TEST DATA DERIVED FROM REGISTRIES
// =============================================================================

/**
 * Valid test values for each type in TYPE_BUILDERS.
 * When adding a new type, add its valid test value here.
 */
const VALID_VALUES_BY_TYPE = {
  string: 'hello',
  text: 'Long form text content here',
  email: 'test@example.com',
  phone: '+12025551234',
  url: 'https://example.com',
  time: '09:30',
  integer: 42,
  decimal: 99.99,
  currency: 199.99,
  boolean: true,
  object: { key: 'value' },
  date: '2026-01-23', // Date only
  timestamp: '2026-01-23T14:30:00Z', // Full ISO datetime
  enum: 'value1', // Will be used with { type: 'enum', values: ['value1', 'value2'] }
};

/**
 * Invalid test values for each type in TYPE_BUILDERS.
 */
const INVALID_VALUES_BY_TYPE = {
  string: 123, // number, not string
  text: 123,
  email: 'notanemail',
  phone: '(202) 555-1234', // Not E.164 format
  url: 'ftp://example.com', // Not http/https
  time: '24:00', // Invalid hour
  integer: 3.14, // Not whole number
  decimal: 'not a number',
  currency: 'not a currency', // Currency must be a number
  boolean: 12345, // Number - Joi converts strings/0/1 to boolean, but not random numbers
  object: 'not an object',
  date: 'not-a-date',
  timestamp: 'not-a-timestamp',
  enum: 'invalid_value', // Not in enum list
};

/**
 * Types that have format constraints beyond just string length.
 * These types validate format BEFORE length, so plain string length tests are inappropriate.
 */
const FORMAT_CONSTRAINED_TYPES = new Set(['email', 'phone', 'url', 'time']);

// =============================================================================
// TESTS
// =============================================================================

describe('utils/validation-loader.js', () => {
  beforeEach(() => {
    clearValidationCache();
    clearDeriverCache();
  });

  // ===========================================================================
  // Core API Functions
  // ===========================================================================

  describe('loadValidationRules()', () => {
    it('should return derived validation rules', () => {
      const rules = loadValidationRules();
      
      expect(rules).toBeDefined();
      expect(rules.fields).toBeDefined();
      expect(rules.entityFields).toBeDefined();
      expect(rules.compositeValidations).toBeDefined();
    });

    it('should cache rules on subsequent calls', () => {
      const rules1 = loadValidationRules();
      const rules2 = loadValidationRules();
      
      expect(rules1).toBe(rules2);
    });
  });

  describe('clearValidationCache()', () => {
    it('should allow cache to be cleared without error', () => {
      loadValidationRules();
      expect(() => clearValidationCache()).not.toThrow();
    });

    it('should be idempotent', () => {
      expect(() => {
        clearValidationCache();
        clearValidationCache();
      }).not.toThrow();
    });
  });

  describe('getValidationMetadata()', () => {
    it('should return metadata about validation rules', () => {
      const metadata = getValidationMetadata();
      
      expect(metadata).toHaveProperty('version');
      expect(metadata).toHaveProperty('policy');
      expect(metadata).toHaveProperty('fields');
      expect(metadata).toHaveProperty('operations');
    });
  });

  // ===========================================================================
  // TYPE_BUILDERS Registry - Derived Tests
  // ===========================================================================

  describe('TYPE_BUILDERS registry', () => {
    const allTypes = Object.keys(TYPE_BUILDERS);

    it('should have builders for all expected types', () => {
      // This test documents what types exist - update if intentionally changed
      expect(allTypes.length).toBeGreaterThanOrEqual(10);
    });

    // Generate a test for each type in the registry
    describe.each(allTypes)('type: %s', (typeName) => {
      it('should have a valid test value defined', () => {
        expect(VALID_VALUES_BY_TYPE[typeName]).toBeDefined();
      });

      it('should build a schema that accepts valid values', () => {
        const fieldDef = typeName === 'enum' 
          ? { type: 'enum', values: ['value1', 'value2'] }
          : { type: typeName };
        
        const schema = buildFieldSchema(fieldDef, `test_${typeName}`);
        const result = schema.validate(VALID_VALUES_BY_TYPE[typeName]);
        
        expect(result.error).toBeUndefined();
      });

      it('should build a schema that rejects invalid values', () => {
        // Skip types that are very permissive or have special coercion
        if (typeName === 'object') return; // object accepts many things
        if (typeName === 'boolean') return; // Joi boolean is very permissive with coercion
        
        const fieldDef = typeName === 'enum'
          ? { type: 'enum', values: ['value1', 'value2'] }
          : { type: typeName };
        
        const schema = buildFieldSchema(fieldDef, `test_${typeName}`);
        const result = schema.validate(INVALID_VALUES_BY_TYPE[typeName]);
        
        expect(result.error).toBeDefined();
      });
    });

    it('should throw for unsupported type', () => {
      expect(() => {
        buildFieldSchema({ type: 'nonexistent_type' }, 'field');
      }).toThrow(/Unsupported field type/);
    });
  });

  // ===========================================================================
  // STRING_TYPES - Modifier Tests (for unconstrained string types)
  // ===========================================================================

  describe('STRING_TYPES modifiers', () => {
    // Only test length modifiers on types that don't have format constraints
    const lengthTestableTypes = Array.from(STRING_TYPES).filter(
      (t) => !FORMAT_CONSTRAINED_TYPES.has(t)
    );

    describe.each(lengthTestableTypes)('type: %s', (typeName) => {
      it('should apply maxLength modifier', () => {
        const fieldDef = { type: typeName, maxLength: 5 };
        const schema = buildFieldSchema(fieldDef, 'test');
        
        expect(schema.validate('hello').error).toBeUndefined();
        expect(schema.validate('toolong').error).toBeDefined();
      });

      it('should apply minLength modifier', () => {
        const fieldDef = { type: typeName, minLength: 3 };
        const schema = buildFieldSchema(fieldDef, 'test');
        
        expect(schema.validate('abc').error).toBeUndefined();
        expect(schema.validate('ab').error).toBeDefined();
      });
    });

    // Format-constrained types still accept maxLength - test with valid format
    describe('format-constrained types accept maxLength', () => {
      it('email: rejects when over maxLength', () => {
        const schema = buildFieldSchema({ type: 'email', maxLength: 20 }, 'email');
        // Long but valid email format
        const result = schema.validate('verylongemail@example.com');
        expect(result.error).toBeDefined();
        expect(result.error.message).toContain('length');
      });

      it('url: rejects when over maxLength', () => {
        const schema = buildFieldSchema({ type: 'url', maxLength: 25 }, 'url');
        const result = schema.validate('https://example.com/very-long-path');
        expect(result.error).toBeDefined();
        expect(result.error.message).toContain('length');
      });
    });
  });

  // ===========================================================================
  // NUMERIC_TYPES - Modifier Tests
  // ===========================================================================

  describe('NUMERIC_TYPES modifiers', () => {
    const numericTypesList = Array.from(NUMERIC_TYPES);

    describe.each(numericTypesList)('type: %s', (typeName) => {
      it('should apply min modifier', () => {
        const fieldDef = { type: typeName, min: 10 };
        const schema = buildFieldSchema(fieldDef, 'test');
        
        expect(schema.validate(10).error).toBeUndefined();
        expect(schema.validate(9).error).toBeDefined();
      });

      it('should apply max modifier', () => {
        const fieldDef = { type: typeName, max: 100 };
        const schema = buildFieldSchema(fieldDef, 'test');
        
        expect(schema.validate(100).error).toBeUndefined();
        expect(schema.validate(101).error).toBeDefined();
      });
    });
  });

  // ===========================================================================
  // Common Modifiers
  // ===========================================================================

  describe('common modifiers', () => {
    it('should apply required modifier', () => {
      const schema = buildFieldSchema({ type: 'string', required: true }, 'name');
      
      expect(schema.validate(undefined).error).toBeDefined();
      expect(schema.validate('value').error).toBeUndefined();
    });

    it('should be optional by default', () => {
      const schema = buildFieldSchema({ type: 'string' }, 'name');
      
      expect(schema.validate(undefined).error).toBeUndefined();
    });

    it('should apply custom error messages', () => {
      const schema = buildFieldSchema({
        type: 'string',
        required: true,
        errorMessages: { required: 'Custom required message' },
      }, 'name');
      
      const result = schema.validate(undefined);
      expect(result.error.message).toContain('Custom required message');
    });
  });

  // ===========================================================================
  // FIELD.* Definitions Integration
  // ===========================================================================

  describe('FIELD definitions integration', () => {
    // Get all FIELD entries
    const fieldEntries = Object.entries(FIELD);

    describe.each(fieldEntries)('FIELD.%s', (fieldName, fieldDef) => {
      it('should produce a valid schema', () => {
        expect(() => buildFieldSchema(fieldDef, fieldName)).not.toThrow();
      });

      it('should have its type registered in TYPE_BUILDERS', () => {
        expect(TYPE_BUILDERS[fieldDef.type]).toBeDefined();
      });
    });

    // Test maxLength enforcement for fields that have it
    const fieldsWithMaxLength = fieldEntries.filter(([_, def]) => def.maxLength !== undefined);

    describe.each(fieldsWithMaxLength)('FIELD.%s maxLength enforcement', (fieldName, fieldDef) => {
      it(`should enforce maxLength of ${fieldDef.maxLength}`, () => {
        const schema = buildFieldSchema(fieldDef, fieldName);
        const overLengthValue = 'A'.repeat(fieldDef.maxLength + 1);
        const result = schema.validate(overLengthValue);
        
        expect(result.error).toBeDefined();
      });
    });
  });
});
