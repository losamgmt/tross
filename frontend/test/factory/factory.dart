/// Test Factory - Metadata-Driven Test Infrastructure
///
/// Single import for generative testing across all entities.
/// Zero per-entity code - everything derived from metadata.
///
/// Usage:
/// ```dart
/// import '../factory/factory.dart';
///
/// void main() {
///   setUpAll(() => EntityTestRegistry.ensureInitialized());
///
///   test('generate data for any entity', () {
///     for (final entity in EntityTestRegistry.allEntityNames) {
///       final data = EntityDataGenerator.create(entity);
///       expect(data['id'], isNotNull);
///     }
///   });
///
///   test('fluent extension syntax', () {
///     final user = 'user'.testData(overrides: {'role_id': 1});
///     final users = 'user'.testDataList(count: 5);
///   });
/// }
/// ```
library;

export 'entity_registry.dart';
export 'entity_data_generator.dart';
