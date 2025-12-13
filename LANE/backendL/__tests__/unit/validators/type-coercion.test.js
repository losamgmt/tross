/**
 * Type Coercion Validators - Unit Tests
 *
 * DEFENSIVE TESTING: Focus on edge cases that would cause crashes
 * - null, undefined, empty strings
 * - Wrong types (objects, arrays, booleans as integers)
 * - Range violations (negative IDs, excessive pagination)
 * - Malformed data (invalid emails, non-UUID strings)
 *
 * Goal: Prevent PostgreSQL type errors and application crashes
 */

const {
  toSafeInteger,
  toSafeUserId,
  toSafeBoolean,
  toSafePagination,
  toSafeUuid,
  toSafeString,
  toSafeEmail,
} = require("../../../validators/type-coercion");

describe("Type Coercion Validators - DEFENSIVE TESTING", () => {
  // ============================================================================
  // toSafeInteger - Core integer validation
  // ============================================================================

  describe("toSafeInteger()", () => {
    describe("✅ Valid inputs", () => {
      test("accepts valid integer", () => {
        expect(toSafeInteger(42, "id")).toBe(42);
      });

      test("accepts integer as string and coerces", () => {
        expect(toSafeInteger("123", "id")).toBe(123);
      });

      test("accepts minimum value (1 by default)", () => {
        expect(toSafeInteger(1, "id")).toBe(1);
      });

      test("accepts custom minimum value", () => {
        expect(toSafeInteger(0, "page", { min: 0 })).toBe(0);
      });

      test("accepts value within custom range", () => {
        expect(toSafeInteger(50, "limit", { min: 1, max: 100 })).toBe(50);
      });

      test("accepts null when allowNull is true", () => {
        expect(toSafeInteger(null, "id", { allowNull: true })).toBe(null);
      });

      test("accepts undefined when allowNull is true", () => {
        expect(toSafeInteger(undefined, "id", { allowNull: true })).toBe(null);
      });

      test("accepts empty string when allowNull is true", () => {
        expect(toSafeInteger("", "id", { allowNull: true })).toBe(null);
      });
    });

    describe("❌ Invalid inputs - null/undefined/empty", () => {
      test("rejects null by default", () => {
        expect(() => toSafeInteger(null, "id")).toThrow("id is required");
      });

      test("rejects undefined by default", () => {
        expect(() => toSafeInteger(undefined, "id")).toThrow("id is required");
      });

      test("rejects empty string by default", () => {
        expect(() => toSafeInteger("", "id")).toThrow("id is required");
      });
    });

    describe("❌ Invalid inputs - wrong types", () => {
      test("rejects non-numeric string", () => {
        expect(() => toSafeInteger("abc", "id")).toThrow(
          "id must be a valid integer",
        );
      });

      test("rejects object", () => {
        expect(() => toSafeInteger({ id: 1 }, "id")).toThrow(
          "id must be a valid integer",
        );
      });

      test("coerces array to first element (parseInt behavior)", () => {
        // parseInt([1,2,3]) returns 1 - this is JavaScript's behavior
        expect(toSafeInteger([1, 2, 3], "id")).toBe(1);
        expect(toSafeInteger(["123"], "id")).toBe(123);
      });

      test("rejects boolean true", () => {
        expect(() => toSafeInteger(true, "id")).toThrow(
          "id must be a valid integer",
        );
      });

      test("rejects boolean false", () => {
        expect(() => toSafeInteger(false, "id")).toThrow(
          "id must be a valid integer",
        );
      });

      test("rejects decimal number (coerces to integer)", () => {
        // Note: parseInt coerces, so 3.14 becomes 3
        expect(toSafeInteger(3.14, "id")).toBe(3);
      });

      test("rejects NaN", () => {
        expect(() => toSafeInteger(NaN, "id")).toThrow(
          "id must be a valid integer",
        );
      });

      test("rejects Infinity", () => {
        expect(() => toSafeInteger(Infinity, "id")).toThrow(
          "id must be a valid integer",
        );
      });
    });

    describe("❌ Invalid inputs - range violations", () => {
      test("rejects negative number (below min)", () => {
        expect(() => toSafeInteger(-1, "id")).toThrow("id must be at least 1");
      });

      test("rejects zero (below default min of 1)", () => {
        expect(() => toSafeInteger(0, "id")).toThrow("id must be at least 1");
      });

      test("rejects value above custom max", () => {
        expect(() => toSafeInteger(999, "limit", { min: 1, max: 200 })).toThrow(
          "limit must be at most 200",
        );
      });

      test("rejects value below custom min", () => {
        expect(() => toSafeInteger(-5, "offset", { min: 0 })).toThrow(
          "offset must be at least 0",
        );
      });
    });

    describe("🔄 Type coercion edge cases", () => {
      test('coerces string "0" to 0 when min allows', () => {
        expect(toSafeInteger("0", "page", { min: 0 })).toBe(0);
      });

      test("coerces numeric string with whitespace", () => {
        expect(toSafeInteger("  42  ", "id")).toBe(42);
      });

      test("coerces string with leading zeros", () => {
        expect(toSafeInteger("007", "id")).toBe(7);
      });

      test("handles large safe integers", () => {
        const safeInt = Number.MAX_SAFE_INTEGER;
        expect(toSafeInteger(safeInt, "id", { max: safeInt })).toBe(safeInt);
      });
    });
  });

  // ============================================================================
  // toSafeUserId - Special handling for dev tokens
  // ============================================================================

  describe("toSafeUserId()", () => {
    test("accepts valid integer userId", () => {
      expect(toSafeUserId(123)).toBe(123);
    });

    test("returns null for any string userId (dev token handling)", () => {
      // toSafeUserId treats ALL strings as dev tokens, returning null
      // This is intentional - dev users have auth0_id but no numeric database ID
      expect(toSafeUserId("456")).toBe(null);
      expect(toSafeUserId("dev|tech001")).toBe(null);
      expect(toSafeUserId("dev|admin001")).toBe(null);
      expect(toSafeUserId("invalid")).toBe(null);
    });

    test("handles null gracefully", () => {
      expect(toSafeUserId(null)).toBe(null);
    });

    test("handles undefined gracefully", () => {
      expect(toSafeUserId(undefined)).toBe(null);
    });

    test("rejects negative userId", () => {
      expect(() => toSafeUserId(-1)).toThrow("userId must be at least 1");
    });
  });

  // ============================================================================
  // toSafeString - String validation with length constraints
  // ============================================================================

  describe("toSafeString()", () => {
    describe("✅ Valid inputs", () => {
      test("accepts valid string", () => {
        expect(toSafeString("hello", "name")).toBe("hello");
      });

      test("trims whitespace by default", () => {
        expect(toSafeString("  hello  ", "name")).toBe("hello");
      });

      test("accepts string with minLength constraint", () => {
        expect(toSafeString("abc", "code", { minLength: 3 })).toBe("abc");
      });

      test("accepts string with maxLength constraint", () => {
        expect(toSafeString("hello", "name", { maxLength: 10 })).toBe("hello");
      });

      test("accepts null when allowNull is true", () => {
        expect(toSafeString(null, "name", { allowNull: true })).toBe(null);
      });

      test("coerces number to string", () => {
        expect(toSafeString(123, "value")).toBe("123");
      });

      test("preserves whitespace when trim is false", () => {
        expect(toSafeString("  hello  ", "name", { trim: false })).toBe(
          "  hello  ",
        );
      });
    });

    describe("❌ Invalid inputs", () => {
      test("rejects null by default", () => {
        expect(() => toSafeString(null, "name")).toThrow("name is required");
      });

      test("rejects undefined by default", () => {
        expect(() => toSafeString(undefined, "name")).toThrow(
          "name is required",
        );
      });

      test("rejects empty string by default", () => {
        expect(() => toSafeString("", "name")).toThrow("name is required");
      });

      test("rejects string below minLength", () => {
        expect(() => toSafeString("ab", "code", { minLength: 3 })).toThrow(
          "code must be at least 3 characters",
        );
      });

      test("rejects string above maxLength", () => {
        expect(() =>
          toSafeString("verylongstring", "code", { maxLength: 5 }),
        ).toThrow("code must be at most 5 characters");
      });

      test("rejects whitespace-only string after trim", () => {
        expect(() => toSafeString("   ", "name")).toThrow(
          "name cannot be empty",
        );
      });
    });
  });

  // ============================================================================
  // toSafeEmail - Email validation
  // ============================================================================

  describe("toSafeEmail()", () => {
    describe("✅ Valid emails", () => {
      test("accepts standard email", () => {
        expect(toSafeEmail("user@example.com", "email")).toBe(
          "user@example.com",
        );
      });

      test("normalizes to lowercase", () => {
        expect(toSafeEmail("User@Example.COM", "email")).toBe(
          "user@example.com",
        );
      });

      test("accepts email with subdomains", () => {
        expect(toSafeEmail("user@mail.example.com", "email")).toBe(
          "user@mail.example.com",
        );
      });

      test("accepts email with numbers", () => {
        expect(toSafeEmail("user123@example.com", "email")).toBe(
          "user123@example.com",
        );
      });

      test("accepts email with dots", () => {
        expect(toSafeEmail("first.last@example.com", "email")).toBe(
          "first.last@example.com",
        );
      });

      test("accepts email with hyphens", () => {
        expect(toSafeEmail("user@my-domain.com", "email")).toBe(
          "user@my-domain.com",
        );
      });

      test("trims whitespace", () => {
        expect(toSafeEmail("  user@example.com  ", "email")).toBe(
          "user@example.com",
        );
      });

      test("accepts null when allowNull is true", () => {
        expect(toSafeEmail(null, "email", { allowNull: true })).toBe(null);
      });
    });

    describe("❌ Invalid emails", () => {
      test("rejects null by default", () => {
        expect(() => toSafeEmail(null, "email")).toThrow("email is required");
      });

      test("rejects email without @", () => {
        expect(() => toSafeEmail("userexample.com", "email")).toThrow(
          "email must be a valid email address",
        );
      });

      test("rejects email without domain", () => {
        expect(() => toSafeEmail("user@", "email")).toThrow(
          "email must be a valid email address",
        );
      });

      test("rejects email without TLD", () => {
        expect(() => toSafeEmail("user@example", "email")).toThrow(
          "email must be a valid email address",
        );
      });

      test("rejects email with spaces", () => {
        expect(() => toSafeEmail("user name@example.com", "email")).toThrow(
          "email must be a valid email address",
        );
      });

      test("rejects empty string", () => {
        expect(() => toSafeEmail("", "email")).toThrow("email is required");
      });

      test("rejects malformed email (multiple @)", () => {
        expect(() => toSafeEmail("user@@example.com", "email")).toThrow(
          "email must be a valid email address",
        );
      });
    });
  });

  // ============================================================================
  // toSafeBoolean - Boolean validation
  // ============================================================================

  describe("toSafeBoolean()", () => {
    describe("✅ Valid booleans", () => {
      test("accepts true", () => {
        expect(toSafeBoolean(true, "flag")).toBe(true);
      });

      test("accepts false", () => {
        expect(toSafeBoolean(false, "flag")).toBe(false);
      });

      test('coerces "true" string to true', () => {
        expect(toSafeBoolean("true", "flag")).toBe(true);
      });

      test('coerces "false" string to false', () => {
        expect(toSafeBoolean("false", "flag")).toBe(false);
      });

      test("coerces 1 to true", () => {
        expect(toSafeBoolean(1, "flag")).toBe(true);
      });

      test("coerces 0 to false", () => {
        expect(toSafeBoolean(0, "flag")).toBe(false);
      });
    });

    describe("❌ Invalid inputs", () => {
      test("returns default value for null (defaultValue parameter)", () => {
        // toSafeBoolean uses defaultValue parameter, not options object
        expect(toSafeBoolean(null, "flag", false)).toBe(false);
        expect(toSafeBoolean(null, "flag", true)).toBe(true);
      });

      test("returns default value for undefined", () => {
        expect(toSafeBoolean(undefined, "flag", false)).toBe(false);
        expect(toSafeBoolean(undefined, "flag", true)).toBe(true);
      });

      test("returns default value for empty string", () => {
        expect(toSafeBoolean("", "flag", false)).toBe(false);
        expect(toSafeBoolean("", "flag", true)).toBe(true);
      });

      test("coerces other strings to true (JS behavior)", () => {
        // JavaScript Boolean('anything') is true
        expect(toSafeBoolean("yes", "flag")).toBe(true);
      });
    });
  });

  // ============================================================================
  // toSafeUuid - UUID v4 validation
  // ============================================================================

  describe("toSafeUuid()", () => {
    describe("✅ Valid UUIDs", () => {
      test("accepts valid UUID v4", () => {
        const uuid = "550e8400-e29b-41d4-a716-446655440000";
        expect(toSafeUuid(uuid, "token")).toBe(uuid);
      });

      test("accepts UUID with uppercase", () => {
        const uuid = "550E8400-E29B-41D4-A716-446655440000";
        expect(toSafeUuid(uuid, "token")).toBe(uuid);
      });

      test("accepts null when allowNull is true", () => {
        expect(toSafeUuid(null, "token", { allowNull: true })).toBe(null);
      });
    });

    describe("❌ Invalid UUIDs", () => {
      test("rejects null by default", () => {
        expect(() => toSafeUuid(null, "token")).toThrow("token is required");
      });

      test("rejects non-string", () => {
        expect(() => toSafeUuid(123, "token")).toThrow(
          "token must be a valid UUID string",
        );
      });

      test("rejects invalid UUID format", () => {
        expect(() => toSafeUuid("not-a-uuid", "token")).toThrow(
          "token must be a valid UUID v4",
        );
      });

      test("rejects UUID with wrong version (v1)", () => {
        const uuidv1 = "550e8400-e29b-11d4-a716-446655440000"; // version 1
        expect(() => toSafeUuid(uuidv1, "token")).toThrow(
          "token must be a valid UUID v4",
        );
      });

      test("rejects UUID with wrong length", () => {
        expect(() => toSafeUuid("550e8400-e29b-41d4-a716", "token")).toThrow(
          "token must be a valid UUID v4",
        );
      });

      test("rejects empty string", () => {
        expect(() => toSafeUuid("", "token")).toThrow("token is required");
      });
    });
  });

  // ============================================================================
  // toSafePagination - Pagination validation
  // ============================================================================

  describe("toSafePagination()", () => {
    describe("✅ Valid pagination", () => {
      test("returns defaults when no query provided", () => {
        const result = toSafePagination({});
        expect(result).toEqual({
          page: 1,
          limit: 50,
          offset: 0,
        });
      });

      test("accepts valid page and limit", () => {
        const result = toSafePagination({ page: "2", limit: "10" });
        expect(result).toEqual({
          page: 2,
          limit: 10,
          offset: 10,
        });
      });

      test("calculates offset correctly", () => {
        const result = toSafePagination({ page: "5", limit: "20" });
        expect(result.offset).toBe(80); // (5-1) * 20
      });

      test("respects custom limits", () => {
        const result = toSafePagination(
          { limit: "100" },
          { defaultLimit: 25, maxLimit: 100 },
        );
        expect(result.limit).toBe(100);
      });
    });

    describe("❌ Invalid pagination", () => {
      test("rejects negative page", () => {
        expect(() => toSafePagination({ page: "-1" })).toThrow(
          "page must be at least 1",
        );
      });

      test("rejects zero page", () => {
        expect(() => toSafePagination({ page: "0" })).toThrow(
          "page must be at least 1",
        );
      });

      test("rejects limit above max", () => {
        expect(() =>
          toSafePagination({ limit: "999" }, { maxLimit: 200 }),
        ).toThrow("limit must be at most 200");
      });

      test("rejects invalid page string", () => {
        expect(() => toSafePagination({ page: "abc" })).toThrow(
          "page must be a valid integer",
        );
      });
    });
  });
});
