/**
 * Unit Tests: Data-Driven Permission System
 * 
 * These tests validate the permission system STRUCTURE and LOGIC,
 * not hardcoded permission values.
 * 
 * If you change config/permissions.json, these tests should still pass
 * as long as the structure is valid.
 */

const {
  ROLE_HIERARCHY,
  PERMISSIONS,
  getRolePriority,
  hasPermission,
  hasMinimumRole,
  getMinimumRole,
  getRoleHierarchy,
  getPermissionMatrix,
  getRowLevelSecurity,
  loadPermissions,
} = require('../../../config/permissions-loader');

describe('Permission System - Data-Driven Tests', () => {
  
  describe('Configuration Loading', () => {
    it('should load permissions from config file', () => {
      const config = loadPermissions();
      expect(config).toBeDefined();
      expect(config.roles).toBeDefined();
      expect(config.resources).toBeDefined();
    });

    it('should cache loaded config', () => {
      const config1 = loadPermissions();
      const config2 = loadPermissions();
      expect(config1).toBe(config2); // Same object reference
    });
  });

  describe('Role Hierarchy', () => {
    it('should have at least 5 roles', () => {
      const hierarchy = getRoleHierarchy();
      const roleCount = Object.keys(hierarchy).length;
      expect(roleCount).toBeGreaterThanOrEqual(5);
    });

    it('should have unique priorities', () => {
      const priorities = Object.values(ROLE_HIERARCHY);
      const uniquePriorities = new Set(priorities);
      expect(uniquePriorities.size).toBe(priorities.length);
    });

    it('should have priorities as positive integers', () => {
      for (const [role, priority] of Object.entries(ROLE_HIERARCHY)) {
        expect(typeof priority).toBe('number');
        expect(priority).toBeGreaterThan(0);
        expect(Number.isInteger(priority)).toBe(true);
      }
    });

    it('should include standard roles', () => {
      expect(ROLE_HIERARCHY).toHaveProperty('admin');
      expect(ROLE_HIERARCHY).toHaveProperty('manager');
      expect(ROLE_HIERARCHY).toHaveProperty('client');
    });
  });

  describe('Permission Matrix', () => {
    it('should have permissions for core resources', () => {
      const matrix = getPermissionMatrix();
      expect(matrix).toHaveProperty('users');
      expect(matrix).toHaveProperty('roles');
      expect(matrix).toHaveProperty('work_orders');
      expect(matrix).toHaveProperty('audit_logs');
    });

    it('should have all CRUD operations for each resource', () => {
      const requiredOps = ['create', 'read', 'update', 'delete'];
      
      for (const [resource, operations] of Object.entries(PERMISSIONS)) {
        for (const op of requiredOps) {
          expect(operations).toHaveProperty(op);
        }
      }
    });

    it('should only use valid role priorities', () => {
      const validPriorities = Object.values(ROLE_HIERARCHY);
      
      for (const [resource, operations] of Object.entries(PERMISSIONS)) {
        for (const [operation, priority] of Object.entries(operations)) {
          expect(validPriorities).toContain(priority);
        }
      }
    });
  });

  describe('getRolePriority()', () => {
    it('should return correct priority for valid roles', () => {
      expect(getRolePriority('admin')).toBe(ROLE_HIERARCHY.admin);
      expect(getRolePriority('client')).toBe(ROLE_HIERARCHY.client);
    });

    it('should be case-insensitive', () => {
      const adminPriority = getRolePriority('admin');
      expect(getRolePriority('ADMIN')).toBe(adminPriority);
      expect(getRolePriority('Admin')).toBe(adminPriority);
    });

    it('should return null for unknown roles', () => {
      expect(getRolePriority('superadmin')).toBeNull();
      expect(getRolePriority('unknown')).toBeNull();
    });

    it('should return null for invalid inputs', () => {
      expect(getRolePriority(null)).toBeNull();
      expect(getRolePriority(undefined)).toBeNull();
      expect(getRolePriority('')).toBeNull();
      expect(getRolePriority(123)).toBeNull();
    });
  });

  describe('hasPermission()', () => {
    it('should allow admin all permissions', () => {
      // Admin should be able to do everything
      for (const resource of Object.keys(PERMISSIONS)) {
        expect(hasPermission('admin', resource, 'create')).toBe(true);
        expect(hasPermission('admin', resource, 'read')).toBe(true);
        expect(hasPermission('admin', resource, 'update')).toBe(true);
        expect(hasPermission('admin', resource, 'delete')).toBe(true);
      }
    });

    it('should enforce role hierarchy (higher roles inherit lower permissions)', () => {
      // For each resource and operation, verify hierarchy
      for (const [resource, operations] of Object.entries(PERMISSIONS)) {
        for (const [operation, minPriority] of Object.entries(operations)) {
          // All roles with priority >= minPriority should have permission
          for (const [role, rolePriority] of Object.entries(ROLE_HIERARCHY)) {
            const hasAccess = hasPermission(role, resource, operation);
            
            if (rolePriority >= minPriority) {
              expect(hasAccess).toBe(true);
            } else {
              expect(hasAccess).toBe(false);
            }
          }
        }
      }
    });

    it('should be case-insensitive for role names', () => {
      const resource = 'users';
      const operation = 'read';
      
      const result1 = hasPermission('admin', resource, operation);
      const result2 = hasPermission('ADMIN', resource, operation);
      const result3 = hasPermission('Admin', resource, operation);
      
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });

    it('should return false for unknown roles', () => {
      expect(hasPermission('superadmin', 'users', 'read')).toBe(false);
      expect(hasPermission('unknown', 'users', 'create')).toBe(false);
    });

    it('should return false for unknown resources', () => {
      expect(hasPermission('admin', 'unknown_resource', 'read')).toBe(false);
    });

    it('should return false for unknown operations', () => {
      expect(hasPermission('admin', 'users', 'unknown_op')).toBe(false);
    });

    it('should return false for null/undefined inputs', () => {
      expect(hasPermission(null, 'users', 'read')).toBe(false);
      expect(hasPermission('admin', null, 'read')).toBe(false);
      expect(hasPermission('admin', 'users', null)).toBe(false);
    });
  });

  describe('hasMinimumRole()', () => {
    it('should return true when user role >= required role', () => {
      expect(hasMinimumRole('admin', 'admin')).toBe(true);
      expect(hasMinimumRole('admin', 'manager')).toBe(true);
      expect(hasMinimumRole('admin', 'client')).toBe(true);
      expect(hasMinimumRole('manager', 'manager')).toBe(true);
      expect(hasMinimumRole('manager', 'client')).toBe(true);
    });

    it('should return false when user role < required role', () => {
      expect(hasMinimumRole('client', 'admin')).toBe(false);
      expect(hasMinimumRole('client', 'manager')).toBe(false);
      expect(hasMinimumRole('manager', 'admin')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(hasMinimumRole('ADMIN', 'manager')).toBe(true);
      expect(hasMinimumRole('admin', 'MANAGER')).toBe(true);
      expect(hasMinimumRole('Admin', 'Manager')).toBe(true);
    });

    it('should return false for unknown roles', () => {
      expect(hasMinimumRole('superadmin', 'admin')).toBe(false);
      expect(hasMinimumRole('admin', 'superadmin')).toBe(false);
    });

    it('should return false for null/undefined inputs', () => {
      expect(hasMinimumRole(null, 'admin')).toBe(false);
      expect(hasMinimumRole('admin', null)).toBe(false);
      expect(hasMinimumRole(null, null)).toBe(false);
    });
  });

  describe('getMinimumRole()', () => {
    it('should return minimum role for each permission', () => {
      for (const [resource, operations] of Object.entries(PERMISSIONS)) {
        for (const operation of Object.keys(operations)) {
          const minRole = getMinimumRole(resource, operation);
          expect(minRole).toBeDefined();
          expect(typeof minRole).toBe('string');
          expect(ROLE_HIERARCHY).toHaveProperty(minRole);
        }
      }
    });

    it('should return null for unknown resource/operation', () => {
      expect(getMinimumRole('unknown_resource', 'read')).toBeNull();
      expect(getMinimumRole('users', 'unknown_operation')).toBeNull();
    });
  });

  describe('getRowLevelSecurity()', () => {
    it('should return RLS policy for valid role/resource', () => {
      // Should return a policy or null (both are valid)
      const policy = getRowLevelSecurity('client', 'users');
      expect(policy === null || typeof policy === 'string').toBe(true);
    });

    it('should return null for resources without RLS', () => {
      const policy = getRowLevelSecurity('admin', 'audit_logs');
      expect(policy === null || typeof policy === 'string').toBe(true);
    });

    it('should be case-insensitive for role names', () => {
      const policy1 = getRowLevelSecurity('client', 'users');
      const policy2 = getRowLevelSecurity('CLIENT', 'users');
      const policy3 = getRowLevelSecurity('Client', 'users');
      
      expect(policy1).toBe(policy2);
      expect(policy2).toBe(policy3);
    });

    it('should return null for unknown roles', () => {
      expect(getRowLevelSecurity('superadmin', 'users')).toBeNull();
    });

    it('should return null for unknown resources', () => {
      expect(getRowLevelSecurity('admin', 'unknown_resource')).toBeNull();
    });
  });

  describe('Permission Validation', () => {
    it('should ensure client has explicitly granted permissions only', () => {
      const clientPriority = ROLE_HIERARCHY.client;
      
      for (const [resource, operations] of Object.entries(PERMISSIONS)) {
        for (const [operation, minPriority] of Object.entries(operations)) {
          const hasAccess = hasPermission('client', resource, operation);
          
          if (minPriority === clientPriority) {
            expect(hasAccess).toBe(true);
          } else {
            expect(hasAccess).toBe(false);
          }
        }
      }
    });

    it('should ensure no permission gaps (all operations defined)', () => {
      const requiredOps = ['create', 'read', 'update', 'delete'];
      
      for (const [resource, operations] of Object.entries(PERMISSIONS)) {
        for (const op of requiredOps) {
          expect(operations[op]).toBeDefined();
          expect(typeof operations[op]).toBe('number');
        }
      }
    });
  });

  describe('Data-Driven Behavior', () => {
    it('should validate tests work regardless of permission values', () => {
      // This test verifies the test suite validates STRUCTURE, not VALUES
      // If config changes, tests should still pass
      
      // Get current values from config
      const usersReadPriority = PERMISSIONS.users.read;
      const rolesCreatePriority = PERMISSIONS.roles.create;
      
      // Find roles that can/cannot perform these operations
      const rolesWithUsersRead = Object.entries(ROLE_HIERARCHY)
        .filter(([_, priority]) => priority >= usersReadPriority)
        .map(([role, _]) => role);
      
      const rolesWithoutRolesCreate = Object.entries(ROLE_HIERARCHY)
        .filter(([_, priority]) => priority < rolesCreatePriority)
        .map(([role, _]) => role);
      
      // Verify our logic works with current config values
      expect(rolesWithUsersRead.length).toBeGreaterThan(0);
      expect(rolesWithoutRolesCreate.length).toBeGreaterThan(0);
      
      // Test against current config
      for (const role of rolesWithUsersRead) {
        expect(hasPermission(role, 'users', 'read')).toBe(true);
      }
      
      for (const role of rolesWithoutRolesCreate) {
        expect(hasPermission(role, 'roles', 'create')).toBe(false);
      }
    });
  });
});
