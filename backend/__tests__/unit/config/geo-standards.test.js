/**
 * Geographic Standards Unit Tests
 *
 * Tests for geo-standards.js - country/state data and validation
 */

const {
  SUPPORTED_COUNTRIES,
  DEFAULT_COUNTRY,
  COUNTRY_NAMES,
  SUBDIVISIONS_BY_COUNTRY,
  ALL_SUBDIVISIONS,
  US_STATES,
  CA_PROVINCES,
  isValidCountry,
  isValidSubdivision,
  isValidSubdivisionForCountry,
  getSubdivisionsForCountry,
  getSubdivisionName,
  getCountryName,
} = require("../../../config/geo-standards");

describe("geo-standards", () => {
  // ==========================================================================
  // CONSTANTS
  // ==========================================================================

  describe("SUPPORTED_COUNTRIES", () => {
    it("should include US and CA", () => {
      expect(SUPPORTED_COUNTRIES).toContain("US");
      expect(SUPPORTED_COUNTRIES).toContain("CA");
    });

    it("should be frozen", () => {
      expect(Object.isFrozen(SUPPORTED_COUNTRIES)).toBe(true);
    });
  });

  describe("DEFAULT_COUNTRY", () => {
    it("should be US", () => {
      expect(DEFAULT_COUNTRY).toBe("US");
    });
  });

  describe("COUNTRY_NAMES", () => {
    it("should have display names for all supported countries", () => {
      for (const code of SUPPORTED_COUNTRIES) {
        expect(COUNTRY_NAMES[code]).toBeDefined();
        expect(typeof COUNTRY_NAMES[code]).toBe("string");
      }
    });

    it("should have correct names", () => {
      expect(COUNTRY_NAMES.US).toBe("United States");
      expect(COUNTRY_NAMES.CA).toBe("Canada");
    });
  });

  describe("US_STATES", () => {
    it("should include all 50 states plus DC", () => {
      // 50 states + DC + 5 territories = 56
      expect(US_STATES.length).toBeGreaterThanOrEqual(51);
    });

    it("should include Pacific Northwest states", () => {
      expect(US_STATES).toContain("OR");
      expect(US_STATES).toContain("WA");
    });

    it("should include DC", () => {
      expect(US_STATES).toContain("DC");
    });

    it("should include territories", () => {
      expect(US_STATES).toContain("PR"); // Puerto Rico
      expect(US_STATES).toContain("GU"); // Guam
    });

    it("should be frozen", () => {
      expect(Object.isFrozen(US_STATES)).toBe(true);
    });
  });

  describe("CA_PROVINCES", () => {
    it("should include all 13 provinces and territories", () => {
      expect(CA_PROVINCES.length).toBe(13);
    });

    it("should include major provinces", () => {
      expect(CA_PROVINCES).toContain("BC"); // British Columbia
      expect(CA_PROVINCES).toContain("ON"); // Ontario
      expect(CA_PROVINCES).toContain("QC"); // Quebec
      expect(CA_PROVINCES).toContain("AB"); // Alberta
    });

    it("should be frozen", () => {
      expect(Object.isFrozen(CA_PROVINCES)).toBe(true);
    });
  });

  describe("ALL_SUBDIVISIONS", () => {
    it("should include all US states", () => {
      for (const state of US_STATES) {
        expect(ALL_SUBDIVISIONS).toContain(state);
      }
    });

    it("should include all CA provinces", () => {
      for (const province of CA_PROVINCES) {
        expect(ALL_SUBDIVISIONS).toContain(province);
      }
    });

    it("should be the combined count", () => {
      expect(ALL_SUBDIVISIONS.length).toBe(
        US_STATES.length + CA_PROVINCES.length,
      );
    });

    it("should be frozen", () => {
      expect(Object.isFrozen(ALL_SUBDIVISIONS)).toBe(true);
    });
  });

  describe("SUBDIVISIONS_BY_COUNTRY", () => {
    it("should map US to US_STATES", () => {
      expect(SUBDIVISIONS_BY_COUNTRY.US).toEqual(US_STATES);
    });

    it("should map CA to CA_PROVINCES", () => {
      expect(SUBDIVISIONS_BY_COUNTRY.CA).toEqual(CA_PROVINCES);
    });
  });

  // ==========================================================================
  // HELPER FUNCTIONS
  // ==========================================================================

  describe("isValidCountry", () => {
    it("should return true for supported countries", () => {
      expect(isValidCountry("US")).toBe(true);
      expect(isValidCountry("CA")).toBe(true);
    });

    it("should return false for unsupported countries", () => {
      expect(isValidCountry("MX")).toBe(false);
      expect(isValidCountry("GB")).toBe(false);
      expect(isValidCountry("XX")).toBe(false);
    });

    it("should be case-sensitive", () => {
      expect(isValidCountry("us")).toBe(false);
      expect(isValidCountry("Us")).toBe(false);
    });
  });

  describe("isValidSubdivision", () => {
    it("should return true for valid US states", () => {
      expect(isValidSubdivision("OR")).toBe(true);
      expect(isValidSubdivision("WA")).toBe(true);
      expect(isValidSubdivision("CA")).toBe(true); // California, not Canada
    });

    it("should return true for valid CA provinces", () => {
      expect(isValidSubdivision("BC")).toBe(true);
      expect(isValidSubdivision("ON")).toBe(true);
    });

    it("should return false for invalid codes", () => {
      expect(isValidSubdivision("XX")).toBe(false);
      expect(isValidSubdivision("ZZ")).toBe(false);
    });

    it("should be case-sensitive", () => {
      expect(isValidSubdivision("or")).toBe(false);
      expect(isValidSubdivision("Or")).toBe(false);
    });
  });

  describe("isValidSubdivisionForCountry", () => {
    it("should return true for matching country/subdivision", () => {
      expect(isValidSubdivisionForCountry("OR", "US")).toBe(true);
      expect(isValidSubdivisionForCountry("BC", "CA")).toBe(true);
    });

    it("should return false for mismatched country/subdivision", () => {
      expect(isValidSubdivisionForCountry("OR", "CA")).toBe(false);
      expect(isValidSubdivisionForCountry("BC", "US")).toBe(false);
    });

    it("should return false for unsupported country", () => {
      expect(isValidSubdivisionForCountry("XX", "MX")).toBe(false);
    });
  });

  describe("getSubdivisionsForCountry", () => {
    it("should return US states for US", () => {
      expect(getSubdivisionsForCountry("US")).toEqual(US_STATES);
    });

    it("should return CA provinces for CA", () => {
      expect(getSubdivisionsForCountry("CA")).toEqual(CA_PROVINCES);
    });

    it("should return empty array for unsupported country", () => {
      expect(getSubdivisionsForCountry("MX")).toEqual([]);
      expect(getSubdivisionsForCountry("XX")).toEqual([]);
    });
  });

  describe("getSubdivisionName", () => {
    it("should return correct name for US states", () => {
      expect(getSubdivisionName("OR", "US")).toBe("Oregon");
      expect(getSubdivisionName("WA", "US")).toBe("Washington");
      expect(getSubdivisionName("DC", "US")).toBe("District of Columbia");
    });

    it("should return correct name for CA provinces", () => {
      expect(getSubdivisionName("BC", "CA")).toBe("British Columbia");
      expect(getSubdivisionName("ON", "CA")).toBe("Ontario");
    });

    it("should return null for invalid subdivision", () => {
      expect(getSubdivisionName("XX", "US")).toBeNull();
    });

    it("should return null for invalid country", () => {
      expect(getSubdivisionName("OR", "MX")).toBeNull();
    });
  });

  describe("getCountryName", () => {
    it("should return correct names", () => {
      expect(getCountryName("US")).toBe("United States");
      expect(getCountryName("CA")).toBe("Canada");
    });

    it("should return null for unsupported country", () => {
      expect(getCountryName("MX")).toBeNull();
      expect(getCountryName("XX")).toBeNull();
    });
  });
});
