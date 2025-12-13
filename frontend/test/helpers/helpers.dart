/// Test Helpers - Barrel Export
///
/// Centralizes all test helper imports for easy access
library;

// Core testing harness
export 'test_harness.dart';
export 'widget_helpers.dart';
export 'widget_tester_extensions.dart';

// Behavioral testing (test WHAT not HOW)
export 'behavioral_test_helpers.dart';

// Spacing and layout helpers
export 'spacing_helpers.dart';

// Test configuration and timeouts
export 'test_config.dart';

// Testing infrastructure helpers
export 'test_binding_helper.dart';
export 'mock_auth_service.dart';
export 'silent_error_service.dart';
export 'test_data_builders.dart';

// Mocking infrastructure for service tests
export 'mock_setup.dart';
export 'test_api_client.dart';
