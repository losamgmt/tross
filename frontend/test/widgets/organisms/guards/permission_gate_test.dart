/// PermissionGate Widget Tests
///
/// Tests the PermissionGate and PermissionBuilder components
/// for declarative permission-based UI rendering.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross/widgets/organisms/guards/permission_gate.dart';
import 'package:tross/models/permission.dart';
import 'package:tross/services/permission_service_dynamic.dart';

void main() {
  setUpAll(() async {
    // Initialize permission service before tests
    await PermissionService.initialize();
  });

  group('PermissionGate', () {
    group('Authentication Gate', () {
      testWidgets('shows fallback when not authenticated', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: PermissionGate(
              isAuthenticated: false,
              userRole: 'admin',
              resource: ResourceType.users,
              operation: CrudOperation.read,
              fallback: Text('Fallback'),
              child: Text('Protected Content'),
            ),
          ),
        );

        expect(find.text('Fallback'), findsOneWidget);
        expect(find.text('Protected Content'), findsNothing);
      });

      testWidgets('shows child when authenticated with permission', (
        tester,
      ) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: PermissionGate(
              isAuthenticated: true,
              userRole: 'admin',
              resource: ResourceType.users,
              operation: CrudOperation.read,
              fallback: Text('Fallback'),
              child: Text('Protected Content'),
            ),
          ),
        );

        expect(find.text('Protected Content'), findsOneWidget);
        expect(find.text('Fallback'), findsNothing);
      });

      testWidgets('shows loading indicator when loading', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: PermissionGate(
              isAuthenticated: true,
              isLoading: true,
              showLoadingIndicator: true,
              userRole: 'admin',
              resource: ResourceType.users,
              operation: CrudOperation.read,
              child: Text('Protected Content'),
            ),
          ),
        );

        expect(find.byType(CircularProgressIndicator), findsOneWidget);
        expect(find.text('Protected Content'), findsNothing);
      });
    });

    group('Permission Gate Type: permission', () {
      testWidgets('shows child when user has permission', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: PermissionGate(
              isAuthenticated: true,
              userRole: 'admin',
              type: PermissionGateType.permission,
              resource: ResourceType.users,
              operation: CrudOperation.create,
              child: Text('Create Button'),
            ),
          ),
        );

        expect(find.text('Create Button'), findsOneWidget);
      });

      testWidgets('shows fallback when resource is null', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: PermissionGate(
              isAuthenticated: true,
              userRole: 'admin',
              type: PermissionGateType.permission,
              resource: null,
              operation: CrudOperation.create,
              fallback: Text('No Access'),
              child: Text('Create Button'),
            ),
          ),
        );

        expect(find.text('No Access'), findsOneWidget);
      });

      testWidgets('shows fallback when operation is null', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: PermissionGate(
              isAuthenticated: true,
              userRole: 'admin',
              type: PermissionGateType.permission,
              resource: ResourceType.users,
              operation: null,
              fallback: Text('No Access'),
              child: Text('Create Button'),
            ),
          ),
        );

        expect(find.text('No Access'), findsOneWidget);
      });
    });

    group('Permission Gate Type: minimumRole', () {
      testWidgets('shows child when user meets minimum role', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: PermissionGate(
              isAuthenticated: true,
              userRole: 'admin',
              type: PermissionGateType.minimumRole,
              minimumRole: UserRole.technician,
              child: Text('Technician Content'),
            ),
          ),
        );

        expect(find.text('Technician Content'), findsOneWidget);
      });

      testWidgets('shows fallback when minimumRole is null', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: PermissionGate(
              isAuthenticated: true,
              userRole: 'admin',
              type: PermissionGateType.minimumRole,
              minimumRole: null,
              fallback: Text('No Access'),
              child: Text('Content'),
            ),
          ),
        );

        expect(find.text('No Access'), findsOneWidget);
      });
    });

    group('Permission Gate Type: exactRole', () {
      testWidgets('shows child when user has exact role', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: PermissionGate(
              isAuthenticated: true,
              userRole: 'admin',
              type: PermissionGateType.exactRole,
              exactRole: UserRole.admin,
              child: Text('Admin Content'),
            ),
          ),
        );

        expect(find.text('Admin Content'), findsOneWidget);
      });

      testWidgets('shows fallback when role does not match', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: PermissionGate(
              isAuthenticated: true,
              userRole: 'viewer',
              type: PermissionGateType.exactRole,
              exactRole: UserRole.admin,
              fallback: Text('Not Admin'),
              child: Text('Admin Content'),
            ),
          ),
        );

        expect(find.text('Not Admin'), findsOneWidget);
      });

      testWidgets('shows fallback when exactRole is null', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: PermissionGate(
              isAuthenticated: true,
              userRole: 'admin',
              type: PermissionGateType.exactRole,
              exactRole: null,
              fallback: Text('No Access'),
              child: Text('Content'),
            ),
          ),
        );

        expect(find.text('No Access'), findsOneWidget);
      });

      testWidgets('shows fallback when userRole is null', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: PermissionGate(
              isAuthenticated: true,
              userRole: null,
              type: PermissionGateType.exactRole,
              exactRole: UserRole.admin,
              fallback: Text('No Access'),
              child: Text('Content'),
            ),
          ),
        );

        expect(find.text('No Access'), findsOneWidget);
      });
    });

    group('Factory Constructors', () {
      testWidgets('permission factory works correctly', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: PermissionGate.permission(
              isAuthenticated: true,
              userRole: 'admin',
              resource: ResourceType.users,
              operation: CrudOperation.delete,
              child: const Text('Delete Button'),
            ),
          ),
        );

        expect(find.text('Delete Button'), findsOneWidget);
      });

      testWidgets('minimumRole factory works correctly', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: PermissionGate.minimumRole(
              isAuthenticated: true,
              userRole: 'admin',
              role: UserRole.manager,
              child: const Text('Manager Content'),
            ),
          ),
        );

        expect(find.text('Manager Content'), findsOneWidget);
      });

      testWidgets('exactRole factory works correctly', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: PermissionGate.exactRole(
              isAuthenticated: true,
              userRole: 'technician',
              role: UserRole.technician,
              child: const Text('Technician Content'),
            ),
          ),
        );

        expect(find.text('Technician Content'), findsOneWidget);
      });

      testWidgets('adminOnly factory works correctly', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: PermissionGate.adminOnly(
              isAuthenticated: true,
              userRole: 'admin',
              child: const Text('Admin Only'),
            ),
          ),
        );

        expect(find.text('Admin Only'), findsOneWidget);
      });

      testWidgets('adminOnly shows fallback for non-admin', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: PermissionGate.adminOnly(
              isAuthenticated: true,
              userRole: 'viewer',
              fallback: const Text('Access Denied'),
              child: const Text('Admin Only'),
            ),
          ),
        );

        expect(find.text('Access Denied'), findsOneWidget);
      });
    });
  });

  group('PermissionBuilder', () {
    testWidgets('provides false when not authenticated', (tester) async {
      bool? capturedPermission;

      await tester.pumpWidget(
        MaterialApp(
          home: PermissionBuilder(
            isAuthenticated: false,
            userRole: 'admin',
            resource: ResourceType.users,
            operation: CrudOperation.read,
            builder: (context, hasPermission) {
              capturedPermission = hasPermission;
              return Text(hasPermission ? 'Has Permission' : 'No Permission');
            },
          ),
        ),
      );

      expect(capturedPermission, isFalse);
      expect(find.text('No Permission'), findsOneWidget);
    });

    testWidgets('provides true when has permission', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: PermissionBuilder(
            isAuthenticated: true,
            userRole: 'admin',
            resource: ResourceType.users,
            operation: CrudOperation.read,
            builder: (context, hasPermission) {
              return Text(hasPermission ? 'Has Permission' : 'No Permission');
            },
          ),
        ),
      );

      expect(find.text('Has Permission'), findsOneWidget);
    });

    testWidgets('checks minimumRole when resource/op not provided', (
      tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          home: PermissionBuilder(
            isAuthenticated: true,
            userRole: 'admin',
            minimumRole: UserRole.customer,
            builder: (context, hasPermission) {
              return Text(hasPermission ? 'Has Permission' : 'No Permission');
            },
          ),
        ),
      );

      expect(find.text('Has Permission'), findsOneWidget);
    });

    testWidgets('returns false when no check criteria provided', (
      tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          home: PermissionBuilder(
            isAuthenticated: true,
            userRole: 'admin',
            builder: (context, hasPermission) {
              return Text(hasPermission ? 'Has Permission' : 'No Permission');
            },
          ),
        ),
      );

      expect(find.text('No Permission'), findsOneWidget);
    });
  });
}
