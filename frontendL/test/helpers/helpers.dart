/// Test Helpers - Barrel Export
///
/// Centralizes all test helper imports for easy access
library;

// Existing helpers
export 'spacing_helpers.dart';
export 'test_harness.dart';
export 'widget_helpers.dart';

// NEW: Testing infrastructure helpers
export 'test_binding_helper.dart';
export 'mock_auth_service.dart';
export 'silent_error_service.dart';
export 'test_data_builders.dart';

// Test configuration and timeouts
export 'test_config.dart';

// Mocking infrastructure for service tests
export 'mock_setup.dart';
export 'test_api_client.dart';
