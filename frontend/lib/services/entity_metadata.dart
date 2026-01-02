/// Entity Metadata - Frontend representation of backend entity metadata
///
/// SOLE RESPONSIBILITY: Define structure of entities for metadata-driven forms/tables
///
/// This mirrors the backend metadata structure from backend/config/models/*.js
/// Loaded from assets/config/entity-metadata.json (synced from backend)
///
/// USAGE:
/// ```dart
/// // Get metadata for an entity
/// final metadata = EntityMetadataRegistry.get('customer');
///
/// // Check required fields
/// if (metadata.requiredFields.contains('email')) { ... }
///
/// // Get field configuration for forms
/// final fieldDef = metadata.fields['email'];
/// if (fieldDef?.type == FieldType.email) { ... }
/// ```
library;

import 'dart:convert';
import 'package:flutter/services.dart';
import '../models/permission.dart';
import 'error_service.dart';

/// Field types matching backend field definitions
enum FieldType {
  string,
  integer,
  boolean,
  email,
  phone,
  timestamp,
  date,
  jsonb,
  decimal,
  enumType, // 'enum' is reserved in Dart
  text,
  uuid,
  foreignKey, // FK relationship to another entity
}

/// Field definition from metadata
class FieldDefinition {
  final String name;
  final FieldType type;
  final bool required;
  final bool readonly;
  final int? maxLength;
  final int? minLength;
  final num? min;
  final num? max;
  final dynamic defaultValue;
  final List<String>? enumValues; // For enum fields
  final String? pattern; // Regex pattern
  final String? description;

  // Foreign key relationship fields
  final String? relatedEntity; // e.g., 'role', 'customer'
  final String? displayField; // Single field fallback e.g., 'name', 'email'
  final List<String>?
  displayFields; // Multiple fields e.g., ['company_name', 'email']
  final String?
  displayTemplate; // Format string e.g., '{company_name} - {email}'

  /// Check if this is a foreign key field
  bool get isForeignKey =>
      type == FieldType.foreignKey || relatedEntity != null;

  const FieldDefinition({
    required this.name,
    required this.type,
    this.required = false,
    this.readonly = false,
    this.maxLength,
    this.minLength,
    this.min,
    this.max,
    this.defaultValue,
    this.enumValues,
    this.pattern,
    this.description,
    this.relatedEntity,
    this.displayField,
    this.displayFields,
    this.displayTemplate,
  });

  factory FieldDefinition.fromJson(String name, Map<String, dynamic> json) {
    return FieldDefinition(
      name: name,
      type: _parseFieldType(json['type'] as String? ?? 'string'),
      required: json['required'] as bool? ?? false,
      readonly: json['readonly'] as bool? ?? false,
      maxLength: json['maxLength'] as int?,
      minLength: json['minLength'] as int?,
      min: json['min'] as num?,
      max: json['max'] as num?,
      defaultValue: json['default'],
      enumValues: (json['values'] as List<dynamic>?)?.cast<String>(),
      pattern: json['pattern'] as String?,
      description: json['description'] as String?,
      relatedEntity: json['relatedEntity'] as String?,
      displayField: json['displayField'] as String?,
      displayFields: (json['displayFields'] as List<dynamic>?)?.cast<String>(),
      displayTemplate: json['displayTemplate'] as String?,
    );
  }

  static FieldType _parseFieldType(String type) {
    return switch (type.toLowerCase()) {
      'string' => FieldType.string,
      'integer' || 'int' => FieldType.integer,
      'boolean' || 'bool' => FieldType.boolean,
      'email' => FieldType.email,
      'phone' => FieldType.phone,
      'timestamp' || 'datetime' => FieldType.timestamp,
      'date' => FieldType.date,
      'jsonb' || 'json' => FieldType.jsonb,
      'decimal' || 'float' || 'double' || 'number' => FieldType.decimal,
      'enum' => FieldType.enumType,
      'text' => FieldType.text,
      'uuid' => FieldType.uuid,
      'foreignkey' || 'fk' => FieldType.foreignKey,
      _ => FieldType.string,
    };
  }
}

/// Sort configuration
class SortConfig {
  final String field;
  final String order; // 'ASC' or 'DESC'

  const SortConfig({required this.field, this.order = 'DESC'});

  factory SortConfig.fromJson(Map<String, dynamic> json) {
    return SortConfig(
      field: json['field'] as String? ?? 'id',
      order: json['order'] as String? ?? 'DESC',
    );
  }
}

/// Preference field definition for JSONB preferences schema
/// Used to dynamically generate preference forms
class PreferenceFieldDefinition {
  final String key;
  final PreferenceFieldType type;
  final String label;
  final String? description;
  final dynamic defaultValue;
  final List<String>? enumValues;
  final Map<String, String>? displayLabels; // Maps enum values to display text
  final int order;

  const PreferenceFieldDefinition({
    required this.key,
    required this.type,
    required this.label,
    this.description,
    this.defaultValue,
    this.enumValues,
    this.displayLabels,
    this.order = 0,
  });

  factory PreferenceFieldDefinition.fromJson(
    String key,
    Map<String, dynamic> json,
  ) {
    return PreferenceFieldDefinition(
      key: key,
      type: _parsePreferenceFieldType(json['type'] as String? ?? 'string'),
      label: json['label'] as String? ?? _formatLabel(key),
      description: json['description'] as String?,
      defaultValue: json['default'],
      enumValues: (json['values'] as List<dynamic>?)?.cast<String>(),
      displayLabels: (json['displayLabels'] as Map<String, dynamic>?)?.map(
        (k, v) => MapEntry(k, v.toString()),
      ),
      order: json['order'] as int? ?? 0,
    );
  }

  static PreferenceFieldType _parsePreferenceFieldType(String type) {
    return switch (type.toLowerCase()) {
      'boolean' || 'bool' => PreferenceFieldType.boolean,
      'enum' => PreferenceFieldType.enumType,
      'string' => PreferenceFieldType.string,
      'integer' || 'int' => PreferenceFieldType.integer,
      _ => PreferenceFieldType.string,
    };
  }

  /// Format key to display label (e.g., 'notificationsEnabled' -> 'Notifications Enabled')
  static String _formatLabel(String key) {
    // Split on camelCase
    final words = key.replaceAllMapped(
      RegExp(r'([a-z])([A-Z])'),
      (match) => '${match.group(1)} ${match.group(2)}',
    );
    // Capitalize first letter
    if (words.isEmpty) return key;
    return '${words[0].toUpperCase()}${words.substring(1)}';
  }

  /// Get display text for an enum value
  String getDisplayText(String value) {
    return displayLabels?[value] ?? _formatLabel(value);
  }
}

/// Preference field types supported by the form builder
enum PreferenceFieldType { boolean, enumType, string, integer }

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
        _toDisplayNamePlural(displayName);

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
  static String _toDisplayNamePlural(String singular) {
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

/// Registry for all entity metadata
///
/// Singleton that loads and caches all entity metadata.
///
/// Entity names use snake_case (e.g., 'work_order', 'preferences')
/// matching the strict naming convention across all layers.
class EntityMetadataRegistry {
  static final EntityMetadataRegistry _instance = EntityMetadataRegistry._();
  static EntityMetadataRegistry get instance => _instance;

  EntityMetadataRegistry._();

  final Map<String, EntityMetadata> _metadata = {};
  bool _initialized = false;

  /// Initialize by loading metadata from assets
  Future<void> initialize() async {
    if (_initialized) return;

    try {
      ErrorService.logInfo(
        '[EntityMetadataRegistry] Loading entity metadata...',
      );

      final jsonString = await rootBundle.loadString(
        'assets/config/entity-metadata.json',
      );
      final json = jsonDecode(jsonString) as Map<String, dynamic>;

      // Skip JSON schema meta-keys (start with $ or are metadata fields)
      final metaKeys = {
        r'$schema',
        r'$id',
        'title',
        'description',
        'version',
        'lastModified',
      };

      for (final entry in json.entries) {
        // Skip meta-keys - only process entity definitions
        if (metaKeys.contains(entry.key)) continue;
        if (entry.value is! Map<String, dynamic>) continue;

        _metadata[entry.key] = EntityMetadata.fromJson(
          entry.key,
          entry.value as Map<String, dynamic>,
        );
      }

      _initialized = true;
      ErrorService.logInfo(
        '[EntityMetadataRegistry] Loaded metadata for ${_metadata.length} entities',
      );
    } catch (e) {
      ErrorService.logError(
        '[EntityMetadataRegistry] Failed to load entity metadata',
        error: e,
      );
      // Load defaults for required entities
      _loadDefaults();
      _initialized = true;
    }
  }

  /// Load default metadata when JSON not available
  void _loadDefaults() {
    // Use snake_case for entity names to match API/URL conventions
    final defaultEntities = [
      'user',
      'role',
      'customer',
      'technician',
      'contract',
      'invoice',
      'inventory',
      'work_order',
    ];

    for (final entity in defaultEntities) {
      _metadata[entity] = _createDefaultMetadata(entity);
    }

    ErrorService.logInfo(
      '[EntityMetadataRegistry] Loaded defaults for ${defaultEntities.length} entities',
    );
  }

  /// Create default metadata for an entity
  EntityMetadata _createDefaultMetadata(String name) {
    // Try to find ResourceType by name directly first, then with 's' suffix
    ResourceType? rlsResource = ResourceType.fromString(name);
    rlsResource ??= ResourceType.fromString('${name}s');

    if (rlsResource == null) {
      throw ArgumentError(
        'Cannot create default metadata for unknown entity "$name". '
        'No matching ResourceType found for "$name" or "${name}s".',
      );
    }

    // Convert camelCase to snake_case for table name
    final tableName = name.replaceAllMapped(
      RegExp(r'([A-Z])'),
      (m) => '_${m.group(1)!.toLowerCase()}',
    );

    return EntityMetadata(
      name: name,
      tableName: '${tableName}s',
      primaryKey: 'id',
      identityField: _getDefaultIdentityField(name),
      rlsResource: rlsResource,
      requiredFields: _getDefaultRequiredFields(name),
      immutableFields: const [],
      searchableFields: _getDefaultSearchableFields(name),
      filterableFields: const ['id', 'is_active', 'status', 'created_at'],
      sortableFields: const ['id', 'created_at', 'updated_at'],
      defaultSort: const SortConfig(field: 'created_at', order: 'DESC'),
      fields: _getDefaultFields(name),
      displayName: EntityMetadata.toDisplayName(name),
      displayNamePlural: EntityMetadata._toDisplayNamePlural(
        EntityMetadata.toDisplayName(name),
      ),
    );
  }

  /// Get default identity field for an entity
  String _getDefaultIdentityField(String name) {
    return switch (name) {
      'user' || 'customer' || 'technician' => 'email',
      'role' => 'name',
      'work_order' || 'contract' => 'title',
      'invoice' => 'invoice_number',
      'inventory' => 'name',
      _ => 'id',
    };
  }

  /// Get default required fields for an entity
  List<String> _getDefaultRequiredFields(String name) {
    return switch (name) {
      'user' => ['email', 'role_id'],
      'role' => ['name'],
      'customer' => ['email'],
      'technician' => ['user_id'],
      'work_order' => ['title', 'customer_id'],
      'contract' => ['title', 'customer_id'],
      'invoice' => ['customer_id'],
      'inventory' => ['name'],
      _ => [],
    };
  }

  /// Get default searchable fields for an entity
  List<String> _getDefaultSearchableFields(String name) {
    return switch (name) {
      'user' => ['email', 'first_name', 'last_name'],
      'role' => ['name', 'description'],
      'customer' => ['email', 'company_name', 'phone'],
      'technician' => ['specialty'],
      'work_order' => ['title', 'description'],
      'contract' => ['title', 'description'],
      'invoice' => ['invoice_number'],
      'inventory' => ['name', 'description', 'sku'],
      _ => [],
    };
  }

  /// Get default field definitions for an entity
  Map<String, FieldDefinition> _getDefaultFields(String name) {
    // Universal fields present on all entities
    final universalFields = <String, FieldDefinition>{
      'id': const FieldDefinition(
        name: 'id',
        type: FieldType.integer,
        readonly: true,
      ),
      'is_active': const FieldDefinition(
        name: 'is_active',
        type: FieldType.boolean,
        defaultValue: true,
      ),
      'created_at': const FieldDefinition(
        name: 'created_at',
        type: FieldType.timestamp,
        readonly: true,
      ),
      'updated_at': const FieldDefinition(
        name: 'updated_at',
        type: FieldType.timestamp,
        readonly: true,
      ),
    };

    // Entity-specific fields
    final entityFields = switch (name) {
      'user' => <String, FieldDefinition>{
        'email': const FieldDefinition(
          name: 'email',
          type: FieldType.email,
          required: true,
          maxLength: 255,
        ),
        'first_name': const FieldDefinition(
          name: 'first_name',
          type: FieldType.string,
          maxLength: 100,
        ),
        'last_name': const FieldDefinition(
          name: 'last_name',
          type: FieldType.string,
          maxLength: 100,
        ),
        'role_id': const FieldDefinition(
          name: 'role_id',
          type: FieldType.integer,
          required: true,
        ),
      },
      'role' => <String, FieldDefinition>{
        'name': const FieldDefinition(
          name: 'name',
          type: FieldType.string,
          required: true,
          maxLength: 50,
        ),
        'description': const FieldDefinition(
          name: 'description',
          type: FieldType.text,
        ),
      },
      'customer' => <String, FieldDefinition>{
        'email': const FieldDefinition(
          name: 'email',
          type: FieldType.email,
          required: true,
          maxLength: 255,
        ),
        'phone': const FieldDefinition(
          name: 'phone',
          type: FieldType.phone,
          maxLength: 50,
        ),
        'company_name': const FieldDefinition(
          name: 'company_name',
          type: FieldType.string,
          maxLength: 255,
        ),
        'status': FieldDefinition(
          name: 'status',
          type: FieldType.enumType,
          enumValues: const ['pending', 'active', 'suspended'],
          defaultValue: 'pending',
        ),
      },
      _ => <String, FieldDefinition>{},
    };

    return {...universalFields, ...entityFields};
  }

  /// Get metadata for an entity
  ///
  /// Throws if entity not found and no default available.
  /// Entity names use snake_case: 'work_order', 'preferences'
  static EntityMetadata get(String entityName) {
    if (!_instance._initialized) {
      throw StateError(
        'EntityMetadataRegistry not initialized. Call initialize() first.',
      );
    }
    final metadata = _instance._metadata[entityName];
    if (metadata == null) {
      throw ArgumentError('Unknown entity: $entityName');
    }
    return metadata;
  }

  /// Get metadata for an entity, or null if not found
  /// Entity names use snake_case: 'work_order', 'preferences'
  static EntityMetadata? tryGet(String entityName) {
    if (!_instance._initialized) return null;
    return _instance._metadata[entityName];
  }

  /// Get all entity names
  static List<String> get entityNames => _instance._metadata.keys.toList();

  /// Check if an entity exists
  static bool has(String entityName) =>
      _instance._metadata.containsKey(entityName);
}
