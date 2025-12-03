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
  static const String profile = '/profile';
  static const String settings = '/settings';
  static const String laborSettings = '/settings/labor';
  static const String pricebooksSettings = '/settings/pricebooks';
  static const String projectSettings = '/settings/project';
  static const String quoteSettings = '/settings/quote';
  static const String mobileSettings = '/settings/mobile';
  static const String dispatchSettings = '/settings/dispatch';
  static const String serviceAgreementSettings = '/settings/service-agreement';
  static const String jobSettings = '/settings/job';
  static const String itemListSettings = '/settings/item-list';
  static const String formsSettings = '/settings/forms';
  static const String invoiceSettings = '/settings/invoice';
  static const String accountingSettings = '/settings/accounting';
  static const String equipmentAssets = '/equipment';

  // Admin Routes (admin role required)
  static const String admin = '/admin';
  static const String adminUsers = '/admin/users';
  static const String adminRoles = '/admin/roles';
  static const String adminAudit = '/admin/audit';
  static const String adminSettings = '/admin/settings';

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

  static const List<String> protectedRoutes = [
    home,
    profile,
    settings,
    laborSettings,
    pricebooksSettings,
    projectSettings,
    quoteSettings,
    mobileSettings,
    dispatchSettings,
    serviceAgreementSettings,
    jobSettings,
    itemListSettings,
    formsSettings,
    invoiceSettings,
    accountingSettings,
    equipmentAssets,
  ];

  static const List<String> adminRoutes = [
    admin,
    adminUsers,
    adminRoles,
    adminAudit,
    adminSettings,
  ];

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
        return 'Dashboard';
      case profile:
        return 'Profile';
      case settings:
        return 'Settings';
      case laborSettings:
        return 'Labor Settings';
      case pricebooksSettings:
        return 'Pricebooks';
      case projectSettings:
        return 'Project Settings';
      case quoteSettings:
        return 'Quote Settings';
      case mobileSettings:
        return 'Mobile Settings';
      case dispatchSettings:
        return 'Dispatch Settings';
      case serviceAgreementSettings:
        return 'Service Agreement Settings';
      case jobSettings:
        return 'Job Settings';
      case itemListSettings:
        return 'Item List Settings';
      case formsSettings:
        return 'Forms Settings';
      case invoiceSettings:
        return 'Invoice Settings';
      case accountingSettings:
        return 'Accounting Settings';
      case equipmentAssets:
        return 'Equipment & Assets';
      case admin:
        return 'Admin Dashboard';
      case adminUsers:
        return 'User Management';
      case adminRoles:
        return 'Role Management';
      case adminAudit:
        return 'Audit Logs';
      case adminSettings:
        return 'Admin Settings';
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
