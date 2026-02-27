/**
 * RLS Filter Helper Unit Tests
 *
 * Tests for: backend/db/helpers/rls-filter-helper.js
 *
 * ADR-008: Row-Level Security Field-Based Filtering
 *
 * Coverage:
 * - Filter config semantics (null, false, '$parent', string, object)
 * - Context value resolution (userId, customerProfileId, technicianProfileId)
 * - Edge cases (no context, invalid config, missing values)
 * - Parameter offset handling
 */

const {
  buildRLSFilter,
  buildRLSFilterForFindById,
  filterConfigAllowsAccess,
  describeFilterConfig,
} = require("../../../db/helpers/rls-filter-helper");

describe("RLS Filter Helper (ADR-008)", () => {
  // ============================================================================
  // TEST FIXTURES
  // ============================================================================

  const userMetadata = {
    tableName: "users",
    primaryKey: "id",
  };

  const workOrderMetadata = {
    tableName: "work_orders",
    primaryKey: "id",
  };

  const invoiceMetadata = {
    tableName: "invoices",
    primaryKey: "id",
  };

  const notificationMetadata = {
    tableName: "notifications",
    primaryKey: "id",
  };

  // Standard context with all profile IDs available
  const fullContext = {
    filterConfig: null, // Will be overridden per test
    userId: 42,
    customerProfileId: 100,
    technicianProfileId: 200,
    role: "customer",
    resource: "work_orders",
  };

  // ============================================================================
  // buildRLSFilter() TESTS - filterConfig: null (all records)
  // ============================================================================

  describe("buildRLSFilter() - filterConfig: null (all records)", () => {
    it("should return empty clause for null filterConfig", () => {
      const result = buildRLSFilter(
        { ...fullContext, filterConfig: null },
        userMetadata,
      );

      expect(result).toEqual({
        clause: "",
        params: [],
        applied: true,
        noFilter: true,
      });
    });

    it("should work regardless of userId", () => {
      const result = buildRLSFilter(
        { filterConfig: null, userId: null },
        userMetadata,
      );

      expect(result.clause).toBe("");
      expect(result.applied).toBe(true);
    });
  });

  // ============================================================================
  // buildRLSFilter() TESTS - filterConfig: false (deny all)
  // ============================================================================

  describe("buildRLSFilter() - filterConfig: false (deny all)", () => {
    it("should return 1=0 to block all access", () => {
      const result = buildRLSFilter(
        { ...fullContext, filterConfig: false },
        invoiceMetadata,
      );

      expect(result).toEqual({
        clause: "1=0",
        params: [],
        applied: true,
      });
    });

    it("should work regardless of metadata", () => {
      const result = buildRLSFilter(
        { filterConfig: false, userId: 1 },
        null,
      );

      expect(result.clause).toBe("1=0");
    });
  });

  // ============================================================================
  // buildRLSFilter() TESTS - filterConfig: '$parent' (sub-entity)
  // ============================================================================

  describe("buildRLSFilter() - filterConfig: '$parent' (sub-entity)", () => {
    it("should deny access when used with generic router (fail closed)", () => {
      // $parent is for sub-entities using custom routes
      // If it reaches rls-filter-helper, it's a configuration error
      // Secure default: deny access
      const result = buildRLSFilter(
        { ...fullContext, filterConfig: "$parent" },
        { tableName: "file_attachments" },
      );

      expect(result).toEqual({
        clause: "1=0",
        params: [],
        applied: true,
      });
    });
  });

  // ============================================================================
  // buildRLSFilter() TESTS - filterConfig: string (shorthand field name)
  // ============================================================================

  describe("buildRLSFilter() - filterConfig: string (shorthand)", () => {
    it("should filter by field using userId (shorthand for { field, value: 'userId' })", () => {
      const result = buildRLSFilter(
        { ...fullContext, filterConfig: "user_id", userId: 42 },
        notificationMetadata,
      );

      expect(result).toEqual({
        clause: "notifications.user_id = $1",
        params: [42],
        applied: true,
      });
    });

    it("should filter by 'id' for users table (customer viewing own record)", () => {
      const result = buildRLSFilter(
        { ...fullContext, filterConfig: "id", userId: 42 },
        userMetadata,
      );

      expect(result).toEqual({
        clause: "users.id = $1",
        params: [42],
        applied: true,
      });
    });

    it("should apply correct parameter offset", () => {
      const result = buildRLSFilter(
        { ...fullContext, filterConfig: "user_id", userId: 42 },
        notificationMetadata,
        2, // Already have $1 and $2
      );

      expect(result.clause).toBe("notifications.user_id = $3");
      expect(result.params).toEqual([42]);
    });

    it("should deny access if userId is null with string shorthand", () => {
      const result = buildRLSFilter(
        { filterConfig: "user_id", userId: null },
        notificationMetadata,
      );

      expect(result.clause).toBe("1=0");
      expect(result.applied).toBe(true);
    });
  });

  // ============================================================================
  // buildRLSFilter() TESTS - filterConfig: { field, value } (full object)
  // ============================================================================

  describe("buildRLSFilter() - filterConfig: { field, value } (object)", () => {
    it("should filter work_orders by customer_id using customerProfileId", () => {
      const result = buildRLSFilter(
        {
          ...fullContext,
          filterConfig: { field: "customer_id", value: "customerProfileId" },
          customerProfileId: 100,
        },
        workOrderMetadata,
      );

      expect(result).toEqual({
        clause: "work_orders.customer_id = $1",
        params: [100],
        applied: true,
      });
    });

    it("should filter work_orders by assigned_technician_id using technicianProfileId", () => {
      const result = buildRLSFilter(
        {
          ...fullContext,
          filterConfig: {
            field: "assigned_technician_id",
            value: "technicianProfileId",
          },
          technicianProfileId: 200,
        },
        workOrderMetadata,
      );

      expect(result).toEqual({
        clause: "work_orders.assigned_technician_id = $1",
        params: [200],
        applied: true,
      });
    });

    it("should filter invoices by customer_id using customerProfileId", () => {
      const result = buildRLSFilter(
        {
          ...fullContext,
          filterConfig: { field: "customer_id", value: "customerProfileId" },
          customerProfileId: 100,
        },
        invoiceMetadata,
      );

      expect(result).toEqual({
        clause: "invoices.customer_id = $1",
        params: [100],
        applied: true,
      });
    });

    it("should filter customers table by id using customerProfileId", () => {
      const result = buildRLSFilter(
        {
          ...fullContext,
          filterConfig: { field: "id", value: "customerProfileId" },
          customerProfileId: 100,
        },
        { tableName: "customers" },
      );

      expect(result).toEqual({
        clause: "customers.id = $1",
        params: [100],
        applied: true,
      });
    });

    it("should default value to 'userId' if not specified", () => {
      const result = buildRLSFilter(
        {
          ...fullContext,
          filterConfig: { field: "user_id" }, // No value specified
          userId: 42,
        },
        notificationMetadata,
      );

      expect(result.params).toEqual([42]);
    });

    it("should deny access if referenced profile ID is null", () => {
      // Technician without technician_profile_id trying to access work orders
      const result = buildRLSFilter(
        {
          filterConfig: {
            field: "assigned_technician_id",
            value: "technicianProfileId",
          },
          userId: 42,
          technicianProfileId: null,
        },
        workOrderMetadata,
      );

      expect(result.clause).toBe("1=0");
      expect(result.applied).toBe(true);
    });

    it("should deny access if referenced profile ID is undefined", () => {
      const result = buildRLSFilter(
        {
          filterConfig: { field: "customer_id", value: "customerProfileId" },
          userId: 42,
          // customerProfileId not provided
        },
        invoiceMetadata,
      );

      expect(result.clause).toBe("1=0");
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe("edge cases", () => {
    it("should return unapplied when no RLS context provided", () => {
      const result = buildRLSFilter(null, userMetadata);

      expect(result).toEqual({
        clause: "",
        params: [],
        applied: false,
      });
    });

    it("should return unapplied when RLS context is undefined", () => {
      const result = buildRLSFilter(undefined, userMetadata);

      expect(result).toEqual({
        clause: "",
        params: [],
        applied: false,
      });
    });

    it("should deny access for invalid filterConfig object (no field)", () => {
      const result = buildRLSFilter(
        { filterConfig: { value: "userId" }, userId: 42 }, // Missing field
        userMetadata,
      );

      expect(result.clause).toBe("1=0");
    });

    it("should deny access for invalid filterConfig type (number)", () => {
      const result = buildRLSFilter(
        { filterConfig: 123, userId: 42 },
        userMetadata,
      );

      expect(result.clause).toBe("1=0");
    });

    it("should handle various parameter offsets correctly", () => {
      const offsets = [0, 1, 5, 10, 100];

      offsets.forEach((offset) => {
        const result = buildRLSFilter(
          { filterConfig: "id", userId: 42 },
          userMetadata,
          offset,
        );

        expect(result.clause).toBe(`users.id = $${offset + 1}`);
      });
    });

    it("should handle empty tableName", () => {
      const result = buildRLSFilter(
        { filterConfig: "user_id", userId: 42 },
        { tableName: "" },
      );

      expect(result.clause).toBe("user_id = $1");
    });
  });

  // ============================================================================
  // buildRLSFilterForFindById() TESTS
  // ============================================================================

  describe("buildRLSFilterForFindById()", () => {
    it("should use paramOffset of 1 by default (for id = $1)", () => {
      const result = buildRLSFilterForFindById(
        { filterConfig: "id", userId: 42 },
        userMetadata,
      );

      expect(result.clause).toBe("users.id = $2");
      expect(result.params).toEqual([42]);
    });

    it("should respect custom paramOffset", () => {
      const result = buildRLSFilterForFindById(
        { filterConfig: "id", userId: 42 },
        userMetadata,
        3,
      );

      expect(result.clause).toBe("users.id = $4");
    });

    it("should work with null filterConfig (all records)", () => {
      const result = buildRLSFilterForFindById(
        { filterConfig: null, userId: 1 },
        userMetadata,
      );

      expect(result.clause).toBe("");
      expect(result.applied).toBe(true);
    });
  });

  // ============================================================================
  // filterConfigAllowsAccess() TESTS
  // ============================================================================

  describe("filterConfigAllowsAccess()", () => {
    it("should return true for null (all records)", () => {
      expect(filterConfigAllowsAccess(null)).toBe(true);
    });

    it("should return false for false (deny all)", () => {
      expect(filterConfigAllowsAccess(false)).toBe(false);
    });

    it("should return true for string field name", () => {
      expect(filterConfigAllowsAccess("user_id")).toBe(true);
    });

    it("should return true for object config", () => {
      expect(
        filterConfigAllowsAccess({ field: "customer_id", value: "userId" }),
      ).toBe(true);
    });
  });

  // ============================================================================
  // describeFilterConfig() TESTS
  // ============================================================================

  describe("describeFilterConfig()", () => {
    it("should describe null as 'all_records'", () => {
      expect(describeFilterConfig(null)).toBe("all_records");
    });

    it("should describe false as 'deny_all'", () => {
      expect(describeFilterConfig(false)).toBe("deny_all");
    });

    it("should describe '$parent' as 'parent_entity_access'", () => {
      expect(describeFilterConfig("$parent")).toBe("parent_entity_access");
    });

    it("should describe string field as 'filter_by_<field>'", () => {
      expect(describeFilterConfig("user_id")).toBe("filter_by_user_id");
    });

    it("should describe object config fully", () => {
      expect(
        describeFilterConfig({ field: "customer_id", value: "customerProfileId" }),
      ).toBe("filter_by_customer_id_via_customerProfileId");
    });
  });

  // ============================================================================
  // REAL-WORLD INTEGRATION SCENARIOS
  // ============================================================================

  describe("Real-world integration scenarios", () => {
    describe("Customer viewing their work orders", () => {
      it("should filter by customer_id using customerProfileId", () => {
        const result = buildRLSFilter(
          {
            filterConfig: { field: "customer_id", value: "customerProfileId" },
            userId: 42,
            customerProfileId: 100,
          },
          workOrderMetadata,
          2, // Assume we have search ($1) and is_active ($2) already
        );

        expect(result.clause).toBe("work_orders.customer_id = $3");
        expect(result.params).toEqual([100]);
      });
    });

    describe("Technician viewing assigned work orders", () => {
      it("should filter by assigned_technician_id using technicianProfileId", () => {
        const result = buildRLSFilter(
          {
            filterConfig: {
              field: "assigned_technician_id",
              value: "technicianProfileId",
            },
            userId: 42,
            technicianProfileId: 15,
          },
          workOrderMetadata,
        );

        expect(result.clause).toBe("work_orders.assigned_technician_id = $1");
        expect(result.params).toEqual([15]);
      });
    });

    describe("User viewing their notifications", () => {
      it("should filter by user_id using userId (string shorthand)", () => {
        const result = buildRLSFilter(
          { filterConfig: "user_id", userId: 99 },
          notificationMetadata,
        );

        expect(result.clause).toBe("notifications.user_id = $1");
        expect(result.params).toEqual([99]);
      });
    });

    describe("Technician denied access to invoices", () => {
      it("should block all access with filterConfig: false", () => {
        const result = buildRLSFilter(
          { filterConfig: false, userId: 15 },
          invoiceMetadata,
        );

        expect(result.clause).toBe("1=0");
        expect(result.params).toEqual([]);
      });
    });

    describe("Admin viewing all users (all_records)", () => {
      it("should not add any filter with filterConfig: null", () => {
        const result = buildRLSFilter(
          { filterConfig: null, userId: 1 },
          userMetadata,
          5,
        );

        expect(result.clause).toBe("");
        expect(result.params).toEqual([]);
      });
    });

    describe("Customer viewing their own customer record", () => {
      it("should filter customers.id by customerProfileId", () => {
        const result = buildRLSFilter(
          {
            filterConfig: { field: "id", value: "customerProfileId" },
            userId: 42,
            customerProfileId: 100,
          },
          { tableName: "customers" },
        );

        expect(result.clause).toBe("customers.id = $1");
        expect(result.params).toEqual([100]);
      });
    });
  });
});
