/// Parity Test Scenarios
///
/// These tests validate that frontend metadata matches backend configuration.
/// They are "drift detection" tests that catch when backend/frontend diverge.
///
/// Test Files:
/// - [metadata_parity_test.dart]: Entity existence and structure
/// - [field_parity_test.dart]: Field definitions and constraints
/// - [enum_parity_test.dart]: Enum values match validation-rules.json
/// - [permission_parity_test.dart]: ResourceType covers permissions.json
///
/// All tests are ZERO per-entity code - everything is generated from metadata.
library;

// Export factory for reuse in other scenario tests
export '../factory/factory.dart';
