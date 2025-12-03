/// Tests for Permission Guard Widgets
///
/// Tests all permission guard variants with mock AuthProvider
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:tross_app/models/permission.dart';
import 'package:tross_app/providers/auth_provider.dart';
import 'package:tross_app/widgets/molecules/guards/permission_guard.dart';

// Mock AuthProvider for testing
class MockAuthProvider extends AuthProvider {
  final Map<String, bool> _permissions = {};
  final String? _role;
  final bool _authenticated;

  MockAuthProvider({
    String? role,
    bool authenticated = true,
    Map<String, bool>? permissions,
  }) : _role = role,
       _authenticated = authenticated {
    if (permissions != null) {
      _permissions.addAll(permissions);
    }
  }

  @override
  String get userRole => _role ?? 'unknown';

  @override
  bool get isAuthenticated => _authenticated;

  @override
  bool hasPermission(ResourceType resource, CrudOperation operation) {
    final key = '${resource}_$operation';
    return _permissions[key] ?? false;
  }

  @override
  bool hasMinimumRole(String requiredRole) {
    if (_role == null) return false;
    final userRole = UserRole.fromString(_role);
    final reqRole = UserRole.fromString(requiredRole);
    if (userRole == null || reqRole == null) return false;
    return userRole.priority >= reqRole.priority;
  }
}

void main() {
  group('PermissionGuard', () {
    testWidgets('shows child when user has permission', (tester) async {
      final mockAuth = MockAuthProvider(
        role: 'admin',
        permissions: {'${ResourceType.users}_${CrudOperation.delete}': true},
      );

      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider<AuthProvider>.value(
            value: mockAuth,
            child: Scaffold(
              body: PermissionGuard(
                resource: ResourceType.users,
                operation: CrudOperation.delete,
                child: const Text('Delete Button'),
              ),
            ),
          ),
        ),
      );

      expect(find.text('Delete Button'), findsOneWidget);
    });

    testWidgets('hides child when user lacks permission', (tester) async {
      final mockAuth = MockAuthProvider(
        role: 'client',
        permissions: {'${ResourceType.users}_${CrudOperation.delete}': false},
      );

      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider<AuthProvider>.value(
            value: mockAuth,
            child: Scaffold(
              body: PermissionGuard(
                resource: ResourceType.users,
                operation: CrudOperation.delete,
                child: const Text('Delete Button'),
              ),
            ),
          ),
        ),
      );

      expect(find.text('Delete Button'), findsNothing);
    });

    testWidgets('shows fallback when permission denied and fallback provided', (
      tester,
    ) async {
      final mockAuth = MockAuthProvider(
        role: 'client',
        permissions: {'${ResourceType.users}_${CrudOperation.delete}': false},
      );

      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider<AuthProvider>.value(
            value: mockAuth,
            child: Scaffold(
              body: PermissionGuard(
                resource: ResourceType.users,
                operation: CrudOperation.delete,
                fallback: const Text('No Permission'),
                child: const Text('Delete Button'),
              ),
            ),
          ),
        ),
      );

      expect(find.text('Delete Button'), findsNothing);
      expect(find.text('No Permission'), findsOneWidget);
    });

    testWidgets('shows nothing when permission denied and no fallback', (
      tester,
    ) async {
      final mockAuth = MockAuthProvider(
        role: 'client',
        permissions: {'${ResourceType.users}_${CrudOperation.delete}': false},
      );

      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider<AuthProvider>.value(
            value: mockAuth,
            child: Scaffold(
              body: PermissionGuard(
                resource: ResourceType.users,
                operation: CrudOperation.delete,
                child: const Text('Delete Button'),
              ),
            ),
          ),
        ),
      );

      expect(find.text('Delete Button'), findsNothing);
      expect(find.byType(SizedBox), findsOneWidget); // SizedBox.shrink()
    });

    testWidgets('respects listen parameter', (tester) async {
      final mockAuth = MockAuthProvider(
        role: 'admin',
        permissions: {'${ResourceType.users}_${CrudOperation.read}': true},
      );

      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider<AuthProvider>.value(
            value: mockAuth,
            child: Scaffold(
              body: PermissionGuard(
                resource: ResourceType.users,
                operation: CrudOperation.read,
                listen: false, // Don't watch, just read once
                child: const Text('User List'),
              ),
            ),
          ),
        ),
      );

      expect(find.text('User List'), findsOneWidget);
    });
  });

  group('PermissionGuardCustom', () {
    testWidgets('shows child when custom check returns true', (tester) async {
      final mockAuth = MockAuthProvider(role: 'admin');

      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider<AuthProvider>.value(
            value: mockAuth,
            child: Scaffold(
              body: PermissionGuardCustom(
                check: (auth) => auth.userRole == 'admin',
                child: const Text('Admin Panel'),
              ),
            ),
          ),
        ),
      );

      expect(find.text('Admin Panel'), findsOneWidget);
    });

    testWidgets('hides child when custom check returns false', (tester) async {
      final mockAuth = MockAuthProvider(role: 'client');

      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider<AuthProvider>.value(
            value: mockAuth,
            child: Scaffold(
              body: PermissionGuardCustom(
                check: (auth) => auth.userRole == 'admin',
                child: const Text('Admin Panel'),
              ),
            ),
          ),
        ),
      );

      expect(find.text('Admin Panel'), findsNothing);
    });

    testWidgets('shows fallback when check fails', (tester) async {
      final mockAuth = MockAuthProvider(role: 'client');

      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider<AuthProvider>.value(
            value: mockAuth,
            child: Scaffold(
              body: PermissionGuardCustom(
                check: (auth) => auth.userRole == 'admin',
                fallback: const Text('Access Denied'),
                child: const Text('Admin Panel'),
              ),
            ),
          ),
        ),
      );

      expect(find.text('Admin Panel'), findsNothing);
      expect(find.text('Access Denied'), findsOneWidget);
    });

    testWidgets('can use complex custom logic', (tester) async {
      final mockAuth = MockAuthProvider(role: 'manager', authenticated: true);

      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider<AuthProvider>.value(
            value: mockAuth,
            child: Scaffold(
              body: PermissionGuardCustom(
                check: (auth) =>
                    auth.isAuthenticated && auth.userRole != 'client',
                child: const Text('Advanced Features'),
              ),
            ),
          ),
        ),
      );

      expect(find.text('Advanced Features'), findsOneWidget);
    });
  });

  group('PermissionGuardMultiple', () {
    testWidgets('shows child when user has all permissions', (tester) async {
      final mockAuth = MockAuthProvider(
        role: 'admin',
        permissions: {
          '${ResourceType.users}_${CrudOperation.read}': true,
          '${ResourceType.roles}_${CrudOperation.read}': true,
        },
      );

      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider<AuthProvider>.value(
            value: mockAuth,
            child: Scaffold(
              body: PermissionGuardMultiple(
                permissions: [
                  (ResourceType.users, CrudOperation.read),
                  (ResourceType.roles, CrudOperation.read),
                ],
                child: const Text('Admin Dashboard'),
              ),
            ),
          ),
        ),
      );

      expect(find.text('Admin Dashboard'), findsOneWidget);
    });

    testWidgets('hides child when user lacks any permission', (tester) async {
      final mockAuth = MockAuthProvider(
        role: 'client',
        permissions: {
          '${ResourceType.users}_${CrudOperation.read}': false,
          '${ResourceType.roles}_${CrudOperation.read}': false,
        },
      );

      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider<AuthProvider>.value(
            value: mockAuth,
            child: Scaffold(
              body: PermissionGuardMultiple(
                permissions: [
                  (ResourceType.users, CrudOperation.read),
                  (ResourceType.roles, CrudOperation.read),
                ],
                child: const Text('Admin Dashboard'),
              ),
            ),
          ),
        ),
      );

      expect(find.text('Admin Dashboard'), findsNothing);
    });

    testWidgets('requires ALL permissions (AND logic)', (tester) async {
      final mockAuth = MockAuthProvider(
        role: 'technician',
        permissions: {
          '${ResourceType.users}_${CrudOperation.read}': true, // HAS this
          '${ResourceType.roles}_${CrudOperation.read}': false, // MISSING this
        },
      );

      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider<AuthProvider>.value(
            value: mockAuth,
            child: Scaffold(
              body: PermissionGuardMultiple(
                permissions: [
                  (ResourceType.users, CrudOperation.read),
                  (ResourceType.roles, CrudOperation.read),
                ],
                child: const Text('Admin Dashboard'),
              ),
            ),
          ),
        ),
      );

      // Should hide because missing roles.read permission
      expect(find.text('Admin Dashboard'), findsNothing);
    });

    testWidgets('shows fallback when any permission missing', (tester) async {
      final mockAuth = MockAuthProvider(
        role: 'client',
        permissions: {
          '${ResourceType.users}_${CrudOperation.read}': false,
          '${ResourceType.roles}_${CrudOperation.read}': false,
        },
      );

      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider<AuthProvider>.value(
            value: mockAuth,
            child: Scaffold(
              body: PermissionGuardMultiple(
                permissions: [
                  (ResourceType.users, CrudOperation.read),
                  (ResourceType.roles, CrudOperation.read),
                ],
                fallback: const Text('Insufficient Permissions'),
                child: const Text('Admin Dashboard'),
              ),
            ),
          ),
        ),
      );

      expect(find.text('Admin Dashboard'), findsNothing);
      expect(find.text('Insufficient Permissions'), findsOneWidget);
    });

    testWidgets('works with empty permissions list', (tester) async {
      final mockAuth = MockAuthProvider(role: 'client');

      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider<AuthProvider>.value(
            value: mockAuth,
            child: const Scaffold(
              body: PermissionGuardMultiple(
                permissions: [], // Empty list = always pass
                child: Text('Always Visible'),
              ),
            ),
          ),
        ),
      );

      expect(find.text('Always Visible'), findsOneWidget);
    });
  });

  group('MinimumRoleGuard', () {
    testWidgets('shows child when user meets role requirement', (tester) async {
      final mockAuth = MockAuthProvider(role: 'admin');

      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider<AuthProvider>.value(
            value: mockAuth,
            child: const Scaffold(
              body: MinimumRoleGuard(
                requiredRole: 'manager',
                child: Text('Management Panel'),
              ),
            ),
          ),
        ),
      );

      expect(find.text('Management Panel'), findsOneWidget);
    });

    testWidgets('hides child when user does not meet requirement', (
      tester,
    ) async {
      final mockAuth = MockAuthProvider(role: 'client');

      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider<AuthProvider>.value(
            value: mockAuth,
            child: const Scaffold(
              body: MinimumRoleGuard(
                requiredRole: 'admin',
                child: Text('Admin Panel'),
              ),
            ),
          ),
        ),
      );

      expect(find.text('Admin Panel'), findsNothing);
    });

    testWidgets('shows fallback when requirement not met', (tester) async {
      final mockAuth = MockAuthProvider(role: 'client');

      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider<AuthProvider>.value(
            value: mockAuth,
            child: const Scaffold(
              body: MinimumRoleGuard(
                requiredRole: 'admin',
                fallback: Text('Admin Access Required'),
                child: Text('Admin Panel'),
              ),
            ),
          ),
        ),
      );

      expect(find.text('Admin Panel'), findsNothing);
      expect(find.text('Admin Access Required'), findsOneWidget);
    });

    testWidgets('respects role hierarchy', (tester) async {
      // Manager (priority 4) meets minimum of Dispatcher (priority 3)
      final mockAuth = MockAuthProvider(role: 'manager');

      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider<AuthProvider>.value(
            value: mockAuth,
            child: const Scaffold(
              body: MinimumRoleGuard(
                requiredRole: 'dispatcher',
                child: Text('Dispatcher Panel'),
              ),
            ),
          ),
        ),
      );

      expect(find.text('Dispatcher Panel'), findsOneWidget);
    });
  });

  group('Guard Composition', () {
    testWidgets('guards can be nested', (tester) async {
      final mockAuth = MockAuthProvider(
        role: 'admin',
        permissions: {
          '${ResourceType.users}_${CrudOperation.delete}': true,
          '${ResourceType.roles}_${CrudOperation.delete}': true,
        },
      );

      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider<AuthProvider>.value(
            value: mockAuth,
            child: Scaffold(
              body: PermissionGuard(
                resource: ResourceType.users,
                operation: CrudOperation.delete,
                child: PermissionGuard(
                  resource: ResourceType.roles,
                  operation: CrudOperation.delete,
                  child: const Text('Nested Content'),
                ),
              ),
            ),
          ),
        ),
      );

      expect(find.text('Nested Content'), findsOneWidget);
    });

    testWidgets('nested guards short-circuit on first failure', (tester) async {
      final mockAuth = MockAuthProvider(
        role: 'client',
        permissions: {
          '${ResourceType.users}_${CrudOperation.delete}': false, // FAILS HERE
          '${ResourceType.roles}_${CrudOperation.delete}': false,
        },
      );

      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider<AuthProvider>.value(
            value: mockAuth,
            child: Scaffold(
              body: PermissionGuard(
                resource: ResourceType.users,
                operation: CrudOperation.delete,
                child: PermissionGuard(
                  // This guard never evaluated
                  resource: ResourceType.roles,
                  operation: CrudOperation.delete,
                  child: const Text('Nested Content'),
                ),
              ),
            ),
          ),
        ),
      );

      expect(find.text('Nested Content'), findsNothing);
    });
  });

  group('Real-World Usage Patterns', () {
    testWidgets('admin sees delete button, client does not', (tester) async {
      // Simulate what happens in admin_dashboard.dart
      final adminAuth = MockAuthProvider(
        role: 'admin',
        permissions: {'${ResourceType.users}_${CrudOperation.delete}': true},
      );

      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider<AuthProvider>.value(
            value: adminAuth,
            child: Scaffold(
              body: PermissionGuard(
                resource: ResourceType.users,
                operation: CrudOperation.delete,
                child: IconButton(
                  icon: const Icon(Icons.delete),
                  onPressed: () {},
                ),
              ),
            ),
          ),
        ),
      );

      expect(find.byIcon(Icons.delete), findsOneWidget);

      // Now test with client
      final clientAuth = MockAuthProvider(
        role: 'client',
        permissions: {'${ResourceType.users}_${CrudOperation.delete}': false},
      );

      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider<AuthProvider>.value(
            value: clientAuth,
            child: Scaffold(
              body: PermissionGuard(
                resource: ResourceType.users,
                operation: CrudOperation.delete,
                child: IconButton(
                  icon: const Icon(Icons.delete),
                  onPressed: () {},
                ),
              ),
            ),
          ),
        ),
      );

      expect(find.byIcon(Icons.delete), findsNothing);
    });
  });
}
