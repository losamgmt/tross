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
import 'package:flutter/foundation.dart' show debugPrint;
import 'package:flutter/services.dart' show rootBundle;
import '../utils/helpers/string_helper.dart';

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
    if (roleName == null || roleName.isEmpty) return null;
    final normalized = StringHelper.toLowerCase(roleName);
    return roles[normalized]?.priority;
  }

  /// Get minimum priority required for operation on resource
  int? getMinimumPriority(String resource, String operation) {
    final resourceConfig = resources[resource];
    if (resourceConfig == null) return null;

    final permission = resourceConfig.permissions[operation];
    return permission?.minimumPriority;
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
      final jsonString = await rootBundle.loadString(
        'assets/config/permissions.json',
      );
      final jsonData = json.decode(jsonString) as Map<String, dynamic>;

      // Validate and parse
      _validateConfig(jsonData);
      final config = PermissionConfig.fromJson(jsonData);

      // Cache and return
      _cached = config;
      _loadedAt = DateTime.now();

      debugPrint('[Permissions] ✅ Loaded permission config v${config.version}');
      debugPrint('[Permissions] 📊 Roles: ${config.roles.length}');
      debugPrint('[Permissions] 📊 Resources: ${config.resources.length}');

      return config;
    } catch (e) {
      debugPrint('[Permissions] ❌ Failed to load permissions: $e');
      rethrow;
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

    debugPrint('[Permissions] ✅ Configuration validation passed');
  }

  /// Clear cache (useful for testing)
  static void clearCache() {
    _cached = null;
    _loadedAt = null;
  }
}
