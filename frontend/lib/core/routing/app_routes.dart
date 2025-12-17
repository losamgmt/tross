// Application Route Constants - Single source of truth for all routes
// KISS Principle: Centralized route definitions prevent typos and inconsistencies
// SRP: This class has one responsibility - define route paths

import '../../config/constants.dart';

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

  // Generic Entity Routes (dynamic - one route for ALL entities)
  // Usage: /entity/users, /entity/customers, /entity/work_orders
  static const String entity = '/entity';

  /// Build entity list route
  static String entityList(String entityName) => '/entity/$entityName';

  /// Build entity detail route
  static String entityDetail(String entityName, int id) =>
      '/entity/$entityName/$id';

  // Status/Error Routes (public, no auth required)
  static const String error = '/error';
  static const String unauthorized = '/unauthorized';
  static const String notFound = '/not-found';
  static const String underConstruction = '/under-construction';

  // Route Groups for Easy Checking
  static const List<String> publicRoutes = [
    root,
    login,
    callback,
    error,
    unauthorized,
    notFound,
    underConstruction,
  ];

  static const List<String> protectedRoutes = [home, settings];

  static const List<String> adminRoutes = [admin];

  // Helper Methods

  /// Check if route is public (no auth required)
  static bool isPublicRoute(String route) {
    return publicRoutes.contains(route);
  }

  /// Check if route requires authentication
  static bool requiresAuth(String route) {
    return protectedRoutes.contains(route) || adminRoutes.contains(route);
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
      case underConstruction:
        return 'Under Construction';
      default:
        return AppConstants.appName; // 'Tross'
    }
  }
}
