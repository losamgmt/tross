/// Entity Data Generator - Metadata-Driven Test Fixture Factory
///
/// Generates valid test data for ANY entity based on its metadata.
/// No per-entity code - all data derived from field definitions.
///
/// SOLE RESPONSIBILITY: Generate valid entity data maps from metadata
library;

import 'dart:math';
import 'package:tross_app/services/entity_metadata.dart';
import 'entity_registry.dart';

// ============================================================================
// CORE GENERATOR
// ============================================================================

/// Generates test data for entities based on metadata.
///
/// Uses a shared ID counter to ensure unique IDs across calls.
/// Accepts optional seed for reproducible random values.
abstract final class EntityDataGenerator {
  static int _globalIdCounter = 1;

  /// Create a complete entity with all fields populated
  static Map<String, dynamic> create(
    String entityName, {
    Map<String, dynamic>? overrides,
    int? id,
    int? seed,
  }) {
    final context = GeneratorContext(seed: seed);
    final entityId = id ?? _globalIdCounter++;
    return _buildEntity(
      entityName,
      context,
      overrides,
      entityId: entityId,
      includeOptional: true,
    );
  }

  /// Create entity with only required fields (plus id)
  static Map<String, dynamic> createMinimal(
    String entityName, {
    Map<String, dynamic>? overrides,
    int? id,
    int? seed,
  }) {
    final context = GeneratorContext(seed: seed);
    final entityId = id ?? _globalIdCounter++;
    return _buildEntity(
      entityName,
      context,
      overrides,
      entityId: entityId,
      includeOptional: false,
    );
  }

  /// Create a list of entities with unique IDs
  static List<Map<String, dynamic>> createList(
    String entityName, {
    int count = 3,
    Map<String, dynamic>? sharedOverrides,
    int? seed,
  }) {
    final context = GeneratorContext(seed: seed);
    return List.generate(count, (_) {
      final entityId = _globalIdCounter++;
      return _buildEntity(
        entityName,
        context,
        sharedOverrides,
        entityId: entityId,
        includeOptional: true,
      );
    });
  }

  /// Create an entity with a specific field removed (for validation testing)
  static Map<String, dynamic> createMissingField(
    String entityName,
    String fieldToRemove, {
    int? seed,
  }) {
    final data = create(entityName, seed: seed);
    data.remove(fieldToRemove);
    return data;
  }

  /// Create an entity with an invalid value for testing validation
  static Map<String, dynamic> createInvalidField(
    String entityName,
    String fieldName,
    dynamic invalidValue, {
    int? seed,
  }) {
    return create(entityName, overrides: {fieldName: invalidValue}, seed: seed);
  }

  static Map<String, dynamic> _buildEntity(
    String entityName,
    GeneratorContext context,
    Map<String, dynamic>? overrides, {
    required int entityId,
    required bool includeOptional,
  }) {
    final metadata = EntityTestRegistry.get(entityName);
    final requiredFields = metadata.requiredFields.toSet();
    final data = <String, dynamic>{};

    // Set ID (override takes precedence)
    data['id'] = overrides?['id'] ?? entityId;

    // Generate field values
    for (final entry in metadata.fields.entries) {
      final fieldName = entry.key;
      final field = entry.value;

      if (fieldName == 'id') continue;

      // Use override if provided
      if (overrides?.containsKey(fieldName) ?? false) {
        data[fieldName] = overrides![fieldName];
        continue;
      }

      // Skip optional fields in minimal mode
      final isRequired = requiredFields.contains(fieldName);
      if (!includeOptional && !isRequired) continue;

      // Generate value from field definition
      data[fieldName] = FieldValueGenerator.generate(
        field: field,
        entityName: entityName,
        entityId: data['id'] as int,
        random: context.random,
      );
    }

    return data;
  }
}

// ============================================================================
// GENERATOR CONTEXT - Encapsulates random state for reproducibility
// ============================================================================

/// Encapsulates random generation state for reproducible test data.
final class GeneratorContext {
  final Random random;

  GeneratorContext({int? seed}) : random = Random(seed ?? 42);
}

// ============================================================================
// FIELD VALUE GENERATOR - Strategy-based field value generation
// ============================================================================

/// Generates appropriate values for fields based on their type and constraints.
///
/// SOLE RESPONSIBILITY: Map FieldDefinition → appropriate test value
abstract final class FieldValueGenerator {
  /// Generate a value for the given field definition
  static dynamic generate({
    required FieldDefinition field,
    required String entityName,
    required int entityId,
    required Random random,
  }) {
    // Use default value if specified
    if (field.defaultValue != null) {
      return field.defaultValue;
    }

    return switch (field.type) {
      FieldType.integer => _integer(field, random),
      FieldType.string => _string(field, entityName, entityId),
      FieldType.text => _text(entityName),
      FieldType.email => _email(entityName, entityId),
      FieldType.phone => _phone(random),
      FieldType.boolean => true,
      FieldType.timestamp => _timestamp(random),
      FieldType.date => _date(random),
      FieldType.decimal => _decimal(field, random),
      FieldType.enumType => _enumValue(field),
      FieldType.jsonb => <String, dynamic>{},
      FieldType.uuid => _uuid(random),
      FieldType.foreignKey => 1, // Default FK assumes id=1 exists
    };
  }

  /// Generate deterministic timestamp from random seed (not DateTime.now())
  static String _timestamp(Random random) {
    // Base date: 2026-01-01 + random days/hours/minutes
    final days = random.nextInt(365);
    final hours = random.nextInt(24);
    final minutes = random.nextInt(60);
    final baseDate = DateTime(2026, 1, 1, hours, minutes);
    return baseDate.add(Duration(days: days)).toIso8601String();
  }

  /// Generate deterministic date from random seed (not DateTime.now())
  static String _date(Random random) {
    final days = random.nextInt(365);
    final baseDate = DateTime(2026, 1, 1);
    return baseDate
        .add(Duration(days: days))
        .toIso8601String()
        .split('T')
        .first;
  }

  static int _integer(FieldDefinition field, Random random) {
    final min = (field.min ?? 1).toInt();
    final max = (field.max ?? 100).toInt();
    return min + random.nextInt(max - min + 1);
  }

  static String _string(FieldDefinition field, String entityName, int id) {
    final maxLength = field.maxLength ?? 50;
    final value = _contextualString(field.name, entityName, id);
    return value.length > maxLength ? value.substring(0, maxLength) : value;
  }

  static String _contextualString(String fieldName, String entityName, int id) {
    return switch (fieldName) {
      'name' => 'Test ${EntityMetadata.toDisplayName(entityName)} $id',
      'first_name' => 'Test',
      'last_name' => 'User$id',
      'title' => 'Test Title $id',
      'description' => 'Description for $entityName $id',
      'summary' => 'Summary for $entityName $id',
      'sku' => 'SKU-${id.toString().padLeft(4, '0')}',
      'invoice_number' => 'INV-${id.toString().padLeft(4, '0')}',
      'work_order_number' => 'WO-2026-${id.toString().padLeft(4, '0')}',
      'organization_name' || 'company_name' => 'Test Company $id',
      'address' => '123 Test Street #$id',
      'city' => 'Test City',
      'state' => 'TS',
      'zip' || 'postal_code' => '12345',
      'country' => 'Test Country',
      'notes' => 'Test notes for $entityName $id',
      _ => 'test_${fieldName}_$id',
    };
  }

  static String _text(String entityName) =>
      'Extended text content for testing the $entityName entity. '
      'Contains multiple sentences to simulate realistic content.';

  static String _email(String entityName, int id) =>
      'test_${entityName}_$id@example.com';

  static String _phone(Random random) =>
      '+1555${random.nextInt(9000000) + 1000000}';

  static double _decimal(FieldDefinition field, Random random) {
    final min = (field.min ?? 0).toDouble();
    final max = (field.max ?? 1000).toDouble();
    return min + random.nextDouble() * (max - min);
  }

  static String? _enumValue(FieldDefinition field) {
    final values = field.enumValues;
    return (values == null || values.isEmpty) ? null : values.first;
  }

  static String _uuid(Random random) {
    String hex(int len) =>
        List.generate(len, (_) => random.nextInt(16).toRadixString(16)).join();
    return '${hex(8)}-${hex(4)}-${hex(4)}-${hex(4)}-${hex(12)}';
  }
}

// ============================================================================
// CONVENIENCE EXTENSION
// ============================================================================

/// Extension on entity name strings for fluent test data generation.
///
/// Usage: `'user'.testData()` or `'user'.testDataList(count: 5)`
extension TestDataGeneration on String {
  /// Generate test data for this entity name
  Map<String, dynamic> testData({
    Map<String, dynamic>? overrides,
    int? id,
    int? seed,
  }) => EntityDataGenerator.create(
    this,
    overrides: overrides,
    id: id,
    seed: seed,
  );

  /// Generate a list of test entities
  List<Map<String, dynamic>> testDataList({
    int count = 3,
    Map<String, dynamic>? sharedOverrides,
    int? seed,
  }) => EntityDataGenerator.createList(
    this,
    count: count,
    sharedOverrides: sharedOverrides,
    seed: seed,
  );
}
