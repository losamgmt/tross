import 'dart:developer' as developer;
import 'package:flutter/foundation.dart';

import '../config/constants.dart';
import '../utils/helpers/string_helper.dart';

/// Log level enum for controlling output verbosity
enum LogLevel {
  debug(0), // Most verbose - development tracing
  info(1), // Normal operations
  warning(2), // Potential issues
  error(3); // Errors only

  const LogLevel(this.value);
  final int value;
}

/// Centralized Error Service for Tross
/// KISS Principle: Simple, consistent error handling across the app
///
/// Log Level Control:
/// - Set `minLogLevel` to filter console output
/// - Default: LogLevel.warning (only warnings and errors in console)
/// - DEBUG/INFO still go to developer.log for DevTools
///
/// Test-Aware: Automatically silent during test execution to prevent noise
class ErrorService {
  static String get _appName => AppConstants.appName;

  /// Minimum log level for console output
  /// Default: warning (cleaner console, still captures important events)
  /// Change to LogLevel.debug or LogLevel.info for verbose debugging
  static LogLevel minLogLevel = LogLevel.warning;

  /// Test mode detection - true when running in test environment
  /// This is automatically detected by checking for test framework presence
  static bool get _isTestMode {
    // Check if we're in a test environment by looking for test-specific conditions
    // Tests run with different environment that we can detect
    try {
      // In tests, kDebugMode is true but we have additional indicators
      // This is a safe heuristic - if it causes issues, can be made configurable
      return const bool.fromEnvironment('FLUTTER_TEST', defaultValue: false);
    } catch (_) {
      return false;
    }
  }

  /// Override for manual control in tests (set in test setUp if needed)
  static bool _manualTestMode = false;
  static void setTestMode(bool enabled) => _manualTestMode = enabled;
  static bool get isInTestMode => _manualTestMode || _isTestMode;

  /// Log errors with structured format
  /// Always logs to developer.log, console output respects minLogLevel
  static void logError(
    String message, {
    dynamic error,
    StackTrace? stackTrace,
    Map<String, dynamic>? context,
  }) {
    // Console output respects minLogLevel
    if (kDebugMode &&
        !isInTestMode &&
        minLogLevel.value <= LogLevel.error.value) {
      // ignore: avoid_print
      print('❌ ERROR: $message ${error != null ? "| $error" : ""}');
      if (context != null) {
        // ignore: avoid_print
        print('   Context: $context');
      }
    }

    // Developer log (for Flutter DevTools) - always log for debugging tools
    developer.log(
      message,
      name: _appName,
      error: error,
      stackTrace: stackTrace,
      level: 1000, // Error level
    );

    // In production, you could send to crash reporting service here
    // e.g., Crashlytics, Sentry, etc.
  }

  /// Log warnings
  /// Always logs to developer.log, console output respects minLogLevel
  static void logWarning(String message, {Map<String, dynamic>? context}) {
    // Console output respects minLogLevel
    if (kDebugMode &&
        !isInTestMode &&
        minLogLevel.value <= LogLevel.warning.value) {
      // ignore: avoid_print
      print('⚠️  WARNING: $message');
      if (context != null) {
        // ignore: avoid_print
        print('   Context: $context');
      }
    }

    developer.log(
      message,
      name: _appName,
      level: 900, // Warning level
    );
  }

  /// Log info messages
  /// Always logs to developer.log, console output respects minLogLevel
  static void logInfo(String message, {Map<String, dynamic>? context}) {
    // Console output respects minLogLevel
    if (kDebugMode &&
        !isInTestMode &&
        minLogLevel.value <= LogLevel.info.value) {
      // ignore: avoid_print
      print('ℹ️  INFO: $message');
      if (context != null) {
        // ignore: avoid_print
        print('   Context: $context');
      }
    }

    developer.log(
      message,
      name: _appName,
      level: 800, // Info level
    );
  }

  /// Handle and display user-friendly errors
  static String getUserFriendlyMessage(dynamic error) {
    if (error == null) return 'An unexpected error occurred';

    final errorString = StringHelper.toLowerCase(error.toString());

    // Map technical errors to user-friendly messages
    if (errorString.contains('network') || errorString.contains('connection')) {
      return 'Network connection issue. Please check your internet connection.';
    }

    if (errorString.contains('timeout')) {
      return 'Request timed out. Please try again.';
    }

    if (errorString.contains('authentication') ||
        errorString.contains('unauthorized')) {
      return 'Authentication error. Please log in again.';
    }

    if (errorString.contains('permission')) {
      return 'Permission denied. Please contact support.';
    }

    // Default fallback
    return 'Something went wrong. Please try again or contact support if the problem persists.';
  }

  /// Log debug-level messages (verbose logging for development only)
  ///
  /// COMPLETELY SILENT in:
  /// - Production builds (kDebugMode = false)
  /// - Test execution (isInTestMode = true)
  /// - When minLogLevel > LogLevel.debug
  ///
  /// Only outputs to console during local development with debug level enabled.
  /// Use this for detailed tracing that helps during development
  /// but would be noise in production console.
  static void logDebug(String message, {Map<String, dynamic>? context}) {
    // Debug logging ONLY when explicitly enabled via minLogLevel
    if (!kDebugMode ||
        isInTestMode ||
        minLogLevel.value > LogLevel.debug.value) {
      return;
    }

    // ignore: avoid_print
    print('🔍 DEBUG: $message');
    if (context != null) {
      // ignore: avoid_print
      print('   Context: $context');
    }

    developer.log(
      message,
      name: _appName,
      level: 500, // Debug level
    );
  }
}
