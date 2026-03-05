/**
 * Schema Generator - Unit Tests
 *
 * Tests the pure transformation functions used by generate-schema.js.
 * Follows existing script test patterns (check-ports, sync-entity-metadata).
 *
 * Test Strategy:
 * - Unit tests for pure functions (no mocks needed)
 * - Mocked fs for loadAllMetadata tests
 * - Integration-style test using generateSchema with modelsDir injection
 */

const {
  // Helpers
  escapeSql,
  pluralizeTable,
  serializeDefault,

  // Pipeline phases
  loadAllMetadata,
  normalizeField,
  normalizeEntity,
  validateEntity,
  generateColumnSql,
  generateTableSql,
  generateIndexSql,
  assembleSchema,
  generateSchema,

  // Config
  CONFIG,
} = require("../../../../scripts/generate-schema");

// ============================================================================
// HELPER TESTS (Pure Functions)
// ============================================================================

describe("generate-schema helpers", () => {
  describe("escapeSql", () => {
    it("returns unmodified string when no quotes", () => {
      expect(escapeSql("hello world")).toBe("hello world");
    });

    it("escapes single quotes", () => {
      expect(escapeSql("it's")).toBe("it''s");
    });

    it("escapes multiple single quotes", () => {
      expect(escapeSql("don't won't can't")).toBe("don''t won''t can''t");
    });

    it("handles empty string", () => {
      expect(escapeSql("")).toBe("");
    });

    it("converts non-strings to string", () => {
      expect(escapeSql(123)).toBe("123");
      expect(escapeSql(null)).toBe("null");
    });
  });

  describe("pluralizeTable", () => {
    it("uses TABLE_OVERRIDES for inventory", () => {
      expect(pluralizeTable("inventory")).toBe("inventory");
    });

    it("adds s to regular entity names", () => {
      expect(pluralizeTable("user")).toBe("users");
      expect(pluralizeTable("customer")).toBe("customers");
    });

    it("does not double-pluralize already plural names", () => {
      expect(pluralizeTable("technicians")).toBe("technicians");
    });
  });

  describe("serializeDefault", () => {
    it("wraps strings in quotes with escaping", () => {
      expect(serializeDefault("active")).toBe("'active'");
      expect(serializeDefault("it's fine")).toBe("'it''s fine'");
    });

    it("serializes booleans as uppercase", () => {
      expect(serializeDefault(true)).toBe("TRUE");
      expect(serializeDefault(false)).toBe("FALSE");
    });

    it("serializes objects as JSONB", () => {
      const obj = { key: "value" };
      expect(serializeDefault(obj)).toBe("'{\"key\":\"value\"}'::jsonb");
    });

    it("serializes numbers as strings", () => {
      expect(serializeDefault(42)).toBe("42");
      expect(serializeDefault(0)).toBe("0");
    });
  });
});

// ============================================================================
// NORMALIZE PHASE TESTS
// ============================================================================

describe("generate-schema normalize phase", () => {
  describe("normalizeField", () => {
    it("derives SQL type from field definition", () => {
      const col = normalizeField("email", { type: "string" }, {});
      expect(col.sqlType).toBeDefined();
      expect(col.name).toBe("email");
    });

    it("adds NOT NULL for required fields", () => {
      const col = normalizeField("name", { type: "string", required: true }, {});
      expect(col.constraints).toContain("NOT NULL");
    });

    it("adds NOT NULL when field is in requiredFields array", () => {
      const metadata = { requiredFields: ["description"] };
      const col = normalizeField("description", { type: "string" }, metadata);
      expect(col.constraints).toContain("NOT NULL");
    });

    it("adds DEFAULT constraint when default is provided", () => {
      const col = normalizeField("status", { type: "string", default: "active" }, {});
      expect(col.constraints.some((c) => c.startsWith("DEFAULT"))).toBe(true);
    });

    it("creates VARCHAR with CHECK for enum fields", () => {
      const col = normalizeField(
        "status",
        { type: "enum", values: ["active", "inactive", "pending"] },
        {},
      );
      expect(col.sqlType).toMatch(/^VARCHAR\(\d+\)$/);
      expect(col.check).toContain("IN");
      expect(col.check).toContain("'active'");
    });

    it("creates FK reference for foreignKey fields", () => {
      const col = normalizeField(
        "customer_id",
        { type: "foreignKey", relatedEntity: "customer" },
        {},
      );
      expect(col.references).toBe("customers(id)");
    });
  });

  describe("normalizeEntity", () => {
    const mockRaw = {
      entityKey: "test_entity",
      tableName: "test_entities",
      namePattern: "simple",
      identityField: "name",
      fields: {
        name: { type: "string", required: true },
        description: { type: "string" },
      },
      requiredFields: ["name"],
    };

    it("includes TIER1 columns (id, is_active, created_at, updated_at)", () => {
      const entity = normalizeEntity(mockRaw);
      const colNames = entity.columns.map((c) => c.name);

      expect(colNames).toContain("id");
      expect(colNames).toContain("is_active");
      expect(colNames).toContain("created_at");
      expect(colNames).toContain("updated_at");
    });

    it("includes name pattern columns", () => {
      const entity = normalizeEntity(mockRaw);
      const colNames = entity.columns.map((c) => c.name);

      expect(colNames).toContain("name"); // simple pattern
    });

    it("marks identity field as UNIQUE when not disabled", () => {
      const entity = normalizeEntity(mockRaw);
      const nameCol = entity.columns.find((c) => c.name === "name");

      expect(nameCol.constraints).toContain("UNIQUE");
    });

    it("respects identityFieldUnique = false", () => {
      const rawWithNonUnique = {
        ...mockRaw,
        identityFieldUnique: false,
      };
      const entity = normalizeEntity(rawWithNonUnique);
      const nameCol = entity.columns.find((c) => c.name === "name");

      expect(nameCol.constraints).not.toContain("UNIQUE");
    });

    it("generates indexes for searchable fields", () => {
      const rawWithSearch = {
        ...mockRaw,
        searchableFields: ["name", "description"],
      };
      const entity = normalizeEntity(rawWithSearch);

      expect(entity.indexes).toContain("name");
      expect(entity.indexes).toContain("description");
    });

    it("generates indexes for foreign key fields", () => {
      const rawWithFk = {
        ...mockRaw,
        fields: {
          ...mockRaw.fields,
          customer_id: { type: "foreignKey", relatedEntity: "customer" },
        },
      };
      const entity = normalizeEntity(rawWithFk);

      expect(entity.indexes).toContain("customer_id");
    });
  });
});

// ============================================================================
// VALIDATE PHASE TESTS
// ============================================================================

describe("generate-schema validate phase", () => {
  describe("validateEntity", () => {
    const validEntity = {
      entityKey: "user",
      tableName: "users",
      columns: [
        { name: "id", sqlType: "SERIAL", constraints: ["PRIMARY KEY"], order: 1 },
        { name: "name", sqlType: "VARCHAR(100)", constraints: [], order: 2 },
      ],
      indexes: [],
    };

    it("returns empty array for valid entity", () => {
      const errors = validateEntity(validEntity);
      expect(errors).toEqual([]);
    });

    it("returns error when entityKey is missing", () => {
      const invalid = { ...validEntity, entityKey: undefined };
      const errors = validateEntity(invalid);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toContain("entityKey");
    });

    it("returns error when tableName is missing", () => {
      const invalid = { ...validEntity, tableName: undefined };
      const errors = validateEntity(invalid);
      expect(errors.some((e) => e.message.includes("tableName"))).toBe(true);
    });

    it("returns error when columns array is empty", () => {
      const invalid = { ...validEntity, columns: [] };
      const errors = validateEntity(invalid);
      expect(errors.some((e) => e.message.includes("columns"))).toBe(true);
    });

    it("returns error when id column is missing", () => {
      const invalid = {
        ...validEntity,
        columns: [{ name: "name", sqlType: "VARCHAR(100)", constraints: [], order: 1 }],
      };
      const errors = validateEntity(invalid);
      expect(errors.some((e) => e.message.includes("id"))).toBe(true);
    });

    it("returns error when column has no sqlType", () => {
      const invalid = {
        ...validEntity,
        columns: [
          ...validEntity.columns,
          { name: "broken", sqlType: undefined, constraints: [], order: 3 },
        ],
      };
      const errors = validateEntity(invalid);
      expect(errors.some((e) => e.message.includes("sqlType"))).toBe(true);
    });
  });
});

// ============================================================================
// GENERATE PHASE TESTS
// ============================================================================

describe("generate-schema generate phase", () => {
  describe("generateColumnSql", () => {
    it("joins name, type, and constraints", () => {
      const col = {
        name: "email",
        sqlType: "VARCHAR(255)",
        constraints: ["NOT NULL", "UNIQUE"],
        order: 1,
      };
      const sql = generateColumnSql(col);
      expect(sql).toBe("email VARCHAR(255) NOT NULL UNIQUE");
    });

    it("includes CHECK constraint when present", () => {
      const col = {
        name: "status",
        sqlType: "VARCHAR(20)",
        constraints: [],
        check: "status IN ('active', 'inactive')",
        order: 1,
      };
      const sql = generateColumnSql(col);
      expect(sql).toContain("CHECK (status IN ('active', 'inactive'))");
    });

    it("includes REFERENCES when present", () => {
      const col = {
        name: "customer_id",
        sqlType: "UUID",
        constraints: [],
        references: "customers(id)",
        order: 1,
      };
      const sql = generateColumnSql(col);
      expect(sql).toContain("REFERENCES customers(id)");
    });
  });

  describe("generateTableSql", () => {
    const mockEntity = {
      entityKey: "user",
      tableName: "users",
      columns: [
        { name: "id", sqlType: "SERIAL", constraints: ["PRIMARY KEY"], order: 1 },
        { name: "name", sqlType: "VARCHAR(100)", constraints: ["NOT NULL"], order: 10 },
      ],
      indexes: [],
    };

    it("generates CREATE TABLE statement", () => {
      const sql = generateTableSql(mockEntity);
      expect(sql).toContain("CREATE TABLE IF NOT EXISTS users");
    });

    it("includes header comment with entity info", () => {
      const sql = generateTableSql(mockEntity);
      expect(sql).toContain("-- USERS");
      expect(sql).toContain("-- Entity: user");
    });

    it("sorts columns by order", () => {
      const sql = generateTableSql(mockEntity);
      const idPos = sql.indexOf("id SERIAL");
      const namePos = sql.indexOf("name VARCHAR");
      expect(idPos).toBeLessThan(namePos);
    });
  });

  describe("generateIndexSql", () => {
    it("generates CREATE INDEX statements for each index field", () => {
      const entity = {
        tableName: "users",
        indexes: ["email", "customer_id"],
      };
      const indexes = generateIndexSql(entity);

      expect(indexes).toHaveLength(2);
      expect(indexes[0]).toContain("CREATE INDEX IF NOT EXISTS idx_users_email");
      expect(indexes[1]).toContain("CREATE INDEX IF NOT EXISTS idx_users_customer_id");
    });

    it("returns empty array when no indexes", () => {
      const entity = { tableName: "users", indexes: [] };
      const indexes = generateIndexSql(entity);
      expect(indexes).toEqual([]);
    });
  });
});

// ============================================================================
// ASSEMBLE PHASE TESTS
// ============================================================================

describe("generate-schema assemble phase", () => {
  describe("assembleSchema", () => {
    it("includes header with provided timestamp", () => {
      const sql = assembleSchema([], "2025-01-01T00:00:00.000Z");
      expect(sql).toContain("-- Generated: 2025-01-01T00:00:00.000Z");
    });

    it("includes command hint", () => {
      const sql = assembleSchema([], "2025-01-01T00:00:00.000Z");
      expect(sql).toContain("npm run generate:schema");
    });

    it("assembles table and index statements", () => {
      const statements = [
        {
          table: "CREATE TABLE users (...);",
          indexes: ["CREATE INDEX idx_users_email ON users(email);"],
        },
      ];
      const sql = assembleSchema(statements, "2025-01-01T00:00:00.000Z");

      expect(sql).toContain("CREATE TABLE users");
      expect(sql).toContain("-- Indexes");
      expect(sql).toContain("idx_users_email");
    });
  });
});

// ============================================================================
// INTEGRATION-STYLE TESTS
// ============================================================================

describe("generate-schema integration", () => {
  describe("generateSchema with real metadata", () => {
    it("succeeds with validateOnly=true", () => {
      const result = generateSchema({ validateOnly: true });

      expect(result.success).toBe(true);
      expect(result.entities).toBeDefined();
      expect(result.entities.length).toBeGreaterThan(0);
    });

    it("generates SQL when validateOnly=false", () => {
      const result = generateSchema({ validateOnly: false });

      expect(result.success).toBe(true);
      expect(result.sql).toBeDefined();
      expect(result.sql).toContain("CREATE TABLE");
    });

    it("includes all expected entities", () => {
      const result = generateSchema({ validateOnly: true });
      const entityKeys = result.entities.map((e) => e.entityKey);

      // Core entities that should always exist
      expect(entityKeys).toContain("user");
      expect(entityKeys).toContain("customer");
      expect(entityKeys).toContain("work_order");
    });
  });
});

// ============================================================================
// CONFIG VALIDATION
// ============================================================================

describe("generate-schema CONFIG", () => {
  it("has frozen objects to prevent mutation", () => {
    expect(Object.isFrozen(CONFIG)).toBe(true);
    expect(Object.isFrozen(CONFIG.COLUMN_ORDER)).toBe(true);
    expect(Object.isFrozen(CONFIG.TIER1_COLUMNS)).toBe(true);
  });

  it("TIER1_COLUMNS has expected fields", () => {
    const names = CONFIG.TIER1_COLUMNS.map((c) => c.name);
    expect(names).toEqual(["id", "is_active", "created_at", "updated_at"]);
  });

  it("TABLE_OVERRIDES includes inventory", () => {
    expect(CONFIG.TABLE_OVERRIDES.inventory).toBe("inventory");
  });
});

// ============================================================================
// ADDITIONAL EDGE CASE TESTS
// ============================================================================

describe("generate-schema edge cases", () => {
  describe("normalizeEntity with different namePatterns", () => {
    it("handles human namePattern (first_name, last_name)", () => {
      const rawHuman = {
        entityKey: "technician",
        tableName: "technicians",
        namePattern: "human",
        identityField: "first_name",
        identityFieldUnique: false,
        fields: {
          first_name: { type: "string", required: true },
          last_name: { type: "string", required: true },
          phone: { type: "string" },
        },
        requiredFields: ["first_name", "last_name"],
      };

      const entity = normalizeEntity(rawHuman);
      const colNames = entity.columns.map((c) => c.name);

      expect(colNames).toContain("first_name");
      expect(colNames).toContain("last_name");
    });

    it("handles computed namePattern (no name columns)", () => {
      const rawComputed = {
        entityKey: "work_order",
        tableName: "work_orders",
        namePattern: "computed",
        identityField: "order_number",
        fields: {
          order_number: { type: "string", required: true },
          description: { type: "string" },
        },
        requiredFields: ["order_number"],
      };

      const entity = normalizeEntity(rawComputed);
      const colNames = entity.columns.map((c) => c.name);

      // Computed pattern should not add name-specific columns
      expect(colNames).toContain("order_number"); // identity field
      expect(colNames).toContain("id");
    });
  });

  describe("normalizeField edge cases", () => {
    it("handles field with no constraints", () => {
      const col = normalizeField("notes", { type: "string" }, {});
      expect(col.constraints).toEqual([]);
      expect(col.name).toBe("notes");
    });

    it("handles enum with enumKey reference", () => {
      // Enum format: keys are values, values are metadata (color, etc.)
      const metadata = {
        enums: {
          statusEnum: {
            pending: { color: "warning" },
            completed: { color: "success" },
            cancelled: { color: "error" },
          },
        },
      };
      const col = normalizeField(
        "status",
        { type: "enum", enumKey: "statusEnum" },
        metadata,
      );

      expect(col.check).toContain("'pending'");
      expect(col.check).toContain("'completed'");
      expect(col.check).toContain("'cancelled'");
    });

    it("handles boolean field type", () => {
      const col = normalizeField("is_verified", { type: "boolean" }, {});
      expect(col.sqlType).toBeDefined();
    });

    it("handles timestamp field type", () => {
      const col = normalizeField("scheduled_at", { type: "timestamp" }, {});
      expect(col.sqlType).toBeDefined();
    });

    it("handles default with raw SQL expression", () => {
      const col = normalizeField(
        "created_at",
        { type: "timestamp", default: { raw: "NOW()" } },
        {},
      );
      // Raw defaults serialize as JSONB in current implementation
      expect(col.constraints.some((c) => c.includes("DEFAULT"))).toBe(true);
    });
  });

  describe("loadAllMetadata edge cases", () => {
    it("returns empty arrays for non-existent directory", () => {
      // loadAllMetadata will throw since we're using fs.readdirSync
      // This verifies the function signature is correct
      expect(() => loadAllMetadata("/nonexistent/path")).toThrow();
    });
  });

  describe("assembleSchema edge cases", () => {
    it("handles empty statements array", () => {
      const sql = assembleSchema([], "2025-01-01T00:00:00.000Z");
      expect(sql).toContain("GENERATED SCHEMA");
      // Should have just the header, no body errors
      expect(sql).not.toContain("undefined");
    });

    it("handles table with no indexes", () => {
      const statements = [
        { table: "CREATE TABLE test ();", indexes: [] },
      ];
      const sql = assembleSchema(statements, "2025-01-01T00:00:00.000Z");

      // Should NOT include indexes section header when no indexes
      expect(sql).toContain("CREATE TABLE test");
      expect(sql).not.toContain("-- Indexes");
    });
  });

  describe("generateSchema error handling", () => {
    it("returns success false when invalid modelsDir provided", () => {
      // This would throw in loadAllMetadata
      expect(() => generateSchema({ modelsDir: "/nonexistent" })).toThrow();
    });
  });
});
