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

  // Development Mode
  static const String devModeTitle = 'Development Mode';
  static const String devModeDescription =
      'Using test tokens for local development. Production will use Auth0.';
  static const String devModeWarning = 'This is a development environment.';

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

  // Navigation
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
  static const String profileTitle = 'Profile';
  static const String settingsTitle = 'Settings';

  // Menu Identifiers (internal keys for menu routing)
  static const String menuProfile = 'profile';
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

// Theme and Style Constants
class StyleConstants {
  // Colors (complementing Theme)
  static const int primaryColorValue = 0xFFCD7F32; // Bronze
  static const int secondaryColorValue = 0xFFFFB90F; // Honey Yellow

  // Spacing
  static const double paddingSmall = 8.0;
  static const double paddingMedium = 16.0;
  static const double paddingLarge = 24.0;
  static const double paddingXLarge = 32.0;

  // NOTE: Icon sizes moved to AppSpacing for responsive sizing
  // Use context.spacing.iconSizeXS/SM/MD/LG/XL instead

  // Border Radius
  static const double radiusSmall = 4.0;
  static const double radiusMedium = 8.0;
  static const double radiusLarge = 16.0;

  // Scrollbar (single source of truth for scrollbar sizing)
  static const double scrollbarThickness = 8.0;
  static const double scrollbarRadius = 4.0;
  static const double scrollbarPadding = 12.0; // Padding to prevent overlay

  // Elevations
  static const double elevationCard = 4.0;
  static const double elevationModal = 8.0;
  static const double elevationAppBar = 2.0;

  // Admin Header Section Spacing
  static const EdgeInsets headerSectionPadding = EdgeInsets.symmetric(
    vertical: 16.0,
    horizontal: 16.0,
  );
  static const double cardSpacing = 12.0;
  static const double cardRunSpacing = 12.0;

  // HealthStatusBox Styling
  static const EdgeInsets healthBoxMargin = EdgeInsets.only(right: 12.0);
  static const EdgeInsets healthBoxPadding = EdgeInsets.all(16.0);
  static const Color healthBoxColor = Color(0xFFE3F2FD); // Light blue
  static const double healthBoxSpacing = 8.0;
  static const TextStyle healthBoxTitleStyle = TextStyle(
    fontWeight: FontWeight.bold,
    fontSize: 16.0,
  );
  static const BorderRadius cardBorderRadius = BorderRadius.all(
    Radius.circular(8.0),
  );

  // DatabaseCard Styling
  static const EdgeInsets dbCardMargin = EdgeInsets.only(right: 8.0);
  static const EdgeInsets dbCardPadding = EdgeInsets.all(12.0);
  static const Color dbCardColor = Color(0xFFFFFFFF); // White
  static const double dbCardSpacing = 6.0;
  static const TextStyle dbCardTitleStyle = TextStyle(
    fontWeight: FontWeight.w500,
    fontSize: 14.0,
  );
}

// API and Network Constants
class NetworkConstants {
  static const int httpTimeoutSeconds = 10;
  static const int connectTimeoutSeconds = 5;
  static const int maxRetries = 3;
  static const Duration retryDelay = Duration(seconds: 2);
}
