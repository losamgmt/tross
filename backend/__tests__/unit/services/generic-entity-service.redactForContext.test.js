/**
 * GenericEntityService._redactForContext() Unit Tests
 *
 * SECURITY-CRITICAL: the service output-boundary redaction helper must strip
 * fields the caller's role may not read, while returning full data for
 * internal/system callers (no role in the RLS context).
 */

jest.mock("../../../db/connection", () =>
  require("../../mocks").createDBMock(),
);

jest.mock("../../../config/logger", () => ({
  logger: require("../../mocks").createLoggerMock(),
}));

const GenericEntityService = require("../../../services/entity/generic-entity-service");

// =============================================================================
// TEST FIXTURES
// =============================================================================

/**
 * Minimal metadata exercising read visibility across the role hierarchy
 * (customer < dispatcher < admin). Only the `read` dimension is defined because
 * this helper redacts read output exclusively.
 */
const mockMetadata = {
  tableName: "work_orders",
  fieldAccess: {
    id: { read: "customer" },
    summary: { read: "customer" },
    internal_notes: { read: "dispatcher" },
    admin_override: { read: "admin" },
  },
};

const sampleRecord = {
  id: 1,
  summary: "Fix HVAC unit",
  internal_notes: "Customer is difficult",
  admin_override: "Special pricing applied",
};

describe("GenericEntityService._redactForContext()", () => {
  describe("no role in context (internal/system reads)", () => {
    test("returns the full record unchanged when rlsContext is null", () => {
      const result = GenericEntityService._redactForContext(
        sampleRecord,
        mockMetadata,
        null,
      );

      expect(result).toEqual(sampleRecord);
    });

    test("returns the full record unchanged when the context has no role", () => {
      const result = GenericEntityService._redactForContext(
        sampleRecord,
        mockMetadata,
        { userId: 42 },
      );

      expect(result).toEqual(sampleRecord);
    });
  });

  describe("role present (API reads)", () => {
    test("redacts a single record to the caller's role-readable fields", () => {
      const result = GenericEntityService._redactForContext(
        sampleRecord,
        mockMetadata,
        { role: "customer" },
      );

      // Customer-readable fields survive
      expect(result.id).toBe(1);
      expect(result.summary).toBe("Fix HVAC unit");
      // Higher-privilege fields are stripped
      expect(result.internal_notes).toBeUndefined();
      expect(result.admin_override).toBeUndefined();
    });

    test("returns all fields for a fully-privileged role", () => {
      const result = GenericEntityService._redactForContext(
        sampleRecord,
        mockMetadata,
        { role: "admin" },
      );

      expect(result).toEqual(sampleRecord);
    });

    test("redacts every record in an array", () => {
      const records = [sampleRecord, { ...sampleRecord, id: 2 }];

      const result = GenericEntityService._redactForContext(
        records,
        mockMetadata,
        { role: "customer" },
      );

      expect(result).toHaveLength(2);
      expect(result[0].summary).toBe("Fix HVAC unit");
      expect(result[0].internal_notes).toBeUndefined();
      expect(result[1].admin_override).toBeUndefined();
    });

    test("returns null when the record is null (not-found passthrough)", () => {
      const result = GenericEntityService._redactForContext(
        null,
        mockMetadata,
        { role: "customer" },
      );

      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Nested relationship data (Tier-1 output boundary)
  //
  // Relationship keys (e.g. `units`) are NOT declared in fieldAccess, so the
  // redaction boundary strips them for ANY role-bearing read — loaded
  // relationship data never leaks through a redacted response, even for admin.
  // Internal/system callers (no role) receive it intact. Making `?include=`
  // response-visible with per-target nested redaction is a documented future
  // feature — see ADR-011 "Field redaction & nested relationships".
  // ---------------------------------------------------------------------------
  describe("nested relationship data (not declared in fieldAccess)", () => {
    const withRelationship = {
      ...sampleRecord,
      units: [{ id: 9, unit_identifier: "4A" }],
    };

    test("strips loaded relationship data on any role-bearing read", () => {
      const result = GenericEntityService._redactForContext(
        withRelationship,
        mockMetadata,
        { role: "admin" }, // even admin: relationship keys aren't in fieldAccess
      );

      expect(result.units).toBeUndefined();
      expect(result.id).toBe(1);
    });

    test("preserves loaded relationship data for internal/system callers", () => {
      const result = GenericEntityService._redactForContext(
        withRelationship,
        mockMetadata,
        null,
      );

      expect(result.units).toEqual([{ id: 9, unit_identifier: "4A" }]);
    });
  });
});
