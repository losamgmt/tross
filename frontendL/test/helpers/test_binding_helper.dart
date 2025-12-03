/// Test Binding Helper - Centralized Flutter Test Initialization
///
/// Automatically initializes TestWidgetsFlutterBinding to prevent
/// "Binding has not yet been initialized" errors.
///
/// Usage:
/// ```dart
/// import 'package:tross_app/test/helpers/test_binding_helper.dart';
///
/// void main() {
///   // Option 1: Call manually in main()
///   initializeTestBinding();
///
///   // Option 2: Call in setUp()
///   setUp(() {
///     initializeTestBinding();
///   });
///
///   test('my test', () {
///     // Binding is guaranteed initialized
///   });
/// }
/// ```
library;

import 'package:flutter_test/flutter_test.dart';

/// Initialize Flutter test binding (idempotent - safe to call multiple times)
void initializeTestBinding() {
  TestWidgetsFlutterBinding.ensureInitialized();
}

/// Base class for tests that need binding initialization
///
/// Usage:
/// ```dart
/// class MyServiceTest with TestBindingMixin {
///   void runTests() {
///     setUp(() {
///       ensureBinding();  // Automatically available
///     });
///   }
/// }
/// ```
mixin TestBindingMixin {
  void ensureBinding() {
    TestWidgetsFlutterBinding.ensureInitialized();
  }
}
