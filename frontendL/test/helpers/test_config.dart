// Test Configuration
// Centralized test timeout configuration to prevent hanging tests

import 'package:flutter_test/flutter_test.dart';

/// Standard test timeout for widget tests
/// Prevents tests from hanging indefinitely
const Duration kWidgetTestTimeout = Duration(seconds: 10);

/// Timeout for animation/transition tests
const Duration kAnimationTestTimeout = Duration(seconds: 5);

/// Timeout for integration tests that may involve multiple interactions
const Duration kIntegrationTestTimeout = Duration(seconds: 30);

/// Configure test timeouts globally
void configureTestTimeouts() {
  // This would be called in test/helpers/helpers.dart or individual test files
  // Currently Flutter test doesn't support global timeout configuration,
  // but we can use this as documentation and apply per-test
}

/// Wrapper for testWidgets with automatic timeout
void testWidgetsWithTimeout(
  String description,
  WidgetTesterCallback callback, {
  Duration timeout = kWidgetTestTimeout,
  bool skip = false,
  Timeout? testTimeout,
  bool semanticsEnabled = true,
  TestVariant<Object?> variant = const DefaultTestVariant(),
  dynamic tags,
}) {
  testWidgets(
    description,
    callback,
    skip: skip,
    timeout: Timeout(timeout),
    semanticsEnabled: semanticsEnabled,
    variant: variant,
    tags: tags,
  );
}
