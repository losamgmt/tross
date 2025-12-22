/**
 * Unit Tests: Permission Check Utility
 *
 * Tests O(1) permission checks using role priority numbers.
 * All functions delegate to permissions-loader - we test the wrappers.
 *
 * Goal: 100% coverage of permission-check.js
 */

const {
  getUserPriority,
  canAccess,
  hasMinimumRole,
  is,
} = require('../../../utils/permission-check');

describe('Permission Check Utility', () => {
  // ==========================================================================
  // getUserPriority()
  // ==========================================================================
  describe('getUserPriority()', () => {
    test('returns 0 for null user', () => {
      expect(getUserPriority(null)).toBe(0);
    });

    test('returns 0 for undefined user', () => {
      expect(getUserPriority(undefined)).toBe(0);
    });

    test('returns role_priority when provided (O(1) path)', () => {
      const user = { role: 'admin', role_priority: 5 };
      expect(getUserPriority(user)).toBe(5);
    });

    test('returns role_priority 0 when explicitly set', () => {
      const user = { role: 'unknown', role_priority: 0 };
      expect(getUserPriority(user)).toBe(0);
    });

    test('falls back to role name lookup when role_priority is missing', () => {
      const user = { role: 'admin' }; // no role_priority
      // Should lookup via permissions-loader
      expect(getUserPriority(user)).toBe(5);
    });

    test('falls back to role name lookup for technician', () => {
      const user = { role: 'technician' };
      expect(getUserPriority(user)).toBe(2);
    });

    test('returns 0 for unknown role without priority', () => {
      const user = { role: 'nonexistent_role' };
      expect(getUserPriority(user)).toBe(0);
    });

    test('prefers numeric role_priority over string lookup', () => {
      // Even if role name would give different priority
      const user = { role: 'viewer', role_priority: 99 };
      expect(getUserPriority(user)).toBe(99);
    });
  });

  // ==========================================================================
  // canAccess()
  // ==========================================================================
  describe('canAccess()', () => {
    test('returns false for null user', () => {
      expect(canAccess(null, 'users', 'read')).toBe(false);
    });

    test('returns false for undefined user', () => {
      expect(canAccess(undefined, 'users', 'read')).toBe(false);
    });

    test('returns false for user without role', () => {
      const user = { id: 1 }; // no role property
      expect(canAccess(user, 'users', 'read')).toBe(false);
    });

    test('returns true when admin reads users', () => {
      const user = { role: 'admin' };
      expect(canAccess(user, 'users', 'read')).toBe(true);
    });

    test('returns true when admin creates users', () => {
      const user = { role: 'admin' };
      expect(canAccess(user, 'users', 'create')).toBe(true);
    });

    test('returns false when viewer tries to create users', () => {
      const user = { role: 'viewer' };
      expect(canAccess(user, 'users', 'create')).toBe(false);
    });

    test('returns true when customer reads work_orders (per RLS)', () => {
      const user = { role: 'customer' };
      expect(canAccess(user, 'work_orders', 'read')).toBe(true);
    });

    test('delegates to hasPermission for complex permissions', () => {
      const user = { role: 'technician' };
      // Technician can read/update work_orders but not delete
      expect(canAccess(user, 'work_orders', 'read')).toBe(true);
      expect(canAccess(user, 'work_orders', 'update')).toBe(true);
      expect(canAccess(user, 'work_orders', 'delete')).toBe(false);
    });
  });

  // ==========================================================================
  // hasMinimumRole()
  // ==========================================================================
  describe('hasMinimumRole()', () => {
    test('returns false for null user', () => {
      expect(hasMinimumRole(null, 'viewer')).toBe(false);
    });

    test('returns false for undefined user', () => {
      expect(hasMinimumRole(undefined, 'viewer')).toBe(false);
    });

    test('returns false for user without role', () => {
      const user = { id: 1 };
      expect(hasMinimumRole(user, 'viewer')).toBe(false);
    });

    test('admin meets minimum role of admin', () => {
      const user = { role: 'admin' };
      expect(hasMinimumRole(user, 'admin')).toBe(true);
    });

    test('admin meets minimum role of customer', () => {
      const user = { role: 'admin' };
      expect(hasMinimumRole(user, 'customer')).toBe(true);
    });

    test('viewer does not meet minimum role of admin', () => {
      const user = { role: 'viewer' };
      expect(hasMinimumRole(user, 'admin')).toBe(false);
    });

    test('manager meets minimum role of dispatcher', () => {
      const user = { role: 'manager' };
      expect(hasMinimumRole(user, 'dispatcher')).toBe(true);
    });

    test('technician meets minimum role of technician', () => {
      const user = { role: 'technician' };
      expect(hasMinimumRole(user, 'technician')).toBe(true);
    });
  });

  // ==========================================================================
  // is.admin()
  // ==========================================================================
  describe('is.admin()', () => {
    test('returns false for null user', () => {
      expect(is.admin(null)).toBe(false);
    });

    test('returns true for admin user', () => {
      const user = { role: 'admin', role_priority: 5 };
      expect(is.admin(user)).toBe(true);
    });

    test('returns false for manager user', () => {
      const user = { role: 'manager', role_priority: 4 };
      expect(is.admin(user)).toBe(false);
    });

    test('returns false for customer user', () => {
      const user = { role: 'customer', role_priority: 1 };
      expect(is.admin(user)).toBe(false);
    });
  });

  // ==========================================================================
  // is.managerOrAbove()
  // ==========================================================================
  describe('is.managerOrAbove()', () => {
    test('returns false for null user', () => {
      expect(is.managerOrAbove(null)).toBe(false);
    });

    test('returns true for admin user', () => {
      const user = { role: 'admin', role_priority: 5 };
      expect(is.managerOrAbove(user)).toBe(true);
    });

    test('returns true for manager user', () => {
      const user = { role: 'manager', role_priority: 4 };
      expect(is.managerOrAbove(user)).toBe(true);
    });

    test('returns false for dispatcher user', () => {
      const user = { role: 'dispatcher', role_priority: 3 };
      expect(is.managerOrAbove(user)).toBe(false);
    });

    test('returns false for customer user', () => {
      const user = { role: 'customer', role_priority: 1 };
      expect(is.managerOrAbove(user)).toBe(false);
    });
  });

  // ==========================================================================
  // is.dispatcherOrAbove()
  // ==========================================================================
  describe('is.dispatcherOrAbove()', () => {
    test('returns true for admin user', () => {
      const user = { role: 'admin', role_priority: 5 };
      expect(is.dispatcherOrAbove(user)).toBe(true);
    });

    test('returns true for manager user', () => {
      const user = { role: 'manager', role_priority: 4 };
      expect(is.dispatcherOrAbove(user)).toBe(true);
    });

    test('returns true for dispatcher user', () => {
      const user = { role: 'dispatcher', role_priority: 3 };
      expect(is.dispatcherOrAbove(user)).toBe(true);
    });

    test('returns false for technician user', () => {
      const user = { role: 'technician', role_priority: 2 };
      expect(is.dispatcherOrAbove(user)).toBe(false);
    });
  });

  // ==========================================================================
  // is.technicianOrAbove()
  // ==========================================================================
  describe('is.technicianOrAbove()', () => {
    test('returns true for dispatcher user', () => {
      const user = { role: 'dispatcher', role_priority: 3 };
      expect(is.technicianOrAbove(user)).toBe(true);
    });

    test('returns true for technician user', () => {
      const user = { role: 'technician', role_priority: 2 };
      expect(is.technicianOrAbove(user)).toBe(true);
    });

    test('returns false for customer user', () => {
      const user = { role: 'customer', role_priority: 1 };
      expect(is.technicianOrAbove(user)).toBe(false);
    });
  });

  // ==========================================================================
  // is.authenticated()
  // ==========================================================================
  describe('is.authenticated()', () => {
    test('returns false for null user', () => {
      expect(is.authenticated(null)).toBe(false);
    });

    test('returns true for customer user', () => {
      const user = { role: 'customer', role_priority: 1 };
      expect(is.authenticated(user)).toBe(true);
    });

    test('returns true for any user with priority >= 1', () => {
      const user = { role: 'technician', role_priority: 2 };
      expect(is.authenticated(user)).toBe(true);
    });

    test('returns false for user with priority 0', () => {
      const user = { role: 'unknown', role_priority: 0 };
      expect(is.authenticated(user)).toBe(false);
    });
  });

  // ==========================================================================
  // is.role()
  // ==========================================================================
  describe('is.role()', () => {
    test('returns false for null user', () => {
      expect(is.role(null, 'admin')).toBe(false);
    });

    test('returns false for null roleName', () => {
      const user = { role: 'admin' };
      expect(is.role(user, null)).toBe(false);
    });

    test('returns false for undefined roleName', () => {
      const user = { role: 'admin' };
      expect(is.role(user, undefined)).toBe(false);
    });

    test('returns false for user without role', () => {
      const user = { id: 1 };
      expect(is.role(user, 'admin')).toBe(false);
    });

    test('returns true for exact match', () => {
      const user = { role: 'admin' };
      expect(is.role(user, 'admin')).toBe(true);
    });

    test('is case insensitive', () => {
      const user = { role: 'Admin' };
      expect(is.role(user, 'admin')).toBe(true);
      expect(is.role(user, 'ADMIN')).toBe(true);
    });

    test('returns false for mismatch', () => {
      const user = { role: 'viewer' };
      expect(is.role(user, 'admin')).toBe(false);
    });
  });
});
