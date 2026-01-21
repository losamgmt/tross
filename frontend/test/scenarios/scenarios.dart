/// Scenario Tests
///
/// Test scenarios validated from metadata - zero per-entity code.
///
/// Parity Tests (drift detection):
/// - [metadata_parity_test.dart]: Entity existence and structure
/// - [field_parity_test.dart]: Field definitions and constraints
/// - [enum_parity_test.dart]: Enum consistency and HUMAN entity alignment
/// - [permission_parity_test.dart]: ResourceType covers permissions.json
///
/// Widget Scenarios (cross-entity widget tests):
/// - [widget_entity_scenario_test.dart]: EntityDetailCard for all entities
/// - [data_table_scenario_test.dart]: AppDataTable for all entities
/// - [entity_form_modal_scenario_test.dart]: EntityFormModal create/edit/view
/// - [filterable_data_table_scenario_test.dart]: FilterableDataTable for all
///
/// Validation Scenarios (robustness tests):
/// - [validation_scenario_test.dart]: Missing fields, type mismatches, edge cases
///
/// All tests are ZERO per-entity code - everything is generated from metadata.
/// SSOT: entity-metadata.json (synced from backend *-metadata.js files)
library;

// Export factory for reuse in other scenario tests
export '../factory/factory.dart';
