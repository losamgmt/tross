/// Centralized test helpers barrel file
/// Re-exports all test utilities for easy imports
library;

export 'widget_tester_extensions.dart';
export '../mocks/mock_services.dart';
export '../fixtures/test_data.dart';

/// Common test constants
class TestConstants {
  // Prevent instantiation
  TestConstants._();

  /// Short duration for tests that need minimal delay
  static const shortDelay = Duration(milliseconds: 10);

  /// Medium duration for tests with async operations
  static const mediumDelay = Duration(milliseconds: 100);

  /// Long duration for tests with multiple async operations
  static const longDelay = Duration(milliseconds: 500);

  /// Default test timeout
  static const defaultTimeout = Duration(seconds: 10);

  /// Extended timeout for complex tests
  static const extendedTimeout = Duration(seconds: 30);
}
