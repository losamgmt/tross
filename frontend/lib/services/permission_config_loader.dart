/// Permission Configuration Loader
///
/// Dynamically loads permissions from assets/config/permissions.json
/// Ensures frontend-backend parity by using same configuration
///
/// BENEFITS:
/// - Change permissions without rebuilding app
/// - Single source of truth shared with backend
/// - Runtime validation prevents invalid configs
/// - Type-safe access with Dart models
library;

import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart' show rootBundle;
import '../utils/helpers/string_helper.dart';
import 'error_service.dart';

/// Expected minimum version of permissions.json
/// Bump this when adding new resources that the frontend depends on
const String kExpectedPermissionVersion = '3.0.1';

/// Required resources that MUST exist in permissions.json
/// If any are missing, the config is considered invalid/stale
const List<String> kRequiredResources = [
  'users',
  'roles',
  'work_orders',
  'preferences',
  'dashboard',
  'admin_panel',
];

/// Permission Configuration Model
class PermissionConfig {
  final Map<String, RoleConfig> roles;
  final Map<String, ResourceConfig> resources;
  final String version;
  final DateTime lastModified;

  const PermissionConfig({
    required this.roles,
    required this.resources,
    required this.version,
    required this.lastModified,
  });

  factory PermissionConfig.fromJson(Map<String, dynamic> json) {
    final rolesMap = <String, RoleConfig>{};
    final rolesJson = json['roles'] as Map<String, dynamic>;
    for (final entry in rolesJson.entries) {
      rolesMap[entry.key] = RoleConfig.fromJson(
        entry.value as Map<String, dynamic>,
      );
    }

    final resourcesMap = <String, ResourceConfig>{};
    final resourcesJson = json['resources'] as Map<String, dynamic>;
    for (final entry in resourcesJson.entries) {
      resourcesMap[entry.key] = ResourceConfig.fromJson(
        entry.value as Map<String, dynamic>,
      );
    }

    return PermissionConfig(
      roles: rolesMap,
      resources: resourcesMap,
      version: json['version'] as String? ?? '1.0.0',
      lastModified: DateTime.parse(
        json['lastModified'] as String? ?? DateTime.now().toIso8601String(),
      ),
    );
  }

  /// Get role priority by name (case-insensitive)
  int? getRolePriority(String? roleName) {
    if (roleName == null || roleName.isEmpty) {
      debugPrint('[PermConfig] getRolePriority: roleName is null/empty');
      return null;
    }
    final normalized = StringHelper.toLowerCase(roleName);
    final priority = roles[normalized]?.priority;
    if (priority == null) {
      debugPrint(
        '[PermConfig] getRolePriority: role "$normalized" not found. Available: ${roles.keys.join(', ')}',
      );
    }
    return priority;
  }

  /// Get minimum priority required for operation on resource
  int? getMinimumPriority(String resource, String operation) {
    final resourceConfig = resources[resource];
    if (resourceConfig == null) {
      debugPrint(
        '[PermConfig] getMinimumPriority: resource "$resource" not found. Available: ${resources.keys.join(', ')}',
      );
      return null;
    }

    final permission = resourceConfig.permissions[operation];
    if (permission == null) {
      debugPrint(
        '[PermConfig] getMinimumPriority: operation "$operation" not found for resource "$resource". Available: ${resourceConfig.permissions.keys.join(', ')}',
      );
      return null;
    }
    return permission.minimumPriority;
  }

  /// Get minimum role required for operation on resource
  String? getMinimumRole(String resource, String operation) {
    final resourceConfig = resources[resource];
    if (resourceConfig == null) return null;

    final permission = resourceConfig.permissions[operation];
    return permission?.minimumRole;
  }

  /// Get row-level security policy for role and resource
  String? getRowLevelSecurity(String? roleName, String resource) {
    if (roleName == null || roleName.isEmpty) return null;

    final resourceConfig = resources[resource];
    if (resourceConfig == null || resourceConfig.rowLevelSecurity == null) {
      return null;
    }

    final normalized = StringHelper.toLowerCase(roleName);
    return resourceConfig.rowLevelSecurity![normalized];
  }
}

/// Role Configuration
class RoleConfig {
  final int priority;
  final String description;

  const RoleConfig({required this.priority, required this.description});

  factory RoleConfig.fromJson(Map<String, dynamic> json) {
    return RoleConfig(
      priority: json['priority'] as int,
      description: json['description'] as String,
    );
  }
}

/// Resource Configuration
class ResourceConfig {
  final String description;
  final Map<String, String>? rowLevelSecurity;
  final Map<String, PermissionDetail> permissions;

  const ResourceConfig({
    required this.description,
    required this.rowLevelSecurity,
    required this.permissions,
  });

  factory ResourceConfig.fromJson(Map<String, dynamic> json) {
    final permissionsMap = <String, PermissionDetail>{};
    final permissionsJson = json['permissions'] as Map<String, dynamic>;
    for (final entry in permissionsJson.entries) {
      permissionsMap[entry.key] = PermissionDetail.fromJson(
        entry.value as Map<String, dynamic>,
      );
    }

    Map<String, String>? rlsMap;
    if (json['rowLevelSecurity'] != null) {
      final rlsJson = json['rowLevelSecurity'] as Map<String, dynamic>;
      rlsMap = rlsJson.map((k, v) => MapEntry(k, v as String));
    }

    return ResourceConfig(
      description: json['description'] as String,
      rowLevelSecurity: rlsMap,
      permissions: permissionsMap,
    );
  }
}

/// Permission Detail
class PermissionDetail {
  final String minimumRole;
  final int minimumPriority;
  final String description;

  const PermissionDetail({
    required this.minimumRole,
    required this.minimumPriority,
    required this.description,
  });

  factory PermissionDetail.fromJson(Map<String, dynamic> json) {
    return PermissionDetail(
      minimumRole: json['minimumRole'] as String,
      minimumPriority: json['minimumPriority'] as int,
      description: json['description'] as String,
    );
  }
}

/// Permission Configuration Loader
///
/// Singleton that loads and caches permission configuration
///
/// Example:
/// ```dart
/// final config = await PermissionConfigLoader.load();
/// final canRead = config.getRolePriority('admin')! >= config.getMinimumPriority('users', 'read')!;
/// ```
class PermissionConfigLoader {
  static PermissionConfig? _cached;
  static DateTime? _loadedAt;

  /// Load permission configuration from assets
  ///
  /// Uses cache if available and not expired
  /// Set [forceReload] to skip cache
  static Future<PermissionConfig> load({bool forceReload = false}) async {
    // Return cache if valid (within 5 minutes)
    if (!forceReload && _cached != null && _loadedAt != null) {
      final age = DateTime.now().difference(_loadedAt!);
      if (age.inMinutes < 5) {
        return _cached!;
      }
    }

    try {
      // Load from assets
      debugPrint('[PermConfigLoader] Loading permissions.json from assets...');
      final jsonString = await rootBundle.loadString(
        'assets/config/permissions.json',
      );
      debugPrint(
        '[PermConfigLoader] Asset loaded, size: ${jsonString.length} bytes',
      );

      final jsonData = json.decode(jsonString) as Map<String, dynamic>;

      // Validate structure and required resources
      _validateConfig(jsonData);
      final config = PermissionConfig.fromJson(jsonData);

      // Validate version compatibility
      _validateVersion(config.version);

      // Validate all required resources exist
      _validateRequiredResources(config);

      // Cache and return
      _cached = config;
      _loadedAt = DateTime.now();

      debugPrint('[PermConfigLoader] ✓ Config loaded successfully');
      debugPrint('[PermConfigLoader]   version: ${config.version}');
      debugPrint('[PermConfigLoader]   roles: ${config.roles.keys.join(', ')}');
      debugPrint(
        '[PermConfigLoader]   resources: ${config.resources.keys.join(', ')}',
      );

      ErrorService.logInfo(
        '[Permissions] Loaded config',
        context: {
          'version': config.version,
          'roles': config.roles.length,
          'resources': config.resources.length,
          'resourceKeys': config.resources.keys.toList(),
        },
      );

      return config;
    } catch (e, stackTrace) {
      debugPrint('[PermConfigLoader] ✗ FAILED TO LOAD: $e');
      ErrorService.logError(
        '[Permissions] Failed to load',
        error: e,
        stackTrace: stackTrace,
      );
      rethrow;
    }
  }

  /// Validate config version is compatible
  static void _validateVersion(String loadedVersion) {
    // Parse version components (e.g., "3.0.1" -> [3, 0, 1])
    final loaded = loadedVersion.split('.').map(int.tryParse).toList();
    final expected = kExpectedPermissionVersion
        .split('.')
        .map(int.tryParse)
        .toList();

    if (loaded.length < 2 || expected.length < 2) {
      debugPrint(
        '[PermConfigLoader] WARNING: Could not parse version "$loadedVersion"',
      );
      return;
    }

    // Check major.minor compatibility (patch can differ)
    final loadedMajor = loaded[0] ?? 0;
    final loadedMinor = loaded[1] ?? 0;
    final expectedMajor = expected[0] ?? 0;
    final expectedMinor = expected[1] ?? 0;

    if (loadedMajor < expectedMajor ||
        (loadedMajor == expectedMajor && loadedMinor < expectedMinor)) {
      // WARNING only - don't crash the app, just log loudly
      final message =
          'STALE CONFIG: permissions.json v$loadedVersion < required v$kExpectedPermissionVersion. '
          'CDN may be caching old version. Try Ctrl+Shift+R.';
      debugPrint('[PermConfigLoader] ⚠️ WARNING: $message');
      ErrorService.logWarning('[Permissions] $message');
      // Continue anyway - better to show something than blank page
    } else {
      debugPrint(
        '[PermConfigLoader] ✓ Version check passed: $loadedVersion >= $kExpectedPermissionVersion',
      );
    }
  }

  /// Validate all required resources exist
  static void _validateRequiredResources(PermissionConfig config) {
    final missing = <String>[];
    for (final resource in kRequiredResources) {
      if (!config.resources.containsKey(resource)) {
        missing.add(resource);
      }
    }

    if (missing.isNotEmpty) {
      // WARNING only - don't crash the app, just log loudly
      final message =
          'Missing resources: ${missing.join(', ')}. Found: ${config.resources.keys.join(', ')}. '
          'CDN may be caching old version. Try Ctrl+Shift+R.';
      debugPrint('[PermConfigLoader] ⚠️ WARNING: $message');
      ErrorService.logWarning('[Permissions] $message');
      // Continue anyway - better to show something than blank page
    } else {
      debugPrint(
        '[PermConfigLoader] ✓ All ${kRequiredResources.length} required resources present',
      );
    }
  }

  /// Validate configuration structure
  static void _validateConfig(Map<String, dynamic> json) {
    if (json['roles'] == null || json['roles'] is! Map) {
      throw Exception('Missing or invalid "roles" object');
    }
    if (json['resources'] == null || json['resources'] is! Map) {
      throw Exception('Missing or invalid "resources" object');
    }

    // Validate role priorities are unique
    final roles = json['roles'] as Map<String, dynamic>;
    final priorities = <int>{};
    for (final entry in roles.entries) {
      final roleConfig = entry.value as Map<String, dynamic>;
      final priority = roleConfig['priority'] as int?;

      if (priority == null || priority < 1) {
        throw Exception('Invalid priority for role "${entry.key}"');
      }

      if (priorities.contains(priority)) {
        throw Exception(
          'Duplicate priority $priority - each role must have unique priority',
        );
      }

      priorities.add(priority);
    }

    // Validate resources have all CRUD operations
    final resources = json['resources'] as Map<String, dynamic>;
    for (final entry in resources.entries) {
      final resourceConfig = entry.value as Map<String, dynamic>;
      final permissions =
          resourceConfig['permissions'] as Map<String, dynamic>?;

      if (permissions == null) {
        throw Exception('Missing permissions for resource "${entry.key}"');
      }

      for (final op in ['create', 'read', 'update', 'delete']) {
        if (!permissions.containsKey(op)) {
          throw Exception(
            'Missing "$op" permission for resource "${entry.key}"',
          );
        }
      }
    }

    ErrorService.logInfo('[Permissions] Configuration validation passed');
  }

  /// Clear cache (useful for testing)
  static void clearCache() {
    _cached = null;
    _loadedAt = null;
  }
}
