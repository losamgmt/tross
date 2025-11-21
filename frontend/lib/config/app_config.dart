import 'package:flutter/foundation.dart';

/// Centralized application configuration - Single source of truth
///
/// This class provides environment detection, feature flags, and all
/// configuration values needed across the application.
class AppConfig {
  // Private constructor to prevent instantiation
  AppConfig._();

  // ============================================================================
  // ENVIRONMENT DETECTION - TWO INDEPENDENT AXES
  // ============================================================================

  /// AXIS 1: Which backend to target?
  /// --dart-define=USE_PROD_BACKEND=true  → Railway production
  /// --dart-define=USE_PROD_BACKEND=false → localhost:3001 (default)
  static const bool useProdBackend = bool.fromEnvironment(
    'USE_PROD_BACKEND',
    defaultValue: false,
  );

  /// AXIS 2: Is frontend running locally or deployed?
  /// kDebugMode=true  → Running via `flutter run` (local development)
  /// kDebugMode=false → Production build deployed to Vercel
  static bool get isLocalFrontend => kDebugMode;
  static bool get isDeployedFrontend => !kDebugMode;

  /// Convenience: Is backend localhost (not Railway)?
  static bool get isLocalBackend => !useProdBackend;

  // ============================================================================
  // FEATURE FLAGS
  // ============================================================================

  /// Enable development authentication (test tokens)
  ///
  /// SECURITY RULE: Dev auth ONLY available when:
  /// - Frontend is running locally (flutter run), AND
  /// - Backend target is localhost (not production Railway)
  ///
  /// This prevents:
  /// - Testing prod backend with fake credentials
  /// - Accidentally enabling dev auth in deployed frontend
  static bool get devAuthEnabled => isLocalFrontend && !useProdBackend;

  /// Enable health monitoring dashboard
  static const bool healthMonitoringEnabled = true;

  /// Enable verbose logging (local dev only)
  static bool get verboseLogging => isLocalFrontend;

  // ============================================================================
  // API CONFIGURATION
  // ============================================================================

  static const String _devBaseUrl = 'http://localhost:3001/api';
  static const String _prodBaseUrl =
      'https://tross-api-production.up.railway.app/api';
  static const String _devBackendUrl = 'http://localhost:3001';
  static const String _prodBackendUrl =
      'https://tross-api-production.up.railway.app';

  /// Backend URL - controlled by USE_PROD_BACKEND flag
  static String get baseUrl => useProdBackend ? _prodBaseUrl : _devBaseUrl;
  static String get backendUrl =>
      useProdBackend ? _prodBackendUrl : _devBackendUrl;

  // ============================================================================
  // FRONTEND CONFIGURATION
  // ============================================================================

  static const String _devFrontendUrl = 'http://localhost:8080';
  static const String _prodFrontendUrl =
      'https://trossapp.vercel.app'; // Update when deployed

  /// Frontend URL - always localhost when running `flutter run` locally
  /// Only uses prodFrontendUrl when actually deployed to Vercel
  static String get frontendUrl => isLocalFrontend
      ? _devFrontendUrl
      : (useProdBackend ? _prodFrontendUrl : _devFrontendUrl);

  /// Callback URL for Auth0 - always localhost during local development
  /// This allows testing prod backend with local frontend
  static String get callbackUrl => kDebugMode
      ? '$_devFrontendUrl/callback' // Always localhost when running locally
      : '$frontendUrl/callback'; // Only use prod URL when deployed

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
      useProdBackend ? 'Production' : 'Development';
}
