/**
 * Data Hygiene Tests
 *
 * Focus: Branch coverage for all type handling and edge cases
 */

const {
  sanitizeValue,
  sanitizeData,
  trimAllStrings,
  isEmpty,
} = require("../../../utils/data-hygiene");

describe("data-hygiene", () => {
  describe("sanitizeValue", () => {
    describe("null/undefined handling", () => {
      it("passes null through unchanged", () => {
        expect(sanitizeValue(null, { type: "string" })).toBeNull();
      });

      it("passes undefined through unchanged", () => {
        expect(sanitizeValue(undefined, { type: "string" })).toBeUndefined();
      });
    });

    describe("no field definition", () => {
      it("passes through when fieldDef is null", () => {
        expect(sanitizeValue("test", null)).toBe("test");
      });

      it("passes through when fieldDef is undefined", () => {
        expect(sanitizeValue("test", undefined)).toBe("test");
      });

      it("passes through when fieldDef has no type", () => {
        expect(sanitizeValue("test", {})).toBe("test");
      });
    });

    describe("string type", () => {
      it("trims string values", () => {
        expect(sanitizeValue("  hello  ", { type: "string" })).toBe("hello");
      });

      it("handles non-string for string type (number)", () => {
        expect(sanitizeValue(123, { type: "string" })).toBe(123);
      });

      it("handles empty string", () => {
        expect(sanitizeValue("", { type: "string" })).toBe("");
      });

      it("preserves case for strings", () => {
        expect(sanitizeValue("  HeLLo  ", { type: "string" })).toBe("HeLLo");
      });
    });

    describe("enum type", () => {
      it("lowercases and trims enum values", () => {
        expect(sanitizeValue("  ACTIVE  ", { type: "enum" })).toBe("active");
      });

      it("handles non-string for enum type", () => {
        expect(sanitizeValue(123, { type: "enum" })).toBe(123);
      });
    });

    describe("email type", () => {
      it("lowercases and trims email values", () => {
        expect(sanitizeValue("  TEST@EXAMPLE.COM  ", { type: "email" })).toBe(
          "test@example.com",
        );
      });

      it("handles non-string for email type", () => {
        expect(sanitizeValue(123, { type: "email" })).toBe(123);
      });
    });

    describe("phone type", () => {
      it("trims phone values but preserves formatting", () => {
        expect(sanitizeValue("  (123) 456-7890  ", { type: "phone" })).toBe(
          "(123) 456-7890",
        );
      });

      it("handles non-string for phone type", () => {
        expect(sanitizeValue(1234567890, { type: "phone" })).toBe(1234567890);
      });
    });

    describe("pass-through types", () => {
      it("passes integer through unchanged", () => {
        expect(sanitizeValue(42, { type: "integer" })).toBe(42);
      });

      it("passes decimal through unchanged", () => {
        expect(sanitizeValue(3.14, { type: "decimal" })).toBe(3.14);
      });

      it("passes boolean through unchanged", () => {
        expect(sanitizeValue(true, { type: "boolean" })).toBe(true);
        expect(sanitizeValue(false, { type: "boolean" })).toBe(false);
      });

      it("passes timestamp through unchanged", () => {
        const date = new Date();
        expect(sanitizeValue(date, { type: "timestamp" })).toBe(date);
      });

      it("passes json through unchanged", () => {
        const obj = { key: "value" };
        expect(sanitizeValue(obj, { type: "json" })).toBe(obj);
      });

      it("passes jsonb through unchanged", () => {
        const obj = { key: "value" };
        expect(sanitizeValue(obj, { type: "jsonb" })).toBe(obj);
      });
    });

    describe("unknown type", () => {
      it("passes unknown types through unchanged", () => {
        expect(sanitizeValue("test", { type: "unknown_custom_type" })).toBe(
          "test",
        );
      });
    });
  });

  describe("sanitizeData", () => {
    it("returns null/undefined as-is", () => {
      expect(sanitizeData(null, {})).toBeNull();
      expect(sanitizeData(undefined, {})).toBeUndefined();
    });

    it("returns arrays as-is", () => {
      const arr = [1, 2, 3];
      expect(sanitizeData(arr, {})).toBe(arr);
    });

    it("returns non-objects as-is", () => {
      expect(sanitizeData("string", {})).toBe("string");
      expect(sanitizeData(123, {})).toBe(123);
    });

    it("trims all strings when no metadata", () => {
      const data = { name: "  test  ", count: 5 };
      const result = sanitizeData(data, null);
      expect(result.name).toBe("test");
      expect(result.count).toBe(5);
    });

    it("trims all strings when no fields in metadata", () => {
      const data = { name: "  test  " };
      const result = sanitizeData(data, {});
      expect(result.name).toBe("test");
    });

    it("sanitizes based on field types from metadata", () => {
      const data = {
        email: "  TEST@EXAMPLE.COM  ",
        status: "  ACTIVE  ",
        name: "  John Doe  ",
      };
      const metadata = {
        fields: {
          email: { type: "email" },
          status: { type: "enum" },
          name: { type: "string" },
        },
      };
      const result = sanitizeData(data, metadata);

      expect(result.email).toBe("test@example.com");
      expect(result.status).toBe("active");
      expect(result.name).toBe("John Doe");
    });

    it("handles fields not in metadata", () => {
      const data = { unknown: "  value  ", known: "  test  " };
      const metadata = {
        fields: {
          known: { type: "string" },
        },
      };
      const result = sanitizeData(data, metadata);

      expect(result.known).toBe("test");
      expect(result.unknown).toBe("  value  "); // No type, passes through
    });
  });

  describe("trimAllStrings", () => {
    it("returns null/undefined as-is", () => {
      expect(trimAllStrings(null)).toBeNull();
      expect(trimAllStrings(undefined)).toBeUndefined();
    });

    it("returns non-objects as-is", () => {
      expect(trimAllStrings("test")).toBe("test");
    });

    it("trims all string values", () => {
      const result = trimAllStrings({
        a: "  hello  ",
        b: "  world  ",
        c: 123,
      });

      expect(result.a).toBe("hello");
      expect(result.b).toBe("world");
      expect(result.c).toBe(123);
    });
  });

  describe("isEmpty", () => {
    it("returns true for null", () => {
      expect(isEmpty(null)).toBe(true);
    });

    it("returns true for undefined", () => {
      expect(isEmpty(undefined)).toBe(true);
    });

    it("returns true for empty string", () => {
      expect(isEmpty("")).toBe(true);
    });

    it("returns true for whitespace-only string", () => {
      expect(isEmpty("   ")).toBe(true);
    });

    it("returns false for non-empty string", () => {
      expect(isEmpty("hello")).toBe(false);
    });

    it("returns false for numbers", () => {
      expect(isEmpty(0)).toBe(false);
      expect(isEmpty(123)).toBe(false);
    });

    it("returns false for boolean false", () => {
      expect(isEmpty(false)).toBe(false);
    });

    it("returns false for objects", () => {
      expect(isEmpty({})).toBe(false);
    });

    it("returns false for arrays", () => {
      expect(isEmpty([])).toBe(false);
    });
  });
});
