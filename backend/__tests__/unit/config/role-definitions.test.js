/**
 * Role Definitions Tests
 *
 * Tests for the fallback role constants and helper functions.
 * These are used in unit tests and as fallbacks before DB is available.
 */

const {
  ROLE_DEFINITIONS,
  USER_ROLES,
  ROLE_HIERARCHY,
  ROLE_PRIORITY_TO_NAME,
  ROLE_NAME_TO_PRIORITY,
  ROLE_DESCRIPTIONS,
  getRolePriority,
  getRoleByPriority,
  hasMinimumRole,
  isValidRole,
} = require("../../../config/role-definitions");

describe("role-definitions", () => {
  describe("ROLE_DEFINITIONS", () => {
    it("should define all 5 standard roles", () => {
      expect(Object.keys(ROLE_DEFINITIONS)).toEqual([
        "customer",
        "technician",
        "dispatcher",
        "manager",
        "admin",
      ]);
    });

    it("should have ascending priorities from customer to admin", () => {
      expect(ROLE_DEFINITIONS.customer.priority).toBe(1);
      expect(ROLE_DEFINITIONS.technician.priority).toBe(2);
      expect(ROLE_DEFINITIONS.dispatcher.priority).toBe(3);
      expect(ROLE_DEFINITIONS.manager.priority).toBe(4);
      expect(ROLE_DEFINITIONS.admin.priority).toBe(5);
    });

    it("should have descriptions for all roles", () => {
      Object.values(ROLE_DEFINITIONS).forEach((role) => {
        expect(role.description).toBeDefined();
        expect(typeof role.description).toBe("string");
        expect(role.description.length).toBeGreaterThan(10);
      });
    });

    it("should be frozen (immutable)", () => {
      expect(Object.isFrozen(ROLE_DEFINITIONS)).toBe(true);
    });
  });

  describe("USER_ROLES", () => {
    it("should provide uppercase keys for role lookup", () => {
      expect(USER_ROLES.CUSTOMER).toBe("customer");
      expect(USER_ROLES.TECHNICIAN).toBe("technician");
      expect(USER_ROLES.DISPATCHER).toBe("dispatcher");
      expect(USER_ROLES.MANAGER).toBe("manager");
      expect(USER_ROLES.ADMIN).toBe("admin");
    });

    it("should be frozen (immutable)", () => {
      expect(Object.isFrozen(USER_ROLES)).toBe(true);
    });
  });

  describe("ROLE_HIERARCHY", () => {
    it("should list roles in ascending priority order", () => {
      expect(ROLE_HIERARCHY).toEqual([
        "customer",
        "technician",
        "dispatcher",
        "manager",
        "admin",
      ]);
    });

    it("should be frozen (immutable)", () => {
      expect(Object.isFrozen(ROLE_HIERARCHY)).toBe(true);
    });
  });

  describe("ROLE_PRIORITY_TO_NAME", () => {
    it("should map priority numbers to role names", () => {
      expect(ROLE_PRIORITY_TO_NAME[1]).toBe("customer");
      expect(ROLE_PRIORITY_TO_NAME[5]).toBe("admin");
    });
  });

  describe("ROLE_NAME_TO_PRIORITY", () => {
    it("should map role names to priority numbers", () => {
      expect(ROLE_NAME_TO_PRIORITY.customer).toBe(1);
      expect(ROLE_NAME_TO_PRIORITY.admin).toBe(5);
    });
  });

  describe("ROLE_DESCRIPTIONS", () => {
    it("should provide descriptions for all roles", () => {
      expect(ROLE_DESCRIPTIONS.customer).toContain("Basic access");
      expect(ROLE_DESCRIPTIONS.admin).toContain("Full system access");
    });
  });

  describe("getRolePriority()", () => {
    it("should return priority for valid role", () => {
      expect(getRolePriority("customer")).toBe(1);
      expect(getRolePriority("admin")).toBe(5);
    });

    it("should be case-insensitive", () => {
      expect(getRolePriority("ADMIN")).toBe(5);
      expect(getRolePriority("Admin")).toBe(5);
    });

    it("should return null for invalid role", () => {
      expect(getRolePriority("superuser")).toBeNull();
      expect(getRolePriority("")).toBeNull();
      expect(getRolePriority(null)).toBeNull();
      expect(getRolePriority(undefined)).toBeNull();
      expect(getRolePriority(123)).toBeNull();
    });
  });

  describe("getRoleByPriority()", () => {
    it("should return role name for valid priority", () => {
      expect(getRoleByPriority(1)).toBe("customer");
      expect(getRoleByPriority(5)).toBe("admin");
    });

    it("should return null for invalid priority", () => {
      expect(getRoleByPriority(0)).toBeNull();
      expect(getRoleByPriority(99)).toBeNull();
    });
  });

  describe("hasMinimumRole()", () => {
    it("should return true when user role meets requirement", () => {
      expect(hasMinimumRole("admin", "customer")).toBe(true);
      expect(hasMinimumRole("manager", "manager")).toBe(true);
      expect(hasMinimumRole("customer", "customer")).toBe(true);
    });

    it("should return false when user role is insufficient", () => {
      expect(hasMinimumRole("customer", "admin")).toBe(false);
      expect(hasMinimumRole("technician", "dispatcher")).toBe(false);
    });

    it("should return false for invalid roles", () => {
      expect(hasMinimumRole("invalid", "customer")).toBe(false);
      expect(hasMinimumRole("admin", "invalid")).toBe(false);
      expect(hasMinimumRole("invalid", "invalid")).toBe(false);
    });
  });

  describe("isValidRole()", () => {
    it("should return true for valid roles", () => {
      expect(isValidRole("customer")).toBe(true);
      expect(isValidRole("admin")).toBe(true);
      expect(isValidRole("MANAGER")).toBe(true);
    });

    it("should return false for invalid roles", () => {
      expect(isValidRole("superuser")).toBe(false);
      expect(isValidRole("")).toBe(false);
      expect(isValidRole(null)).toBe(false);
    });
  });
});
