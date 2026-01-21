/// JSON Metadata Provider - Reads metadata from asset JSON files
///
/// SOLE RESPONSIBILITY: Load and parse permissions/validation from JSON assets
///
/// This is the read-only implementation of MetadataProvider.
/// Reads from:
/// - assets/config/permissions.json
/// - assets/config/entity-metadata.json (SSOT for entities, fields, and validation)
///
/// USAGE:
/// ```dart
/// // Create instance
/// final provider = JsonMetadataProvider();
///
/// // Get permission matrix
/// final matrix = await provider.getPermissionMatrix('users');
/// ```
library;

import 'dart:convert';
import 'package:flutter/services.dart' show rootBundle;
import '../error_service.dart';
import 'metadata_provider.dart';
import 'metadata_types.dart';

/// Implementation that reads from JSON asset files
class JsonMetadataProvider implements MetadataProvider {
  // Cache for loaded JSON data with per-cache timestamps
  Map<String, dynamic>? _permissionsCache;
  Map<String, dynamic>? _entityMetadataCache;
  DateTime? _permissionsLoadedAt;
  DateTime? _entityMetadataLoadedAt;

  // Cache duration (5 minutes)
  static const _cacheDuration = Duration(minutes: 5);

  @override
  bool get isEditable => false;

  @override
  String get providerName => 'JsonMetadataProvider';

  // ===========================================================================
  // Permission Metadata
  // ===========================================================================

  @override
  Future<List<String>> getRoles() async {
    final json = await _loadPermissions();
    final roles = json['roles'] as Map<String, dynamic>? ?? {};
    return roles.keys.toList();
  }

  @override
  Future<List<RoleSummary>> getRoleSummaries() async {
    final json = await _loadPermissions();
    final roles = json['roles'] as Map<String, dynamic>? ?? {};
    return roles.entries
        .map(
          (e) => RoleSummary.fromJson(e.key, e.value as Map<String, dynamic>),
        )
        .toList()
      ..sort(
        (a, b) => b.priority.compareTo(a.priority),
      ); // Highest priority first
  }

  @override
  Future<List<String>> getResources() async {
    final json = await _loadPermissions();
    final resources = json['resources'] as Map<String, dynamic>? ?? {};
    return resources.keys.toList();
  }

  @override
  Future<List<ResourceSummary>> getResourceSummaries() async {
    final json = await _loadPermissions();
    final resources = json['resources'] as Map<String, dynamic>? ?? {};

    return resources.entries.map((e) {
      final resourceJson = e.value as Map<String, dynamic>;
      final permissionsJson =
          resourceJson['permissions'] as Map<String, dynamic>? ?? {};
      return ResourceSummary(
        name: e.key,
        description: resourceJson['description'] as String? ?? '',
        operations: permissionsJson.keys.toList(),
      );
    }).toList();
  }

  @override
  Future<PermissionMatrix?> getPermissionMatrix(String resource) async {
    final json = await _loadPermissions();
    final resources = json['resources'] as Map<String, dynamic>? ?? {};
    final resourceJson = resources[resource] as Map<String, dynamic>?;

    if (resourceJson == null) return null;

    final roles = await getRoles();
    final rolePriorities = await _getRolePriorities();

    return PermissionMatrix.fromResourceConfig(
      entity: resource,
      roles: roles,
      rolePriorities: rolePriorities,
      resourceJson: resourceJson,
    );
  }

  @override
  Future<Map<String, PermissionMatrix>> getAllPermissionMatrices() async {
    final resources = await getResources();
    final result = <String, PermissionMatrix>{};

    for (final resource in resources) {
      final matrix = await getPermissionMatrix(resource);
      if (matrix != null) {
        result[resource] = matrix;
      }
    }

    return result;
  }

  @override
  Future<Map<String, dynamic>> getRawPermissions() async {
    return await _loadPermissions();
  }

  Future<Map<String, int>> _getRolePriorities() async {
    final json = await _loadPermissions();
    final roles = json['roles'] as Map<String, dynamic>? ?? {};
    final priorities = <String, int>{};

    for (final entry in roles.entries) {
      final roleJson = entry.value as Map<String, dynamic>;
      priorities[entry.key] = roleJson['priority'] as int? ?? 0;
    }

    return priorities;
  }

  // ===========================================================================
  // Validation Metadata
  // ===========================================================================
  // All validation rules are derived from entity-metadata.json (SSOT).
  // There is no separate validation-rules.json file.

  /// Meta keys to skip when iterating entity metadata
  static const _metaKeys = {
    r'$schema',
    r'$id',
    'title',
    'description',
    'version',
    'lastModified',
  };

  @override
  Future<List<String>> getValidationFields() async {
    // Collect all unique field names across all entities
    final entityMetadata = await _loadEntityMetadata();
    final allFields = <String>{};

    for (final entry in entityMetadata.entries) {
      // Skip schema metadata keys and non-entity values
      if (_metaKeys.contains(entry.key)) continue;
      if (entry.value is! Map<String, dynamic>) continue;

      final entityJson = entry.value as Map<String, dynamic>;
      final fields = entityJson['fields'] as Map<String, dynamic>? ?? {};
      allFields.addAll(fields.keys);
    }

    return allFields.toList()..sort();
  }

  @override
  Future<FieldValidation?> getFieldValidation(String fieldName) async {
    // Search for the field across all entities and return the first match
    final entityMetadata = await _loadEntityMetadata();

    for (final entry in entityMetadata.entries) {
      // Skip schema metadata keys and non-entity values
      if (_metaKeys.contains(entry.key)) continue;
      if (entry.value is! Map<String, dynamic>) continue;

      final entityJson = entry.value as Map<String, dynamic>;
      final fields = entityJson['fields'] as Map<String, dynamic>? ?? {};
      final fieldJson = fields[fieldName] as Map<String, dynamic>?;

      if (fieldJson != null) {
        return FieldValidation.fromJson(fieldName, fieldJson);
      }
    }

    return null;
  }

  @override
  Future<Map<String, FieldValidation>> getAllFieldValidations() async {
    // Collect all fields from all entities
    final entityMetadata = await _loadEntityMetadata();
    final result = <String, FieldValidation>{};

    for (final entry in entityMetadata.entries) {
      // Skip schema metadata keys and non-entity values
      if (_metaKeys.contains(entry.key)) continue;
      if (entry.value is! Map<String, dynamic>) continue;

      final entityJson = entry.value as Map<String, dynamic>;
      final fields = entityJson['fields'] as Map<String, dynamic>? ?? {};

      for (final fieldEntry in fields.entries) {
        // Don't overwrite if already exists (first entity wins)
        if (!result.containsKey(fieldEntry.key)) {
          result[fieldEntry.key] = FieldValidation.fromJson(
            fieldEntry.key,
            fieldEntry.value as Map<String, dynamic>,
          );
        }
      }
    }

    return result;
  }

  @override
  Future<Map<String, dynamic>> getRawValidation() async {
    // Return entity metadata as the validation source (SSOT)
    return await _loadEntityMetadata();
  }

  @override
  Future<EntityValidationRules?> getEntityValidationRules(String entity) async {
    // Get entity metadata - this is the SSOT for all fields and validation
    final entityMetadata = await _loadEntityMetadata();
    final entityJson = entityMetadata[entity] as Map<String, dynamic>?;

    if (entityJson == null) return null;

    // Get entity's field definitions directly from entity-metadata.json
    final entityFields = entityJson['fields'] as Map<String, dynamic>? ?? {};

    // Build field validations from entity fields
    final fields = <String, FieldValidation>{};

    for (final fieldEntry in entityFields.entries) {
      final fieldName = fieldEntry.key;
      final fieldJson = fieldEntry.value as Map<String, dynamic>;

      fields[fieldName] = FieldValidation.fromJson(fieldName, fieldJson);
    }

    return EntityValidationRules(entity: entity, fields: fields);
  }

  // ===========================================================================
  // Entity Metadata
  // ===========================================================================

  @override
  Future<List<String>> getEntityNames() async {
    final json = await _loadEntityMetadata();
    // Filter out schema metadata keys
    return json.keys
        .where(
          (k) =>
              !k.startsWith(r'$') &&
              k != 'title' &&
              k != 'description' &&
              k != 'version' &&
              k != 'lastModified',
        )
        .toList();
  }

  @override
  Future<Map<String, dynamic>> getRawEntityMetadata() async {
    return await _loadEntityMetadata();
  }

  // ===========================================================================
  // Cache Management
  // ===========================================================================

  @override
  void clearCache() {
    _permissionsCache = null;
    _entityMetadataCache = null;
    _permissionsLoadedAt = null;
    _entityMetadataLoadedAt = null;
    ErrorService.logDebug('[$providerName] Cache cleared');
  }

  @override
  Future<void> reload() async {
    clearCache();
    await Future.wait([_loadPermissions(), _loadEntityMetadata()]);
    ErrorService.logDebug('[$providerName] All data reloaded');
  }

  bool _isCacheValid(DateTime? loadedAt) {
    if (loadedAt == null) return false;
    return DateTime.now().difference(loadedAt) < _cacheDuration;
  }

  // ===========================================================================
  // Private Loading Methods
  // ===========================================================================

  Future<Map<String, dynamic>> _loadPermissions() async {
    if (_permissionsCache != null && _isCacheValid(_permissionsLoadedAt)) {
      return _permissionsCache!;
    }

    try {
      final jsonString = await rootBundle.loadString(
        'assets/config/permissions.json',
      );
      _permissionsCache = json.decode(jsonString) as Map<String, dynamic>;
      _permissionsLoadedAt = DateTime.now();
      ErrorService.logDebug('[$providerName] Loaded permissions.json');
      return _permissionsCache!;
    } catch (e, stackTrace) {
      ErrorService.logError(
        '[$providerName] Failed to load permissions.json',
        error: e,
        stackTrace: stackTrace,
      );
      rethrow;
    }
  }

  Future<Map<String, dynamic>> _loadEntityMetadata() async {
    if (_entityMetadataCache != null &&
        _isCacheValid(_entityMetadataLoadedAt)) {
      return _entityMetadataCache!;
    }

    try {
      final jsonString = await rootBundle.loadString(
        'assets/config/entity-metadata.json',
      );
      _entityMetadataCache = json.decode(jsonString) as Map<String, dynamic>;
      _entityMetadataLoadedAt = DateTime.now();
      ErrorService.logDebug('[$providerName] Loaded entity-metadata.json');
      return _entityMetadataCache!;
    } catch (e, stackTrace) {
      ErrorService.logError(
        '[$providerName] Failed to load entity-metadata.json',
        error: e,
        stackTrace: stackTrace,
      );
      rethrow;
    }
  }
}
