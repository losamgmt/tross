/**
 * Unit Tests: Name Utilities
 *
 * Tests all name formatting functions for entities.
 * Covers HUMAN entities, COMPUTED entities, text utilities, and the
 * display-name resolution SSOT (resolveDisplayName + buildHumanNameSqlExpr).
 *
 * Goal: 100% coverage of name-utils.js
 */

const {
  composeFields,
  fullName,
  sortName,
  displayName,
  truncate,
  computeName,
  formatTemplate,
  resolveDisplayName,
  buildHumanNameSqlExpr,
} = require("../../../utils/name-utils");
const { NAME_PATTERNS } = require("../../../config/name-patterns");

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

  // ==========================================================================
  // FIELD COMPOSITION PRIMITIVE
  // ==========================================================================

  describe("composeFields()", () => {
    test("returns empty string for null record", () => {
      expect(composeFields(null, ["first_name"])).toBe("");
    });

    test("returns empty string when fields is not an array", () => {
      expect(composeFields({ first_name: "Jane" }, null)).toBe("");
    });

    test("composes arbitrary ordered fields", () => {
      const record = { a: "X", b: "Y", c: "Z" };
      expect(composeFields(record, ["a", "b", "c"])).toBe("X Y Z");
    });

    test("drops empty and null fields, trims the rest", () => {
      const record = { a: "  X  ", b: "", c: null, d: "Z" };
      expect(composeFields(record, ["a", "b", "c", "d"])).toBe("X Z");
    });

    test("coerces non-string values", () => {
      expect(composeFields({ a: 42, b: "u" }, ["a", "b"])).toBe("42 u");
    });
  });

  // ==========================================================================
  // DISPLAY-NAME RESOLUTION (SSOT)
  // ==========================================================================

  describe("resolveDisplayName()", () => {
    test("returns empty string for null record", () => {
      expect(resolveDisplayName(null, { namePattern: NAME_PATTERNS.SIMPLE })).toBe("");
    });

    test("returns empty string for null metadata", () => {
      expect(resolveDisplayName({ name: "Acme" }, null)).toBe("");
    });

    test("HUMAN: composes declared displayFields", () => {
      const meta = {
        namePattern: NAME_PATTERNS.HUMAN,
        displayFields: ["first_name", "last_name"],
      };
      expect(resolveDisplayName({ first_name: "Jane", last_name: "Smith" }, meta)).toBe(
        "Jane Smith",
      );
    });

    test("HUMAN: falls back to first_name/last_name when displayFields absent", () => {
      const meta = { namePattern: NAME_PATTERNS.HUMAN };
      expect(resolveDisplayName({ first_name: "Ann", last_name: "Lee" }, meta)).toBe(
        "Ann Lee",
      );
    });

    test("HUMAN: honors a non-standard displayFields order", () => {
      const meta = {
        namePattern: NAME_PATTERNS.HUMAN,
        displayFields: ["last_name", "first_name"],
      };
      expect(resolveDisplayName({ first_name: "Jane", last_name: "Smith" }, meta)).toBe(
        "Smith Jane",
      );
    });

    test("SIMPLE: returns the authored displayField column", () => {
      const meta = { namePattern: NAME_PATTERNS.SIMPLE, displayField: "name" };
      expect(resolveDisplayName({ name: "Manager" }, meta)).toBe("Manager");
    });

    test("COMPUTED: returns the identifier displayField column", () => {
      const meta = {
        namePattern: NAME_PATTERNS.COMPUTED,
        displayField: "work_order_number",
      };
      expect(resolveDisplayName({ work_order_number: "WO-2026-0001" }, meta)).toBe(
        "WO-2026-0001",
      );
    });

    test("custom: null namePattern but a declared displayField still resolves", () => {
      const meta = { namePattern: null, displayField: "company_name" };
      expect(resolveDisplayName({ company_name: "Acme LLC" }, meta)).toBe("Acme LLC");
    });

    test("returns empty string when the displayField value is null", () => {
      const meta = { namePattern: NAME_PATTERNS.SIMPLE, displayField: "name" };
      expect(resolveDisplayName({ name: null }, meta)).toBe("");
    });

    test("returns empty string for junction/system (no pattern, no displayField)", () => {
      expect(resolveDisplayName({ id: 1 }, { namePattern: null })).toBe("");
    });
  });

  // ==========================================================================
  // SQL EXPRESSION BUILDER + JS<->SQL PARITY
  // ==========================================================================

  describe("buildHumanNameSqlExpr()", () => {
    test("builds the canonical expression for the default fields", () => {
      expect(buildHumanNameSqlExpr()).toBe(
        "NULLIF(TRIM(CONCAT_WS(' ', NULLIF(TRIM(first_name), ''), NULLIF(TRIM(last_name), ''))), '')",
      );
    });

    test("supports custom fields", () => {
      expect(buildHumanNameSqlExpr(["given", "family"])).toBe(
        "NULLIF(TRIM(CONCAT_WS(' ', NULLIF(TRIM(given), ''), NULLIF(TRIM(family), ''))), '')",
      );
    });

    test("qualifies columns with a table alias", () => {
      expect(buildHumanNameSqlExpr(["first_name", "last_name"], { alias: "c" })).toBe(
        "NULLIF(TRIM(CONCAT_WS(' ', NULLIF(TRIM(c.first_name), ''), NULLIF(TRIM(c.last_name), ''))), '')",
      );
    });
  });

  describe("JS<->SQL parity (composeFields vs the GENERATED expression)", () => {
    // Oracle mirroring Postgres semantics of buildHumanNameSqlExpr:
    //   NULLIF(TRIM(CONCAT_WS(' ', NULLIF(TRIM(c), ''), ...)), '')
    // Returns null for the "no name" case (the SQL twin of JS '').
    const evalHumanNameSql = (fields, record) => {
      const parts = fields
        .map((f) => (record[f] == null ? null : String(record[f]).trim())) // TRIM(col)
        .map((v) => (v === "" ? null : v)) // NULLIF(col, '')
        .filter((v) => v != null); // CONCAT_WS drops NULL
      const trimmed = parts.join(" ").trim(); // outer TRIM
      return trimmed === "" ? null : trimmed; // NULLIF(result, '')
    };

    const fields = ["first_name", "last_name"];
    const cases = [
      { first_name: "Jane", last_name: "Smith" },
      { first_name: "Jane", last_name: "" },
      { first_name: "", last_name: "Smith" },
      { first_name: null, last_name: "Doe" },
      { first_name: "  Jane  ", last_name: "  Smith  " },
      { first_name: "   ", last_name: null },
      {},
    ];

    test.each(cases)(
      "composeFields agrees with the SQL oracle for %o",
      (record) => {
        const js = composeFields(record, fields);
        const sql = evalHumanNameSql(fields, record);
        // SQL NULL is the twin of JS '' (the "no display name" sentinel).
        expect(js).toBe(sql == null ? "" : sql);
      },
    );

    test("resolveDisplayName(HUMAN) agrees with the SQL oracle", () => {
      const meta = { namePattern: NAME_PATTERNS.HUMAN, displayFields: fields };
      for (const record of cases) {
        const sql = evalHumanNameSql(fields, record);
        expect(resolveDisplayName(record, meta)).toBe(sql == null ? "" : sql);
      }
    });
  });
});
