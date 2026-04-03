/**
 * Entity Metadata Sync - Unit Tests
 *
 * Tests the pure transformation functions used by sync-entity-metadata.js
 */

const {
  getPluralForm,
  transformField,
  transformPreferenceSchema,
  transformModel,
  PLURAL_OVERRIDES,
} = require("../../../../scripts/sync-entity-metadata");

describe("sync-entity-metadata", () => {
  describe("getPluralForm", () => {
    it("uses explicit overrides when available", () => {
      expect(getPluralForm("User")).toBe("Users");
      expect(getPluralForm("Inventory")).toBe("Inventory"); // Uncountable
    });

    it("handles words ending in consonant + y", () => {
      expect(getPluralForm("Category")).toBe("Categories");
      expect(getPluralForm("Company")).toBe("Companies");
    });

    it("handles words ending in vowel + y", () => {
      expect(getPluralForm("Key")).toBe("Keys");
      expect(getPluralForm("Day")).toBe("Days");
    });

    it("handles words ending in s, x, ch, sh", () => {
      expect(getPluralForm("Bus")).toBe("Buses");
      expect(getPluralForm("Box")).toBe("Boxes");
      expect(getPluralForm("Match")).toBe("Matches");
      expect(getPluralForm("Dish")).toBe("Dishes");
    });

    it("adds s for regular nouns", () => {
      expect(getPluralForm("Car")).toBe("Cars");
      expect(getPluralForm("Book")).toBe("Books");
    });
  });

  describe("transformField", () => {
    it("transforms basic field with type", () => {
      const result = transformField("name", { type: "string" }, {}, {});
      expect(result).toEqual({ type: "string" });
    });

    it("includes required flag when present", () => {
      const result = transformField(
        "email",
        { type: "string", required: true },
        {},
        {},
      );
      expect(result).toEqual({ type: "string", required: true });
    });

    it("includes maxLength when present", () => {
      const result = transformField(
        "description",
        { type: "string", maxLength: 500 },
        {},
        {},
      );
      expect(result).toEqual({ type: "string", maxLength: 500 });
    });

    it("includes enum values when present", () => {
      const result = transformField(
        "status",
        { type: "enum", values: ["active", "inactive"] },
        {},
        {},
      );
      expect(result).toEqual({ type: "enum", values: ["active", "inactive"] });
    });

    it("transforms foreignKey fields with references", () => {
      const allModels = {
        role: {
          tableName: "roles",
          identityField: "name",
        },
      };
      const result = transformField(
        "role_id",
        { type: "foreignKey", references: "role" },
        {},
        allModels,
      );
      expect(result.type).toBe("foreignKey");
      expect(result.references).toBe("role");
      expect(result.displayField).toBe("name");
    });

    it("uses explicit displayField when provided", () => {
      const allModels = {
        user: {
          tableName: "users",
          identityField: "email",
          displayField: "full_name",
        },
      };
      const result = transformField(
        "user_id",
        { type: "foreignKey", references: "user", displayField: "email" },
        {},
        allModels,
      );
      expect(result.type).toBe("foreignKey");
      expect(result.references).toBe("user");
      expect(result.displayField).toBe("email"); // Uses explicit over inferred
    });

    it("does not transform integer fields without references as FK", () => {
      // Integer fields stay as integers unless explicitly typed as foreignKey
      const result = transformField(
        "count",
        { type: "integer" },
        {},
        {},
      );
      expect(result.type).toBe("integer");
      expect(result.references).toBeUndefined();
    });
  });

  describe("transformPreferenceSchema", () => {
    it("adds label from key when not provided", () => {
      const schema = {
        notificationsEnabled: { type: "boolean", default: true },
      };
      const result = transformPreferenceSchema(schema);
      expect(result.notificationsEnabled.label).toBe("Notifications Enabled");
    });

    it("preserves existing label", () => {
      const schema = {
        theme: {
          type: "enum",
          label: "Color Theme",
          values: ["light", "dark"],
        },
      };
      const result = transformPreferenceSchema(schema);
      expect(result.theme.label).toBe("Color Theme");
    });

    it("generates displayLabels for enum values", () => {
      const schema = {
        theme: { type: "enum", values: ["light", "dark", "system"] },
      };
      const result = transformPreferenceSchema(schema);
      expect(result.theme.displayLabels).toEqual({
        light: "Light",
        dark: "Dark",
        system: "System",
      });
    });

    it("adds order when not specified", () => {
      const schema = {
        first: { type: "boolean" },
        second: { type: "boolean" },
        third: { type: "boolean" },
      };
      const result = transformPreferenceSchema(schema);
      expect(result.first.order).toBe(0);
      expect(result.second.order).toBe(1);
      expect(result.third.order).toBe(2);
    });
  });

  describe("transformModel", () => {
    it("transforms minimal model correctly", () => {
      const backendMeta = {
        tableName: "customers",
        primaryKey: "id",
        identityField: "email",
        rlsResource: "customers",
        fields: {
          id: { type: "integer" },
          email: { type: "string", required: true },
        },
      };

      const result = transformModel("customer", backendMeta);

      expect(result.tableName).toBe("customers");
      expect(result.primaryKey).toBe("id");
      expect(result.identityField).toBe("email");
      expect(result.displayName).toBe("Customer");
      expect(result.displayNamePlural).toBe("Customers");
      expect(result.fields.email.required).toBe(true);
    });

    it("generates display names from entity name", () => {
      const backendMeta = {
        tableName: "work_orders",
        primaryKey: "id",
        identityField: "work_order_number",
        fields: {},
      };

      const result = transformModel("work_order", backendMeta);

      // work_order splits on capitals and underscores
      expect(result.displayName).toBeDefined();
      expect(result.displayNamePlural).toBeDefined();
    });

    it("includes arrays when present", () => {
      const backendMeta = {
        tableName: "users",
        primaryKey: "id",
        identityField: "email",
        requiredFields: ["email", "role_id"],
        searchableFields: ["email", "first_name"],
        filterableFields: ["role_id", "status"],
        sortableFields: ["created_at", "email"],
        fields: {},
      };

      const result = transformModel("user", backendMeta);

      expect(result.requiredFields).toEqual(["email", "role_id"]);
      expect(result.searchableFields).toEqual(["email", "first_name"]);
      expect(result.filterableFields).toEqual(["role_id", "status"]);
      expect(result.sortableFields).toEqual(["created_at", "email"]);
    });

    it("includes summaryConfig when present", () => {
      const backendMeta = {
        tableName: "work_orders",
        primaryKey: "id",
        identityField: "work_order_number",
        summaryConfig: {
          groupableFields: ["customer_id", "status"],
          summableFields: ["total"],
        },
        fields: {},
      };

      const result = transformModel("work_order", backendMeta);

      expect(result.summaryConfig).toEqual({
        groupableFields: ["customer_id", "status"],
        summableFields: ["total"],
      });
    });

    it("sets summaryConfig to null when not provided", () => {
      const backendMeta = {
        tableName: "notifications",
        primaryKey: "id",
        identityField: "id",
        fields: {},
      };

      const result = transformModel("notification", backendMeta);

      expect(result.summaryConfig).toBeNull();
    });
  });

  describe("buildEntityPlacements", () => {
    const { buildEntityPlacements } = require("../../../../scripts/sync-entity-metadata");
    
    it("builds placements from metadata with navGroup", () => {
      // buildEntityPlacements reads from actual metadata, so we're testing
      // that it correctly extracts navGroup and navOrder
      const placements = buildEntityPlacements();
      
      // Should include vendor (has navGroup: 'resources', navOrder: 3)
      expect(placements.vendor).toEqual({
        group: "resources",
        order: 3,
      });
    });

    it("excludes entities without navGroup", () => {
      const placements = buildEntityPlacements();
      
      // Should NOT include audit_log (navVisibility: null)
      expect(placements.audit_log).toBeUndefined();
      
      // Should NOT include notification (navVisibility: null)
      expect(placements.notification).toBeUndefined();
    });

    it("includes all navigable entities", () => {
      const placements = buildEntityPlacements();
      
      // All entities with navVisibility + navGroup should be present
      expect(Object.keys(placements)).toContain("customer");
      expect(Object.keys(placements)).toContain("technician");
      expect(Object.keys(placements)).toContain("work_order");
      expect(Object.keys(placements)).toContain("invoice");
      expect(Object.keys(placements)).toContain("contract");
      expect(Object.keys(placements)).toContain("inventory");
      expect(Object.keys(placements)).toContain("user");
      expect(Object.keys(placements)).toContain("role");
      expect(Object.keys(placements)).toContain("vendor");
    });

    it("assigns correct groups to entities", () => {
      const placements = buildEntityPlacements();
      
      // Customers group
      expect(placements.customer.group).toBe("customers");
      
      // Resources group
      expect(placements.technician.group).toBe("resources");
      expect(placements.inventory.group).toBe("resources");
      expect(placements.vendor.group).toBe("resources");
      
      // Work group
      expect(placements.work_order.group).toBe("work");
      
      // Finance group
      expect(placements.contract.group).toBe("finance");
      expect(placements.invoice.group).toBe("finance");
      
      // Admin group
      expect(placements.user.group).toBe("admin");
      expect(placements.role.group).toBe("admin");
    });
  });
});
