/**
 * Output Filter Helper Unit Tests
 *
 * Tests for: backend/db/helpers/output-filter-helper.js
 *
 * Coverage:
 * - filterOutput() - Single record filtering
 * - filterOutputArray() - Array filtering
 * - isSensitiveField() - Field sensitivity check
 * - getAlwaysSensitiveFields() - List of default sensitive fields
 * - Edge cases (null, undefined, arrays, nested objects)
 * - Metadata-driven configuration (sensitiveFields, outputFields)
 */

const {
  filterOutput,
  filterOutputArray,
  isSensitiveField,
  getAlwaysSensitiveFields,
  _ALWAYS_SENSITIVE,
} = require("../../../db/helpers/output-filter-helper");

describe("Output Filter Helper", () => {
  // ============================================================================
  // TEST FIXTURES
  // ============================================================================

  const userWithSensitiveFields = {
    id: 1,
    email: "test@example.com",
    first_name: "John",
    last_name: "Doe",
    auth0_id: "auth0|abc123xyz", // Sensitive - should be stripped
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
  // filterOutput() TESTS
  // ============================================================================

  describe("filterOutput()", () => {
    describe("always-sensitive fields", () => {
      it("should strip auth0_id from user records", () => {
        const result = filterOutput(userWithSensitiveFields, {});

        expect(result.auth0_id).toBeUndefined();
        expect(result.email).toBe("test@example.com");
        expect(result.id).toBe(1);
      });

      it("should strip refresh_token if present", () => {
        const record = { id: 1, name: "Test", refresh_token: "secret-token" };
        const result = filterOutput(record, {});

        expect(result.refresh_token).toBeUndefined();
        expect(result.name).toBe("Test");
      });

      it("should strip api_key if present", () => {
        const record = { id: 1, name: "Test", api_key: "sk-1234567890" };
        const result = filterOutput(record, {});

        expect(result.api_key).toBeUndefined();
      });

      it("should strip all always-sensitive fields", () => {
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

        const result = filterOutput(recordWithAll, {});

        expect(result.auth0_id).toBeUndefined();
        expect(result.refresh_token).toBeUndefined();
        expect(result.api_key).toBeUndefined();
        expect(result.api_secret).toBeUndefined();
        expect(result.secret_key).toBeUndefined();
        expect(result.private_key).toBeUndefined();
        expect(result.email).toBe("test@example.com");
        expect(result.id).toBe(1);
      });
    });

    describe("metadata.sensitiveFields", () => {
      it("should strip additional fields defined in metadata", () => {
        const record = {
          id: 1,
          email: "test@example.com",
          internal_notes: "VIP customer - handle with care",
          credit_score: 750,
        };

        const metadata = {
          sensitiveFields: ["internal_notes", "credit_score"],
        };

        const result = filterOutput(record, metadata);

        expect(result.internal_notes).toBeUndefined();
        expect(result.credit_score).toBeUndefined();
        expect(result.email).toBe("test@example.com");
      });

      it("should combine always-sensitive with metadata-defined", () => {
        const record = {
          id: 1,
          auth0_id: "auth0|123",
          ssn: "123-45-6789",
          email: "test@example.com",
        };

        const metadata = {
          sensitiveFields: ["ssn"],
        };

        const result = filterOutput(record, metadata);

        expect(result.auth0_id).toBeUndefined(); // Always sensitive
        expect(result.ssn).toBeUndefined(); // Metadata sensitive
        expect(result.email).toBe("test@example.com");
      });
    });

    describe("metadata.outputFields (whitelist mode)", () => {
      it("should only include whitelisted fields", () => {
        const record = {
          id: 1,
          email: "test@example.com",
          first_name: "John",
          last_name: "Doe",
          internal_data: "secret",
          created_at: "2025-01-01",
        };

        const metadata = {
          outputFields: ["id", "email", "first_name", "last_name"],
        };

        const result = filterOutput(record, metadata);

        expect(result).toEqual({
          id: 1,
          email: "test@example.com",
          first_name: "John",
          last_name: "Doe",
        });
        expect(result.internal_data).toBeUndefined();
        expect(result.created_at).toBeUndefined();
      });

      it("should still strip always-sensitive even if whitelisted", () => {
        const record = {
          id: 1,
          email: "test@example.com",
          auth0_id: "auth0|123",
        };

        const metadata = {
          outputFields: ["id", "email", "auth0_id"], // Whitelist includes auth0_id
        };

        const result = filterOutput(record, metadata);

        expect(result.id).toBe(1);
        expect(result.email).toBe("test@example.com");
        expect(result.auth0_id).toBeUndefined(); // Still stripped - security trumps whitelist
      });

      it("should handle empty whitelist", () => {
        const record = { id: 1, email: "test@example.com" };

        const result = filterOutput(record, { outputFields: [] });

        // Empty whitelist falls back to blacklist mode
        expect(result.id).toBe(1);
        expect(result.email).toBe("test@example.com");
      });
    });

    describe("edge cases", () => {
      it("should return null for null input", () => {
        expect(filterOutput(null, {})).toBeNull();
      });

      it("should return undefined for undefined input", () => {
        expect(filterOutput(undefined, {})).toBeUndefined();
      });

      it("should handle empty object", () => {
        expect(filterOutput({}, {})).toEqual({});
      });

      it("should handle missing metadata", () => {
        const record = {
          id: 1,
          auth0_id: "auth0|123",
          email: "test@example.com",
        };
        const result = filterOutput(record);

        expect(result.auth0_id).toBeUndefined();
        expect(result.email).toBe("test@example.com");
      });

      it("should not mutate original record", () => {
        const original = {
          id: 1,
          auth0_id: "auth0|123",
          email: "test@example.com",
        };
        const originalCopy = { ...original };

        filterOutput(original, {});

        expect(original).toEqual(originalCopy);
      });

      it("should redirect arrays to filterOutputArray", () => {
        const records = [
          { id: 1, auth0_id: "auth0|1", email: "a@example.com" },
          { id: 2, auth0_id: "auth0|2", email: "b@example.com" },
        ];

        const result = filterOutput(records, {});

        expect(Array.isArray(result)).toBe(true);
        expect(result[0].auth0_id).toBeUndefined();
        expect(result[1].auth0_id).toBeUndefined();
      });
    });
  });

  // ============================================================================
  // filterOutputArray() TESTS
  // ============================================================================

  describe("filterOutputArray()", () => {
    it("should filter all records in array", () => {
      const records = [
        { id: 1, auth0_id: "auth0|1", email: "a@example.com" },
        { id: 2, auth0_id: "auth0|2", email: "b@example.com" },
        { id: 3, auth0_id: "auth0|3", email: "c@example.com" },
      ];

      const result = filterOutputArray(records, {});

      expect(result.length).toBe(3);
      result.forEach((record, i) => {
        expect(record.auth0_id).toBeUndefined();
        expect(record.id).toBe(i + 1);
      });
    });

    it("should handle empty array", () => {
      expect(filterOutputArray([], {})).toEqual([]);
    });

    it("should handle non-array input gracefully", () => {
      const record = { id: 1, auth0_id: "auth0|123" };
      const result = filterOutputArray(record, {});

      expect(result.auth0_id).toBeUndefined();
      expect(result.id).toBe(1);
    });

    it("should apply metadata to all records", () => {
      const records = [
        { id: 1, secret: "a", name: "First" },
        { id: 2, secret: "b", name: "Second" },
      ];

      const metadata = { sensitiveFields: ["secret"] };
      const result = filterOutputArray(records, metadata);

      expect(result[0].secret).toBeUndefined();
      expect(result[1].secret).toBeUndefined();
      expect(result[0].name).toBe("First");
      expect(result[1].name).toBe("Second");
    });
  });

  // ============================================================================
  // isSensitiveField() TESTS
  // ============================================================================

  describe("isSensitiveField()", () => {
    it("should return true for always-sensitive fields", () => {
      expect(isSensitiveField("auth0_id")).toBe(true);
      expect(isSensitiveField("refresh_token")).toBe(true);
      expect(isSensitiveField("api_key")).toBe(true);
    });

    it("should return true for metadata-defined sensitive fields", () => {
      const metadata = { sensitiveFields: ["ssn", "credit_score"] };

      expect(isSensitiveField("ssn", metadata)).toBe(true);
      expect(isSensitiveField("credit_score", metadata)).toBe(true);
    });

    it("should return false for non-sensitive fields", () => {
      expect(isSensitiveField("id")).toBe(false);
      expect(isSensitiveField("email")).toBe(false);
      expect(isSensitiveField("first_name")).toBe(false);
    });
  });

  // ============================================================================
  // getAlwaysSensitiveFields() TESTS
  // ============================================================================

  describe("getAlwaysSensitiveFields()", () => {
    it("should return array of always-sensitive field names", () => {
      const fields = getAlwaysSensitiveFields();

      expect(Array.isArray(fields)).toBe(true);
      expect(fields).toContain("auth0_id");
      expect(fields).toContain("refresh_token");
      expect(fields).toContain("api_key");
    });

    it("should return a copy (not the original array)", () => {
      const fields1 = getAlwaysSensitiveFields();
      const fields2 = getAlwaysSensitiveFields();

      expect(fields1).not.toBe(fields2);
      expect(fields1).toEqual(fields2);
    });

    it("should NOT include password fields (Auth0 handles auth)", () => {
      const fields = getAlwaysSensitiveFields();

      expect(fields).not.toContain("password");
      expect(fields).not.toContain("password_hash");
    });
  });

  // ============================================================================
  // _ALWAYS_SENSITIVE (internal) TESTS
  // ============================================================================

  describe("_ALWAYS_SENSITIVE (internal)", () => {
    it("should be an array", () => {
      expect(Array.isArray(_ALWAYS_SENSITIVE)).toBe(true);
    });

    it("should contain auth0_id (our only auth-related field)", () => {
      expect(_ALWAYS_SENSITIVE).toContain("auth0_id");
    });

    it("should contain future-proofing fields", () => {
      expect(_ALWAYS_SENSITIVE).toContain("refresh_token");
      expect(_ALWAYS_SENSITIVE).toContain("api_key");
      expect(_ALWAYS_SENSITIVE).toContain("api_secret");
      expect(_ALWAYS_SENSITIVE).toContain("secret_key");
      expect(_ALWAYS_SENSITIVE).toContain("private_key");
    });
  });

  // ============================================================================
  // REAL-WORLD INTEGRATION SCENARIOS
  // ============================================================================

  describe("Real-world integration scenarios", () => {
    describe("User API response", () => {
      it("should return safe user data for API", () => {
        const dbUser = {
          id: 42,
          email: "john@example.com",
          first_name: "John",
          last_name: "Doe",
          auth0_id: "auth0|507f1f77bcf86cd799439011",
          role_id: 2,
          status: "active",
          is_active: true,
          created_at: "2025-01-15T10:30:00Z",
          updated_at: "2025-01-20T14:45:00Z",
        };

        const result = filterOutput(dbUser, userMetadata);

        expect(result).toEqual({
          id: 42,
          email: "john@example.com",
          first_name: "John",
          last_name: "Doe",
          role_id: 2,
          status: "active",
          is_active: true,
          created_at: "2025-01-15T10:30:00Z",
          updated_at: "2025-01-20T14:45:00Z",
        });
      });
    });

    describe("Customer list API response", () => {
      it("should filter array of customers", () => {
        const dbCustomers = [
          {
            id: 1,
            email: "cust1@example.com",
            api_key: "key1",
            company_name: "ACME",
          },
          {
            id: 2,
            email: "cust2@example.com",
            api_key: "key2",
            company_name: "Globex",
          },
        ];

        const result = filterOutputArray(dbCustomers, {});

        expect(result).toEqual([
          { id: 1, email: "cust1@example.com", company_name: "ACME" },
          { id: 2, email: "cust2@example.com", company_name: "Globex" },
        ]);
      });
    });

    describe("Role response (no sensitive fields)", () => {
      it("should return role unchanged (no sensitive fields)", () => {
        const dbRole = {
          id: 1,
          name: "admin",
          description: "Full access",
          priority: 5,
          status: "active",
          is_active: true,
        };

        const result = filterOutput(dbRole, { tableName: "roles" });

        expect(result).toEqual(dbRole);
      });
    });
  });
});
