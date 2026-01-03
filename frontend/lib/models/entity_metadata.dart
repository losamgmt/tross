/// Entity Metadata Model
///
/// Complete definition of an entity for metadata-driven UI
/// Used by forms, tables, and CRUD operations
library;

import 'field_definition.dart';
import 'preference_field.dart';
import 'permission.dart';

/// Entity metadata - complete definition of an entity
class EntityMetadata {
  /// Entity name (e.g., 'customer', 'work_order')
  final String name;

  /// Database table name
  final String tableName;

  /// Primary key field (usually 'id')
  final String primaryKey;

  /// Human-readable identity field (e.g., 'email' for customers, 'title' for work orders)
  final String identityField;

  /// Resource type for RLS (row-level security) - determines which RECORDS user can access.
  /// This is distinct from nav visibility (which uses permissions.json resource.read).
  /// Every entity MUST have an rlsResource for defense-in-depth security.
  final ResourceType rlsResource;

  /// Icon name for Material Icons (e.g., 'people_outlined', 'business_outlined').
  /// Used for navigation menus and entity displays.
  final String? icon;

  /// Fields required for create operations
  final List<String> requiredFields;

  /// Fields that cannot be updated after creation
  final List<String> immutableFields;

  /// Fields that support text search
  final List<String> searchableFields;

  /// Fields that can be filtered
  final List<String> filterableFields;

  /// Fields that can be sorted
  final List<String> sortableFields;

  /// Default sort configuration
  final SortConfig defaultSort;

  /// Field definitions with types and constraints
  final Map<String, FieldDefinition> fields;

  /// Display label for this entity (singular)
  final String displayName;

  /// Display label for this entity (plural)
  final String displayNamePlural;

  /// Preference schema for entities with JSONB preferences field
  /// Contains field definitions for the preferences JSON keys
  final Map<String, PreferenceFieldDefinition>? preferenceSchema;

  const EntityMetadata({
    required this.name,
    required this.tableName,
    required this.primaryKey,
    required this.identityField,
    required this.rlsResource,
    this.icon,
    required this.requiredFields,
    required this.immutableFields,
    required this.searchableFields,
    required this.filterableFields,
    required this.sortableFields,
    required this.defaultSort,
    required this.fields,
    required this.displayName,
    required this.displayNamePlural,
    this.preferenceSchema,
  });

  factory EntityMetadata.fromJson(String name, Map<String, dynamic> json) {
    // Parse field definitions
    final fieldsJson = json['fields'] as Map<String, dynamic>? ?? {};
    final fields = <String, FieldDefinition>{};
    for (final entry in fieldsJson.entries) {
      fields[entry.key] = FieldDefinition.fromJson(
        entry.key,
        entry.value as Map<String, dynamic>,
      );
    }

    // Parse default sort
    final defaultSortJson = json['defaultSort'] as Map<String, dynamic>?;
    final defaultSort = defaultSortJson != null
        ? SortConfig.fromJson(defaultSortJson)
        : const SortConfig(field: 'created_at', order: 'DESC');

    // Generate display names from entity name if not provided
    final displayName = json['displayName'] as String? ?? toDisplayName(name);
    final displayNamePlural =
        json['displayNamePlural'] as String? ??
        toDisplayNamePlural(displayName);

    // Parse rlsResource string to ResourceType enum
    // Every entity MUST have a valid rlsResource for defense-in-depth
    final rlsResourceString = json['rlsResource'] as String? ?? '${name}s';
    final rlsResource = ResourceType.fromString(rlsResourceString);
    if (rlsResource == null) {
      throw ArgumentError(
        'Invalid rlsResource "$rlsResourceString" for entity "$name". '
        'Must be one of: ${ResourceType.values.map((r) => r.toBackendString()).join(", ")}',
      );
    }

    return EntityMetadata(
      name: name,
      tableName: json['tableName'] as String? ?? '${name}s',
      primaryKey: json['primaryKey'] as String? ?? 'id',
      identityField: json['identityField'] as String? ?? 'id',
      rlsResource: rlsResource,
      icon: json['icon'] as String?,
      requiredFields:
          (json['requiredFields'] as List<dynamic>?)?.cast<String>() ?? [],
      immutableFields:
          (json['immutableFields'] as List<dynamic>?)?.cast<String>() ?? [],
      searchableFields:
          (json['searchableFields'] as List<dynamic>?)?.cast<String>() ?? [],
      filterableFields:
          (json['filterableFields'] as List<dynamic>?)?.cast<String>() ?? [],
      sortableFields:
          (json['sortableFields'] as List<dynamic>?)?.cast<String>() ?? [],
      defaultSort: defaultSort,
      fields: fields,
      displayName: displayName,
      displayNamePlural: displayNamePlural,
      preferenceSchema: _parsePreferenceSchema(json['preferenceSchema']),
    );
  }

  /// Parse preferenceSchema JSON into PreferenceFieldDefinition map
  static Map<String, PreferenceFieldDefinition>? _parsePreferenceSchema(
    dynamic schemaJson,
  ) {
    if (schemaJson == null) return null;
    final schema = schemaJson as Map<String, dynamic>;
    if (schema.isEmpty) return null;

    final result = <String, PreferenceFieldDefinition>{};
    for (final entry in schema.entries) {
      result[entry.key] = PreferenceFieldDefinition.fromJson(
        entry.key,
        entry.value as Map<String, dynamic>,
      );
    }
    return result;
  }

  /// Convert entity name to display name (e.g., 'work_order' -> 'Work Order')
  ///
  /// This is the canonical method for formatting entity names.
  /// Use this instead of duplicating the logic elsewhere.
  static String toDisplayName(String name) {
    return name
        .split('_')
        .map(
          (word) => word.isEmpty
              ? ''
              : '${word[0].toUpperCase()}${word.substring(1)}',
        )
        .join(' ');
  }

  /// Convert display name to plural (simple +s, can be overridden in JSON)
  static String toDisplayNamePlural(String singular) {
    if (singular.endsWith('y')) {
      return '${singular.substring(0, singular.length - 1)}ies';
    }
    if (singular.endsWith('s') ||
        singular.endsWith('x') ||
        singular.endsWith('ch') ||
        singular.endsWith('sh')) {
      return '${singular}es';
    }
    return '${singular}s';
  }

  /// Get list of all field names
  List<String> get fieldNames => fields.keys.toList();

  /// Check if a field is required
  bool isRequired(String fieldName) => requiredFields.contains(fieldName);

  /// Check if a field is readonly
  bool isReadonly(String fieldName) => fields[fieldName]?.readonly ?? false;

  /// Check if a field is immutable (can't be updated after create)
  bool isImmutable(String fieldName) =>
      immutableFields.contains(fieldName) ||
      fieldName == primaryKey ||
      fieldName == 'created_at';

  /// Get field type
  FieldType? getFieldType(String fieldName) => fields[fieldName]?.type;
}
