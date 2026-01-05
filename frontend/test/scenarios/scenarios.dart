/// Scenario Tests
///
/// Test scenarios validated from metadata - zero per-entity code.
///
/// Parity Tests (drift detection):
/// - [metadata_parity_test.dart]: Entity existence and structure
/// - [field_parity_test.dart]: Field definitions and constraints
/// - [enum_parity_test.dart]: Enum values match validation-rules.json
/// - [permission_parity_test.dart]: ResourceType covers permissions.json
///
/// Widget Scenarios (cross-entity widget tests):
/// - [widget_entity_scenario_test.dart]: All widgets x all entities
///
/// All tests are ZERO per-entity code - everything is generated from metadata.
library;

// Export factory for reuse in other scenario tests
export '../factory/factory.dart';
