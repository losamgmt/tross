/**
 * Unit Tests: Name Utilities
 *
 * Tests all name formatting functions for entities.
 * Covers HUMAN entities, COMPUTED entities, and text utilities.
 *
 * Goal: 100% coverage of name-utils.js
 */

const {
  fullName,
  sortName,
  displayName,
  truncate,
  computeName,
  formatTemplate,
} = require("../../helpers/name-utils");

describe("Name Utils", () => {
  // ==========================================================================
  // HUMAN ENTITY FUNCTIONS
  // ==========================================================================

  describe("fullName()", () => {
    test("returns empty string for null entity", () => {
      expect(fullName(null)).toBe("");
    });

    test("returns empty string for undefined entity", () => {
      expect(fullName(undefined)).toBe("");
    });

    test("returns empty string for entity with no names", () => {
      expect(fullName({})).toBe("");
    });

    test("returns full name with first and last", () => {
      const entity = { first_name: "Jane", last_name: "Smith" };
      expect(fullName(entity)).toBe("Jane Smith");
    });

    test("returns first name only when no last name", () => {
      const entity = { first_name: "Jane" };
      expect(fullName(entity)).toBe("Jane");
    });

    test("returns last name only when no first name", () => {
      const entity = { last_name: "Smith" };
      expect(fullName(entity)).toBe("Smith");
    });

    test("trims whitespace from names", () => {
      const entity = { first_name: "  Jane  ", last_name: "  Smith  " };
      expect(fullName(entity)).toBe("Jane Smith");
    });

    test("handles empty strings as names", () => {
      const entity = { first_name: "", last_name: "Smith" };
      expect(fullName(entity)).toBe("Smith");
    });

    test("handles null values for names", () => {
      const entity = { first_name: null, last_name: "Doe" };
      expect(fullName(entity)).toBe("Doe");
    });
  });

  describe("sortName()", () => {
    test("returns empty string for null entity", () => {
      expect(sortName(null)).toBe("");
    });

    test("returns empty string for undefined entity", () => {
      expect(sortName(undefined)).toBe("");
    });

    test('returns "Last, First" format', () => {
      const entity = { first_name: "Jane", last_name: "Smith" };
      expect(sortName(entity)).toBe("Smith, Jane");
    });

    test("returns just last name if no first name", () => {
      const entity = { last_name: "Smith" };
      expect(sortName(entity)).toBe("Smith");
    });

    test("returns just first name if no last name", () => {
      const entity = { first_name: "Jane" };
      expect(sortName(entity)).toBe("Jane");
    });

    test("returns empty string for empty object", () => {
      expect(sortName({})).toBe("");
    });

    test("trims whitespace from names", () => {
      const entity = { first_name: "  Jane  ", last_name: "  Smith  " };
      expect(sortName(entity)).toBe("Smith, Jane");
    });
  });

  describe("displayName()", () => {
    test("returns empty string for null entity", () => {
      expect(displayName(null)).toBe("");
    });

    test("returns empty string for undefined entity", () => {
      expect(displayName(undefined)).toBe("");
    });

    test("returns first_name when available", () => {
      const entity = { first_name: "Jane", email: "jane@example.com" };
      expect(displayName(entity)).toBe("Jane");
    });

    test("trims first_name", () => {
      const entity = { first_name: "  Jane  " };
      expect(displayName(entity)).toBe("Jane");
    });

    test("falls back to email username when no first_name", () => {
      const entity = { email: "jane.doe@example.com" };
      expect(displayName(entity)).toBe("jane.doe");
    });

    test("returns empty string when no first_name or email", () => {
      expect(displayName({})).toBe("");
    });

    test("handles email with no @ sign gracefully", () => {
      const entity = { email: "invalid-email" };
      expect(displayName(entity)).toBe("invalid-email");
    });
  });

  // ==========================================================================
  // TEXT UTILITIES
  // ==========================================================================

  describe("truncate()", () => {
    test("returns empty string for null text", () => {
      expect(truncate(null)).toBe("");
    });

    test("returns empty string for undefined text", () => {
      expect(truncate(undefined)).toBe("");
    });

    test("returns empty string for empty string", () => {
      expect(truncate("")).toBe("");
    });

    test("returns original text when under max length", () => {
      expect(truncate("Hello", 10)).toBe("Hello");
    });

    test("returns original text when exactly at max length", () => {
      expect(truncate("Hello", 5)).toBe("Hello");
    });

    test("truncates and adds ellipsis when over max length", () => {
      expect(truncate("Hello World", 5)).toBe("Hello...");
    });

    test("uses default max length of 30", () => {
      const longText =
        "This is a very long description that exceeds 30 characters";
      const result = truncate(longText);
      expect(result).toBe("This is a very long descriptio...");
      expect(result.length).toBe(33); // 30 + '...'
    });

    test("trims the text before truncating", () => {
      expect(truncate("   Hello   ", 5)).toBe("Hello");
    });

    test("handles very short max length", () => {
      expect(truncate("Hello", 2)).toBe("He...");
    });
  });

  // ==========================================================================
  // COMPUTED ENTITY NAME FUNCTIONS
  // ==========================================================================

  describe("computeName()", () => {
    test("returns empty string for null entity", () => {
      expect(computeName({ entity: null })).toBe("");
    });

    test("returns empty string for undefined entity", () => {
      expect(computeName({ entity: undefined })).toBe("");
    });

    test("returns customer name with summary and identifier", () => {
      const result = computeName({
        entity: {
          summary: "Fix kitchen sink",
          work_order_number: "WO-2024-0001",
        },
        customer: { first_name: "Jane", last_name: "Smith" },
        identifierField: "work_order_number",
      });
      expect(result).toBe("Jane Smith: Fix kitchen sink: WO-2024-0001");
    });

    test('uses "Unknown Customer" when no customer provided', () => {
      const result = computeName({
        entity: { summary: "Work", work_order_number: "WO-001" },
        customer: null,
        identifierField: "work_order_number",
      });
      expect(result).toBe("Unknown Customer: Work: WO-001");
    });

    test("omits summary when empty", () => {
      const result = computeName({
        entity: { work_order_number: "WO-001" },
        customer: { first_name: "Jane", last_name: "Smith" },
        identifierField: "work_order_number",
      });
      expect(result).toBe("Jane Smith: WO-001");
    });

    test("omits identifier when field is missing", () => {
      const result = computeName({
        entity: { summary: "Work task" },
        customer: { first_name: "Jane", last_name: "Smith" },
        identifierField: "work_order_number",
      });
      expect(result).toBe("Jane Smith: Work task");
    });

    test("returns just customer name when no summary or identifier", () => {
      const result = computeName({
        entity: {},
        customer: { first_name: "Jane", last_name: "Smith" },
        identifierField: "work_order_number",
      });
      expect(result).toBe("Jane Smith");
    });

    test("truncates long summary to 50 characters", () => {
      const longSummary =
        "This is a very long summary that should be truncated to 50 characters for display";
      const result = computeName({
        entity: { summary: longSummary, work_order_number: "WO-001" },
        customer: { first_name: "Jane" },
        identifierField: "work_order_number",
      });
      expect(result).toContain(
        "This is a very long summary that should be truncat...",
      );
    });
  });

  describe("formatTemplate()", () => {
    test("returns empty string for null template", () => {
      expect(formatTemplate(null, { name: "test" })).toBe("");
    });

    test("returns template for null data", () => {
      expect(formatTemplate("Hello {name}", null)).toBe("Hello {name}");
    });

    test("returns template for undefined data", () => {
      expect(formatTemplate("Hello {name}", undefined)).toBe("Hello {name}");
    });

    test("replaces simple placeholders", () => {
      const result = formatTemplate("{first_name} {last_name}", {
        first_name: "Jane",
        last_name: "Smith",
      });
      expect(result).toBe("Jane Smith");
    });

    test("handles nested object paths", () => {
      const result = formatTemplate("{customer.name}", {
        customer: { name: "Acme Corp" },
      });
      expect(result).toBe("Acme Corp");
    });

    test("handles deeply nested paths", () => {
      const result = formatTemplate("{company.address.city}", {
        company: { address: { city: "New York" } },
      });
      expect(result).toBe("New York");
    });

    test("returns empty string for missing field", () => {
      const result = formatTemplate("Hello {name}", {});
      expect(result).toBe("Hello ");
    });

    test("returns empty string for null value in path", () => {
      const result = formatTemplate("{customer.name}", {
        customer: null,
      });
      expect(result).toBe("");
    });

    test("returns empty string for undefined value in path", () => {
      const result = formatTemplate("{customer.name}", {
        customer: undefined,
      });
      expect(result).toBe("");
    });

    test("converts numbers to string", () => {
      const result = formatTemplate("ID: {id}", { id: 42 });
      expect(result).toBe("ID: 42");
    });

    test("handles multiple placeholders", () => {
      const result = formatTemplate("{a} + {b} = {c}", {
        a: 1,
        b: 2,
        c: 3,
      });
      expect(result).toBe("1 + 2 = 3");
    });

    test("handles template with no placeholders", () => {
      const result = formatTemplate("No placeholders here", { name: "test" });
      expect(result).toBe("No placeholders here");
    });

    test("handles empty template", () => {
      expect(formatTemplate("", { name: "test" })).toBe("");
    });
  });
});
