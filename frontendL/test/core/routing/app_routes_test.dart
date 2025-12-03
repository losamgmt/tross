// App Routes Unit Tests - Route constant validation
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/core/routing/app_routes.dart';

void main() {
  group('AppRoutes - Route Constants', () {
    test('public routes are correctly defined', () {
      expect(AppRoutes.root, equals('/'));
      expect(AppRoutes.login, equals('/login'));
      expect(AppRoutes.callback, equals('/callback'));
    });

    test('protected routes are correctly defined', () {
      expect(AppRoutes.home, equals('/home'));
      expect(AppRoutes.profile, equals('/profile'));
    });

    test('admin routes are correctly defined', () {
      expect(AppRoutes.admin, equals('/admin'));
      expect(AppRoutes.adminUsers, equals('/admin/users'));
      expect(AppRoutes.adminRoles, equals('/admin/roles'));
      expect(AppRoutes.adminAudit, equals('/admin/audit'));
      expect(AppRoutes.adminSettings, equals('/admin/settings'));
    });

    test('status/error routes are correctly defined', () {
      expect(AppRoutes.error, equals('/error'));
      expect(AppRoutes.unauthorized, equals('/unauthorized'));
      expect(AppRoutes.notFound, equals('/not-found'));
      expect(AppRoutes.underConstruction, equals('/under-construction'));
    });
  });

  group('AppRoutes - Route Groups', () {
    test('publicRoutes list contains all public routes', () {
      expect(AppRoutes.publicRoutes, contains(AppRoutes.root));
      expect(AppRoutes.publicRoutes, contains(AppRoutes.login));
      expect(AppRoutes.publicRoutes, contains(AppRoutes.callback));
      expect(AppRoutes.publicRoutes, contains(AppRoutes.error));
      expect(AppRoutes.publicRoutes, contains(AppRoutes.unauthorized));
      expect(AppRoutes.publicRoutes, contains(AppRoutes.notFound));
      expect(AppRoutes.publicRoutes, contains(AppRoutes.underConstruction));
    });

    test('protectedRoutes list contains protected routes', () {
      expect(AppRoutes.protectedRoutes, contains(AppRoutes.home));
      expect(AppRoutes.protectedRoutes, contains(AppRoutes.profile));
    });

    test('adminRoutes list contains all admin routes', () {
      expect(AppRoutes.adminRoutes, contains(AppRoutes.admin));
      expect(AppRoutes.adminRoutes, contains(AppRoutes.adminUsers));
      expect(AppRoutes.adminRoutes, contains(AppRoutes.adminRoles));
      expect(AppRoutes.adminRoutes, contains(AppRoutes.adminAudit));
      expect(AppRoutes.adminRoutes, contains(AppRoutes.adminSettings));
    });

    test('route groups do not overlap', () {
      // Public and protected should not overlap
      for (final route in AppRoutes.publicRoutes) {
        expect(
          AppRoutes.protectedRoutes.contains(route),
          isFalse,
          reason: '$route should not be in both public and protected',
        );
      }

      // Public and admin should not overlap
      for (final route in AppRoutes.publicRoutes) {
        expect(
          AppRoutes.adminRoutes.contains(route),
          isFalse,
          reason: '$route should not be in both public and admin',
        );
      }

      // Protected and admin should not overlap
      for (final route in AppRoutes.protectedRoutes) {
        expect(
          AppRoutes.adminRoutes.contains(route),
          isFalse,
          reason: '$route should not be in both protected and admin',
        );
      }
    });
  });

  group('AppRoutes - Helper Methods', () {
    test('isPublicRoute() identifies public routes correctly', () {
      expect(AppRoutes.isPublicRoute(AppRoutes.root), isTrue);
      expect(AppRoutes.isPublicRoute(AppRoutes.login), isTrue);
      expect(AppRoutes.isPublicRoute(AppRoutes.callback), isTrue);
      expect(AppRoutes.isPublicRoute(AppRoutes.error), isTrue);
    });

    test('isPublicRoute() returns false for non-public routes', () {
      expect(AppRoutes.isPublicRoute(AppRoutes.home), isFalse);
      expect(AppRoutes.isPublicRoute(AppRoutes.admin), isFalse);
      expect(AppRoutes.isPublicRoute('/unknown'), isFalse);
    });

    test('requiresAuth() identifies routes requiring authentication', () {
      expect(AppRoutes.requiresAuth(AppRoutes.home), isTrue);
      expect(AppRoutes.requiresAuth(AppRoutes.profile), isTrue);
      expect(AppRoutes.requiresAuth(AppRoutes.admin), isTrue);
      expect(AppRoutes.requiresAuth(AppRoutes.adminUsers), isTrue);
    });

    test('requiresAuth() returns false for public routes', () {
      expect(AppRoutes.requiresAuth(AppRoutes.root), isFalse);
      expect(AppRoutes.requiresAuth(AppRoutes.login), isFalse);
      expect(AppRoutes.requiresAuth(AppRoutes.error), isFalse);
    });

    test('requiresAdmin() identifies admin routes correctly', () {
      expect(AppRoutes.requiresAdmin(AppRoutes.admin), isTrue);
      expect(AppRoutes.requiresAdmin(AppRoutes.adminUsers), isTrue);
      expect(AppRoutes.requiresAdmin(AppRoutes.adminRoles), isTrue);
      expect(AppRoutes.requiresAdmin(AppRoutes.adminAudit), isTrue);
      expect(AppRoutes.requiresAdmin(AppRoutes.adminSettings), isTrue);
    });

    test('requiresAdmin() returns false for non-admin routes', () {
      expect(AppRoutes.requiresAdmin(AppRoutes.home), isFalse);
      expect(AppRoutes.requiresAdmin(AppRoutes.login), isFalse);
      expect(AppRoutes.requiresAdmin(AppRoutes.profile), isFalse);
    });

    test('requiresAdmin() uses startsWith for admin sub-routes', () {
      // Any route starting with /admin should require admin
      expect(AppRoutes.requiresAdmin('/admin'), isTrue);
      expect(AppRoutes.requiresAdmin('/admin/users'), isTrue);
      expect(AppRoutes.requiresAdmin('/admin/custom'), isTrue);
      expect(AppRoutes.requiresAdmin('/admin/new-feature'), isTrue);
    });

    test('getRouteName() returns user-friendly names', () {
      expect(AppRoutes.getRouteName(AppRoutes.root), equals('Login'));
      expect(AppRoutes.getRouteName(AppRoutes.login), equals('Login'));
      expect(AppRoutes.getRouteName(AppRoutes.home), equals('Dashboard'));
      expect(
        AppRoutes.getRouteName(AppRoutes.admin),
        equals('Admin Dashboard'),
      );
      expect(
        AppRoutes.getRouteName(AppRoutes.adminUsers),
        equals('User Management'),
      );
      expect(
        AppRoutes.getRouteName(AppRoutes.adminRoles),
        equals('Role Management'),
      );
      expect(
        AppRoutes.getRouteName(AppRoutes.adminAudit),
        equals('Audit Logs'),
      );
      expect(AppRoutes.getRouteName(AppRoutes.profile), equals('Profile'));
      expect(AppRoutes.getRouteName(AppRoutes.error), equals('Error'));
      expect(
        AppRoutes.getRouteName(AppRoutes.unauthorized),
        equals('Access Denied'),
      );
      expect(AppRoutes.getRouteName(AppRoutes.notFound), equals('Not Found'));
      expect(
        AppRoutes.getRouteName(AppRoutes.underConstruction),
        equals('Under Construction'),
      );
    });

    test('getRouteName() returns default for unknown routes', () {
      expect(AppRoutes.getRouteName('/unknown'), equals('Tross'));
      expect(AppRoutes.getRouteName('/random'), equals('Tross'));
    });
  });

  group('AppRoutes - Consistency Checks', () {
    test('all admin routes start with /admin', () {
      for (final route in AppRoutes.adminRoutes) {
        expect(
          route.startsWith('/admin'),
          isTrue,
          reason: 'Admin route $route should start with /admin',
        );
      }
    });

    test('all route constants start with /', () {
      expect(AppRoutes.root.startsWith('/'), isTrue);
      expect(AppRoutes.login.startsWith('/'), isTrue);
      expect(AppRoutes.home.startsWith('/'), isTrue);
      expect(AppRoutes.admin.startsWith('/'), isTrue);
      expect(AppRoutes.error.startsWith('/'), isTrue);
    });

    test('no duplicate routes across all groups', () {
      final allRoutes = [
        ...AppRoutes.publicRoutes,
        ...AppRoutes.protectedRoutes,
        ...AppRoutes.adminRoutes,
      ];

      final uniqueRoutes = allRoutes.toSet();
      expect(
        allRoutes.length,
        equals(uniqueRoutes.length),
        reason: 'Route lists should not contain duplicates',
      );
    });
  });
}
