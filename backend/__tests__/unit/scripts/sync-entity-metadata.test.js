/**
 * Entity Metadata Sync - Unit Tests
 *
 * Tests the pure transformation functions used by sync-entity-metadata.js
 */

const {
  getPluralForm,
  transformField,
  transformRelationships,
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

    it("transforms foreign key fields", () => {
      const foreignKeys = {
        role_id: { table: "roles", column: "id" },
      };
      const result = transformField(
        "role_id",
        { type: "integer" },
        foreignKeys,
        {},
      );
      expect(result.type).toBe("foreignKey");
      expect(result.relatedEntity).toBe("role");
    });

    it("uses relationship displayField when available", () => {
      const relationships = {
        role: {
          table: "roles",
          foreignKey: "role_id",
          fields: ["id", "name", "priority"],
        },
      };
      const result = transformField(
        "role_id",
        { type: "integer" },
        {},
        relationships,
      );
      expect(result.type).toBe("foreignKey");
      expect(result.displayField).toBe("name");
    });
  });

  describe("transformRelationships", () => {
    it("returns undefined when no relationships", () => {
      const result = transformRelationships({}, {});
      expect(result).toBeUndefined();
    });

    it("transforms relationship with foreignKey", () => {
      const relationships = {
        role: { table: "roles", foreignKey: "role_id", fields: ["id", "name"] },
      };
      const result = transformRelationships({}, relationships);
      expect(result).toEqual({
        role_id: {
          relatedEntity: "role",
          displayField: "name",
          type: "belongsTo",
        },
      });
    });

    it("merges foreignKeys not in relationships", () => {
      const foreignKeys = {
        customer_id: { table: "customers", column: "id" },
      };
      const result = transformRelationships(foreignKeys, {});
      expect(result).toEqual({
        customer_id: {
          relatedEntity: "customer",
          displayField: "name",
          type: "belongsTo",
        },
      });
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
  });

  describe("buildEntityPlacements", () => {
    const { buildEntityPlacements } = require("../../../../scripts/sync-entity-metadata");
    
    it("builds placements from metadata with navGroup", () => {
      // buildEntityPlacements reads from actual metadata, so we're testing
      // that it correctly extracts navGroup and navOrder
      const placements = buildEntityPlacements();
      
      // Should include vendor (has navGroup: 'operations', navOrder: 3)
      expect(placements.vendor).toEqual({
        group: "operations",
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
      
      // People group
      expect(placements.customer.group).toBe("people");
      expect(placements.technician.group).toBe("people");
      
      // Operations group
      expect(placements.work_order.group).toBe("operations");
      expect(placements.inventory.group).toBe("operations");
      expect(placements.vendor.group).toBe("operations");
      
      // Finance group
      expect(placements.contract.group).toBe("finance");
      expect(placements.invoice.group).toBe("finance");
      
      // Admin group
      expect(placements.user.group).toBe("admin");
      expect(placements.role.group).toBe("admin");
    });
  });
});
