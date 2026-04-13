/// Tross UI Constants - Single source of truth for all text content
/// KISS Principle: Centralized constants prevent text mismatches
///
/// ⚠️ IMPORTANT: Change app name in ONE place here, it updates EVERYWHERE
library;

import 'package:flutter/material.dart';

class AppConstants {
  // Private constructor to prevent instantiation
  AppConstants._();

  // ============================================================================
  // APP IDENTITY - Change "Tross" here to update everywhere!
  // ============================================================================

  static const String appName = 'Tross';
  static const String appTagline = 'Professional Maintenance Management';
  static const String appDescription = 'Secure • Reliable • Efficient';
  static const String appCopyright =
      '© 2025 Tross - Professional Maintenance Solutions';
  static const String supportEmail = 'support@tross.com';

  /// App icon - wrench in circle (matches web/icons/tross-icon.svg)
  static const IconData appIcon = Icons.build_circle;
  static const IconData appIconOutlined = Icons.build_circle_outlined;

  // Development Mode
  static const String devModeTitle = 'Development Mode';
  static const String devModeDescription =
      'Using test tokens for local development. Production will use Auth0.';
  static const String devModeWarning = 'This is a development environment.';

  // Dev Login Card
  static const String devLoginCardTitle = 'Developer Login';
  static const String devLoginCardDescription =
      'For testing and development only';
  static const String devLoginButton = 'Dev Login';
  static const String devLoginRoleHint = 'Choose a role to test with';

  // Authentication
  static const String loginButtonTest = 'Login as Technician';
  static const String loginButtonAdmin = 'Login as Admin';
  static const String loginButtonAuth0 = 'Login with Auth0';
  static const String logoutButton = 'Logout';
  static const String logout = 'logout'; // Menu value/key
  static const String authenticationFailed = 'Authentication failed';
  static const String loginRequired = 'Please log in to continue';
  static const String auth0LoginFailed =
      'Auth0 login failed. Please try again.';
  static const String technicianLoginFailed =
      'Technician login failed. Please try again.';
  static const String adminLoginFailed =
      'Admin login failed. Please try again.';

  // Navigation - DEPRECATED: Use AppRoutes instead
  @Deprecated('Use AppRoutes.home instead')
  static const String homeRoute = '/home';

  // User Interface
  static const String loading = 'Loading...';
  static const String authenticating = 'Authenticating...';
  static const String retry = 'Retry';
  static const String cancel = 'Cancel';
  static const String save = 'Save';
  static const String delete = 'Delete';
  static const String edit = 'Edit';
  static const String close = 'Close';

  // Error Messages
  static const String networkError =
      'Network connection issue. Please check your internet connection.';
  static const String timeoutError = 'Request timed out. Please try again.';
  static const String authError = 'Authentication error. Please log in again.';
  static const String permissionError =
      'Permission denied. Please contact support.';
  static const String genericError =
      'Something went wrong. Please try again or contact support if the problem persists.';
  static const String failedToLoadData = 'Failed to load data';
  static const String failedToLoadUsers = 'Failed to Load Users';

  // Error Display - Page Titles & Descriptions
  static const String error404Title = 'Page Not Found';
  static const String error404Description =
      'The page you requested does not exist or has been moved.';

  static const String error403Title = 'Access Denied';
  static const String error403Description =
      'You don\'t have permission to access this page. Please contact your administrator.';

  static const String error500Title = 'Something Went Wrong';
  static const String error500Description =
      'We encountered an unexpected error. Please try again later.';

  // Error Display - Action Labels
  static const String actionRetry = 'Retry';
  static const String actionGoHome = 'Go Home';
  static const String actionGoToLogin = 'Go to Login';
  static const String actionBackToLogin = 'Back to Login';
  static const String actionContactSupport = 'Contact Support';
  static const String actionDismiss = 'Dismiss';

  // Error Display - Status Messages
  static const String statusAuthenticated = 'Authenticated as';
  static const String statusNotAuthenticated = 'Not authenticated';
  static const String statusRetrying = 'Retrying...';
  static const String statusActionFailed = 'Action failed';

  // Success Messages
  static const String loginSuccess = 'Login successful';
  static const String logoutSuccess = 'Logout successful';
  static const String saveSuccess = 'Changes saved successfully';

  // Navigation
  static const String homeTitle = 'Home';
  static const String settingsTitle = 'Settings';

  // Menu Identifiers (internal keys for menu routing)
  static const String menuSettings = 'settings';
  static const String menuAdmin = 'admin';

  // User Roles (matching backend)
  static const String roleAdmin = 'admin';
  static const String roleTechnician = 'technician';
  static const String roleCustomer = 'customer';
  static const String roleUnknown = 'unknown';

  // Auth Providers (matching backend AUTH.PROVIDERS)
  static const String authProviderDevelopment = 'development';
  static const String authProviderAuth0 = 'auth0';
  static const String authProviderUnknown = 'unknown';

  // Default Values
  static const String defaultUserName = 'User';
  static const String defaultEmail = '';
}

// API and Network Constants
class NetworkConstants {
  static const int httpTimeoutSeconds = 10;
  static const int connectTimeoutSeconds = 5;
  static const int maxRetries = 3;
  static const Duration retryDelay = Duration(seconds: 2);
}

// ============================================================================
// FIELD CONSTANTS - Single source of truth for field metadata
// ============================================================================

/// Field-related constants - centralized to prevent hardcoded duplicates
class FieldConstants {
  FieldConstants._();

  /// System fields added/managed by the database, not user-editable
  /// Used to filter out from forms, displayable fields, etc.
  static const Set<String> systemFields = {'id', 'created_at', 'updated_at'};

  /// Default display field when metadata doesn't specify one
  /// Last resort fallback - prefer entity metadata displayField
  static const String defaultDisplayField = 'name';
}
