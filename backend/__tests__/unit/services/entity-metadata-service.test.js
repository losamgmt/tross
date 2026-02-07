/**
 * Entity Metadata Service - Unit Tests
 *
 * Comprehensive tests for entity metadata operations.
 */

const EntityMetadataService = require("../../../services/entity-metadata-service");

// Mock logger
jest.mock("../../../config/logger", () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe("EntityMetadataService", () => {
  describe("getEntityList", () => {
    it("should return list of all entities", () => {
      const entities = EntityMetadataService.getEntityList();

      expect(Array.isArray(entities)).toBe(true);
      expect(entities.length).toBeGreaterThan(0);
      expect(entities[0]).toHaveProperty("name");
      expect(entities[0]).toHaveProperty("tableName");
    });

    it("should sort entities by name", () => {
      const entities = EntityMetadataService.getEntityList();
      const names = entities.map((e) => e.name);
      const sorted = [...names].sort();
      expect(names).toEqual(sorted);
    });

    it("should include required properties", () => {
      const entities = EntityMetadataService.getEntityList();

      entities.forEach((entity) => {
        expect(entity).toHaveProperty("name");
        expect(entity).toHaveProperty("tableName");
        expect(entity).toHaveProperty("primaryKey");
      });
    });
  });

  describe("getEntityMetadata", () => {
    it("should return metadata for known entity", () => {
      const metadata = EntityMetadataService.getEntityMetadata("customer");

      expect(metadata).toBeDefined();
      expect(metadata.name).toBe("customer");
      expect(metadata).toHaveProperty("tableName");
      expect(metadata).toHaveProperty("rlsMatrix");
      expect(metadata).toHaveProperty("fieldAccessMatrix");
    });

    it("should return null for unknown entity", () => {
      const metadata =
        EntityMetadataService.getEntityMetadata("unknown_entity");

      expect(metadata).toBeNull();
    });

    it("should include validation rules", () => {
      const metadata = EntityMetadataService.getEntityMetadata("customer");

      expect(metadata).toHaveProperty("validationRules");
    });

    it("should include display configuration", () => {
      const metadata = EntityMetadataService.getEntityMetadata("customer");

      expect(metadata).toHaveProperty("displayColumns");
      expect(metadata).toHaveProperty("fieldAliases");
    });

    it("should include field lists", () => {
      const metadata = EntityMetadataService.getEntityMetadata("customer");

      expect(metadata).toHaveProperty("immutableFields");
      expect(metadata).toHaveProperty("requiredFields");
      expect(metadata).toHaveProperty("sensitiveFields");
    });
  });

  describe("buildRlsMatrix", () => {
    it("should build RLS matrix for known resource", () => {
      const matrix = EntityMetadataService.buildRlsMatrix("customer");

      expect(matrix).toHaveProperty("title");
      expect(matrix).toHaveProperty("columns");
      expect(matrix).toHaveProperty("rows");
      expect(matrix.columns).toContain("create");
      expect(matrix.columns).toContain("read");
      expect(matrix.columns).toContain("update");
      expect(matrix.columns).toContain("delete");
    });

    it("should include role permissions", () => {
      const matrix = EntityMetadataService.buildRlsMatrix("customer");

      expect(matrix.rows.length).toBeGreaterThan(0);
      expect(matrix.rows[0]).toHaveProperty("role");
      expect(matrix.rows[0]).toHaveProperty("permissions");
    });

    it("should handle unknown resource gracefully", () => {
      const matrix = EntityMetadataService.buildRlsMatrix("unknown_resource");

      expect(matrix).toHaveProperty("rows");
    });
  });

  describe("buildFieldAccessMatrix", () => {
    it("should build field access matrix", () => {
      const entityMetadata = require("../../../config/models");
      const customerMeta = entityMetadata.customer;
      const matrix = EntityMetadataService.buildFieldAccessMatrix(
        "customer",
        customerMeta,
      );

      expect(matrix).toHaveProperty("title");
      expect(matrix).toHaveProperty("rows");
    });

    it("should handle entity with no field access", () => {
      const matrix = EntityMetadataService.buildFieldAccessMatrix("test", {});

      expect(matrix.rows).toEqual([]);
      expect(matrix.description).toContain("No field-level access");
    });
  });

  describe("getEntityValidationRules", () => {
    it("should return validation rules for known entity", () => {
      const entityMetadata = require("../../../config/models");
      const customerMeta = entityMetadata.customer;
      const rules = EntityMetadataService.getEntityValidationRules(
        "customer",
        customerMeta,
      );

      expect(rules).toBeDefined();
    });
  });

  describe("getFieldAccess", () => {
    it("should return field access for known entity", () => {
      const metadata = EntityMetadataService.getEntityMetadata("customer");

      expect(metadata).toBeDefined();
      expect(metadata).toHaveProperty("fieldAccessMatrix");
    });

    it("should return null for unknown entity", () => {
      const metadata =
        EntityMetadataService.getEntityMetadata("unknown_entity");

      expect(metadata).toBeNull();
    });
  });

  describe("getValidationRules", () => {
    it("should return validation rules for known entity", () => {
      const metadata = EntityMetadataService.getEntityMetadata("customer");

      expect(metadata).toBeDefined();
      expect(metadata).toHaveProperty("validationRules");
    });

    it("should return null for unknown entity", () => {
      const metadata =
        EntityMetadataService.getEntityMetadata("unknown_entity");

      expect(metadata).toBeNull();
    });
  });

  describe("permissions and validationRules getters", () => {
    it("should return cached permissions", () => {
      const permissions = EntityMetadataService.permissions;

      expect(permissions).toBeDefined();
      expect(permissions).toHaveProperty("roles");
    });

    it("should return cached validation rules", () => {
      const rules = EntityMetadataService.validationRules;

      expect(rules).toBeDefined();
    });
  });

  describe("reloadConfigs", () => {
    it("should reload configs without error", () => {
      expect(() => EntityMetadataService.reloadConfigs()).not.toThrow();
    });
  });

  describe("getRoles", () => {
    it("should return roles object", () => {
      const roles = EntityMetadataService.getRoles();

      expect(roles).toBeDefined();
      expect(typeof roles).toBe("object");
    });
  });

  describe("getRlsPermissions", () => {
    it("should return RLS permissions for known resource", () => {
      const permissions = EntityMetadataService.getRlsPermissions("customer");

      expect(permissions).toBeDefined();
    });

    it("should handle unknown resource gracefully", () => {
      const permissions =
        EntityMetadataService.getRlsPermissions("unknown_resource");

      // Should return undefined or empty, not throw
      expect(
        permissions === undefined ||
          permissions === null ||
          typeof permissions === "object",
      ).toBe(true);
    });
  });
});
