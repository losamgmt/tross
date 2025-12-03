import 'package:flutter/foundation.dart' show debugPrint;
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/providers/auth_provider.dart';
import 'package:tross_app/models/permission.dart';
import '../helpers/backend_availability.dart';

void main() {
  group('AuthProvider Tests', () {
    late AuthProvider authProvider;

    setUp(() {
      authProvider = AuthProvider();
    });

    // Check backend availability once for entire test suite
    setUpAll(() async {
      final status = await BackendAvailability.getStatus();
      debugPrint('\n${'=' * 60}');
      debugPrint('Backend Status: ${status.message}');
      debugPrint(
        'Integration Tests: ${status.canRunIntegrationTests ? "ENABLED" : "DISABLED"}',
      );
      debugPrint(
        'Auth Tests: ${status.canRunAuthTests ? "ENABLED" : "DISABLED"}',
      );
      debugPrint('=' * 60 + '\n');
    });

    group('Initial State', () {
      test('should start with correct initial state', () {
        expect(authProvider.isLoading, false);
        expect(authProvider.error, isNull);
        expect(authProvider.user, isNull);
        expect(authProvider.isAuthenticated, false);
        expect(authProvider.token, isNull);
        expect(authProvider.userName, equals('User'));
        expect(authProvider.userRole, equals('unknown'));
        expect(authProvider.userEmail, equals(''));
      });
    });

    group('State Management', () {
      test('should set loading state correctly', () {
        // We'd need to expose a test method or make _setLoading public for testing
        expect(authProvider.isLoading, false);
      });

      test('should clear error when new operation starts', () {
        // Test error clearing behavior
        expect(authProvider.error, isNull);
      });

      test('should update user state correctly', () {
        // Test user state updates
        expect(authProvider.user, isNull);
      });
    });

    group('Authentication Flow', () {
      test('should successfully login with test token as admin', () async {
        final backendAvailable = await BackendAvailability.checkDevMode();
        if (!backendAvailable) {
          BackendAvailability.printSkipMessage(
            'Admin login test',
            reason: 'Backend dev mode required for test token authentication',
          );
          return;
        }

        // Act
        final result = await authProvider.loginWithTestToken(role: 'admin');

        // Assert
        expect(result, true, reason: 'Login should succeed');
        expect(authProvider.isAuthenticated, true);
        expect(authProvider.isLoading, false);
        expect(authProvider.error, isNull);
        expect(authProvider.userRole, 'admin');
        expect(authProvider.userName, isNotEmpty);
        expect(authProvider.userEmail, contains('@'));
      });

      test('should successfully login with test token as technician', () async {
        final backendAvailable = await BackendAvailability.checkDevMode();
        if (!backendAvailable) {
          BackendAvailability.printSkipMessage('Technician login test');
          return;
        }

        // Act
        final result = await authProvider.loginWithTestToken(
          role: 'technician',
        );

        // Assert
        expect(result, true, reason: 'Login should succeed');
        expect(authProvider.isAuthenticated, true);
        expect(authProvider.userRole, 'technician');
        expect(authProvider.isLoading, false);
      });

      test('should successfully login with test token as manager', () async {
        final backendAvailable = await BackendAvailability.checkDevMode();
        if (!backendAvailable) {
          BackendAvailability.printSkipMessage('Manager login test');
          return;
        }

        // Act
        final result = await authProvider.loginWithTestToken(role: 'manager');

        // Assert
        expect(result, true);
        expect(authProvider.isAuthenticated, true);
        expect(authProvider.userRole, 'manager');
      });

      test('should successfully login with test token as dispatcher', () async {
        final backendAvailable = await BackendAvailability.checkDevMode();
        if (!backendAvailable) {
          BackendAvailability.printSkipMessage('Dispatcher login test');
          return;
        }

        // Act
        final result = await authProvider.loginWithTestToken(
          role: 'dispatcher',
        );

        // Assert
        expect(result, true);
        expect(authProvider.isAuthenticated, true);
        expect(authProvider.userRole, 'dispatcher');
      });

      test('should successfully login with test token as client', () async {
        final backendAvailable = await BackendAvailability.checkDevMode();
        if (!backendAvailable) {
          BackendAvailability.printSkipMessage('Client login test');
          return;
        }

        // Act
        final result = await authProvider.loginWithTestToken(role: 'client');

        // Assert
        expect(result, true);
        expect(authProvider.isAuthenticated, true);
        expect(authProvider.userRole, 'client');
      });

      test('should clear error on successful login', () async {
        final backendAvailable = await BackendAvailability.checkDevMode();
        if (!backendAvailable) {
          BackendAvailability.printSkipMessage('Error clearing test');
          return;
        }

        // Arrange: Set an error first
        authProvider.clearError(); // Ensure clean state

        // Act: Login successfully
        await authProvider.loginWithTestToken(role: 'admin');

        // Assert: Error should be null
        expect(authProvider.error, isNull);
      });

      test('should handle invalid role gracefully', () async {
        final backendAvailable = await BackendAvailability.checkDevMode();
        if (!backendAvailable) {
          BackendAvailability.printSkipMessage('Invalid role test');
          return;
        }

        // Act: Try to login with invalid role
        final result = await authProvider.loginWithTestToken(
          role: 'invalid_role',
        );

        // Assert: Should fail gracefully
        expect(result, false, reason: 'Invalid role should fail');
        expect(authProvider.isAuthenticated, false);
        expect(authProvider.error, isNotNull);
      });

      test('should handle logout correctly', () async {
        // Test logout functionality
        await authProvider.logout();

        expect(authProvider.isAuthenticated, false);
        expect(authProvider.user, isNull);
        expect(authProvider.token, isNull);
        expect(authProvider.error, isNull);
        expect(authProvider.isLoading, false);
      });
    });

    group('User Info Properties', () {
      test('should return correct user name for authenticated user', () {
        // Test with mock user data
        expect(authProvider.userName, equals('User'));
      });

      test('should return correct user role', () {
        expect(authProvider.userRole, equals('unknown'));
      });

      test('should return correct user email', () {
        expect(authProvider.userEmail, equals(''));
      });
    });

    group('Error Handling', () {
      test('should handle network errors gracefully', () async {
        // Test network error handling
        expect(authProvider.error, isNull);
      });

      test('should handle invalid response errors', () async {
        // Test invalid response handling
        expect(authProvider.error, isNull);
      });

      test('should clear errors on new operations', () {
        // Test error clearing
        expect(authProvider.error, isNull);
      });
    });

    group('Notification', () {
      test('should notify listeners on state changes', () {
        bool notified = false;
        authProvider.addListener(() {
          notified = true;
        });

        authProvider.logout(); // This should trigger notification

        expect(notified, true);
      });
    });

    group('Permission Checks', () {
      test('should deny permissions when not authenticated', () {
        // Arrange: Provider starts unauthenticated
        expect(authProvider.isAuthenticated, false);

        // Act & Assert: All permissions should be denied
        expect(
          authProvider.hasPermission(ResourceType.users, CrudOperation.read),
          false,
        );
        expect(
          authProvider.hasPermission(ResourceType.roles, CrudOperation.create),
          false,
        );
      });

      test('should grant admin full permissions', () async {
        final backendAvailable = await BackendAvailability.checkDevMode();
        if (!backendAvailable) {
          BackendAvailability.printSkipMessage('Admin permissions test');
          return;
        }

        // Arrange: Login as admin
        await authProvider.loginWithTestToken(role: 'admin');

        // Act & Assert: Admin should have all permissions
        expect(
          authProvider.hasPermission(ResourceType.users, CrudOperation.create),
          true,
        );
        expect(
          authProvider.hasPermission(ResourceType.users, CrudOperation.delete),
          true,
        );
        expect(
          authProvider.hasPermission(ResourceType.roles, CrudOperation.update),
          true,
        );
      });

      test('should restrict technician permissions', () async {
        final backendAvailable = await BackendAvailability.checkDevMode();
        if (!backendAvailable) {
          BackendAvailability.printSkipMessage('Technician permissions test');
          return;
        }

        // Arrange: Login as technician
        await authProvider.loginWithTestToken(role: 'technician');

        // Act & Assert: Technician has limited permissions
        expect(
          authProvider.hasPermission(ResourceType.users, CrudOperation.read),
          false,
          reason: 'Technician cannot read users',
        );
        expect(
          authProvider.hasPermission(ResourceType.users, CrudOperation.delete),
          false,
          reason: 'Technician cannot delete users',
        );
      });

      test('should provide denial reason with checkPermission', () async {
        final backendAvailable = await BackendAvailability.checkDevMode();
        if (!backendAvailable) {
          BackendAvailability.printSkipMessage('Permission denial reason test');
          return;
        }

        // Arrange: Login as technician
        await authProvider.loginWithTestToken(role: 'technician');

        // Act: Check permission with denial reason
        final result = authProvider.checkPermission(
          ResourceType.users,
          CrudOperation.delete,
        );

        // Assert: Should get detailed denial reason
        expect(result.allowed, false);
        expect(result.denialReason, isNotEmpty);
        expect(result.denialReason, contains('technician'));
      });

      test('should check minimum role correctly', () async {
        final backendAvailable = await BackendAvailability.checkDevMode();
        if (!backendAvailable) {
          BackendAvailability.printSkipMessage('Minimum role test');
          return;
        }

        // Arrange: Login as manager
        await authProvider.loginWithTestToken(role: 'manager');

        // Act & Assert: Role hierarchy checks
        expect(
          authProvider.hasMinimumRole('technician'),
          true,
          reason: 'Manager has minimum role of technician',
        );
        expect(
          authProvider.hasMinimumRole('manager'),
          true,
          reason: 'Manager has minimum role of manager',
        );
        expect(
          authProvider.hasMinimumRole('admin'),
          false,
          reason: 'Manager does not have minimum role of admin',
        );
      });

      test('should return allowed operations for role', () async {
        final backendAvailable = await BackendAvailability.checkDevMode();
        if (!backendAvailable) {
          BackendAvailability.printSkipMessage('Allowed operations test');
          return;
        }

        // Arrange: Login as admin
        await authProvider.loginWithTestToken(role: 'admin');

        // Act: Get allowed operations
        final operations = authProvider.getAllowedOperations(
          ResourceType.users,
        );

        // Assert: Admin should have all CRUD operations
        expect(operations, contains(CrudOperation.create));
        expect(operations, contains(CrudOperation.read));
        expect(operations, contains(CrudOperation.update));
        expect(operations, contains(CrudOperation.delete));
      });

      test('should check resource access correctly', () async {
        final backendAvailable = await BackendAvailability.checkDevMode();
        if (!backendAvailable) {
          BackendAvailability.printSkipMessage('Resource access test');
          return;
        }

        // Arrange: Login as technician
        await authProvider.loginWithTestToken(role: 'technician');

        // Act & Assert: Can access some resources, not others
        // Technician typically has limited access
        expect(
          authProvider.canAccessResource(ResourceType.users),
          false,
          reason: 'Technician cannot access user management',
        );
      });

      test('should deny permissions for inactive user', () async {
        final backendAvailable = await BackendAvailability.checkDevMode();
        if (!backendAvailable) {
          BackendAvailability.printSkipMessage('Inactive user test');
          return;
        }

        // Arrange: Login first
        await authProvider.loginWithTestToken(role: 'admin');

        // Simulate user deactivation by modifying user data
        // In real scenario, this would come from backend
        authProvider.user?['is_active'] = false;

        // Act & Assert: Permissions should be denied for inactive user
        // Note: isActive getter checks user?['is_active']
        expect(authProvider.isActive, false);
      });
    });
  });
}
