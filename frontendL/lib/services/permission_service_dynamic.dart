/// Permission Service - Dynamic Frontend Permission Validation
///
/// Loads permissions from assets/config/permissions.json (shared with backend)
/// Provides pure functions for permission checks with zero side effects.
///
/// PHILOSOPHY:
/// - Data-driven configuration (no hardcoded permissions)
/// - Single source of truth (backend + frontend share same config)
/// - Easy to audit and test
/// - Type-safe with enums
///
/// USAGE:
/// ```dart
/// // Initialize once at app startup
/// await PermissionService.initialize();
///
/// // Use anywhere
/// if (PermissionService.hasPermission('admin', ResourceType.users, CrudOperation.delete)) {
///   // Show delete button
/// }
/// ```
library;

import '../models/permission.dart';
import 'permission_config_loader.dart';

/// Permission Service
///
/// PURE FUNCTIONS - No state (except cached config), no side effects, easily testable
class PermissionService {
  // Private constructor - static class only
  PermissionService._();

  /// Cached permission configuration
  static PermissionConfig? _config;

  /// Initialize permission service (call once at app startup)
  ///
  /// Example:
  /// ```dart
  /// void main() async {
  ///   WidgetsFlutterBinding.ensureInitialized();
  ///   await PermissionService.initialize();
  ///   runApp(MyApp());
  /// }
  /// ```
  static Future<void> initialize({bool forceReload = false}) async {
    _config = await PermissionConfigLoader.load(forceReload: forceReload);
  }

  /// Get cached config (throws if not initialized)
  static PermissionConfig get _ensureConfig {
    if (_config == null) {
      throw StateError(
        'PermissionService not initialized. Call PermissionService.initialize() first.',
      );
    }
    return _config!;
  }

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

    final config = _ensureConfig;
    final userPriority = config.getRolePriority(roleName);
    if (userPriority == null) {
      return false; // Unknown role = no permission
    }

    // Get minimum priority required for operation
    final resourceKey = resource.toBackendString();
    final operationKey = operation.toString();
    final requiredPriority = config.getMinimumPriority(
      resourceKey,
      operationKey,
    );

    if (requiredPriority == null) {
      return false; // Unknown permission = no permission
    }

    // User priority must be >= required priority
    return userPriority >= requiredPriority;
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

    final config = _ensureConfig;
    final userPriority = config.getRolePriority(roleName);
    if (userPriority == null) {
      return PermissionResult.denied(denialReason: 'Unknown role: $roleName');
    }

    final resourceKey = resource.toBackendString();
    final operationKey = operation.toString();
    final requiredPriority = config.getMinimumPriority(
      resourceKey,
      operationKey,
    );
    final minimumRole = config.getMinimumRole(resourceKey, operationKey);

    if (requiredPriority == null || minimumRole == null) {
      return PermissionResult.denied(
        denialReason:
            'Permission not defined for ${resource.toString()} ${operation.toString()}',
      );
    }

    if (userPriority >= requiredPriority) {
      return const PermissionResult.allowed();
    }

    return PermissionResult.denied(
      denialReason: 'Requires $minimumRole role or higher',
    );
  }

  /// Check if user role >= required role
  ///
  /// Useful for broad role checks like "is manager or above?"
  ///
  /// Example:
  /// ```dart
  /// if (PermissionService.hasMinimumRole('dispatcher', UserRole.manager)) {
  ///   // dispatcher is below manager, returns false
  /// }
  /// ```
  static bool hasMinimumRole(String? userRoleName, UserRole requiredRole) {
    if (userRoleName == null || userRoleName.isEmpty) {
      return false;
    }

    final config = _ensureConfig;
    final userPriority = config.getRolePriority(userRoleName);
    if (userPriority == null) {
      return false;
    }

    return userPriority >= requiredRole.priority;
  }

  /// Get minimum role required for operation
  ///
  /// Useful for showing permission requirements in UI
  ///
  /// Example:
  /// ```dart
  /// final minRole = PermissionService.getMinimumRole(ResourceType.users, CrudOperation.delete);
  /// print('Requires: ${minRole?.toString() ?? 'unknown'}'); // 'admin'
  /// ```
  static UserRole? getMinimumRole(
    ResourceType resource,
    CrudOperation operation,
  ) {
    final config = _ensureConfig;
    final resourceKey = resource.toBackendString();
    final operationKey = operation.toString();
    final minimumRoleName = config.getMinimumRole(resourceKey, operationKey);

    if (minimumRoleName == null) {
      return null;
    }

    return UserRole.fromString(minimumRoleName);
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
    if (roleName == null || roleName.isEmpty) {
      return [];
    }

    final config = _ensureConfig;
    final userPriority = config.getRolePriority(roleName);
    if (userPriority == null) {
      return [];
    }

    final allowed = <CrudOperation>[];
    for (final operation in CrudOperation.values) {
      if (hasPermission(roleName, resource, operation)) {
        allowed.add(operation);
      }
    }

    return allowed;
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

  /// Get row-level security policy for user's role and resource
  ///
  /// Returns policy like 'own_record_only', 'all_records', 'assigned_only', etc.
  ///
  /// Example:
  /// ```dart
  /// final policy = PermissionService.getRowLevelSecurity('client', ResourceType.users);
  /// if (policy == 'own_record_only') {
  ///   // Filter users WHERE id = currentUserId
  /// }
  /// ```
  static String? getRowLevelSecurity(String? roleName, ResourceType resource) {
    if (roleName == null || roleName.isEmpty) {
      return null;
    }

    final config = _ensureConfig;
    final resourceKey = resource.toBackendString();
    return config.getRowLevelSecurity(roleName, resourceKey);
  }

  /// Reload permissions from config (useful for hot-reload during development)
  ///
  /// Example:
  /// ```dart
  /// await PermissionService.reload(); // Re-read from assets
  /// ```
  static Future<void> reload() async {
    await initialize(forceReload: true);
  }

  /// Get permission configuration (for debugging/admin UI)
  ///
  /// Returns the full loaded configuration object
  static PermissionConfig? get config => _config;
}
