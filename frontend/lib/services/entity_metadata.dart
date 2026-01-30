/// Entity Metadata Registry Service
///
/// SOLE RESPONSIBILITY: Load and provide access to entity metadata
///
/// This service loads metadata from assets/config/entity-metadata.json
/// and provides a singleton registry for runtime access.
///
/// USAGE:
/// ```dart
/// // Initialize at app startup
/// await EntityMetadataRegistry.instance.initialize();
///
/// // Get metadata for an entity
/// final metadata = EntityMetadataRegistry.get('customer');
/// ```
library;

import 'dart:convert';
import 'package:flutter/services.dart';
import '../models/entity_metadata.dart';
import '../models/field_definition.dart';
import '../models/permission.dart';
import 'error_service.dart';

// Re-export models for backwards compatibility
export '../models/entity_metadata.dart';
export '../models/field_definition.dart';
export '../models/preference_field.dart';

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
      ErrorService.logDebug(
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
      ErrorService.logDebug(
        '[EntityMetadataRegistry] Loaded metadata for ${_metadata.length} entities',
      );
      // coverage:ignore-start
      // Fallback paths only execute when rootBundle.loadString fails
      // (e.g., assets not bundled). Cannot be tested without mocking rootBundle.
    } catch (e) {
      ErrorService.logError(
        '[EntityMetadataRegistry] Failed to load entity metadata',
        error: e,
      );
      // Load defaults for required entities
      _loadDefaults();
      _initialized = true;
      // coverage:ignore-end
    }
  }

  // coverage:ignore-start
  // Default metadata generation - only used when JSON assets unavailable.
  // Provides fallback for development/debugging when assets aren't bundled.

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

    ErrorService.logDebug(
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

    final identityField = _getDefaultIdentityField(name);

    return EntityMetadata(
      name: name,
      tableName: '${tableName}s',
      primaryKey: 'id',
      identityField: identityField,
      displayField: _getDefaultDisplayField(name) ?? identityField,
      rlsResource: rlsResource,
      requiredFields: _getDefaultRequiredFields(name),
      immutableFields: const [],
      searchableFields: _getDefaultSearchableFields(name),
      filterableFields: const ['id', 'is_active', 'status', 'created_at'],
      sortableFields: const ['id', 'created_at', 'updated_at'],
      defaultSort: const SortConfig(field: 'created_at', order: 'DESC'),
      fields: _getDefaultFields(name),
      displayName: EntityMetadata.toDisplayName(name),
      displayNamePlural: EntityMetadata.toDisplayNamePlural(
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

  /// Get default display field for an entity (when referenced by FK)
  ///
  /// Returns null to use identityField as fallback.
  /// Only specify when displayField differs from identityField.
  String? _getDefaultDisplayField(String name) {
    return switch (name) {
      // Role: identity is 'priority' (unique), display is 'name' (human-readable)
      // This case is now handled by JSON, but kept as fallback
      _ => null, // Use identityField by default
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
  // coverage:ignore-end

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

  /// Get the BadgeStyle color name for an enum field value
  ///
  /// Returns the color name (e.g., 'success', 'error') defined in metadata,
  /// or null if the value has no color or entity/field not found.
  ///
  /// Usage:
  /// ```dart
  /// final colorName = EntityMetadataRegistry.getValueColor(
  ///   'work_order', 'status', 'completed'
  /// ); // Returns 'success'
  /// ```
  static String? getValueColor(String entity, String field, String value) {
    final metadata = tryGet(entity);
    if (metadata == null) return null;
    final fieldDef = metadata.fields[field];
    if (fieldDef == null) return null;
    return fieldDef.getValueColor(value);
  }
}
