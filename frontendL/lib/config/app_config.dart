import 'package:flutter/foundation.dart';

/// Centralized application configuration - Single source of truth
///
/// This class provides environment detection, feature flags, and all
/// configuration values needed across the application.
class AppConfig {
  // Private constructor to prevent instantiation
  AppConfig._();

  // ============================================================================
  // ENVIRONMENT DETECTION
  // ============================================================================

  /// Detects if running in development mode
  /// Uses compile-time constant with fallback to kDebugMode
  static const bool isDevelopment = bool.fromEnvironment(
    'DEVELOPMENT',
    defaultValue: true,
  );

  /// Runtime environment check (Flutter framework)
  static bool get isDebugMode => kDebugMode;

  /// Production mode check
  static bool get isProduction => !isDevelopment;

  /// Development mode with all features enabled
  static bool get isDevMode => isDevelopment || kDebugMode;

  // ============================================================================
  // FEATURE FLAGS
  // ============================================================================

  /// Enable development authentication (test tokens)
  /// CRITICAL: Must be false in production for security
  static bool get devAuthEnabled => isDevMode;

  /// Enable health monitoring dashboard
  static const bool healthMonitoringEnabled = true;

  /// Enable verbose logging
  static bool get verboseLogging => isDevMode;

  // ============================================================================
  // API CONFIGURATION
  // ============================================================================

  static const String _devBaseUrl = 'http://localhost:3001/api';
  static const String _prodBaseUrl = 'https://api.tross.com/api';
  static const String _devBackendUrl = 'http://localhost:3001';
  static const String _prodBackendUrl = 'https://api.tross.com';

  static String get baseUrl => isDevelopment ? _devBaseUrl : _prodBaseUrl;
  static String get backendUrl =>
      isDevelopment ? _devBackendUrl : _prodBackendUrl;

  // ============================================================================
  // HEALTH MONITORING ENDPOINTS
  // ============================================================================

  static String get healthEndpoint => '$baseUrl/health/db';
  static String get healthPollingEndpoint => '$baseUrl/health/status';

  // ============================================================================
  // AUTHENTICATION ENDPOINTS
  // ============================================================================

  // Development Endpoints (only available in dev mode)
  static String get devTokenEndpoint => '$baseUrl/dev/token';
  static String get devAdminTokenEndpoint => '$baseUrl/dev/admin-token';

  // Auth Endpoints
  static String get profileEndpoint => '$baseUrl/auth/me';
  static String get auth0LoginEndpoint => '$baseUrl/auth0/login';
  static String get auth0CallbackEndpoint => '$baseUrl/auth0/callback';

  // ============================================================================
  // AUTH0 CONFIGURATION
  // ============================================================================

  static const String auth0Domain = String.fromEnvironment(
    'AUTH0_DOMAIN',
    defaultValue: 'dev-mglpuahc3cwf66wq.us.auth0.com',
  );

  static const String auth0ClientId = String.fromEnvironment(
    'AUTH0_CLIENT_ID',
    defaultValue: 'WxWdn4aInQlttryLO0TYdvheBka8yXX4',
  );

  // Auth0 Audience (API Identifier) - OPTIONAL for basic login
  // Only needed if you want to call a secured backend API with this token
  // If not set, Auth0 will issue an opaque token for userinfo only
  // To use: Create an API in Auth0 dashboard with identifier matching this URL
  static const String auth0Audience = String.fromEnvironment(
    'AUTH0_AUDIENCE',
    defaultValue: '', // Empty = no audience (basic login only)
  );

  static const String auth0Scheme =
      'com.tross.auth0'; // Custom URL scheme for mobile

  // ============================================================================
  // TIMEOUTS & PERFORMANCE
  // ============================================================================

  static const Duration httpTimeout = Duration(seconds: 10);
  static const Duration connectTimeout = Duration(seconds: 5);
  static const Duration healthCheckInterval = Duration(seconds: 30);

  // ============================================================================
  // VERSION INFO
  // ============================================================================

  static const String version = '1.0.0';
  static const String buildNumber = '1';

  // ============================================================================
  // SECURITY HELPERS
  // ============================================================================

  /// Validates if dev authentication should be allowed
  /// Throws StateError if dev auth is attempted in production
  static void validateDevAuth() {
    if (!devAuthEnabled) {
      throw StateError(
        'Development authentication is not available in production mode. '
        'This is a security restriction.',
      );
    }
  }

  /// Gets environment name for display
  static String get environmentName =>
      isProduction ? 'Production' : 'Development';
}
