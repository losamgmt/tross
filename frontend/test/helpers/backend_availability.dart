/// Backend Availability Detection for Tests
///
/// Smart test helper that detects if backend is running before attempting
/// integration tests. Respects AppConfig backend target (localhost vs Railway).
///
/// **Backend Targeting:**
/// - Default: Tests run against localhost:3001
/// - With --dart-define=USE_PROD_BACKEND=true: Tests run against Railway
///
/// **Test Behavior:**
/// - Integration tests: Run against whichever backend is configured
/// - Dev mode tests (test tokens): Only run against localhost (skip on Railway)
///
/// **Usage:**
/// ```dart
/// test('should fetch users', () async {
///   final available = await BackendAvailability.check();
///   if (!available) {
///     BackendAvailability.printSkipMessage('User fetch test');
///     return;
///   }
///   // Runs against localhost OR Railway based on AppConfig
/// });
///
/// test('should login with test token', () async {
///   final devMode = await BackendAvailability.checkDevMode();
///   if (!devMode) {
///     BackendAvailability.printSkipMessage('Test token login');
///     return;
///   }
///   // Only runs against localhost (dev mode feature)
/// });
/// ```
library;

import 'dart:io';
import 'package:flutter/foundation.dart' show debugPrint;
import 'package:http/http.dart' as http;
import 'package:tross_app/config/app_config.dart';

/// Backend availability checker for intelligent test execution
class BackendAvailability {
  /// Cached availability status to avoid multiple checks
  static bool? _cachedAvailability;
  static DateTime? _cacheTime;
  static const _cacheDuration = Duration(seconds: 30);

  /// Backend health endpoint - respects AppConfig backend target
  static String get healthEndpoint => '${AppConfig.backendUrl}/api/health';

  /// Test token endpoint (dev mode only) - only available on localhost
  static String get testTokenEndpoint =>
      '${AppConfig.backendUrl}/api/dev/token?role=admin';

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
  /// Dev mode (test tokens) only available when targeting localhost backend.
  /// Production backend never has dev mode endpoints for security.
  static Future<bool> checkDevMode() async {
    // Dev mode only exists on localhost backend
    if (AppConfig.useProdBackend) {
      debugPrint(
        '⚠️  Dev mode unavailable: targeting production backend (${AppConfig.backendUrl})',
      );
      return false;
    }

    try {
      final response = await http
          .get(Uri.parse(testTokenEndpoint))
          .timeout(const Duration(seconds: 2));

      // 200 = success
      final available = response.statusCode == 200;

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
    final target = AppConfig.useProdBackend ? 'Railway' : 'localhost:3001';
    final howToRun = AppConfig.useProdBackend
        ? 'This test requires localhost backend (dev mode only)'
        : 'Start backend with `npm run dev:backend`';

    debugPrint('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    debugPrint('⏭️  SKIPPED: $testName');
    debugPrint('   Reason: $msg');
    debugPrint('   Backend target: $target');
    debugPrint('   To run: $howToRun');
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
