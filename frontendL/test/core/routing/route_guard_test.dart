// Route Guard Unit Tests - Security-first navigation control testing
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/core/routing/route_guard.dart';
import 'package:tross_app/core/routing/app_routes.dart';

void main() {
  group('RouteGuardResult', () {
    test('allow() creates result with canAccess=true', () {
      const result = RouteGuardResult.allow();

      expect(result.canAccess, isTrue);
      expect(result.redirectRoute, isNull);
      expect(result.reason, isNull);
    });

    test('requiresLogin() creates result redirecting to login', () {
      const result = RouteGuardResult.requiresLogin();

      expect(result.canAccess, isFalse);
      expect(result.redirectRoute, equals(AppRoutes.login));
      expect(result.reason, equals('Authentication required'));
    });

    test('unauthorized() creates result redirecting to unauthorized page', () {
      const result = RouteGuardResult.unauthorized();

      expect(result.canAccess, isFalse);
      expect(result.redirectRoute, equals(AppRoutes.unauthorized));
      expect(result.reason, equals('Insufficient permissions'));
    });

    test('unauthorized() accepts custom reason', () {
      const customReason = 'Admin access required';
      const result = RouteGuardResult.unauthorized(customReason: customReason);

      expect(result.canAccess, isFalse);
      expect(result.redirectRoute, equals(AppRoutes.unauthorized));
      expect(result.reason, equals(customReason));
    });

    test('redirectToHome() creates result redirecting to home', () {
      const result = RouteGuardResult.redirectToHome();

      expect(result.canAccess, isFalse);
      expect(result.redirectRoute, equals(AppRoutes.home));
    });

    test('toString() returns formatted string', () {
      const result = RouteGuardResult.requiresLogin();
      final str = result.toString();

      expect(str, contains('canAccess: false'));
      expect(str, contains('redirectRoute: ${AppRoutes.login}'));
      expect(str, contains('reason: Authentication required'));
    });
  });

  group('RouteGuard - Public Routes', () {
    test('allows access to root route without authentication', () {
      final result = RouteGuard.checkAccess(
        route: AppRoutes.root,
        isAuthenticated: false,
        user: null,
      );

      expect(result.canAccess, isTrue);
    });

    test('allows access to login route without authentication', () {
      final result = RouteGuard.checkAccess(
        route: AppRoutes.login,
        isAuthenticated: false,
        user: null,
      );

      expect(result.canAccess, isTrue);
    });

    test('allows access to callback route without authentication', () {
      final result = RouteGuard.checkAccess(
        route: AppRoutes.callback,
        isAuthenticated: false,
        user: null,
      );

      expect(result.canAccess, isTrue);
    });

    test('allows access to error pages without authentication', () {
      final routes = [
        AppRoutes.error,
        AppRoutes.unauthorized,
        AppRoutes.notFound,
        AppRoutes.underConstruction,
      ];

      for (final route in routes) {
        final result = RouteGuard.checkAccess(
          route: route,
          isAuthenticated: false,
          user: null,
        );

        expect(
          result.canAccess,
          isTrue,
          reason: '$route should be accessible without auth',
        );
      }
    });
  });

  group('RouteGuard - Protected Routes (Authentication Required)', () {
    test('denies access to home route without authentication', () {
      final result = RouteGuard.checkAccess(
        route: AppRoutes.home,
        isAuthenticated: false,
        user: null,
      );

      expect(result.canAccess, isFalse);
      expect(result.redirectRoute, equals(AppRoutes.login));
      expect(result.reason, equals('Authentication required'));
    });

    test('allows access to home route with authentication', () {
      final result = RouteGuard.checkAccess(
        route: AppRoutes.home,
        isAuthenticated: true,
        user: {'role': 'technician', 'email': 'tech@test.com'},
      );

      expect(result.canAccess, isTrue);
    });

    test('denies access to profile route without authentication', () {
      final result = RouteGuard.checkAccess(
        route: AppRoutes.profile,
        isAuthenticated: false,
        user: null,
      );

      expect(result.canAccess, isFalse);
      expect(result.redirectRoute, equals(AppRoutes.login));
    });
  });

  group('RouteGuard - Admin Routes (Admin Role Required)', () {
    test('denies access to admin route without authentication', () {
      final result = RouteGuard.checkAccess(
        route: AppRoutes.admin,
        isAuthenticated: false,
        user: null,
      );

      expect(result.canAccess, isFalse);
      expect(result.redirectRoute, equals(AppRoutes.login));
      expect(result.reason, equals('Authentication required'));
    });

    test('denies access to admin route for non-admin user', () {
      final result = RouteGuard.checkAccess(
        route: AppRoutes.admin,
        isAuthenticated: true,
        user: {'role': 'technician', 'email': 'tech@test.com'},
      );

      expect(result.canAccess, isFalse);
      expect(result.redirectRoute, equals(AppRoutes.unauthorized));
      expect(
        result.reason,
        equals('This area is restricted to administrators only'),
      );
    });

    test('allows access to admin route for admin user', () {
      final result = RouteGuard.checkAccess(
        route: AppRoutes.admin,
        isAuthenticated: true,
        user: {'role': 'admin', 'email': 'admin@test.com'},
      );

      expect(result.canAccess, isTrue);
    });

    test('denies access to admin sub-routes for non-admin', () {
      final adminSubRoutes = [
        AppRoutes.adminUsers,
        AppRoutes.adminRoles,
        AppRoutes.adminAudit,
        AppRoutes.adminSettings,
      ];

      for (final route in adminSubRoutes) {
        final result = RouteGuard.checkAccess(
          route: route,
          isAuthenticated: true,
          user: {'role': 'technician', 'email': 'tech@test.com'},
        );

        expect(
          result.canAccess,
          isFalse,
          reason: '$route should deny non-admin access',
        );
        expect(result.redirectRoute, equals(AppRoutes.unauthorized));
      }
    });

    test('allows access to admin sub-routes for admin', () {
      final adminSubRoutes = [
        AppRoutes.adminUsers,
        AppRoutes.adminRoles,
        AppRoutes.adminAudit,
        AppRoutes.adminSettings,
      ];

      for (final route in adminSubRoutes) {
        final result = RouteGuard.checkAccess(
          route: route,
          isAuthenticated: true,
          user: {'role': 'admin', 'email': 'admin@test.com'},
        );

        expect(
          result.canAccess,
          isTrue,
          reason: '$route should allow admin access',
        );
      }
    });
  });

  group('RouteGuard - Helper Methods', () {
    test('hasRequiredRole() returns true for admin on admin route', () {
      final hasRole = RouteGuard.hasRequiredRole(
        route: AppRoutes.admin,
        user: {'role': 'admin', 'email': 'admin@test.com'},
      );

      expect(hasRole, isTrue);
    });

    test('hasRequiredRole() returns false for non-admin on admin route', () {
      final hasRole = RouteGuard.hasRequiredRole(
        route: AppRoutes.admin,
        user: {'role': 'technician', 'email': 'tech@test.com'},
      );

      expect(hasRole, isFalse);
    });

    test(
      'hasRequiredRole() returns true for any authenticated user on home',
      () {
        final hasRole = RouteGuard.hasRequiredRole(
          route: AppRoutes.home,
          user: {'role': 'technician', 'email': 'tech@test.com'},
        );

        expect(hasRole, isTrue);
      },
    );

    test('hasRequiredRole() returns true for public routes without user', () {
      final hasRole = RouteGuard.hasRequiredRole(
        route: AppRoutes.login,
        user: null,
      );

      expect(hasRole, isTrue);
    });

    test('getAccessDeniedMessage() returns admin-specific message', () {
      final message = RouteGuard.getAccessDeniedMessage(AppRoutes.admin);

      expect(message, contains('administrators'));
      expect(message, contains('system administrator'));
    });

    test(
      'getAccessDeniedMessage() returns auth message for protected routes',
      () {
        final message = RouteGuard.getAccessDeniedMessage(AppRoutes.home);

        expect(message, contains('logged in'));
      },
    );

    test('isValidRoute() returns true for known routes', () {
      final routes = [
        AppRoutes.root,
        AppRoutes.login,
        AppRoutes.home,
        AppRoutes.admin,
        AppRoutes.error,
        AppRoutes.unauthorized,
      ];

      for (final route in routes) {
        expect(
          RouteGuard.isValidRoute(route),
          isTrue,
          reason: '$route should be recognized as valid',
        );
      }
    });

    test('isValidRoute() returns false for unknown routes', () {
      expect(RouteGuard.isValidRoute('/unknown'), isFalse);
      expect(RouteGuard.isValidRoute('/random-path'), isFalse);
      expect(RouteGuard.isValidRoute('/does-not-exist'), isFalse);
    });

    test(
      'isValidRoute() returns true for admin sub-routes using startsWith',
      () {
        expect(RouteGuard.isValidRoute('/admin/users'), isTrue);
        expect(RouteGuard.isValidRoute('/admin/roles'), isTrue);
      },
    );
  });

  group('RouteGuard - Edge Cases', () {
    test('handles null user gracefully for protected routes', () {
      final result = RouteGuard.checkAccess(
        route: AppRoutes.home,
        isAuthenticated: false,
        user: null,
      );

      expect(result.canAccess, isFalse);
      expect(result.redirectRoute, equals(AppRoutes.login));
    });

    test('handles user without role field', () {
      final result = RouteGuard.checkAccess(
        route: AppRoutes.admin,
        isAuthenticated: true,
        user: {'email': 'test@test.com'}, // No role field
      );

      expect(result.canAccess, isFalse);
      expect(result.redirectRoute, equals(AppRoutes.unauthorized));
    });

    test('handles empty user map', () {
      final result = RouteGuard.checkAccess(
        route: AppRoutes.admin,
        isAuthenticated: true,
        user: {}, // Empty map
      );

      expect(result.canAccess, isFalse);
      expect(result.redirectRoute, equals(AppRoutes.unauthorized));
    });

    test('case-insensitive role checking (matches backend)', () {
      final result = RouteGuard.checkAccess(
        route: AppRoutes.admin,
        isAuthenticated: true,
        user: {'role': 'Admin'}, // Capital A - should work (case-insensitive)
      );

      // Should PASS because role checking is case-insensitive (like backend)
      expect(
        result.canAccess,
        isTrue,
        reason:
            'Role checking should be case-insensitive to match backend behavior',
      );
    });
  });
}
