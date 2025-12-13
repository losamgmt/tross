/// Tests for Permission Configuration
///
/// Mirrors backend/__tests__/unit/config/permissions.test.js
/// Ensures frontend permission logic matches backend exactly
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/config/permissions.dart';

void main() {
  group('Permission Configuration Tests', () {
    group('ROLE_HIERARCHY constant', () {
      test('should have all 5 roles defined', () {
        expect(roleHierarchy.length, 5);
        expect(roleHierarchy.containsKey('admin'), true);
        expect(roleHierarchy.containsKey('manager'), true);
        expect(roleHierarchy.containsKey('dispatcher'), true);
        expect(roleHierarchy.containsKey('technician'), true);
        expect(roleHierarchy.containsKey('client'), true);
      });

      test('should have correct priority values', () {
        expect(roleHierarchy['admin'], 5);
        expect(roleHierarchy['manager'], 4);
        expect(roleHierarchy['dispatcher'], 3);
        expect(roleHierarchy['technician'], 2);
        expect(roleHierarchy['client'], 1);
      });

      test('should have unique priority values', () {
        final priorities = roleHierarchy.values.toSet();
        expect(priorities.length, 5, reason: 'All priorities should be unique');
      });

      test('should have admin as highest priority', () {
        final maxPriority = roleHierarchy.values.reduce(
          (a, b) => a > b ? a : b,
        );
        expect(maxPriority, roleHierarchy['admin']);
      });

      test('should have client as lowest priority', () {
        final minPriority = roleHierarchy.values.reduce(
          (a, b) => a < b ? a : b,
        );
        expect(minPriority, roleHierarchy['client']);
      });
    });

    group('OPERATIONS constant', () {
      test('should have all CRUD operations', () {
        expect(Operations.create, 'create');
        expect(Operations.read, 'read');
        expect(Operations.update, 'update');
        expect(Operations.delete, 'delete');
      });
    });

    group('PERMISSIONS matrix', () {
      test('should have all resources defined', () {
        expect(permissions.containsKey('users'), true);
        expect(permissions.containsKey('roles'), true);
        expect(permissions.containsKey('work_orders'), true);
        expect(permissions.containsKey('audit_logs'), true);
      });

      test('should have all operations for each resource', () {
        permissions.forEach((resource, ops) {
          expect(
            ops.containsKey('create'),
            true,
            reason: '$resource should have create',
          );
          expect(
            ops.containsKey('read'),
            true,
            reason: '$resource should have read',
          );
          expect(
            ops.containsKey('update'),
            true,
            reason: '$resource should have update',
          );
          expect(
            ops.containsKey('delete'),
            true,
            reason: '$resource should have delete',
          );
        });
      });

      test('should have valid priority values', () {
        final validPriorities = roleHierarchy.values.toSet();

        permissions.forEach((resource, ops) {
          ops.forEach((operation, priority) {
            expect(
              validPriorities.contains(priority),
              true,
              reason: '$resource.$operation has invalid priority: $priority',
            );
          });
        });
      });
    });

    group('getRolePriority()', () {
      test('should return correct priority for each role', () {
        expect(getRolePriority('admin'), 5);
        expect(getRolePriority('manager'), 4);
        expect(getRolePriority('dispatcher'), 3);
        expect(getRolePriority('technician'), 2);
        expect(getRolePriority('client'), 1);
      });

      test('should be case-insensitive', () {
        expect(getRolePriority('ADMIN'), 5);
        expect(getRolePriority('Admin'), 5);
        expect(getRolePriority('aDmIn'), 5);
      });

      test('should return null for unknown role', () {
        expect(getRolePriority('unknown'), null);
        expect(getRolePriority('superuser'), null);
      });

      test('should return null for null input', () {
        expect(getRolePriority(null), null);
      });

      test('should return null for empty string', () {
        expect(getRolePriority(''), null);
      });
    });

    group('hasPermission()', () {
      group('admin role', () {
        test('should have all permissions on users', () {
          expect(hasPermission('admin', 'users', 'create'), true);
          expect(hasPermission('admin', 'users', 'read'), true);
          expect(hasPermission('admin', 'users', 'update'), true);
          expect(hasPermission('admin', 'users', 'delete'), true);
        });

        test('should have all permissions on roles', () {
          expect(hasPermission('admin', 'roles', 'create'), true);
          expect(hasPermission('admin', 'roles', 'read'), true);
          expect(hasPermission('admin', 'roles', 'update'), true);
          expect(hasPermission('admin', 'roles', 'delete'), true);
        });

        test('should have all permissions on work_orders', () {
          expect(hasPermission('admin', 'work_orders', 'create'), true);
          expect(hasPermission('admin', 'work_orders', 'read'), true);
          expect(hasPermission('admin', 'work_orders', 'update'), true);
          expect(hasPermission('admin', 'work_orders', 'delete'), true);
        });

        test('should have all permissions on audit_logs', () {
          expect(hasPermission('admin', 'audit_logs', 'create'), true);
          expect(hasPermission('admin', 'audit_logs', 'read'), true);
          expect(hasPermission('admin', 'audit_logs', 'update'), true);
          expect(hasPermission('admin', 'audit_logs', 'delete'), true);
        });
      });

      group('manager role', () {
        test('should NOT have create/update/delete on users', () {
          expect(hasPermission('manager', 'users', 'create'), false);
          expect(hasPermission('manager', 'users', 'update'), false);
          expect(hasPermission('manager', 'users', 'delete'), false);
        });

        test('should have read on users', () {
          expect(hasPermission('manager', 'users', 'read'), true);
        });

        test('should have read on roles', () {
          expect(hasPermission('manager', 'roles', 'read'), true);
        });

        test('should have all permissions on work_orders', () {
          expect(hasPermission('manager', 'work_orders', 'create'), true);
          expect(hasPermission('manager', 'work_orders', 'read'), true);
          expect(hasPermission('manager', 'work_orders', 'update'), true);
          expect(hasPermission('manager', 'work_orders', 'delete'), true);
        });
      });

      group('dispatcher role', () {
        test('should have create/read/update on work_orders', () {
          expect(hasPermission('dispatcher', 'work_orders', 'create'), true);
          expect(hasPermission('dispatcher', 'work_orders', 'read'), true);
          expect(hasPermission('dispatcher', 'work_orders', 'update'), true);
        });

        test('should NOT have delete on work_orders', () {
          expect(hasPermission('dispatcher', 'work_orders', 'delete'), false);
        });

        test('should NOT have any permissions on roles', () {
          expect(hasPermission('dispatcher', 'roles', 'create'), false);
          expect(hasPermission('dispatcher', 'roles', 'read'), false);
          expect(hasPermission('dispatcher', 'roles', 'update'), false);
          expect(hasPermission('dispatcher', 'roles', 'delete'), false);
        });
      });

      group('technician role', () {
        test('should have read on users', () {
          expect(hasPermission('technician', 'users', 'read'), true);
        });

        test('should NOT have create/update/delete on users', () {
          expect(hasPermission('technician', 'users', 'create'), false);
          expect(hasPermission('technician', 'users', 'update'), false);
          expect(hasPermission('technician', 'users', 'delete'), false);
        });

        test('should have read/update on work_orders', () {
          expect(hasPermission('technician', 'work_orders', 'read'), true);
          expect(hasPermission('technician', 'work_orders', 'update'), true);
        });

        test('should NOT have create/delete on work_orders', () {
          expect(hasPermission('technician', 'work_orders', 'create'), false);
          expect(hasPermission('technician', 'work_orders', 'delete'), false);
        });
      });

      group('client role', () {
        test('should only have read on work_orders', () {
          expect(hasPermission('client', 'work_orders', 'read'), true);
          expect(hasPermission('client', 'work_orders', 'create'), false);
          expect(hasPermission('client', 'work_orders', 'update'), false);
          expect(hasPermission('client', 'work_orders', 'delete'), false);
        });

        test('should have create on audit_logs (automatic)', () {
          expect(hasPermission('client', 'audit_logs', 'create'), true);
        });

        test('should NOT have any other permissions', () {
          expect(hasPermission('client', 'users', 'read'), false);
          expect(hasPermission('client', 'roles', 'read'), false);
          expect(hasPermission('client', 'audit_logs', 'read'), false);
        });
      });

      group('edge cases', () {
        test('should return false for unknown role', () {
          expect(hasPermission('unknown', 'users', 'read'), false);
        });

        test('should return false for unknown resource', () {
          expect(hasPermission('admin', 'unknown', 'read'), false);
        });

        test('should return false for unknown operation', () {
          expect(hasPermission('admin', 'users', 'unknown'), false);
        });

        test('should return false for null role', () {
          expect(hasPermission(null, 'users', 'read'), false);
        });

        test('should return false for null resource', () {
          expect(hasPermission('admin', null, 'read'), false);
        });

        test('should return false for null operation', () {
          expect(hasPermission('admin', 'users', null), false);
        });

        test('should return false for empty strings', () {
          expect(hasPermission('', 'users', 'read'), false);
          expect(hasPermission('admin', '', 'read'), false);
          expect(hasPermission('admin', 'users', ''), false);
        });

        test('should be case-insensitive for role name', () {
          expect(hasPermission('ADMIN', 'users', 'delete'), true);
          expect(hasPermission('Admin', 'users', 'delete'), true);
        });
      });

      group('permission inheritance validation', () {
        test('higher roles should have all lower role permissions', () {
          // If client can read work_orders, everyone should be able to
          expect(hasPermission('client', 'work_orders', 'read'), true);
          expect(hasPermission('technician', 'work_orders', 'read'), true);
          expect(hasPermission('dispatcher', 'work_orders', 'read'), true);
          expect(hasPermission('manager', 'work_orders', 'read'), true);
          expect(hasPermission('admin', 'work_orders', 'read'), true);
        });
      });
    });

    group('hasMinimumRole()', () {
      test('should return true when roles are equal', () {
        expect(hasMinimumRole('admin', 'admin'), true);
        expect(hasMinimumRole('manager', 'manager'), true);
        expect(hasMinimumRole('client', 'client'), true);
      });

      test('should return true when user role exceeds required', () {
        expect(hasMinimumRole('admin', 'manager'), true);
        expect(hasMinimumRole('admin', 'dispatcher'), true);
        expect(hasMinimumRole('admin', 'technician'), true);
        expect(hasMinimumRole('admin', 'client'), true);

        expect(hasMinimumRole('manager', 'dispatcher'), true);
        expect(hasMinimumRole('manager', 'technician'), true);
        expect(hasMinimumRole('manager', 'client'), true);
      });

      test('should return false when user role is below required', () {
        expect(hasMinimumRole('client', 'admin'), false);
        expect(hasMinimumRole('technician', 'admin'), false);
        expect(hasMinimumRole('dispatcher', 'admin'), false);
        expect(hasMinimumRole('manager', 'admin'), false);

        expect(hasMinimumRole('client', 'manager'), false);
        expect(hasMinimumRole('technician', 'manager'), false);
      });

      test('should return false for unknown user role', () {
        expect(hasMinimumRole('unknown', 'client'), false);
      });

      test('should return false for unknown required role', () {
        expect(hasMinimumRole('admin', 'unknown'), false);
      });

      test('should return false for null user role', () {
        expect(hasMinimumRole(null, 'client'), false);
      });

      test('should return false for null required role', () {
        expect(hasMinimumRole('admin', null), false);
      });
    });

    group('getRolePermissions()', () {
      test('should return all permissions for admin', () {
        final perms = getRolePermissions('admin');
        expect(perms.containsKey('users'), true);
        expect(perms.containsKey('roles'), true);
        expect(perms.containsKey('work_orders'), true);
        expect(perms.containsKey('audit_logs'), true);

        expect(perms['users']!.length, 4); // All CRUD
        expect(perms['roles']!.length, 4); // All CRUD
        expect(perms['work_orders']!.length, 4); // All CRUD
        expect(perms['audit_logs']!.length, 4); // All CRUD
      });

      test('should return limited permissions for manager', () {
        final perms = getRolePermissions('manager');
        expect(perms['users'], ['read']);
        expect(perms['roles'], ['read']);
        expect(perms['work_orders'], ['create', 'read', 'update', 'delete']);
      });

      test('should return minimal permissions for client', () {
        final perms = getRolePermissions('client');
        expect(perms['work_orders'], ['read']);
        expect(perms['audit_logs'], ['create']);
        expect(perms.containsKey('users'), false);
        expect(perms.containsKey('roles'), false);
      });

      test('should return empty object for unknown role', () {
        final perms = getRolePermissions('unknown');
        expect(perms.isEmpty, true);
      });

      test('should return empty object for null role', () {
        final perms = getRolePermissions(null);
        expect(perms.isEmpty, true);
      });
    });

    group('PermissionService', () {
      test('canPerform should work correctly', () {
        expect(PermissionService.canPerform('admin', 'users', 'delete'), true);
        expect(
          PermissionService.canPerform('client', 'users', 'delete'),
          false,
        );
      });

      test('meetsMinimumRole should work correctly', () {
        expect(PermissionService.meetsMinimumRole('admin', 'manager'), true);
        expect(PermissionService.meetsMinimumRole('client', 'admin'), false);
      });

      test('isAdmin should identify admins', () {
        expect(PermissionService.isAdmin('admin'), true);
        expect(PermissionService.isAdmin('ADMIN'), true);
        expect(PermissionService.isAdmin('manager'), false);
        expect(PermissionService.isAdmin(null), false);
      });

      test('isManager should check manager or above', () {
        expect(PermissionService.isManager('admin'), true);
        expect(PermissionService.isManager('manager'), true);
        expect(PermissionService.isManager('dispatcher'), false);
      });

      test('isDispatcher should check dispatcher or above', () {
        expect(PermissionService.isDispatcher('admin'), true);
        expect(PermissionService.isDispatcher('manager'), true);
        expect(PermissionService.isDispatcher('dispatcher'), true);
        expect(PermissionService.isDispatcher('technician'), false);
      });

      test('isTechnician should check technician or above', () {
        expect(PermissionService.isTechnician('admin'), true);
        expect(PermissionService.isTechnician('technician'), true);
        expect(PermissionService.isTechnician('client'), false);
      });

      test('getPermissionsFor should return role permissions', () {
        final perms = PermissionService.getPermissionsFor('manager');
        expect(perms.containsKey('users'), true);
      });

      test('getPriority should return role priority', () {
        expect(PermissionService.getPriority('admin'), 5);
        expect(PermissionService.getPriority('client'), 1);
        expect(PermissionService.getPriority('unknown'), null);
      });
    });
  });
}
