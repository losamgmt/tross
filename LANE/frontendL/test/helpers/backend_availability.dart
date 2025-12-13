/// Backend Availability Detection for Tests
///
/// Smart test helper that detects if backend is running before attempting
/// integration tests. Allows tests to:
/// - Run full suite when backend available (local dev, CI with services)
/// - Skip gracefully with warnings when backend offline (unit test mode)
///
/// **Usage:**
/// ```dart
/// test('should login with backend', () async {
///   final backendAvailable = await BackendAvailability.check();
///   if (!backendAvailable) {
///     print('⚠️  SKIPPED: Backend not available');
///     return; // Skip test gracefully
///   }
///
///   // Run integration test...
/// });
/// ```
library;

import 'dart:io';
import 'package:flutter/foundation.dart' show debugPrint;
import 'package:http/http.dart' as http;

/// Backend availability checker for intelligent test execution
class BackendAvailability {
  /// Cached availability status to avoid multiple checks
  static bool? _cachedAvailability;
  static DateTime? _cacheTime;
  static const _cacheDuration = Duration(seconds: 30);

  /// Backend health endpoint
  static const String healthEndpoint = 'http://localhost:3001/api/health';

  /// Test token endpoint (dev mode only)
  static const String testTokenEndpoint =
      'http://localhost:3001/api/dev/token?role=admin';

  /// Check if backend is available and responding
  ///
  /// **Behavior:**
  /// - Returns `true` if backend health check succeeds
  /// - Returns `false` if backend unreachable (connection refused, timeout)
  /// - Caches result for 30 seconds to avoid repeated checks
  ///
  /// **Use Cases:**
  /// - CI/CD: Backend runs in docker-compose, tests run full suite
  /// - Local dev with backend: Full integration testing
  /// - Local dev without backend: Unit tests only, integration skipped
  /// - Pre-commit hooks: Fast unit tests without requiring backend
  static Future<bool> check({bool ignoreCache = false}) async {
    // Return cached result if still valid
    if (!ignoreCache && _cachedAvailability != null && _cacheTime != null) {
      final age = DateTime.now().difference(_cacheTime!);
      if (age < _cacheDuration) {
        return _cachedAvailability!;
      }
    }

    try {
      // Quick health check with short timeout
      final response = await http
          .get(Uri.parse(healthEndpoint))
          .timeout(const Duration(seconds: 2));

      final available = response.statusCode >= 200 && response.statusCode < 500;

      // Cache result
      _cachedAvailability = available;
      _cacheTime = DateTime.now();

      if (available) {
        debugPrint('✅ Backend available at $healthEndpoint');
      } else {
        debugPrint(
          '⚠️  Backend responding but unhealthy: ${response.statusCode}',
        );
      }

      return available;
    } on SocketException catch (_) {
      // Connection refused - backend not running
      _cachedAvailability = false;
      _cacheTime = DateTime.now();
      debugPrint('⚠️  Backend not running at $healthEndpoint');
      return false;
    } on HttpException catch (_) {
      // HTTP error
      _cachedAvailability = false;
      _cacheTime = DateTime.now();
      debugPrint('⚠️  Backend HTTP error');
      return false;
    } catch (e) {
      // Timeout or other error
      _cachedAvailability = false;
      _cacheTime = DateTime.now();
      debugPrint('⚠️  Backend check failed: ${e.runtimeType}');
      return false;
    }
  }

  /// Check if backend dev mode (test tokens) is available
  ///
  /// More specific check for authentication tests that need test tokens.
  static Future<bool> checkDevMode() async {
    try {
      final response = await http
          .get(Uri.parse(testTokenEndpoint))
          .timeout(const Duration(seconds: 2));

      // 200 = success
      final available = response.statusCode == 200;
      response.statusCode == 200 || response.statusCode == 400;

      if (available) {
        debugPrint('✅ Backend dev mode available (test tokens enabled)');
      }

      return available;
    } catch (e) {
      debugPrint('⚠️  Backend dev mode not available');
      return false;
    }
  }

  /// Print helpful message about skipped tests
  static void printSkipMessage(String testName, {String? reason}) {
    final msg = reason ?? 'Backend not available';
    debugPrint('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    debugPrint('⏭️  SKIPPED: $testName');
    debugPrint('   Reason: $msg');
    debugPrint('   To run: Start backend with `npm run dev:backend`');
    debugPrint('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  /// Clear cached availability (useful for testing)
  static void clearCache() {
    _cachedAvailability = null;
    _cacheTime = null;
  }

  /// Get summary of backend availability for test suite
  static Future<BackendStatus> getStatus() async {
    final basicAvailable = await check();
    if (!basicAvailable) {
      return BackendStatus(
        available: false,
        devModeAvailable: false,
        message: 'Backend not running',
      );
    }

    final devMode = await checkDevMode();
    return BackendStatus(
      available: true,
      devModeAvailable: devMode,
      message: devMode
          ? 'Backend fully available (dev mode enabled)'
          : 'Backend available (dev mode disabled)',
    );
  }
}

/// Backend availability status
class BackendStatus {
  final bool available;
  final bool devModeAvailable;
  final String message;

  const BackendStatus({
    required this.available,
    required this.devModeAvailable,
    required this.message,
  });

  /// Whether integration tests can run
  bool get canRunIntegrationTests => available;

  /// Whether auth tests with test tokens can run
  bool get canRunAuthTests => available && devModeAvailable;

  @override
  String toString() => message;
}
