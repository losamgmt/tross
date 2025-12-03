/// Permission Configuration
///
/// Defines role hierarchy and permission matrix for RBAC (Role-Based Access Control).
///
/// ARCHITECTURE:
/// - Role hierarchy: Higher priority = more access
/// - Permission inheritance: If client can read, everyone can read
/// - Matrix-based: resource × operation → minimum required role priority
///
/// PHILOSOPHY (KISS):
/// - Configuration over code
/// - Single source of truth
/// - Easy to audit and modify
///
/// NOTE: This is a MIRROR of backend/config/permissions.js
/// Any changes here MUST be synced with backend!
library;

/// Role Hierarchy
/// Maps role names to their priority levels.
/// Higher priority = more access (admin = 5, client = 1)
const Map<String, int> roleHierarchy = {
  'admin': 5,
  'manager': 4,
  'dispatcher': 3,
  'technician': 2,
  'client': 1,
};

/// Permission Operations
/// Standard CRUD operations for all resources
class Operations {
  static const String create = 'create';
  static const String read = 'read';
  static const String update = 'update';
  static const String delete = 'delete';
}

/// Permission Matrix
///
/// Defines the MINIMUM role priority required for each operation on each resource.
///
/// Structure:
/// {
///   resource: {
///     operation: minimumRolePriority
///   }
/// }
///
/// Example:
/// - users.create: 5 (admin) → Only admins can create users
/// - users.read: 2 (technician) → Technicians and above can read users
///
/// IMPORTANT: Due to hierarchy, if a role has permission, all higher roles do too.
const Map<String, Map<String, int>> permissions = {
  // User Management
  'users': {
    'create': 5, // admin - Only admins create users
    'read': 2, // technician - Technicians+ can view users
    'update': 5, // admin - Only admins update users
    'delete': 5, // admin - Only admins delete users
  },

  // Role Management
  'roles': {
    'create': 5, // admin - Only admins create roles
    'read': 4, // manager - Managers+ can view roles
    'update': 5, // admin - Only admins update roles
    'delete': 5, // admin - Only admins delete roles
  },

  // Work Orders (placeholder for future implementation)
  'work_orders': {
    'create': 3, // dispatcher - Dispatchers+ can create work orders
    'read': 1, // client - Everyone can read work orders
    'update': 2, // technician - Technicians+ can update work orders
    'delete': 4, // manager - Managers+ can delete work orders
  },

  // Audit Logs
  'audit_logs': {
    'create': 1, // client - Everyone creates audit logs (automatic)
    'read': 5, // admin - Only admins view audit logs
    'update': 5, // admin - Audit logs are immutable (but admin override)
    'delete': 5, // admin - Only admins delete old audit logs
  },
};

/// Get role priority by name
///
/// [roleName] - Role name (e.g., 'admin', 'client')
/// Returns role priority or null if role not found
int? getRolePriority(String? roleName) {
  if (roleName == null || roleName.isEmpty) {
    return null;
  }
  return roleHierarchy[roleName.toLowerCase()];
}

/// Check if a role has permission to perform an operation on a resource
///
/// [roleName] - User's role name (e.g., 'manager')
/// [resource] - Resource name (e.g., 'users', 'work_orders')
/// [operation] - Operation (create, read, update, delete)
/// Returns true if role has permission
///
/// Example:
/// ```dart
/// hasPermission('manager', 'users', 'read')  // true
/// hasPermission('client', 'users', 'delete') // false
/// hasPermission('admin', 'users', 'delete')  // true (admin has all)
/// ```
bool hasPermission(String? roleName, String? resource, String? operation) {
  // Validate inputs
  if (roleName == null ||
      roleName.isEmpty ||
      resource == null ||
      resource.isEmpty ||
      operation == null ||
      operation.isEmpty) {
    return false;
  }

  final userPriority = getRolePriority(roleName);
  if (userPriority == null) {
    return false; // Unknown role = no permission
  }

  // Check if resource exists in permissions
  final resourcePermissions = permissions[resource];
  if (resourcePermissions == null) {
    return false; // Unknown resource = no permission
  }

  // Get minimum required priority for this operation
  final requiredPriority = resourcePermissions[operation];
  if (requiredPriority == null) {
    return false; // Unknown operation = no permission
  }

  // User has permission if their priority >= required priority
  return userPriority >= requiredPriority;
}

/// Check if a user role meets or exceeds a minimum role requirement
///
/// [userRole] - User's role name
/// [requiredRole] - Minimum required role name
/// Returns true if user's role is sufficient
///
/// Example:
/// ```dart
/// hasMinimumRole('admin', 'manager')     // true (admin > manager)
/// hasMinimumRole('technician', 'admin')  // false (technician < admin)
/// hasMinimumRole('manager', 'manager')   // true (equal)
/// ```
bool hasMinimumRole(String? userRole, String? requiredRole) {
  final userPriority = getRolePriority(userRole);
  final requiredPriority = getRolePriority(requiredRole);

  if (userPriority == null || requiredPriority == null) {
    return false;
  }

  return userPriority >= requiredPriority;
}

/// Get all permissions for a given role
/// Returns a map of resources and operations the role can perform
///
/// [roleName] - Role name
/// Returns map of resource → operations list
///
/// Example:
/// ```dart
/// getRolePermissions('manager')
/// // Returns: { 'users': ['read'], 'roles': ['read'], 'work_orders': ['create', 'read', 'update', 'delete'], ... }
/// ```
Map<String, List<String>> getRolePermissions(String? roleName) {
  final userPriority = getRolePriority(roleName);
  if (userPriority == null) {
    return {};
  }

  final Map<String, List<String>> rolePermissions = {};

  // Check each resource
  permissions.forEach((resource, operations) {
    final List<String> allowedOperations = [];

    // Check each operation
    operations.forEach((operation, requiredPriority) {
      if (userPriority >= requiredPriority) {
        allowedOperations.add(operation);
      }
    });

    if (allowedOperations.isNotEmpty) {
      rolePermissions[resource] = allowedOperations;
    }
  });

  return rolePermissions;
}

/// Permission Service
/// Provides convenient methods for checking permissions in the UI
class PermissionService {
  /// Check if current user can perform operation on resource
  static bool canPerform(String? userRole, String resource, String operation) {
    return hasPermission(userRole, resource, operation);
  }

  /// Check if current user has minimum role level
  static bool meetsMinimumRole(String? userRole, String requiredRole) {
    return hasMinimumRole(userRole, requiredRole);
  }

  /// Check if user is admin
  static bool isAdmin(String? userRole) {
    return userRole?.toLowerCase() == 'admin';
  }

  /// Check if user is manager or above
  static bool isManager(String? userRole) {
    return hasMinimumRole(userRole, 'manager');
  }

  /// Check if user is dispatcher or above
  static bool isDispatcher(String? userRole) {
    return hasMinimumRole(userRole, 'dispatcher');
  }

  /// Check if user is technician or above
  static bool isTechnician(String? userRole) {
    return hasMinimumRole(userRole, 'technician');
  }

  /// Get all permissions for a role
  static Map<String, List<String>> getPermissionsFor(String? userRole) {
    return getRolePermissions(userRole);
  }

  /// Get role priority
  static int? getPriority(String? userRole) {
    return getRolePriority(userRole);
  }
}
