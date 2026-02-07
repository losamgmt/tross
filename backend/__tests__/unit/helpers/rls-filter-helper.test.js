/**
 * RLS Filter Helper Unit Tests
 *
 * Tests for: backend/db/helpers/rls-filter-helper.js
 *
 * Coverage:
 * - All RLS policies (all_records, own_record_only, own_*_only, assigned_*, deny_all, public_resource)
 * - Edge cases (no context, unknown policy, missing userId)
 * - Parameter offset handling
 * - Metadata-driven field configuration
 */

const {
  buildRLSFilter,
  buildRLSFilterForFindById,
  policyAllowsAccess,
  getSupportedPolicies,
  _POLICY_HANDLERS,
} = require("../../../db/helpers/rls-filter-helper");

describe("RLS Filter Helper", () => {
  // ============================================================================
  // TEST FIXTURES
  // ============================================================================

  const userMetadata = {
    tableName: "users",
    primaryKey: "id",
    // Uses default rlsFilterConfig (ownRecordField: 'id')
  };

  const workOrderMetadata = {
    tableName: "work_orders",
    primaryKey: "id",
    // Uses default rlsFilterConfig (customerField: 'customer_id', assignedField: 'assigned_technician_id')
  };

  const invoiceMetadata = {
    tableName: "invoices",
    primaryKey: "id",
    // Uses default customerField
  };

  const customMetadata = {
    tableName: "custom_entities",
    primaryKey: "id",
    rlsFilterConfig: {
      ownRecordField: "owner_id",
      customerField: "client_id",
      assignedField: "responsible_user_id",
    },
  };

  // ============================================================================
  // buildRLSFilter() TESTS
  // ============================================================================

  describe("buildRLSFilter()", () => {
    describe("all_records policy", () => {
      it("should return empty clause for all_records (admin view)", () => {
        const result = buildRLSFilter(
          { policy: "all_records", userId: 1 },
          userMetadata,
        );

        // applied: false because no actual filtering occurs (full access)
        expect(result).toEqual({
          clause: "",
          params: [],
          applied: false,
        });
      });

      it("should work regardless of userId", () => {
        const result = buildRLSFilter(
          { policy: "all_records", userId: null },
          userMetadata,
        );

        expect(result.clause).toBe("");
        // applied: false because no actual filtering occurs
        expect(result.applied).toBe(false);
      });
    });

    describe("public_resource policy", () => {
      it("should return empty clause for public_resource (e.g., roles)", () => {
        const result = buildRLSFilter(
          { policy: "public_resource", userId: 5 },
          { tableName: "roles" },
        );

        // applied: false because no actual filtering occurs (public access)
        expect(result).toEqual({
          clause: "",
          params: [],
          applied: false,
        });
      });
    });

    describe("own_record_only policy", () => {
      it("should filter by id field (default)", () => {
        const result = buildRLSFilter(
          { policy: "own_record_only", userId: 42 },
          userMetadata,
          0,
        );

        expect(result).toEqual({
          clause: "id = $1",
          params: [42],
          applied: true,
        });
      });

      it("should respect custom ownRecordField from metadata", () => {
        const result = buildRLSFilter(
          { policy: "own_record_only", userId: 42 },
          customMetadata,
          0,
        );

        expect(result).toEqual({
          clause: "owner_id = $1",
          params: [42],
          applied: true,
        });
      });

      it("should apply correct parameter offset", () => {
        const result = buildRLSFilter(
          { policy: "own_record_only", userId: 42 },
          userMetadata,
          2, // Already have $1 and $2
        );

        expect(result.clause).toBe("id = $3");
        expect(result.params).toEqual([42]);
      });
    });

    describe("own_work_orders_only policy", () => {
      it("should filter by customer_id (default)", () => {
        const result = buildRLSFilter(
          { policy: "own_work_orders_only", userId: 100 },
          workOrderMetadata,
          0,
        );

        expect(result).toEqual({
          clause: "customer_id = $1",
          params: [100],
          applied: true,
        });
      });

      it("should respect custom customerField from metadata", () => {
        const result = buildRLSFilter(
          { policy: "own_work_orders_only", userId: 100 },
          customMetadata,
          0,
        );

        expect(result).toEqual({
          clause: "client_id = $1",
          params: [100],
          applied: true,
        });
      });
    });

    describe("assigned_work_orders_only policy", () => {
      it("should filter by assigned_technician_id (default)", () => {
        const result = buildRLSFilter(
          { policy: "assigned_work_orders_only", userId: 50 },
          workOrderMetadata,
          0,
        );

        expect(result).toEqual({
          clause: "assigned_technician_id = $1",
          params: [50],
          applied: true,
        });
      });

      it("should respect custom assignedField from metadata", () => {
        const result = buildRLSFilter(
          { policy: "assigned_work_orders_only", userId: 50 },
          customMetadata,
          0,
        );

        expect(result).toEqual({
          clause: "responsible_user_id = $1",
          params: [50],
          applied: true,
        });
      });
    });

    describe("own_invoices_only policy", () => {
      it("should filter by customer_id", () => {
        const result = buildRLSFilter(
          { policy: "own_invoices_only", userId: 75 },
          invoiceMetadata,
          0,
        );

        expect(result).toEqual({
          clause: "customer_id = $1",
          params: [75],
          applied: true,
        });
      });
    });

    describe("own_contracts_only policy", () => {
      it("should filter by customer_id", () => {
        const result = buildRLSFilter(
          { policy: "own_contracts_only", userId: 80 },
          { tableName: "contracts" },
          0,
        );

        expect(result).toEqual({
          clause: "customer_id = $1",
          params: [80],
          applied: true,
        });
      });
    });

    describe("deny_all policy", () => {
      it("should return 1=0 to block all access", () => {
        const result = buildRLSFilter(
          { policy: "deny_all", userId: 99 },
          invoiceMetadata,
          0,
        );

        expect(result).toEqual({
          clause: "1=0",
          params: [],
          applied: true,
        });
      });

      it("should work regardless of metadata", () => {
        const result = buildRLSFilter(
          { policy: "deny_all", userId: 1 },
          null, // Even with null metadata
          0,
        );

        expect(result.clause).toBe("1=0");
      });
    });

    describe("edge cases", () => {
      it("should return unapplied when no RLS context provided", () => {
        const result = buildRLSFilter(null, userMetadata);

        expect(result).toEqual({
          clause: "",
          params: [],
          applied: false,
        });
      });

      it("should return unapplied when RLS context has no policy", () => {
        const result = buildRLSFilter({ userId: 1 }, userMetadata);

        expect(result).toEqual({
          clause: "",
          params: [],
          applied: false,
        });
      });

      it("should deny access for unknown policy (security failsafe)", () => {
        const result = buildRLSFilter(
          { policy: "nonexistent_policy", userId: 1 },
          userMetadata,
        );

        expect(result).toEqual({
          clause: "1=0",
          params: [],
          applied: true,
        });
      });

      it("should handle empty string policy as unknown", () => {
        const result = buildRLSFilter({ policy: "", userId: 1 }, userMetadata);

        // Empty string is falsy, so should return unapplied
        expect(result.applied).toBe(false);
      });

      it("should handle various parameter offsets correctly", () => {
        const offsets = [0, 1, 5, 10, 100];

        offsets.forEach((offset) => {
          const result = buildRLSFilter(
            { policy: "own_record_only", userId: 1 },
            userMetadata,
            offset,
          );

          expect(result.clause).toBe(`id = $${offset + 1}`);
        });
      });
    });
  });

  // ============================================================================
  // buildRLSFilterForFindById() TESTS
  // ============================================================================

  describe("buildRLSFilterForFindById()", () => {
    it("should use paramOffset of 1 by default (for id = $1)", () => {
      const result = buildRLSFilterForFindById(
        { policy: "own_record_only", userId: 42 },
        userMetadata,
      );

      expect(result.clause).toBe("id = $2");
      expect(result.params).toEqual([42]);
    });

    it("should respect custom paramOffset", () => {
      const result = buildRLSFilterForFindById(
        { policy: "own_record_only", userId: 42 },
        userMetadata,
        3,
      );

      expect(result.clause).toBe("id = $4");
    });

    it("should work with all policies", () => {
      const result = buildRLSFilterForFindById(
        { policy: "all_records", userId: 1 },
        userMetadata,
      );

      expect(result.clause).toBe("");
      // applied: false because no actual filtering occurs (full access)
      expect(result.applied).toBe(false);
    });
  });

  // ============================================================================
  // policyAllowsAccess() TESTS
  // ============================================================================

  describe("policyAllowsAccess()", () => {
    it("should return true for all_records", () => {
      expect(policyAllowsAccess("all_records")).toBe(true);
    });

    it("should return true for own_record_only", () => {
      expect(policyAllowsAccess("own_record_only")).toBe(true);
    });

    it("should return true for own_work_orders_only", () => {
      expect(policyAllowsAccess("own_work_orders_only")).toBe(true);
    });

    it("should return true for public_resource", () => {
      expect(policyAllowsAccess("public_resource")).toBe(true);
    });

    it("should return false for deny_all", () => {
      expect(policyAllowsAccess("deny_all")).toBe(false);
    });

    it("should return false for unknown policies", () => {
      expect(policyAllowsAccess("unknown_policy")).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(policyAllowsAccess(undefined)).toBe(false);
    });
  });

  // ============================================================================
  // getSupportedPolicies() TESTS
  // ============================================================================

  describe("getSupportedPolicies()", () => {
    it("should return array of all supported policy names", () => {
      const policies = getSupportedPolicies();

      expect(Array.isArray(policies)).toBe(true);
      expect(policies).toContain("all_records");
      expect(policies).toContain("public_resource");
      expect(policies).toContain("own_record_only");
      expect(policies).toContain("own_work_orders_only");
      expect(policies).toContain("assigned_work_orders_only");
      expect(policies).toContain("own_invoices_only");
      expect(policies).toContain("own_contracts_only");
      expect(policies).toContain("deny_all");
    });

    it("should have 8 supported policies", () => {
      expect(getSupportedPolicies().length).toBe(8);
    });
  });

  // ============================================================================
  // POLICY HANDLER COVERAGE
  // ============================================================================

  describe("_POLICY_HANDLERS (internal)", () => {
    it("should have handlers for all documented policies", () => {
      const expectedPolicies = [
        "all_records",
        "public_resource",
        "own_record_only",
        "own_work_orders_only",
        "assigned_work_orders_only",
        "own_invoices_only",
        "own_contracts_only",
        "deny_all",
      ];

      expectedPolicies.forEach((policy) => {
        expect(_POLICY_HANDLERS[policy]).toBeDefined();
        expect(typeof _POLICY_HANDLERS[policy]).toBe("function");
      });
    });

    it("should not have any extra undocumented handlers", () => {
      const handlerCount = Object.keys(_POLICY_HANDLERS).length;
      expect(handlerCount).toBe(8);
    });
  });

  // ============================================================================
  // INTEGRATION SCENARIOS
  // ============================================================================

  describe("Real-world integration scenarios", () => {
    describe("Customer viewing their work orders", () => {
      it("should generate correct filter for own_work_orders_only", () => {
        const customerId = 42;
        const result = buildRLSFilter(
          { policy: "own_work_orders_only", userId: customerId },
          workOrderMetadata,
          2, // Assume we have search ($1) and is_active ($2) already
        );

        // Result should be: WHERE ... AND customer_id = $3
        expect(result.clause).toBe("customer_id = $3");
        expect(result.params).toEqual([42]);
      });
    });

    describe("Technician viewing assigned work orders", () => {
      it("should generate correct filter for assigned_work_orders_only", () => {
        const technicianId = 15;
        const result = buildRLSFilter(
          { policy: "assigned_work_orders_only", userId: technicianId },
          workOrderMetadata,
          0,
        );

        expect(result.clause).toBe("assigned_technician_id = $1");
        expect(result.params).toEqual([15]);
      });
    });

    describe("Customer trying to view invoices", () => {
      it("should filter invoices by customer_id", () => {
        const result = buildRLSFilter(
          { policy: "own_invoices_only", userId: 99 },
          invoiceMetadata,
          0,
        );

        expect(result.clause).toBe("customer_id = $1");
        expect(result.params).toEqual([99]);
      });
    });

    describe("Technician trying to view invoices (deny_all)", () => {
      it("should block all access", () => {
        const result = buildRLSFilter(
          { policy: "deny_all", userId: 15 },
          invoiceMetadata,
          0,
        );

        expect(result.clause).toBe("1=0");
        expect(result.params).toEqual([]);
      });
    });

    describe("Admin viewing users (all_records)", () => {
      it("should not add any filter", () => {
        const result = buildRLSFilter(
          { policy: "all_records", userId: 1 },
          userMetadata,
          5,
        );

        expect(result.clause).toBe("");
        expect(result.params).toEqual([]);
      });
    });

    describe("User viewing their own profile", () => {
      it("should filter by user id", () => {
        const userId = 123;
        const result = buildRLSFilter(
          { policy: "own_record_only", userId },
          userMetadata,
          0,
        );

        expect(result.clause).toBe("id = $1");
        expect(result.params).toEqual([123]);
      });
    });
  });
});
