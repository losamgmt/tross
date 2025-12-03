/// Environment Configuration
///
/// Centralized configuration for different deployment environments.
/// Uses compile-time constants for tree-shaking unused environments.
///
/// Usage:
/// ```dart
/// final apiUrl = Environment.apiBaseUrl;
/// if (Environment.isDevelopment) { ... }
/// ```
library;

class Environment {
  /// API base URL - configurable per environment
  ///
  /// Development: http://localhost:3001/api
  /// Production: Set via --dart-define=API_BASE_URL=https://api.trossapp.com
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3001/api',
  );

  /// Frontend URL - used for CORS, redirects, etc.
  static const String frontendUrl = String.fromEnvironment(
    'FRONTEND_URL',
    defaultValue: 'http://localhost:8080',
  );

  /// Environment mode detection
  ///
  /// In production builds, dart.vm.product is true
  /// In development/debug builds, it's false
  static const bool isProduction = bool.fromEnvironment('dart.vm.product');
  static const bool isDevelopment = !isProduction;

  /// Feature flags
  static const bool enableDevTools = isDevelopment;
  static const bool enableDebugLogging = isDevelopment;

  /// API timeout configurations
  static const Duration apiTimeout = Duration(seconds: 30);
  static const Duration apiConnectionTimeout = Duration(seconds: 10);

  /// Prevent instantiation
  const Environment._();
}
