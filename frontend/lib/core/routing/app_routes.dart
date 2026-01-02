// Application Route Constants - Single source of truth for all routes
// KISS Principle: Centralized route definitions prevent typos and inconsistencies
// SRP: This class has one responsibility - define route paths

import '../../config/constants.dart';
import '../../services/nav_config_loader.dart';

class AppRoutes {
  // Private constructor to prevent instantiation
  AppRoutes._();

  // Public Routes (no authentication required)
  static const String root = '/';
  static const String login = '/login';
  static const String callback = '/callback';

  // Protected Routes (authentication required)
  static const String home = '/home';
  static const String settings = '/settings';

  // Admin Routes (admin role required)
  static const String admin = '/admin';

  // Admin sub-routes (mirror backend /api/admin/* structure)
  // Uses /system/ prefix for collision-avoidance with entity names
  static const String adminLogs = '/admin/system/logs';

  /// Build admin entity route (entity metadata/settings)
  static String adminEntity(String entityName) => '/admin/$entityName';

  // Generic Entity Routes (dynamic - one route for ALL entities)
  // Entities sit directly under root, matching backend /api/:entity structure
  // Usage: /customers, /work_orders, /users

  /// Build entity list route (e.g., /customers, /work_orders)
  static String entityList(String entityName) => '/$entityName';

  /// Build entity detail route (e.g., /customers/42)
  static String entityDetail(String entityName, int id) => '/$entityName/$id';

  // Status/Error Routes (public, no auth required)
  static const String error = '/error';
  static const String unauthorized = '/unauthorized';
  static const String notFound = '/not-found';

  // ════════════════════════════════════════════════════════════════════════
  // METADATA-DRIVEN HELPERS (use NavConfigService when available)
  // ════════════════════════════════════════════════════════════════════════

  /// Get public route paths from nav-config.json
  /// Falls back to static list if NavConfigService not initialized
  static List<String> getPublicRoutePaths() {
    if (!NavConfigService.isInitialized) {
      return _fallbackPublicRoutes;
    }
    return NavConfigService.config.publicRoutes.map((r) => r.path).toList();
  }

  /// Check if route is public using nav-config.json
  static bool isPublicPath(String path) {
    if (!NavConfigService.isInitialized) {
      return _fallbackPublicRoutes.contains(path);
    }
    return NavConfigService.config.isPublicRoute(path);
  }

  // Static fallback for when NavConfigService not yet initialized
  static const List<String> _fallbackPublicRoutes = [
    root,
    login,
    callback,
    error,
    unauthorized,
    notFound,
  ];

  // Legacy static list (kept for backward compatibility)
  static const List<String> publicRoutes = _fallbackPublicRoutes;

  static const List<String> protectedRoutes = [home, settings];

  static const List<String> adminRoutes = [admin];

  // ════════════════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ════════════════════════════════════════════════════════════════════════

  /// Check if route is public (no auth required)
  /// Uses NavConfigService when initialized, falls back to static list
  static bool isPublicRoute(String route) {
    return isPublicPath(route);
  }

  /// Check if route requires authentication
  static bool requiresAuth(String route) {
    return !isPublicPath(route);
  }

  /// Check if route requires admin role
  static bool requiresAdmin(String route) {
    return adminRoutes.any((adminRoute) => route.startsWith(adminRoute));
  }

  /// Get route name for display purposes
  static String getRouteName(String route) {
    switch (route) {
      case root:
      case login:
        return 'Login';
      case home:
        return 'Home';
      case settings:
        return 'Settings';
      case admin:
        return 'Admin';
      case error:
        return 'Error';
      case unauthorized:
        return 'Access Denied';
      case notFound:
        return 'Not Found';
      default:
        return AppConstants.appName; // 'Tross'
    }
  }
}
