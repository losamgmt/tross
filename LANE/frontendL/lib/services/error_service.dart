import 'dart:developer' as developer;
import 'package:flutter/foundation.dart';

import '../config/constants.dart';
import '../utils/helpers/string_helper.dart';

/// Centralized Error Service for Tross
/// KISS Principle: Simple, consistent error handling across the app
///
/// Test-Aware: Automatically silent during test execution to prevent noise
class ErrorService {
  static String get _appName => AppConstants.appName;

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
  /// Automatically silent during test execution
  static void logError(
    String message, {
    dynamic error,
    StackTrace? stackTrace,
    Map<String, dynamic>? context,
  }) {
    // Browser console output (works everywhere) - but NOT during tests
    if (kDebugMode && !isInTestMode) {
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
  /// Automatically silent during test execution
  static void logWarning(String message, {Map<String, dynamic>? context}) {
    if (kDebugMode && !isInTestMode) {
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
  /// Automatically silent during test execution
  static void logInfo(String message, {Map<String, dynamic>? context}) {
    if (kDebugMode && !isInTestMode) {
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
}
