/**
 * Field Type Standards Unit Tests
 *
 * Tests for field-type-standards.js - field definitions and address generators
 */

const {
  FIELD,
  ADDRESS_SUFFIXES,
  createAddressFields,
  createAddressFieldAccess,
  getAddressFieldNames,
  getAddressPrefix,
  hasCompleteAddress,
} = require("../../../config/field-type-standards");

const {
  SUPPORTED_COUNTRIES,
  DEFAULT_COUNTRY,
  ALL_SUBDIVISIONS,
} = require("../../../config/geo-standards");

describe("field-type-standards", () => {
  // ==========================================================================
  // FIELD DEFINITIONS
  // ==========================================================================

  describe("FIELD", () => {
    it("should be frozen", () => {
      expect(Object.isFrozen(FIELD)).toBe(true);
    });

    describe("EMAIL", () => {
      it("should have correct structure", () => {
        expect(FIELD.EMAIL).toEqual({
          type: "email",
          maxLength: 255,
        });
      });

      it("should be frozen", () => {
        expect(Object.isFrozen(FIELD.EMAIL)).toBe(true);
      });
    });

    describe("PHONE", () => {
      it("should have correct structure", () => {
        expect(FIELD.PHONE).toEqual({
          type: "phone",
          maxLength: 50,
        });
      });
    });

    describe("FIRST_NAME", () => {
      it("should have correct structure", () => {
        expect(FIELD.FIRST_NAME).toEqual({
          type: "string",
          maxLength: 100,
        });
      });

      it("should NOT have pattern restriction (international names)", () => {
        expect(FIELD.FIRST_NAME.pattern).toBeUndefined();
      });
    });

    describe("LAST_NAME", () => {
      it("should have correct structure", () => {
        expect(FIELD.LAST_NAME).toEqual({
          type: "string",
          maxLength: 100,
        });
      });

      it("should NOT have pattern restriction (international names)", () => {
        expect(FIELD.LAST_NAME.pattern).toBeUndefined();
      });
    });

    describe("NAME", () => {
      it("should have correct structure", () => {
        expect(FIELD.NAME).toEqual({
          type: "string",
          maxLength: 255,
        });
      });
    });

    describe("SUMMARY", () => {
      it("should have correct structure", () => {
        expect(FIELD.SUMMARY).toEqual({
          type: "string",
          maxLength: 255,
        });
      });
    });

    describe("DESCRIPTION", () => {
      it("should have correct structure", () => {
        expect(FIELD.DESCRIPTION).toEqual({
          type: "text", // Semantic type for long-form content
          maxLength: 5000,
        });
      });
    });

    // ---- New FIELD constants added in Phase 1 ----

    describe("TITLE", () => {
      it("should have correct structure", () => {
        expect(FIELD.TITLE).toEqual({
          type: "string",
          maxLength: 150,
        });
      });
    });

    describe("NOTES", () => {
      it("should have correct structure", () => {
        expect(FIELD.NOTES).toEqual({
          type: "text",
          maxLength: 10000,
        });
      });
    });

    describe("TERMS", () => {
      it("should have correct structure", () => {
        expect(FIELD.TERMS).toEqual({
          type: "text",
          maxLength: 50000,
        });
      });
    });

    describe("IDENTIFIER", () => {
      it("should have correct structure", () => {
        expect(FIELD.IDENTIFIER).toEqual({
          type: "string",
          maxLength: 100,
        });
      });
    });

    describe("SKU", () => {
      it("should have correct structure", () => {
        expect(FIELD.SKU).toEqual({
          type: "string",
          maxLength: 50,
        });
      });
    });

    describe("CURRENCY", () => {
      it("should have correct structure", () => {
        expect(FIELD.CURRENCY).toEqual({
          type: "currency",
          precision: 2,
          min: 0,
        });
      });
    });

    describe("URL", () => {
      it("should have correct structure", () => {
        expect(FIELD.URL).toEqual({
          type: "url",
          maxLength: 2048,
        });
      });
    });

    describe("ADDRESS_STATE", () => {
      it("should be an enum with all subdivisions", () => {
        expect(FIELD.ADDRESS_STATE.type).toBe("enum");
        expect(FIELD.ADDRESS_STATE.values).toEqual(ALL_SUBDIVISIONS);
      });
    });

    describe("ADDRESS_COUNTRY", () => {
      it("should be an enum with supported countries", () => {
        expect(FIELD.ADDRESS_COUNTRY.type).toBe("enum");
        expect(FIELD.ADDRESS_COUNTRY.values).toEqual(SUPPORTED_COUNTRIES);
      });

      it("should default to US", () => {
        expect(FIELD.ADDRESS_COUNTRY.default).toBe(DEFAULT_COUNTRY);
      });
    });
  });

  // ==========================================================================
  // ADDRESS GENERATORS
  // ==========================================================================

  describe("ADDRESS_SUFFIXES", () => {
    it("should have 6 suffixes in correct order", () => {
      expect(ADDRESS_SUFFIXES).toEqual([
        "line1",
        "line2",
        "city",
        "state",
        "postal_code",
        "country",
      ]);
    });

    it("should be frozen", () => {
      expect(Object.isFrozen(ADDRESS_SUFFIXES)).toBe(true);
    });
  });

  describe("createAddressFields", () => {
    it("should generate 6 fields with prefix", () => {
      const fields = createAddressFields("location");

      expect(Object.keys(fields)).toHaveLength(6);
      expect(fields).toHaveProperty("location_line1");
      expect(fields).toHaveProperty("location_line2");
      expect(fields).toHaveProperty("location_city");
      expect(fields).toHaveProperty("location_state");
      expect(fields).toHaveProperty("location_postal_code");
      expect(fields).toHaveProperty("location_country");
    });

    it("should use correct field types", () => {
      const fields = createAddressFields("test");

      expect(fields.test_line1.type).toBe("string");
      expect(fields.test_line1.maxLength).toBe(255);

      expect(fields.test_city.type).toBe("string");
      expect(fields.test_city.maxLength).toBe(100);

      expect(fields.test_state.type).toBe("enum");
      expect(fields.test_state.values).toEqual(ALL_SUBDIVISIONS);

      expect(fields.test_postal_code.type).toBe("string");
      expect(fields.test_postal_code.maxLength).toBe(20);

      expect(fields.test_country.type).toBe("enum");
      expect(fields.test_country.values).toEqual(SUPPORTED_COUNTRIES);
    });

    it("should default country to US", () => {
      const fields = createAddressFields("location");
      expect(fields.location_country.default).toBe("US");
    });

    it("should allow custom default country", () => {
      const fields = createAddressFields("location", { defaultCountry: "CA" });
      expect(fields.location_country.default).toBe("CA");
    });

    it("should NOT mark fields as required by default", () => {
      const fields = createAddressFields("location");

      expect(fields.location_line1.required).toBeUndefined();
      expect(fields.location_city.required).toBeUndefined();
    });

    it("should mark line1 and city as required when option is true", () => {
      const fields = createAddressFields("billing", { required: true });

      expect(fields.billing_line1.required).toBe(true);
      expect(fields.billing_city.required).toBe(true);
      // Other fields should still be optional
      expect(fields.billing_line2.required).toBeUndefined();
      expect(fields.billing_state.required).toBeUndefined();
    });

    it("should work with different prefixes", () => {
      const billing = createAddressFields("billing");
      const service = createAddressFields("service");
      const mailing = createAddressFields("mailing");

      expect(billing).toHaveProperty("billing_line1");
      expect(service).toHaveProperty("service_line1");
      expect(mailing).toHaveProperty("mailing_line1");
    });
  });

  describe("createAddressFieldAccess", () => {
    it("should generate 6 field access entries with prefix", () => {
      const access = createAddressFieldAccess("location", "customer");

      expect(Object.keys(access)).toHaveLength(6);
      expect(access).toHaveProperty("location_line1");
      expect(access).toHaveProperty("location_line2");
      expect(access).toHaveProperty("location_city");
      expect(access).toHaveProperty("location_state");
      expect(access).toHaveProperty("location_postal_code");
      expect(access).toHaveProperty("location_country");
    });

    it("should use minRole for create and update", () => {
      const access = createAddressFieldAccess("location", "dispatcher");

      expect(access.location_line1.create).toBe("dispatcher");
      expect(access.location_line1.update).toBe("dispatcher");
      expect(access.location_city.create).toBe("dispatcher");
      expect(access.location_city.update).toBe("dispatcher");
    });

    it("should default read to customer", () => {
      const access = createAddressFieldAccess("location", "dispatcher");

      expect(access.location_line1.read).toBe("customer");
      expect(access.location_city.read).toBe("customer");
    });

    it("should allow custom read role", () => {
      const access = createAddressFieldAccess("location", "admin", {
        readRole: "manager",
      });

      expect(access.location_line1.read).toBe("manager");
      expect(access.location_city.read).toBe("manager");
    });

    it("should always set delete to none", () => {
      const access = createAddressFieldAccess("location", "admin");

      for (const suffix of ADDRESS_SUFFIXES) {
        expect(access[`location_${suffix}`].delete).toBe("none");
      }
    });
  });

  // ==========================================================================
  // ADDRESS UTILITIES
  // ==========================================================================

  describe("getAddressFieldNames", () => {
    it("should return all 6 field names for a prefix", () => {
      const names = getAddressFieldNames("billing");

      expect(names).toEqual([
        "billing_line1",
        "billing_line2",
        "billing_city",
        "billing_state",
        "billing_postal_code",
        "billing_country",
      ]);
    });

    it("should work with any prefix", () => {
      const names = getAddressFieldNames("xyz");
      expect(names[0]).toBe("xyz_line1");
      expect(names[5]).toBe("xyz_country");
    });
  });

  describe("getAddressPrefix", () => {
    it("should extract prefix from address field names", () => {
      expect(getAddressPrefix("location_line1")).toBe("location");
      expect(getAddressPrefix("location_line2")).toBe("location");
      expect(getAddressPrefix("location_city")).toBe("location");
      expect(getAddressPrefix("location_state")).toBe("location");
      expect(getAddressPrefix("location_postal_code")).toBe("location");
      expect(getAddressPrefix("location_country")).toBe("location");
    });

    it("should handle different prefixes", () => {
      expect(getAddressPrefix("billing_line1")).toBe("billing");
      expect(getAddressPrefix("service_city")).toBe("service");
    });

    it("should return null for non-address fields", () => {
      expect(getAddressPrefix("email")).toBeNull();
      expect(getAddressPrefix("customer_id")).toBeNull();
      expect(getAddressPrefix("first_name")).toBeNull();
    });
  });

  describe("hasCompleteAddress", () => {
    it("should return true when all 6 fields exist", () => {
      const fieldNames = [
        "id",
        "name",
        "location_line1",
        "location_line2",
        "location_city",
        "location_state",
        "location_postal_code",
        "location_country",
        "email",
      ];

      expect(hasCompleteAddress(fieldNames, "location")).toBe(true);
    });

    it("should return false when any field is missing", () => {
      const fieldNames = [
        "location_line1",
        "location_line2",
        "location_city",
        "location_state",
        "location_postal_code",
        // missing location_country
      ];

      expect(hasCompleteAddress(fieldNames, "location")).toBe(false);
    });

    it("should return false for wrong prefix", () => {
      const fieldNames = [
        "billing_line1",
        "billing_line2",
        "billing_city",
        "billing_state",
        "billing_postal_code",
        "billing_country",
      ];

      expect(hasCompleteAddress(fieldNames, "location")).toBe(false);
      expect(hasCompleteAddress(fieldNames, "billing")).toBe(true);
    });
  });

  // ==========================================================================
  // INTEGRATION: Using in metadata
  // ==========================================================================

  describe("Integration: simulated metadata usage", () => {
    it("should work as designed in a metadata file", () => {
      // Simulating how this would be used in work-order-metadata.js
      const fields = {
        id: { type: "integer", readonly: true },
        email: FIELD.EMAIL,
        ...createAddressFields("location"),
        ...createAddressFields("billing", { required: true }),
      };

      // Should have standard fields
      expect(fields.id).toEqual({ type: "integer", readonly: true });
      expect(fields.email).toEqual(FIELD.EMAIL);

      // Should have 12 address fields (6 + 6)
      expect(fields.location_line1).toBeDefined();
      expect(fields.billing_line1).toBeDefined();

      // location should be optional
      expect(fields.location_line1.required).toBeUndefined();

      // billing should be required
      expect(fields.billing_line1.required).toBe(true);
    });

    it("should work for fieldAccess pattern", () => {
      const fieldAccess = {
        id: {
          create: "none",
          read: "customer",
          update: "none",
          delete: "none",
        },
        ...createAddressFieldAccess("location", "customer"),
        ...createAddressFieldAccess("billing", "dispatcher"),
      };

      // 1 + 6 + 6 = 13 entries
      expect(Object.keys(fieldAccess)).toHaveLength(13);

      // location editable by customer
      expect(fieldAccess.location_line1.update).toBe("customer");

      // billing editable by dispatcher
      expect(fieldAccess.billing_line1.update).toBe("dispatcher");
    });
  });
});
