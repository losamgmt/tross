/// Entity Settings Service - Manages admin-level entity configurations
///
/// SOLE RESPONSIBILITY: CRUD for entity settings with convenience methods
///
/// Uses GenericEntityService under the hood - this is just a thin wrapper
/// that adds entity-settings-specific logic (getForEntity, caching, etc.)
///
/// ENTITY SETTINGS SCHEMA:
/// - defaultSort: { field: string, direction: 'asc'|'desc' }
/// - defaultColumns: string[] (columns shown by default)
/// - columnLabels: { [field]: string } (custom labels)
/// - defaultDensity: 'compact'|'standard'|'comfortable'
/// - defaultPageSize: number
///
/// USAGE:
/// ```dart
/// // Get settings for work_orders
/// final settings = await EntitySettingsService.getForEntity('work_order');
///
/// // Admin: Update settings
/// await EntitySettingsService.save(
///   entityName: 'work_order',
///   settings: EntitySettingsConfig(
///     defaultSort: SortConfig(field: 'created_at', direction: 'desc'),
///     defaultColumns: ['work_order_number', 'status', 'customer_id'],
///     defaultDensity: 'compact',
///   ),
/// );
/// ```
library;

import 'generic_entity_service.dart';
import 'error_service.dart';

/// Sort configuration for an entity
class SortConfig {
  final String field;
  final String direction;

  const SortConfig({required this.field, this.direction = 'asc'});

  factory SortConfig.fromJson(Map<String, dynamic>? json) {
    if (json == null) {
      return const SortConfig(field: 'id', direction: 'asc');
    }
    return SortConfig(
      field: json['field'] as String? ?? 'id',
      direction: json['direction'] as String? ?? 'asc',
    );
  }

  Map<String, dynamic> toJson() => {'field': field, 'direction': direction};
}

/// Entity settings configuration
class EntitySettingsConfig {
  final SortConfig? defaultSort;
  final List<String>? defaultColumns;
  final Map<String, String>? columnLabels;
  final String? defaultDensity;
  final int? defaultPageSize;

  const EntitySettingsConfig({
    this.defaultSort,
    this.defaultColumns,
    this.columnLabels,
    this.defaultDensity,
    this.defaultPageSize,
  });

  factory EntitySettingsConfig.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const EntitySettingsConfig();
    return EntitySettingsConfig(
      defaultSort: json['defaultSort'] != null
          ? SortConfig.fromJson(json['defaultSort'] as Map<String, dynamic>)
          : null,
      defaultColumns: (json['defaultColumns'] as List<dynamic>?)
          ?.map((e) => e.toString())
          .toList(),
      columnLabels: (json['columnLabels'] as Map<String, dynamic>?)?.map(
        (k, v) => MapEntry(k, v.toString()),
      ),
      defaultDensity: json['defaultDensity'] as String?,
      defaultPageSize: json['defaultPageSize'] as int?,
    );
  }

  Map<String, dynamic> toJson() => {
    if (defaultSort != null) 'defaultSort': defaultSort!.toJson(),
    if (defaultColumns != null) 'defaultColumns': defaultColumns,
    if (columnLabels != null) 'columnLabels': columnLabels,
    if (defaultDensity != null) 'defaultDensity': defaultDensity,
    if (defaultPageSize != null) 'defaultPageSize': defaultPageSize,
  };

  /// Merge with another config (other takes precedence)
  EntitySettingsConfig merge(EntitySettingsConfig? other) {
    if (other == null) return this;
    return EntitySettingsConfig(
      defaultSort: other.defaultSort ?? defaultSort,
      defaultColumns: other.defaultColumns ?? defaultColumns,
      columnLabels: other.columnLabels ?? columnLabels,
      defaultDensity: other.defaultDensity ?? defaultDensity,
      defaultPageSize: other.defaultPageSize ?? defaultPageSize,
    );
  }
}

/// An entity settings record from the database
class EntitySettings {
  final int id;
  final String entityName;
  final EntitySettingsConfig settings;
  final int? updatedBy;
  final DateTime createdAt;
  final DateTime updatedAt;

  const EntitySettings({
    required this.id,
    required this.entityName,
    required this.settings,
    this.updatedBy,
    required this.createdAt,
    required this.updatedAt,
  });

  factory EntitySettings.fromJson(Map<String, dynamic> json) {
    return EntitySettings(
      id: json['id'] as int,
      entityName: json['entity_name'] as String,
      settings: EntitySettingsConfig.fromJson(
        json['settings'] as Map<String, dynamic>?,
      ),
      updatedBy: json['updated_by'] as int?,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }
}

/// Service for managing entity settings (admin-level defaults)
class EntitySettingsService {
  // Private constructor - static only
  EntitySettingsService._();

  static const String _entityName = 'entity_settings';

  // Simple in-memory cache (cleared on save)
  static final Map<String, EntitySettingsConfig> _cache = {};

  /// Get settings for a specific entity
  ///
  /// Returns cached settings if available, otherwise fetches from API.
  /// Returns empty config if no settings exist (graceful degradation).
  static Future<EntitySettingsConfig> getForEntity(String entityName) async {
    // Check cache first
    if (_cache.containsKey(entityName)) {
      return _cache[entityName]!;
    }

    try {
      final result = await GenericEntityService.getAll(
        _entityName,
        filters: {'entity_name': entityName},
        limit: 1,
      );

      if (result.data.isEmpty) {
        // No settings defined - return empty config
        _cache[entityName] = const EntitySettingsConfig();
        return const EntitySettingsConfig();
      }

      final settings = EntitySettings.fromJson(result.data.first);
      _cache[entityName] = settings.settings;
      return settings.settings;
    } catch (e) {
      ErrorService.logError(
        '[EntitySettingsService] Failed to get settings for $entityName',
        error: e,
      );
      // Return empty config on error (graceful degradation)
      return const EntitySettingsConfig();
    }
  }

  /// Get all entity settings (for admin panel)
  static Future<List<EntitySettings>> getAll() async {
    try {
      final result = await GenericEntityService.getAll(
        _entityName,
        sortBy: 'entity_name',
        sortOrder: 'ASC',
        limit: 100,
      );

      return result.data.map((json) => EntitySettings.fromJson(json)).toList();
    } catch (e) {
      ErrorService.logError(
        '[EntitySettingsService] Failed to get all settings',
        error: e,
      );
      rethrow;
    }
  }

  /// Save settings for an entity (admin only)
  ///
  /// Creates new record if none exists, updates existing otherwise.
  static Future<EntitySettings> save({
    required String entityName,
    required EntitySettingsConfig settings,
  }) async {
    try {
      // Check if settings already exist
      final existing = await GenericEntityService.getAll(
        _entityName,
        filters: {'entity_name': entityName},
        limit: 1,
      );

      Map<String, dynamic> result;

      if (existing.data.isNotEmpty) {
        // Update existing
        final id = existing.data.first['id'] as int;
        result = await GenericEntityService.update(_entityName, id, {
          'settings': settings.toJson(),
        });
      } else {
        // Create new
        result = await GenericEntityService.create(_entityName, {
          'entity_name': entityName,
          'settings': settings.toJson(),
        });
      }

      // Clear cache for this entity
      _cache.remove(entityName);

      return EntitySettings.fromJson(result);
    } catch (e) {
      ErrorService.logError(
        '[EntitySettingsService] Failed to save settings for $entityName',
        error: e,
      );
      rethrow;
    }
  }

  /// Delete settings for an entity (admin only)
  static Future<void> delete(int id) async {
    try {
      await GenericEntityService.delete(_entityName, id);
      // Clear entire cache since we don't know which entity this was
      _cache.clear();
    } catch (e) {
      ErrorService.logError(
        '[EntitySettingsService] Failed to delete settings',
        error: e,
      );
      rethrow;
    }
  }

  /// Clear the settings cache (useful after admin changes)
  static void clearCache() {
    _cache.clear();
  }
}
