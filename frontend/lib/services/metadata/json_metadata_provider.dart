/// JSON Metadata Provider - Reads metadata from asset JSON files
///
/// SOLE RESPONSIBILITY: Load and parse permissions/validation from JSON assets
///
/// This is the read-only implementation of MetadataProvider.
/// Reads from:
/// - assets/config/permissions.json
/// - assets/config/validation-rules.json
/// - assets/config/entity-metadata.json
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
  // Cache for loaded JSON data
  Map<String, dynamic>? _permissionsCache;
  Map<String, dynamic>? _validationCache;
  Map<String, dynamic>? _entityMetadataCache;
  DateTime? _lastLoaded;

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

  @override
  Future<List<String>> getValidationFields() async {
    final json = await _loadValidation();
    final fields = json['fields'] as Map<String, dynamic>? ?? {};
    return fields.keys.toList();
  }

  @override
  Future<FieldValidation?> getFieldValidation(String fieldName) async {
    final json = await _loadValidation();
    final fields = json['fields'] as Map<String, dynamic>? ?? {};
    final fieldJson = fields[fieldName] as Map<String, dynamic>?;

    if (fieldJson == null) return null;
    return FieldValidation.fromJson(fieldName, fieldJson);
  }

  @override
  Future<Map<String, FieldValidation>> getAllFieldValidations() async {
    final json = await _loadValidation();
    final fields = json['fields'] as Map<String, dynamic>? ?? {};
    final result = <String, FieldValidation>{};

    for (final entry in fields.entries) {
      result[entry.key] = FieldValidation.fromJson(
        entry.key,
        entry.value as Map<String, dynamic>,
      );
    }

    return result;
  }

  @override
  Future<Map<String, dynamic>> getRawValidation() async {
    return await _loadValidation();
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
    _validationCache = null;
    _entityMetadataCache = null;
    _lastLoaded = null;
    ErrorService.logDebug('[$providerName] Cache cleared');
  }

  @override
  Future<void> reload() async {
    clearCache();
    await Future.wait([
      _loadPermissions(),
      _loadValidation(),
      _loadEntityMetadata(),
    ]);
    ErrorService.logDebug('[$providerName] All data reloaded');
  }

  bool get _isCacheValid {
    if (_lastLoaded == null) return false;
    return DateTime.now().difference(_lastLoaded!) < _cacheDuration;
  }

  // ===========================================================================
  // Private Loading Methods
  // ===========================================================================

  Future<Map<String, dynamic>> _loadPermissions() async {
    if (_permissionsCache != null && _isCacheValid) {
      return _permissionsCache!;
    }

    try {
      final jsonString = await rootBundle.loadString(
        'assets/config/permissions.json',
      );
      _permissionsCache = json.decode(jsonString) as Map<String, dynamic>;
      _lastLoaded = DateTime.now();
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

  Future<Map<String, dynamic>> _loadValidation() async {
    if (_validationCache != null && _isCacheValid) {
      return _validationCache!;
    }

    try {
      final jsonString = await rootBundle.loadString(
        'assets/config/validation-rules.json',
      );
      _validationCache = json.decode(jsonString) as Map<String, dynamic>;
      _lastLoaded = DateTime.now();
      ErrorService.logDebug('[$providerName] Loaded validation-rules.json');
      return _validationCache!;
    } catch (e, stackTrace) {
      ErrorService.logError(
        '[$providerName] Failed to load validation-rules.json',
        error: e,
        stackTrace: stackTrace,
      );
      rethrow;
    }
  }

  Future<Map<String, dynamic>> _loadEntityMetadata() async {
    if (_entityMetadataCache != null && _isCacheValid) {
      return _entityMetadataCache!;
    }

    try {
      final jsonString = await rootBundle.loadString(
        'assets/config/entity-metadata.json',
      );
      _entityMetadataCache = json.decode(jsonString) as Map<String, dynamic>;
      _lastLoaded = DateTime.now();
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
