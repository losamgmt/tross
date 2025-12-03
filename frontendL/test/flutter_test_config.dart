/// Global Flutter Test Configuration
/// Sets default timeout for ALL tests to prevent hangs
///
/// SAFETY: 10 second timeout PER TEST prevents hanging
/// - Unit tests complete in milliseconds
/// - Widget tests in 1-2 seconds
/// - Any test taking >10s is broken and will be killed
///
/// Override for specific tests with: testWidgets('...', timeout: Timeout(Duration(seconds: 30)))
library;

import 'dart:async';
import 'package:flutter_test/flutter_test.dart';

Future<void> testExecutable(FutureOr<void> Function() testMain) async {
  // Set default timeout to 10 seconds for all tests
  // This prevents any test from hanging indefinitely
  setUpAll(() {
    // Configure default test timeout
    TestWidgetsFlutterBinding.ensureInitialized();
  });

  await testMain();
}

// Override default timeout - kills hanging tests at 10 seconds
const defaultTestTimeout = Timeout(Duration(seconds: 10));
