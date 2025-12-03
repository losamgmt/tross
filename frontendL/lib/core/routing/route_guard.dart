// Route Guard - Security-first navigation control
// SRP: Single responsibility - determine if user can access a route
// DRY: Centralized access control logic used throughout the app
// TESTED: Comprehensive unit tests ensure security guarantees

import '../../services/auth/auth_profile_service.dart';
import 'app_routes.dart';

/// Result of a route guard check
class RouteGuardResult {
  final bool canAccess;
  final String? redirectRoute;
  final String? reason;

  const RouteGuardResult({
    required this.canAccess,
    this.redirectRoute,
    this.reason,
  });

  /// Allow access to the route
  const RouteGuardResult.allow()
    : canAccess = true,
      redirectRoute = null,
      reason = null;

  /// Deny access and redirect to login
  const RouteGuardResult.requiresLogin()
    : canAccess = false,
      redirectRoute = AppRoutes.login,
      reason = 'Authentication required';

  /// Deny access and redirect to unauthorized page
  const RouteGuardResult.unauthorized({String? customReason})
    : canAccess = false,
      redirectRoute = AppRoutes.unauthorized,
      reason = customReason ?? 'Insufficient permissions';

  /// Deny access and redirect to home
  const RouteGuardResult.redirectToHome({String? customReason})
    : canAccess = false,
      redirectRoute = AppRoutes.home,
      reason = customReason;

  @override
  String toString() {
    return 'RouteGuardResult(canAccess: $canAccess, '
        'redirectRoute: $redirectRoute, reason: $reason)';
  }
}

/// Route Guard Service - Centralized route access control
///
/// This class implements a security-first approach to navigation:
/// 1. Public routes are always accessible
/// 2. Protected routes require authentication
/// 3. Admin routes require admin role
/// 4. Clear, testable access decisions
///
/// Usage:
/// ```dart
/// final result = RouteGuard.checkAccess(
///   route: '/admin',
///   isAuthenticated: true,
///   user: currentUser,
/// );
///
/// if (!result.canAccess) {
///   Navigator.pushReplacementNamed(context, result.redirectRoute!);
/// }
/// ```
class RouteGuard {
  // Private constructor to prevent instantiation
  RouteGuard._();

  /// Check if user can access the requested route
  ///
  /// Returns [RouteGuardResult] with access decision and optional redirect
  static RouteGuardResult checkAccess({
    required String route,
    required bool isAuthenticated,
    Map<String, dynamic>? user,
  }) {
    // 1. Public routes are always accessible
    if (AppRoutes.isPublicRoute(route)) {
      return const RouteGuardResult.allow();
    }

    // 2. Unknown routes (404s) should pass through to show error page
    // Don't block them - let the router handle them
    if (!isValidRoute(route)) {
      return const RouteGuardResult.allow();
    }

    // 3. Protected routes require authentication
    if (!isAuthenticated) {
      return const RouteGuardResult.requiresLogin();
    }

    // 4. Admin routes require admin role
    if (AppRoutes.requiresAdmin(route)) {
      final isAdmin = AuthProfileService.isAdmin(user);

      if (!isAdmin) {
        return const RouteGuardResult.unauthorized(
          customReason: 'This area is restricted to administrators only',
        );
      }
    }

    // 5. Access granted
    return const RouteGuardResult.allow();
  }

  /// Check if user has specific role required for a route
  ///
  /// This method can be extended for more granular role checks
  static bool hasRequiredRole({
    required String route,
    Map<String, dynamic>? user,
  }) {
    // Admin routes require admin role
    if (AppRoutes.requiresAdmin(route)) {
      return AuthProfileService.isAdmin(user);
    }

    // Other protected routes just need authentication (any role)
    if (AppRoutes.requiresAuth(route)) {
      return user != null;
    }

    // Public routes have no role requirement
    return true;
  }

  /// Get user-friendly message for why access was denied
  static String getAccessDeniedMessage(String route) {
    if (AppRoutes.requiresAdmin(route)) {
      return 'This area is restricted to administrators. '
          'Please contact your system administrator if you need access.';
    }

    if (AppRoutes.requiresAuth(route)) {
      return 'You must be logged in to access this area.';
    }

    return 'Access to this area is restricted.';
  }

  /// Check if route exists in the application
  /// Used for 404 handling
  static bool isValidRoute(String route) {
    return AppRoutes.publicRoutes.contains(route) ||
        AppRoutes.protectedRoutes.contains(route) ||
        AppRoutes.adminRoutes.any((r) => route.startsWith(r));
  }
}
