/// Tests for Permission Configuration
///
/// Tests BEHAVIOR and INVARIANTS, not specific permission values.
/// This approach prevents brittleness when permission values change.
///
/// Key Testing Patterns:
/// 1. Structural invariants - all roles/resources/operations exist
/// 2. Boundary cases - admin has ALL, invalid role has NONE
/// 3. Hierarchy monotonicity - higher role >= lower role permissions
/// 4. Edge cases - null, empty, unknown inputs handled gracefully
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/config/permissions.dart';

void main() {
  group('Permission Configuration Tests', () {
    // ================================================================
    // STRUCTURAL INVARIANTS - Configuration shape is correct
    // ================================================================

    group('Role Hierarchy Structure', () {
      test('should have exactly 5 roles defined', () {
        expect(roleHierarchy.length, 5);
      });

      test('should contain all expected role names', () {
        expect(roleHierarchy.containsKey('admin'), true);
        expect(roleHierarchy.containsKey('manager'), true);
        expect(roleHierarchy.containsKey('dispatcher'), true);
        expect(roleHierarchy.containsKey('technician'), true);
        expect(roleHierarchy.containsKey('customer'), true);
      });

      test('should have unique priority values for each role', () {
        final priorities = roleHierarchy.values.toSet();
        expect(
          priorities.length,
          roleHierarchy.length,
          reason: 'Each role must have a unique priority',
        );
      });

      test('should have admin as highest priority', () {
        final maxPriority = roleHierarchy.values.reduce(
          (a, b) => a > b ? a : b,
        );
        expect(roleHierarchy['admin'], maxPriority);
      });

      test('should have customer as lowest priority', () {
        final minPriority = roleHierarchy.values.reduce(
          (a, b) => a < b ? a : b,
        );
        expect(roleHierarchy['customer'], minPriority);
      });

      test('should have strictly ordered priorities', () {
        // admin > manager > dispatcher > technician > customer
        expect(roleHierarchy['admin']! > roleHierarchy['manager']!, true);
        expect(roleHierarchy['manager']! > roleHierarchy['dispatcher']!, true);
        expect(
          roleHierarchy['dispatcher']! > roleHierarchy['technician']!,
          true,
        );
        expect(roleHierarchy['technician']! > roleHierarchy['customer']!, true);
      });
    });

    group('Operations Structure', () {
      test('should have all 4 CRUD operations defined', () {
        expect(Operations.create, 'create');
        expect(Operations.read, 'read');
        expect(Operations.update, 'update');
        expect(Operations.delete, 'delete');
      });
    });

    group('Permissions Matrix Structure', () {
      test('should have at least core resources defined', () {
        // Core resources that must exist
        expect(permissions.containsKey('users'), true);
        expect(permissions.containsKey('roles'), true);
        expect(permissions.containsKey('work_orders'), true);
        expect(permissions.containsKey('audit_logs'), true);
      });

      test('every resource should have all 4 CRUD operations', () {
        for (final resource in permissions.keys) {
          final ops = permissions[resource]!;
          expect(
            ops.containsKey('create'),
            true,
            reason: '$resource missing create',
          );
          expect(
            ops.containsKey('read'),
            true,
            reason: '$resource missing read',
          );
          expect(
            ops.containsKey('update'),
            true,
            reason: '$resource missing update',
          );
          expect(
            ops.containsKey('delete'),
            true,
            reason: '$resource missing delete',
          );
        }
      });

      test('every permission value should be a valid role priority', () {
        final validPriorities = roleHierarchy.values.toSet();
        for (final resource in permissions.keys) {
          for (final entry in permissions[resource]!.entries) {
            expect(
              validPriorities.contains(entry.value),
              true,
              reason:
                  '$resource.${entry.key} has invalid priority: ${entry.value}',
            );
          }
        }
      });
    });

    // ================================================================
    // BOUNDARY CASES - Admin has ALL, Invalid has NONE
    // ================================================================

    group('Boundary: Admin Role (highest privilege)', () {
      test('admin should have ALL permissions on ALL resources', () {
        for (final resource in permissions.keys) {
          for (final operation in ['create', 'read', 'update', 'delete']) {
            expect(
              hasPermission('admin', resource, operation),
              true,
              reason: 'Admin should have $operation on $resource',
            );
          }
        }
      });

      test(
        'admin getRolePermissions should return all resources with all ops',
        () {
          final perms = getRolePermissions('admin');
          for (final resource in permissions.keys) {
            expect(perms.containsKey(resource), true);
            expect(
              perms[resource]!.length,
              4,
              reason: '$resource should have 4',
            );
          }
        },
      );
    });

    group('Boundary: Invalid Role (no privilege)', () {
      test('unknown role should have ZERO permissions', () {
        for (final resource in permissions.keys) {
          for (final operation in ['create', 'read', 'update', 'delete']) {
            expect(
              hasPermission('nonexistent_role', resource, operation),
              false,
              reason: 'Unknown role should not have $operation on $resource',
            );
          }
        }
      });

      test('null role should have ZERO permissions', () {
        for (final resource in permissions.keys) {
          expect(hasPermission(null, resource, 'read'), false);
        }
      });

      test('empty string role should have ZERO permissions', () {
        for (final resource in permissions.keys) {
          expect(hasPermission('', resource, 'read'), false);
        }
      });

      test('unknown role getRolePermissions should return empty map', () {
        expect(getRolePermissions('nonexistent'), isEmpty);
        expect(getRolePermissions(null), isEmpty);
        expect(getRolePermissions(''), isEmpty);
      });
    });

    group('Boundary: Customer Role (lowest valid privilege)', () {
      test('customer should have at least SOME permissions', () {
        final perms = getRolePermissions('customer');
        expect(
          perms.isNotEmpty,
          true,
          reason: 'Customer should have at least one permission',
        );
      });

      test('customer should NOT have admin-level permissions', () {
        // Customer should not be able to delete users
        expect(hasPermission('customer', 'users', 'delete'), false);
        // Customer should not be able to manage roles
        expect(hasPermission('customer', 'roles', 'create'), false);
        expect(hasPermission('customer', 'roles', 'update'), false);
        expect(hasPermission('customer', 'roles', 'delete'), false);
      });
    });

    // ================================================================
    // HIERARCHY MONOTONICITY - Higher role >= Lower role
    // ================================================================

    group('Hierarchy Monotonicity', () {
      test('each role should have >= permissions of all lower roles', () {
        final orderedRoles = [
          'customer',
          'technician',
          'dispatcher',
          'manager',
          'admin',
        ];

        for (var i = 1; i < orderedRoles.length; i++) {
          final higherRole = orderedRoles[i];
          final lowerRole = orderedRoles[i - 1];

          for (final resource in permissions.keys) {
            for (final operation in ['create', 'read', 'update', 'delete']) {
              final lowerHas = hasPermission(lowerRole, resource, operation);
              final higherHas = hasPermission(higherRole, resource, operation);

              // If lower role has permission, higher role MUST have it
              if (lowerHas) {
                expect(
                  higherHas,
                  true,
                  reason:
                      '$higherRole should have $operation on $resource since $lowerRole does',
                );
              }
            }
          }
        }
      });

      test('hasMinimumRole should respect hierarchy', () {
        final orderedRoles = [
          'customer',
          'technician',
          'dispatcher',
          'manager',
          'admin',
        ];

        for (var i = 0; i < orderedRoles.length; i++) {
          for (var j = 0; j < orderedRoles.length; j++) {
            final userRole = orderedRoles[i];
            final requiredRole = orderedRoles[j];
            final expected = i >= j; // user index >= required index

            expect(
              hasMinimumRole(userRole, requiredRole),
              expected,
              reason: '$userRole meets $requiredRole: expected $expected',
            );
          }
        }
      });
    });

    // ================================================================
    // FUNCTION BEHAVIOR - getRolePriority
    // ================================================================

    group('getRolePriority() Behavior', () {
      test('should return a value for every defined role', () {
        for (final role in roleHierarchy.keys) {
          expect(getRolePriority(role), isNotNull);
        }
      });

      test('should be case-insensitive', () {
        expect(getRolePriority('ADMIN'), getRolePriority('admin'));
        expect(getRolePriority('Admin'), getRolePriority('admin'));
        expect(getRolePriority('aDmIn'), getRolePriority('admin'));
      });

      test('should return null for invalid inputs', () {
        expect(getRolePriority('unknown'), isNull);
        expect(getRolePriority('superuser'), isNull);
        expect(getRolePriority(null), isNull);
        expect(getRolePriority(''), isNull);
      });
    });

    // ================================================================
    // FUNCTION BEHAVIOR - hasPermission edge cases
    // ================================================================

    group('hasPermission() Edge Cases', () {
      test('should return false for unknown resource', () {
        expect(hasPermission('admin', 'nonexistent_resource', 'read'), false);
      });

      test('should return false for unknown operation', () {
        expect(hasPermission('admin', 'users', 'nonexistent_op'), false);
      });

      test('should return false for all null/empty inputs', () {
        expect(hasPermission(null, 'users', 'read'), false);
        expect(hasPermission('admin', null, 'read'), false);
        expect(hasPermission('admin', 'users', null), false);
        expect(hasPermission('', 'users', 'read'), false);
        expect(hasPermission('admin', '', 'read'), false);
        expect(hasPermission('admin', 'users', ''), false);
      });

      test('should be case-insensitive for role name', () {
        // Pick any permission admin definitely has
        final adminHasRead = hasPermission('admin', 'users', 'read');
        expect(hasPermission('ADMIN', 'users', 'read'), adminHasRead);
        expect(hasPermission('Admin', 'users', 'read'), adminHasRead);
      });
    });

    // ================================================================
    // FUNCTION BEHAVIOR - hasMinimumRole edge cases
    // ================================================================

    group('hasMinimumRole() Edge Cases', () {
      test('should return true when roles are equal', () {
        for (final role in roleHierarchy.keys) {
          expect(hasMinimumRole(role, role), true);
        }
      });

      test('should return false for invalid inputs', () {
        expect(hasMinimumRole('unknown', 'customer'), false);
        expect(hasMinimumRole('admin', 'unknown'), false);
        expect(hasMinimumRole(null, 'customer'), false);
        expect(hasMinimumRole('admin', null), false);
      });
    });

    // ================================================================
    // PERMISSION SERVICE - Convenience methods
    // ================================================================

    group('PermissionService Convenience Methods', () {
      test('canPerform should delegate to hasPermission correctly', () {
        // Test with known boundary case: admin can do anything
        expect(PermissionService.canPerform('admin', 'users', 'delete'), true);
        // Unknown role can do nothing
        expect(PermissionService.canPerform('unknown', 'users', 'read'), false);
      });

      test('meetsMinimumRole should delegate to hasMinimumRole correctly', () {
        expect(PermissionService.meetsMinimumRole('admin', 'customer'), true);
        expect(PermissionService.meetsMinimumRole('customer', 'admin'), false);
      });

      test('isAdmin should identify only admin role', () {
        expect(PermissionService.isAdmin('admin'), true);
        expect(PermissionService.isAdmin('ADMIN'), true);
        expect(PermissionService.isAdmin('manager'), false);
        expect(PermissionService.isAdmin('customer'), false);
        expect(PermissionService.isAdmin(null), false);
        expect(PermissionService.isAdmin(''), false);
      });

      test('role level checks should respect hierarchy', () {
        // isManager: admin and manager should pass
        expect(PermissionService.isManager('admin'), true);
        expect(PermissionService.isManager('manager'), true);
        expect(PermissionService.isManager('dispatcher'), false);

        // isDispatcher: admin, manager, dispatcher should pass
        expect(PermissionService.isDispatcher('admin'), true);
        expect(PermissionService.isDispatcher('manager'), true);
        expect(PermissionService.isDispatcher('dispatcher'), true);
        expect(PermissionService.isDispatcher('technician'), false);

        // isTechnician: admin, manager, dispatcher, technician should pass
        expect(PermissionService.isTechnician('admin'), true);
        expect(PermissionService.isTechnician('technician'), true);
        expect(PermissionService.isTechnician('customer'), false);
      });

      test('getPermissionsFor should return non-empty for valid roles', () {
        for (final role in roleHierarchy.keys) {
          final perms = PermissionService.getPermissionsFor(role);
          // Every valid role should have at least one permission
          // (even if it's just customer with read on something)
          if (role != 'customer') {
            // Most roles have multiple permissions
            expect(perms.isNotEmpty, true, reason: '$role should have perms');
          }
        }
      });

      test('getPriority should match getRolePriority', () {
        for (final role in roleHierarchy.keys) {
          expect(PermissionService.getPriority(role), getRolePriority(role));
        }
        expect(PermissionService.getPriority('unknown'), isNull);
        expect(PermissionService.getPriority(null), isNull);
      });
    });
  });
}
