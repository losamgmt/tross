/// Entity Metadata Model
///
/// Complete definition of an entity for metadata-driven UI
/// Used by forms, tables, and CRUD operations
library;

import 'field_definition.dart';
import 'preference_field.dart';
import 'permission.dart';

/// Semantic grouping of fields for form layout
class FieldGroup {
  /// Display label for the group
  final String label;

  /// Field names in this group
  final List<String> fields;

  /// Display order (lower = first)
  final int order;

  /// Row layout hints - each inner list is a row of fields
  /// Fields not in any row are rendered full-width vertically
  /// Example: [['city', 'state', 'postal_code']] puts those 3 fields on one row
  final List<List<String>> rows;

  /// Group name to copy field values FROM when "Same as" button is clicked
  /// The fields must have matching suffixes (e.g., billing_city -> service_city)
  /// Example: service_address.copyFrom = 'billing_address'
  final String? copyFrom;

  /// Label for the copy button (e.g., "Same as Billing")
  /// Defaults to "Same as [source group label]"
  final String? copyFromLabel;

  const FieldGroup({
    required this.label,
    required this.fields,
    required this.order,
    this.rows = const [],
    this.copyFrom,
    this.copyFromLabel,
  });

  factory FieldGroup.fromJson(Map<String, dynamic> json) {
    return FieldGroup(
      label: json['label'] as String? ?? '',
      fields: (json['fields'] as List<dynamic>?)?.cast<String>() ?? [],
      order: json['order'] as int? ?? 0,
      rows:
          (json['rows'] as List<dynamic>?)
              ?.map((row) => (row as List<dynamic>).cast<String>())
              .toList() ??
          [],
      copyFrom: json['copyFrom'] as String?,
      copyFromLabel: json['copyFromLabel'] as String?,
    );
  }

  /// Check if a field is in any row layout
  bool isInRow(String fieldName) {
    return rows.any((row) => row.contains(fieldName));
  }

  /// Get the row containing a field, or null if not in a row
  List<String>? getRowFor(String fieldName) {
    for (final row in rows) {
      if (row.contains(fieldName)) return row;
    }
    return null;
  }
}

/// Form layout strategy for rendering fields
///
/// Determines how GenericForm renders its fields:
/// - [flat]: Simple vertical list of all fields (default)
/// - [grouped]: Fields organized into collapsible/visual sections using fieldGroups
/// - [tabbed]: Fields organized into tabs (future, for complex entities)
enum FormLayout {
  /// Simple vertical list of all fields, no grouping
  flat,

  /// Fields organized into visual sections using entity fieldGroups
  grouped,

  /// Fields organized into tabs (future enhancement)
  tabbed,
}

/// Entity metadata - complete definition of an entity
class EntityMetadata {
  /// Entity key (singular, for API params and lookups: e.g., 'work_order')
  /// This is the canonical identifier for the entity across all layers.
  final String entityKey;

  /// Entity name - alias for entityKey for backwards compatibility
  String get name => entityKey;

  /// Database table name (plural, also used for API URLs: e.g., 'work_orders')
  final String tableName;

  /// Primary key field (usually 'id')
  final String primaryKey;

  /// Human-readable identity field (e.g., 'email' for customers, 'title' for work orders)
  /// This is the unique business key used for lookups and references.
  final String identityField;

  /// Display field shown when this entity is referenced by others (e.g., in FK dropdowns).
  /// Defaults to identityField if not specified.
  /// Example: role has identityField='priority' (unique key) but displayField='name' (shown in UI).
  final String displayField;

  /// Resource type for RLS (row-level security) - determines which RECORDS user can access.
  /// This is distinct from nav visibility (which uses permissions.json resource.read).
  /// Every entity MUST have an rlsResource for defense-in-depth security.
  final ResourceType rlsResource;

  /// Icon name for Material Icons (e.g., 'people_outlined', 'business_outlined').
  /// Used for navigation menus and entity displays.
  final String? icon;

  /// Whether this entity supports file attachments.
  /// When true, the entity detail screen shows file upload/list UI.
  final bool supportsFileAttachments;

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

  /// Semantic field groups for form layout
  /// Keys are group names (e.g., 'identity', 'billing_address')
  /// Used by forms to organize fields into logical sections
  final Map<String, FieldGroup> fieldGroups;

  const EntityMetadata({
    required this.entityKey,
    required this.tableName,
    required this.primaryKey,
    required this.identityField,
    required this.displayField,
    required this.rlsResource,
    this.icon,
    required this.supportsFileAttachments,
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
    this.fieldGroups = const {},
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

    final identityField = json['identityField'] as String? ?? 'id';

    return EntityMetadata(
      entityKey: json['entityKey'] as String? ?? name,
      tableName: json['tableName'] as String? ?? '${name}s',
      primaryKey: json['primaryKey'] as String? ?? 'id',
      identityField: identityField,
      displayField: json['displayField'] as String? ?? identityField,
      rlsResource: rlsResource,
      icon: json['icon'] as String?,
      supportsFileAttachments:
          json['supportsFileAttachments'] as bool? ?? false,
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
      fieldGroups: _parseFieldGroups(json['fieldGroups']),
    );
  }

  /// Parse fieldGroups JSON into FieldGroup map
  static Map<String, FieldGroup> _parseFieldGroups(dynamic groupsJson) {
    if (groupsJson == null) return {};
    final groups = groupsJson as Map<String, dynamic>;
    if (groups.isEmpty) return {};

    final result = <String, FieldGroup>{};
    for (final entry in groups.entries) {
      result[entry.key] = FieldGroup.fromJson(
        entry.value as Map<String, dynamic>,
      );
    }
    return result;
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

  /// Get field groups sorted by order
  List<FieldGroup> get sortedFieldGroups {
    final groups = fieldGroups.values.toList();
    groups.sort((a, b) => a.order.compareTo(b.order));
    return groups;
  }

  /// Check if this entity has field groups defined
  bool get hasFieldGroups => fieldGroups.isNotEmpty;
}
