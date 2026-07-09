/**
 * Unit Tests: deriveEnumColumnLength (enum → VARCHAR sizing + ENUM_MAX_LENGTH cap)
 */

const {
  deriveEnumColumnLength,
  ENUM_MAX_LENGTH,
} = require('../../../config/field-types');

describe('deriveEnumColumnLength', () => {
  test('sizes from the longest value with head-room', () => {
    // maxLen = max(7, 11, 10) = 11 → ceil(11 * 1.5) + 10 = 17 + 10 = 27
    expect(deriveEnumColumnLength(['pending', 'in_progress'])).toBe(27);
  });

  test('applies a floor of 10 for short values', () => {
    // maxLen = max(1, 1, 10) = 10 → ceil(15) + 10 = 25
    expect(deriveEnumColumnLength(['a', 'b'])).toBe(25);
  });

  test('handles an empty value list via the floor', () => {
    expect(deriveEnumColumnLength([])).toBe(25);
  });

  test('accepts a value right at the cap boundary', () => {
    // L = 36 → ceil(54) + 10 = 64 === ENUM_MAX_LENGTH (allowed)
    const atBoundary = 'x'.repeat(36);
    expect(deriveEnumColumnLength([atBoundary])).toBe(ENUM_MAX_LENGTH);
  });

  test('throws when the derived width exceeds ENUM_MAX_LENGTH', () => {
    // L = 37 → ceil(55.5)=56 + 10 = 66 > 64
    const tooLong = 'x'.repeat(37);
    expect(() => deriveEnumColumnLength([tooLong])).toThrow(/ENUM_MAX_LENGTH/);
  });
});
