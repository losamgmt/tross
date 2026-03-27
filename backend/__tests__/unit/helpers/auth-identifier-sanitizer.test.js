/**
 * Auth Identifier Sanitizer Unit Tests
 *
 * Tests for: backend/db/helpers/auth-identifier-sanitizer.js
 *
 * Coverage:
 * - stripAuthIdentifiers() - Single record sanitization
 * - stripAuthIdentifiersArray() - Array sanitization
 * - isAuthIdentifier() - Field check
 * - getAuthIdentifierFields() - List of auth identifier fields
 * - Backward compatibility (filterOutput, filterOutputArray)
 * - Edge cases (null, undefined, arrays, nested objects)
 */

const {
  // New names
  stripAuthIdentifiers,
  stripAuthIdentifiersArray,
  isAuthIdentifier,
  getAuthIdentifierFields,
  _AUTH_IDENTIFIERS,
  // Legacy aliases (for backward compatibility)
  filterOutput,
  filterOutputArray,
  isSensitiveField,
  getAlwaysSensitiveFields,
  _ALWAYS_SENSITIVE,
} = require("../../../db/helpers/auth-identifier-sanitizer");

describe("Auth Identifier Sanitizer", () => {
  // ============================================================================
  // TEST FIXTURES
  // ============================================================================

  const userWithAuthIdentifiers = {
    id: 1,
    email: "test@example.com",
    first_name: "John",
    last_name: "Doe",
    auth0_id: "auth0|abc123xyz", // Auth identifier - should be stripped
    role_id: 2,
    status: "active",
    is_active: true,
    created_at: "2025-01-01T00:00:00Z",
  };

  const userMetadata = {
    tableName: "users",
    sensitiveFields: ["auth0_id"],
  };

  const cleanUser = {
    id: 1,
    email: "test@example.com",
    first_name: "John",
    last_name: "Doe",
    role_id: 2,
    status: "active",
    is_active: true,
    created_at: "2025-01-01T00:00:00Z",
  };

  // ============================================================================
  // stripAuthIdentifiers() TESTS
  // ============================================================================

  describe("stripAuthIdentifiers()", () => {
    describe("auth identifier fields", () => {
      it("should strip auth0_id from user records", () => {
        const result = stripAuthIdentifiers(userWithAuthIdentifiers, {});

        expect(result.auth0_id).toBeUndefined();
        expect(result.email).toBe("test@example.com");
        expect(result.id).toBe(1);
      });

      it("should strip refresh_token if present", () => {
        const record = { id: 1, name: "Test", refresh_token: "secret-token" };
        const result = stripAuthIdentifiers(record, {});

        expect(result.refresh_token).toBeUndefined();
        expect(result.name).toBe("Test");
      });

      it("should strip api_key if present", () => {
        const record = { id: 1, name: "Test", api_key: "sk-1234567890" };
        const result = stripAuthIdentifiers(record, {});

        expect(result.api_key).toBeUndefined();
      });

      it("should strip all auth identifier fields", () => {
        const recordWithAll = {
          id: 1,
          auth0_id: "auth0|123",
          refresh_token: "token",
          api_key: "key",
          api_secret: "secret",
          secret_key: "secret",
          private_key: "private",
          email: "test@example.com",
        };

        const result = stripAuthIdentifiers(recordWithAll, {});

        expect(result.auth0_id).toBeUndefined();
        expect(result.refresh_token).toBeUndefined();
        expect(result.api_key).toBeUndefined();
        expect(result.api_secret).toBeUndefined();
        expect(result.secret_key).toBeUndefined();
        expect(result.private_key).toBeUndefined();
        expect(result.email).toBe("test@example.com");
      });
    });

    describe("metadata sensitiveFields", () => {
      it("should strip fields listed in metadata.sensitiveFields", () => {
        const record = { id: 1, name: "Test", internal_code: "SECRET123" };
        const metadata = { sensitiveFields: ["internal_code"] };

        const result = stripAuthIdentifiers(record, metadata);

        expect(result.internal_code).toBeUndefined();
        expect(result.name).toBe("Test");
      });

      it("should combine auth identifiers with metadata sensitiveFields", () => {
        const record = {
          id: 1,
          name: "Test",
          auth0_id: "auth0|123",
          internal_code: "SECRET",
        };
        const metadata = { sensitiveFields: ["internal_code"] };

        const result = stripAuthIdentifiers(record, metadata);

        expect(result.auth0_id).toBeUndefined();
        expect(result.internal_code).toBeUndefined();
        expect(result.name).toBe("Test");
      });
    });

    describe("edge cases", () => {
      it("should handle null input gracefully", () => {
        const result = stripAuthIdentifiers(null, {});
        expect(result).toBeNull();
      });

      it("should handle undefined input gracefully", () => {
        const result = stripAuthIdentifiers(undefined, {});
        expect(result).toBeUndefined();
      });

      it("should handle empty object", () => {
        const result = stripAuthIdentifiers({}, {});
        expect(result).toEqual({});
      });

      it("should not mutate the original record", () => {
        const original = { id: 1, auth0_id: "auth0|123" };
        const originalCopy = { ...original };

        stripAuthIdentifiers(original, {});

        expect(original).toEqual(originalCopy);
      });

      it("should handle missing metadata gracefully", () => {
        const result = stripAuthIdentifiers(userWithAuthIdentifiers);
        expect(result.auth0_id).toBeUndefined();
        expect(result.email).toBe("test@example.com");
      });
    });
  });

  // ============================================================================
  // stripAuthIdentifiersArray() TESTS
  // ============================================================================

  describe("stripAuthIdentifiersArray()", () => {
    it("should strip auth identifiers from all records in array", () => {
      const records = [
        { id: 1, email: "a@test.com", auth0_id: "auth0|1" },
        { id: 2, email: "b@test.com", auth0_id: "auth0|2" },
      ];

      const result = stripAuthIdentifiersArray(records, {});

      expect(result).toHaveLength(2);
      expect(result[0].auth0_id).toBeUndefined();
      expect(result[1].auth0_id).toBeUndefined();
      expect(result[0].email).toBe("a@test.com");
      expect(result[1].email).toBe("b@test.com");
    });

    it("should handle empty array", () => {
      const result = stripAuthIdentifiersArray([], {});
      expect(result).toEqual([]);
    });

    it("should not mutate the original array", () => {
      const original = [{ id: 1, auth0_id: "auth0|123" }];
      const originalCopy = [...original.map(r => ({ ...r }))];

      stripAuthIdentifiersArray(original, {});

      expect(original).toEqual(originalCopy);
    });
  });

  // ============================================================================
  // isAuthIdentifier() TESTS
  // ============================================================================

  describe("isAuthIdentifier()", () => {
    it("should return true for auth0_id", () => {
      expect(isAuthIdentifier("auth0_id")).toBe(true);
    });

    it("should return true for all auth identifier fields", () => {
      const fields = ["auth0_id", "refresh_token", "api_key", "api_secret", "secret_key", "private_key"];
      fields.forEach(field => {
        expect(isAuthIdentifier(field)).toBe(true);
      });
    });

    it("should return true for metadata sensitiveFields", () => {
      const metadata = { sensitiveFields: ["custom_secret"] };
      expect(isAuthIdentifier("custom_secret", metadata)).toBe(true);
    });

    it("should return false for regular fields", () => {
      expect(isAuthIdentifier("email")).toBe(false);
      expect(isAuthIdentifier("name")).toBe(false);
      expect(isAuthIdentifier("id")).toBe(false);
    });
  });

  // ============================================================================
  // getAuthIdentifierFields() TESTS
  // ============================================================================

  describe("getAuthIdentifierFields()", () => {
    it("should return array of auth identifier field names", () => {
      const fields = getAuthIdentifierFields();
      expect(Array.isArray(fields)).toBe(true);
      expect(fields).toContain("auth0_id");
      expect(fields).toContain("api_key");
    });

    it("should not include regular fields", () => {
      const fields = getAuthIdentifierFields();
      expect(fields).not.toContain("email");
      expect(fields).not.toContain("id");
    });
  });

  // ============================================================================
  // BACKWARD COMPATIBILITY TESTS
  // ============================================================================

  describe("Backward Compatibility", () => {
    it("filterOutput should be an alias for stripAuthIdentifiers", () => {
      expect(filterOutput).toBe(stripAuthIdentifiers);
    });

    it("filterOutputArray should be an alias for stripAuthIdentifiersArray", () => {
      expect(filterOutputArray).toBe(stripAuthIdentifiersArray);
    });

    it("isSensitiveField should be an alias for isAuthIdentifier", () => {
      expect(isSensitiveField).toBe(isAuthIdentifier);
    });

    it("getAlwaysSensitiveFields should be an alias for getAuthIdentifierFields", () => {
      expect(getAlwaysSensitiveFields).toBe(getAuthIdentifierFields);
    });

    it("_ALWAYS_SENSITIVE should match _AUTH_IDENTIFIERS", () => {
      expect(_ALWAYS_SENSITIVE).toEqual(_AUTH_IDENTIFIERS);
    });

    it("filterOutput should work identically to stripAuthIdentifiers", () => {
      const record = { id: 1, auth0_id: "auth0|123", email: "test@test.com" };
      
      const result1 = filterOutput(record, {});
      const result2 = stripAuthIdentifiers(record, {});

      expect(result1).toEqual(result2);
    });
  });

  // ============================================================================
  // EXPORTS TESTS
  // ============================================================================

  describe("Exports", () => {
    it("should export _AUTH_IDENTIFIERS for testing", () => {
      expect(_AUTH_IDENTIFIERS).toBeDefined();
      expect(Array.isArray(_AUTH_IDENTIFIERS)).toBe(true);
      expect(_AUTH_IDENTIFIERS).toContain("auth0_id");
    });
  });
});
