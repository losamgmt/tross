/// Entity Registry - Test-Friendly Wrapper for EntityMetadataRegistry
///
/// Provides test-safe access to entity metadata for generative testing.
/// Handles initialization and exposes discovery methods.
///
/// SOLE RESPONSIBILITY: Provide entity metadata access to test infrastructure
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross/services/entity_metadata.dart';

/// CORE business entities that must always exist.
/// Used for pre-initialization smoke tests only.
/// NOTE: After initialization, use EntityTestRegistry.allEntityNames instead!
/// This list should be a SUBSET of what's in entity-metadata.json.
const coreBusinessEntities = <String>[
  'user',
  'role',
  'customer',
  'technician',
  'work_order',
  'contract',
  'invoice',
  'inventory',
];

/// DEPRECATED: Use EntityTestRegistry.allEntityNames inside test bodies instead.
///
/// This constant exists for backward compatibility with tests that use the
/// `for (entity in allKnownEntities) { test(...) }` pattern at declaration time.
///
/// LIMITATION: This list is static and may become out of sync with
/// entity-metadata.json. For SSOT compliance, prefer:
/// ```dart
/// test('all entities work', () {
///   for (final entity in EntityTestRegistry.allEntityNames) {
///     // test logic here with entity
///   }
/// });
/// ```
///
/// TODO: Migrate all usages to dynamic EntityTestRegistry.allEntityNames pattern
const allKnownEntities = <String>[
  'approval_request',
  'asset',
  'audit_log',
  'contract',
  'customer',
  'customer_unit',
  'department',
  'file_attachment',
  'inventory',
  'invoice',
  'maintenance_schedule',
  'notification',
  'payment',
  'preferences',
  'property',
  'property_role',
  'purchase_order',
  'quote',
  'receipt',
  'recommendation',
  'role',
  'saved_view',
  'service_agreement',
  'service_agreement_item',
  'service_template',
  'subcontractor',
  'technician',
  'unit',
  'user',
  'vendor',
  'visit',
  'visit_subcontractor',
  'visit_technician',
  'work_order',
];

/// Test-friendly wrapper for EntityMetadataRegistry
///
/// Ensures proper initialization in test context and provides
/// convenient access methods for generative testing.
abstract final class EntityTestRegistry {
  static bool _initialized = false;

  /// Ensure metadata is loaded before tests run.
  /// Safe to call multiple times - only initializes once.
  static Future<void> ensureInitialized() async {
    if (_initialized) return;

    TestWidgetsFlutterBinding.ensureInitialized();
    await EntityMetadataRegistry.instance.initialize();
    _initialized = true;
  }

  /// Whether the registry has been initialized
  static bool get isInitialized => _initialized;

  /// All entity names from metadata (snake_case)
  static List<String> get allEntityNames {
    _assertInitialized();
    return EntityMetadataRegistry.entityNames;
  }

  /// Get metadata for a specific entity. Throws if not found.
  static EntityMetadata get(String entityName) {
    _assertInitialized();
    return EntityMetadataRegistry.get(entityName);
  }

  /// Try to get metadata, returns null if not found
  static EntityMetadata? tryGet(String entityName) {
    if (!_initialized) return null;
    return EntityMetadataRegistry.tryGet(entityName);
  }

  /// Check if an entity exists in the registry
  static bool has(String entityName) {
    _assertInitialized();
    return EntityMetadataRegistry.has(entityName);
  }

  /// Get all field names for an entity
  static List<String> getFieldNames(String entityName) =>
      get(entityName).fieldNames;

  /// Get required field names for an entity
  static List<String> getRequiredFields(String entityName) =>
      get(entityName).requiredFields;

  /// Get a specific field definition
  static FieldDefinition? getField(String entityName, String fieldName) =>
      get(entityName).fields[fieldName];

  /// Get entities that have a specific field type
  static Iterable<String> entitiesWithFieldType(FieldType type) sync* {
    _assertInitialized();
    for (final entity in allEntityNames) {
      if (get(entity).fields.values.any((f) => f.type == type)) {
        yield entity;
      }
    }
  }

  /// Get entities that have foreign key relationships
  static Iterable<String> get entitiesWithForeignKeys sync* {
    _assertInitialized();
    for (final entity in allEntityNames) {
      if (get(entity).fields.values.any((f) => f.isForeignKey)) {
        yield entity;
      }
    }
  }

  /// Get entities that have enum fields with defined values
  static Iterable<String> get entitiesWithEnums sync* {
    _assertInitialized();
    for (final entity in allEntityNames) {
      final hasEnum = get(entity).fields.values.any(
        (f) => f.type == FieldType.enumType && f.enumValues != null,
      );
      if (hasEnum) {
        yield entity;
      }
    }
  }

  static void _assertInitialized() {
    if (!_initialized) {
      throw StateError(
        'EntityTestRegistry not initialized. '
        'Call await EntityTestRegistry.ensureInitialized() in setUpAll.',
      );
    }
  }
}
