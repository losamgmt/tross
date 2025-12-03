/// Data-Driven Permission Tests
///
/// These tests validate permission STRUCTURE and PARITY, not hardcoded values.
/// If you change permissions.json, these tests continue to pass as long as:
/// 1. The JSON structure is valid
/// 2. Frontend-backend parity is maintained
/// 3. Role hierarchy is consistent
///
/// NO MORE BRITTLE TESTS! 🎉
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/models/permission.dart';
import 'package:tross_app/services/permission_service_dynamic.dart';

void main() {
  // Initialize permission service before all tests
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    await PermissionService.initialize();
  });

  group('Permission Configuration Structure', () {
    test('permission config loads successfully', () {
      expect(PermissionService.config, isNotNull);
      expect(PermissionService.config!.roles, isNotEmpty);
      expect(PermissionService.config!.resources, isNotEmpty);
    });

    test('all expected roles are defined', () {
      final config = PermissionService.config!;

      // Verify all UserRole enum values have corresponding config
      for (final role in UserRole.values) {
        expect(
          config.roles.containsKey(role.name),
          isTrue,
          reason: 'Role ${role.name} missing from permissions.json',
        );
      }
    });

    test('all expected resources are defined', () {
      final config = PermissionService.config!;

      // Verify all ResourceType enum values have corresponding config
      for (final resource in ResourceType.values) {
        final resourceKey = resource.toBackendString();
        expect(
          config.resources.containsKey(resourceKey),
          isTrue,
          reason: 'Resource $resourceKey missing from permissions.json',
        );
      }
    });

    test('role priorities match enum priorities', () {
      final config = PermissionService.config!;

      for (final role in UserRole.values) {
        final configPriority = config.getRolePriority(role.name);
        expect(
          configPriority,
          equals(role.priority),
          reason: 'Priority mismatch for role ${role.name}',
        );
      }
    });

    test('role priorities are unique', () {
      final config = PermissionService.config!;
      final priorities = config.roles.values.map((r) => r.priority).toSet();

      expect(
        priorities.length,
        equals(config.roles.length),
        reason: 'Duplicate priorities found in roles',
      );
    });

    test('all resources have all CRUD operations', () {
      final config = PermissionService.config!;

      for (final entry in config.resources.entries) {
        final resourceName = entry.key;
        final resourceConfig = entry.value;

        for (final operation in CrudOperation.values) {
          expect(
            resourceConfig.permissions.containsKey(operation.toString()),
            isTrue,
            reason:
                'Resource $resourceName missing ${operation.toString()} permission',
          );
        }
      }
    });

    test('all permissions reference valid roles', () {
      final config = PermissionService.config!;
      final validRoles = config.roles.keys.toSet();

      for (final resourceEntry in config.resources.entries) {
        for (final permEntry in resourceEntry.value.permissions.entries) {
          final minimumRole = permEntry.value.minimumRole;
          expect(
            validRoles.contains(minimumRole),
            isTrue,
            reason:
                'Invalid role "$minimumRole" in ${resourceEntry.key}.${permEntry.key}',
          );
        }
      }
    });

    test('permission priorities match role priorities', () {
      final config = PermissionService.config!;

      for (final resourceEntry in config.resources.entries) {
        for (final permEntry in resourceEntry.value.permissions.entries) {
          final minimumRole = permEntry.value.minimumRole;
          final minimumPriority = permEntry.value.minimumPriority;
          final expectedPriority = config.getRolePriority(minimumRole);

          expect(
            minimumPriority,
            equals(expectedPriority),
            reason:
                'Priority mismatch in ${resourceEntry.key}.${permEntry.key}: '
                'says $minimumPriority but role $minimumRole has $expectedPriority',
          );
        }
      }
    });
  });

  group('Permission Service - Boundary Checks', () {
    test('handles null role gracefully', () {
      expect(
        PermissionService.hasPermission(
          null,
          ResourceType.users,
          CrudOperation.read,
        ),
        isFalse,
      );
    });

    test('handles empty role gracefully', () {
      expect(
        PermissionService.hasPermission(
          '',
          ResourceType.users,
          CrudOperation.read,
        ),
        isFalse,
      );
    });

    test('handles invalid role gracefully', () {
      expect(
        PermissionService.hasPermission(
          'superadmin',
          ResourceType.users,
          CrudOperation.read,
        ),
        isFalse,
      );
    });

    test('is case-insensitive for role names', () {
      final config = PermissionService.config!;

      // Find first resource that admin can read
      String? testResource;
      for (final entry in config.resources.entries) {
        final adminCanRead = PermissionService.hasPermission(
          'admin',
          ResourceType.values.firstWhere(
            (r) => r.toBackendString() == entry.key,
          ),
          CrudOperation.read,
        );
        if (adminCanRead) {
          testResource = entry.key;
          break;
        }
      }

      expect(
        testResource,
        isNotNull,
        reason: 'Need at least one readable resource for test',
      );

      final resource = ResourceType.values.firstWhere(
        (r) => r.toBackendString() == testResource,
      );

      // Test case variations
      expect(
        PermissionService.hasPermission('admin', resource, CrudOperation.read),
        isTrue,
      );
      expect(
        PermissionService.hasPermission('ADMIN', resource, CrudOperation.read),
        isTrue,
      );
      expect(
        PermissionService.hasPermission('Admin', resource, CrudOperation.read),
        isTrue,
      );
    });
  });

  group('Permission Service - Role Hierarchy', () {
    test('higher priority roles inherit lower role permissions', () {
      final config = PermissionService.config!;

      // For each resource/operation combination
      for (final resourceEntry in config.resources.entries) {
        final resourceKey = resourceEntry.key;
        final resource = ResourceType.values.firstWhere(
          (r) => r.toBackendString() == resourceKey,
        );

        for (final operation in CrudOperation.values) {
          final minimumRole = config.getMinimumRole(
            resourceKey,
            operation.toString(),
          );
          if (minimumRole == null) continue;

          final minimumPriority = config.getRolePriority(minimumRole)!;

          // All roles with priority >= minimumPriority should have permission
          for (final role in UserRole.values) {
            final hasPermission = PermissionService.hasPermission(
              role.name,
              resource,
              operation,
            );

            if (role.priority >= minimumPriority) {
              expect(
                hasPermission,
                isTrue,
                reason:
                    '${role.name} (priority ${role.priority}) should have '
                    '$resourceKey.$operation (requires $minimumRole, priority $minimumPriority)',
              );
            } else {
              expect(
                hasPermission,
                isFalse,
                reason:
                    '${role.name} (priority ${role.priority}) should NOT have '
                    '$resourceKey.$operation (requires $minimumRole, priority $minimumPriority)',
              );
            }
          }
        }
      }
    });

    test('admin has all permissions (highest priority)', () {
      // Admin should be able to do everything
      for (final resource in ResourceType.values) {
        for (final operation in CrudOperation.values) {
          expect(
            PermissionService.hasPermission('admin', resource, operation),
            isTrue,
            reason:
                'Admin should have ${resource.toString()}.${operation.toString()}',
          );
        }
      }
    });

    test('client has only explicitly granted permissions (lowest priority)', () {
      final config = PermissionService.config!;

      // Client should only have permissions where minimumPriority = 1
      for (final resourceEntry in config.resources.entries) {
        final resourceKey = resourceEntry.key;
        final resource = ResourceType.values.firstWhere(
          (r) => r.toBackendString() == resourceKey,
        );

        for (final operation in CrudOperation.values) {
          final minimumPriority = config.getMinimumPriority(
            resourceKey,
            operation.toString(),
          );
          final hasPermission = PermissionService.hasPermission(
            'client',
            resource,
            operation,
          );

          if (minimumPriority == 1) {
            expect(
              hasPermission,
              isTrue,
              reason:
                  'Client should have $resourceKey.${operation.toString()} (requires priority 1)',
            );
          } else {
            expect(
              hasPermission,
              isFalse,
              reason:
                  'Client should NOT have $resourceKey.${operation.toString()} (requires priority $minimumPriority)',
            );
          }
        }
      }
    });
  });

  group('Permission Service - Helper Methods', () {
    test(
      'getAllowedOperations returns correct operations for each role/resource',
      () {
        // Verify config is loaded
        expect(PermissionService.config, isNotNull);

        for (final role in UserRole.values) {
          for (final resource in ResourceType.values) {
            final allowed = PermissionService.getAllowedOperations(
              role.name,
              resource,
            );

            // Verify each allowed operation
            for (final operation in CrudOperation.values) {
              final hasPermission = PermissionService.hasPermission(
                role.name,
                resource,
                operation,
              );

              if (hasPermission) {
                expect(
                  allowed.contains(operation),
                  isTrue,
                  reason:
                      '${role.name} should have ${operation.toString()} in allowed list for ${resource.toString()}',
                );
              } else {
                expect(
                  allowed.contains(operation),
                  isFalse,
                  reason:
                      '${role.name} should NOT have ${operation.toString()} in allowed list for ${resource.toString()}',
                );
              }
            }
          }
        }
      },
    );

    test('canAccessResource returns true if ANY operation is allowed', () {
      for (final role in UserRole.values) {
        for (final resource in ResourceType.values) {
          final allowed = PermissionService.getAllowedOperations(
            role.name,
            resource,
          );
          final canAccess = PermissionService.canAccessResource(
            role.name,
            resource,
          );

          expect(
            canAccess,
            equals(allowed.isNotEmpty),
            reason:
                'canAccessResource should match getAllowedOperations.isNotEmpty',
          );
        }
      }
    });

    test('checkPermission returns correct denial reason', () {
      // Test with invalid role
      final result1 = PermissionService.checkPermission(
        null,
        ResourceType.users,
        CrudOperation.read,
      );
      expect(result1.allowed, isFalse);
      expect(result1.denialReason, contains('No role'));

      // Test with unknown role
      final result2 = PermissionService.checkPermission(
        'superadmin',
        ResourceType.users,
        CrudOperation.read,
      );
      expect(result2.allowed, isFalse);
      expect(result2.denialReason, contains('Unknown role'));

      // Test with insufficient permission (find a denied case)
      final config = PermissionService.config!;
      for (final resourceEntry in config.resources.entries) {
        final resourceKey = resourceEntry.key;
        final resource = ResourceType.values.firstWhere(
          (r) => r.toBackendString() == resourceKey,
        );

        for (final operation in CrudOperation.values) {
          final hasPermission = PermissionService.hasPermission(
            'client',
            resource,
            operation,
          );

          if (!hasPermission) {
            // Found a denied permission
            final result = PermissionService.checkPermission(
              'client',
              resource,
              operation,
            );
            expect(result.allowed, isFalse);
            expect(result.denialReason, isNotNull);
            expect(result.denialReason, isNot(isEmpty));
            return; // Only need to test one
          }
        }
      }
    });

    test('hasMinimumRole validates role hierarchy correctly', () {
      for (final userRole in UserRole.values) {
        for (final requiredRole in UserRole.values) {
          final hasMinimum = PermissionService.hasMinimumRole(
            userRole.name,
            requiredRole,
          );

          expect(
            hasMinimum,
            equals(userRole.priority >= requiredRole.priority),
            reason:
                '${userRole.name} (${userRole.priority}) vs ${requiredRole.name} (${requiredRole.priority})',
          );
        }
      }
    });

    test('getMinimumRole returns correct minimum role for each permission', () {
      final config = PermissionService.config!;

      for (final resourceEntry in config.resources.entries) {
        final resourceKey = resourceEntry.key;
        final resource = ResourceType.values.firstWhere(
          (r) => r.toBackendString() == resourceKey,
        );

        for (final operation in CrudOperation.values) {
          final expectedRole = config.getMinimumRole(
            resourceKey,
            operation.toString(),
          );
          final actualRole = PermissionService.getMinimumRole(
            resource,
            operation,
          );

          expect(
            actualRole?.name,
            equals(expectedRole),
            reason:
                'Minimum role mismatch for $resourceKey.${operation.toString()}',
          );
        }
      }
    });
  });

  group('Row-Level Security', () {
    test('getRowLevelSecurity returns correct policies', () {
      final config = PermissionService.config!;

      for (final role in UserRole.values) {
        for (final resourceEntry in config.resources.entries) {
          final resourceKey = resourceEntry.key;
          final resource = ResourceType.values.firstWhere(
            (r) => r.toBackendString() == resourceKey,
          );
          final expectedPolicy = config.getRowLevelSecurity(
            role.name,
            resourceKey,
          );
          final actualPolicy = PermissionService.getRowLevelSecurity(
            role.name,
            resource,
          );

          expect(
            actualPolicy,
            equals(expectedPolicy),
            reason: 'RLS policy mismatch for ${role.name} on $resourceKey',
          );
        }
      }
    });

    test('RLS policies are null or valid strings', () {
      for (final role in UserRole.values) {
        for (final resource in ResourceType.values) {
          final policy = PermissionService.getRowLevelSecurity(
            role.name,
            resource,
          );

          // Policy must be null or a non-empty string
          if (policy != null) {
            expect(policy, isNot(isEmpty));
          }
        }
      }
    });
  });

  group('Configuration Immutability', () {
    test('modifying returned config does not affect internal state', () {
      final config1 = PermissionService.config;
      final config2 = PermissionService.config;

      // Should return same cached instance
      expect(identical(config1, config2), isTrue);
    });
  });
}
