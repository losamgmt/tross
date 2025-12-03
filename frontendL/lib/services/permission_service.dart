/// Permission Service - Frontend permission validation
///
/// Mirrors backend permission matrix exactly (backend/config/permissions.js)
/// Provides pure functions for permission checks with zero side effects.
///
/// PHILOSOPHY:
/// - Configuration over code
/// - Single source of truth (matches backend)
/// - Easy to audit and test
/// - Type-safe with enums
library;

import '../models/permission.dart';

/// Permission Service
///
/// PURE FUNCTIONS - No state, no side effects, easily testable
///
/// Example:
/// ```dart
/// if (PermissionService.hasPermission('admin', ResourceType.users, CrudOperation.delete)) {
///   // Show delete button
/// }
/// ```
class PermissionService {
  // Private constructor - static class only
  PermissionService._();

  /// Permission Matrix (mirrors backend/config/permissions.js)
  ///
  /// Maps resource × operation → minimum required role priority
  static const Map<ResourceType, Map<CrudOperation, int>> _permissions = {
    ResourceType.users: {
      CrudOperation.create: 5, // admin
      CrudOperation.read: 1, // client+ (with row-level security)
      CrudOperation.update: 5, // admin
      CrudOperation.delete: 5, // admin
    },
    ResourceType.roles: {
      CrudOperation.create: 5, // admin
      CrudOperation.read: 4, // manager+
      CrudOperation.update: 5, // admin
      CrudOperation.delete: 5, // admin
    },
    ResourceType.workOrders: {
      CrudOperation.create: 3, // dispatcher+
      CrudOperation.read: 1, // client+ (everyone)
      CrudOperation.update: 2, // technician+
      CrudOperation.delete: 4, // manager+
    },
    ResourceType.auditLogs: {
      CrudOperation.create: 1, // everyone (automatic)
      CrudOperation.read: 5, // admin only
      CrudOperation.update: 5, // admin (immutable, but override)
      CrudOperation.delete: 5, // admin (cleanup old logs)
    },
  };

  /// Check if role has permission to perform operation on resource
  ///
  /// @param roleName - User's role ('admin', 'manager', etc.)
  /// @param resource - Resource type (users, roles, etc.)
  /// @param operation - CRUD operation (create, read, update, delete)
  /// @returns true if role has permission
  ///
  /// Example:
  /// ```dart
  /// PermissionService.hasPermission('manager', ResourceType.roles, CrudOperation.read); // true
  /// PermissionService.hasPermission('client', ResourceType.users, CrudOperation.delete); // false
  /// ```
  static bool hasPermission(
    String? roleName,
    ResourceType resource,
    CrudOperation operation,
  ) {
    // Validate inputs
    if (roleName == null || roleName.isEmpty) {
      return false; // No role = no permission
    }

    final userRole = UserRole.fromString(roleName);
    if (userRole == null) {
      return false; // Unknown role = no permission
    }

    // Get required priority for this resource × operation
    final resourcePermissions = _permissions[resource];
    if (resourcePermissions == null) {
      return false; // Unknown resource = no permission
    }

    final requiredPriority = resourcePermissions[operation];
    if (requiredPriority == null) {
      return false; // Unknown operation = no permission
    }

    // User has permission if their priority >= required priority
    return userRole.priority >= requiredPriority;
  }

  /// Get detailed permission check result with denial reason
  ///
  /// Useful for showing users WHY they can't perform an action
  ///
  /// Example:
  /// ```dart
  /// final result = PermissionService.checkPermission('client', ResourceType.users, CrudOperation.delete);
  /// if (!result.allowed) {
  ///   showError('Cannot delete users: ${result.denialReason}');
  /// }
  /// ```
  static PermissionResult checkPermission(
    String? roleName,
    ResourceType resource,
    CrudOperation operation,
  ) {
    if (roleName == null || roleName.isEmpty) {
      return const PermissionResult.denied(
        denialReason: 'No role assigned to user',
      );
    }

    final userRole = UserRole.fromString(roleName);
    if (userRole == null) {
      return PermissionResult.denied(denialReason: 'Unknown role: $roleName');
    }

    final resourcePermissions = _permissions[resource];
    if (resourcePermissions == null) {
      return PermissionResult.denied(
        denialReason: 'Unknown resource: $resource',
      );
    }

    final requiredPriority = resourcePermissions[operation];
    if (requiredPriority == null) {
      return PermissionResult.denied(
        denialReason: 'Unknown operation: $operation',
      );
    }

    if (userRole.priority < requiredPriority) {
      final minimumRole = UserRole.values.firstWhere(
        (r) => r.priority == requiredPriority,
      );

      return PermissionResult.denied(
        denialReason:
            'Minimum role required: ${minimumRole.name} (you have: ${userRole.name})',
        minimumRequired: minimumRole,
      );
    }

    return const PermissionResult.allowed();
  }

  /// Check if user's role meets or exceeds a minimum role requirement
  ///
  /// @param userRoleName - User's current role
  /// @param requiredRoleName - Minimum required role
  /// @returns true if user's role is sufficient
  ///
  /// Example:
  /// ```dart
  /// PermissionService.hasMinimumRole('admin', 'manager'); // true (admin > manager)
  /// PermissionService.hasMinimumRole('client', 'admin'); // false (client < admin)
  /// ```
  static bool hasMinimumRole(String? userRoleName, String? requiredRoleName) {
    if (userRoleName == null || requiredRoleName == null) {
      return false;
    }

    final userRole = UserRole.fromString(userRoleName);
    final requiredRole = UserRole.fromString(requiredRoleName);

    if (userRole == null || requiredRole == null) {
      return false;
    }

    return userRole.priority >= requiredRole.priority;
  }

  /// Get minimum role required for operation
  ///
  /// Returns null if resource/operation not found
  ///
  /// Example:
  /// ```dart
  /// final minRole = PermissionService.getMinimumRole(ResourceType.users, CrudOperation.delete);
  /// print(minRole); // 'admin'
  /// ```
  static UserRole? getMinimumRole(
    ResourceType resource,
    CrudOperation operation,
  ) {
    final resourcePermissions = _permissions[resource];
    if (resourcePermissions == null) return null;

    final requiredPriority = resourcePermissions[operation];
    if (requiredPriority == null) return null;

    try {
      return UserRole.values.firstWhere((r) => r.priority == requiredPriority);
    } catch (_) {
      return null;
    }
  }

  /// Get all operations user can perform on resource
  ///
  /// Returns list of allowed operations
  ///
  /// Example:
  /// ```dart
  /// final allowed = PermissionService.getAllowedOperations('manager', ResourceType.roles);
  /// print(allowed); // [CrudOperation.read] (manager can only read roles)
  /// ```
  static List<CrudOperation> getAllowedOperations(
    String? roleName,
    ResourceType resource,
  ) {
    if (roleName == null) return [];

    final userRole = UserRole.fromString(roleName);
    if (userRole == null) return [];

    final resourcePermissions = _permissions[resource];
    if (resourcePermissions == null) return [];

    return resourcePermissions.entries
        .where((entry) => userRole.priority >= entry.value)
        .map((entry) => entry.key)
        .toList();
  }

  /// Check if role can perform ANY operation on resource
  ///
  /// Useful for "can user access this screen at all?"
  ///
  /// Example:
  /// ```dart
  /// if (!PermissionService.canAccessResource('client', ResourceType.roles)) {
  ///   // Redirect to unauthorized page
  /// }
  /// ```
  static bool canAccessResource(String? roleName, ResourceType resource) {
    return getAllowedOperations(roleName, resource).isNotEmpty;
  }
}
