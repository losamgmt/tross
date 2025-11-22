/// Tests for Permission Models
///
/// Tests all permission enums and classes for correct behavior
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/models/permission.dart';

void main() {
  group('CrudOperation Enum', () {
    test('should have all 4 CRUD operations', () {
      expect(CrudOperation.values.length, 4);
      expect(CrudOperation.values, contains(CrudOperation.create));
      expect(CrudOperation.values, contains(CrudOperation.read));
      expect(CrudOperation.values, contains(CrudOperation.update));
      expect(CrudOperation.values, contains(CrudOperation.delete));
    });

    test('toString should return operation name', () {
      expect(CrudOperation.create.toString(), 'create');
      expect(CrudOperation.read.toString(), 'read');
      expect(CrudOperation.update.toString(), 'update');
      expect(CrudOperation.delete.toString(), 'delete');
    });

    test('should be comparable', () {
      expect(CrudOperation.create == CrudOperation.create, true);
      expect(CrudOperation.create == CrudOperation.read, false);
    });
  });

  group('ResourceType Enum', () {
    test('should have core resources', () {
      expect(ResourceType.users.toString(), 'users');
      expect(ResourceType.roles.toString(), 'roles');
      expect(ResourceType.workOrders.toString(), 'work_orders'); // snake_case
      expect(ResourceType.auditLogs.toString(), 'audit_logs'); // snake_case
    });

    test('should have future resources defined', () {
      expect(ResourceType.values, contains(ResourceType.contracts));
      expect(ResourceType.values, contains(ResourceType.workOrders));
      expect(ResourceType.values, contains(ResourceType.invoices));
      expect(ResourceType.values, contains(ResourceType.auditLogs));
    });

    test('toString should handle snake_case conversion', () {
      // Resources with explicit _value parameter
      expect(ResourceType.workOrders.toString(), 'work_orders');
      expect(ResourceType.auditLogs.toString(), 'audit_logs');

      // Resources without _value use enum name
      expect(ResourceType.users.toString(), 'users');
      expect(ResourceType.contracts.toString(), 'contracts');
    });

    test('should be comparable', () {
      expect(ResourceType.users == ResourceType.users, true);
      expect(ResourceType.users == ResourceType.roles, false);
    });
  });

  group('UserRole Enum', () {
    test('should have all 5 roles', () {
      expect(UserRole.values.length, 5);
      expect(UserRole.values, contains(UserRole.admin));
      expect(UserRole.values, contains(UserRole.manager));
      expect(UserRole.values, contains(UserRole.dispatcher));
      expect(UserRole.values, contains(UserRole.technician));
      expect(UserRole.values, contains(UserRole.customer));
    });

    test('should have correct priority hierarchy', () {
      expect(UserRole.admin.priority, 5); // Highest
      expect(UserRole.manager.priority, 4);
      expect(UserRole.dispatcher.priority, 3);
      expect(UserRole.technician.priority, 2);
      expect(UserRole.customer.priority, 1); // Lowest
    });

    test('priorities should be unique', () {
      final priorities = UserRole.values.map((r) => r.priority).toSet();
      expect(priorities.length, UserRole.values.length);
    });

    test('toString should return role name', () {
      expect(UserRole.admin.toString(), 'admin');
      expect(UserRole.manager.toString(), 'manager');
      expect(UserRole.dispatcher.toString(), 'dispatcher');
      expect(UserRole.technician.toString(), 'technician');
      expect(UserRole.customer.toString(), 'customer');
    });

    group('fromString()', () {
      test('should parse valid role names', () {
        expect(UserRole.fromString('admin'), UserRole.admin);
        expect(UserRole.fromString('manager'), UserRole.manager);
        expect(UserRole.fromString('dispatcher'), UserRole.dispatcher);
        expect(UserRole.fromString('technician'), UserRole.technician);
        expect(UserRole.fromString('customer'), UserRole.customer);
      });

      test('should be case-insensitive', () {
        expect(UserRole.fromString('ADMIN'), UserRole.admin);
        expect(UserRole.fromString('Admin'), UserRole.admin);
        expect(UserRole.fromString('AdMiN'), UserRole.admin);
        expect(UserRole.fromString('manager'), UserRole.manager);
        expect(UserRole.fromString('MANAGER'), UserRole.manager);
      });

      test('should return null for invalid role names', () {
        expect(UserRole.fromString('invalid'), null);
        expect(UserRole.fromString('superadmin'), null);
        expect(UserRole.fromString(''), null);
        expect(UserRole.fromString('admin123'), null);
      });

      test('should return null for null input', () {
        expect(UserRole.fromString(null), null);
      });
    });
  });

  group('PermissionResult Class', () {
    test('allowed() constructor creates allowed result', () {
      const result = PermissionResult.allowed();
      expect(result.allowed, true);
      expect(result.denialReason, null);
      expect(result.minimumRequired, null);
    });

    test('denied() constructor creates denied result', () {
      const result = PermissionResult.denied(
        denialReason: 'Insufficient permissions',
      );
      expect(result.allowed, false);
      expect(result.denialReason, 'Insufficient permissions');
      expect(result.minimumRequired, null);
    });

    test('denied() can include minimum required role', () {
      const result = PermissionResult.denied(
        denialReason: 'Need admin access',
        minimumRequired: UserRole.admin,
      );
      expect(result.allowed, false);
      expect(result.denialReason, 'Need admin access');
      expect(result.minimumRequired, UserRole.admin);
    });

    test('toString() shows status', () {
      const allowed = PermissionResult.allowed();
      expect(allowed.toString(), 'Allowed');

      const denied = PermissionResult.denied(denialReason: 'Not authorized');
      expect(denied.toString(), 'Denied: Not authorized');
    });

    test('should be immutable', () {
      const result = PermissionResult.allowed();
      expect(() => result.allowed, returnsNormally);
      // Cannot modify const - compilation would fail if mutable
    });
  });

  group('Permission Model Integration', () {
    test('role hierarchy supports permission comparisons', () {
      // Admin > Manager
      expect(UserRole.admin.priority > UserRole.manager.priority, true);

      // Manager > Dispatcher
      expect(UserRole.manager.priority > UserRole.dispatcher.priority, true);

      // Dispatcher > Technician
      expect(UserRole.dispatcher.priority > UserRole.technician.priority, true);

      // Technician > Client
      expect(UserRole.technician.priority > UserRole.customer.priority, true);
    });

    test('can create permission check scenarios', () {
      // Example: Admin trying to delete users
      const userRole = UserRole.admin;
      const resource = ResourceType.users;
      const operation = CrudOperation.delete;

      // This would be checked in PermissionService
      expect(userRole.priority, greaterThanOrEqualTo(5)); // Admin level
      expect(resource.toString(), 'users');
      expect(operation.toString(), 'delete');
    });

    test('all enums are usable in switch statements', () {
      // CrudOperation
      String operationName(CrudOperation op) {
        switch (op) {
          case CrudOperation.create:
            return 'CREATE';
          case CrudOperation.read:
            return 'READ';
          case CrudOperation.update:
            return 'UPDATE';
          case CrudOperation.delete:
            return 'DELETE';
        }
      }

      expect(operationName(CrudOperation.create), 'CREATE');
      expect(operationName(CrudOperation.delete), 'DELETE');

      // ResourceType
      bool isAdminResource(ResourceType resource) {
        switch (resource) {
          case ResourceType.users:
          case ResourceType.roles:
          case ResourceType.auditLogs:
            return true;
          default:
            return false;
        }
      }

      expect(isAdminResource(ResourceType.users), true);
      expect(isAdminResource(ResourceType.workOrders), false);

      // UserRole
      bool isManagement(UserRole role) {
        switch (role) {
          case UserRole.admin:
          case UserRole.manager:
            return true;
          default:
            return false;
        }
      }

      expect(isManagement(UserRole.admin), true);
      expect(isManagement(UserRole.customer), false);
    });
  });
}
