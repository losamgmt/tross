/// Permission Model - Enums for type-safe permission checks
///
/// **IMPORTANT: Permission Enforcement Strategy**
///
/// This model provides TYPE-SAFE enums for permissions, but does NOT
/// enforce them. Permission enforcement happens **backend-side** via
/// middleware in `backend/middleware/auth.js` using the permission
/// matrix defined in `backend/config/permissions.js`.
///
/// **Frontend Role:**
/// - Use these enums for UI logic (show/hide buttons, enable/disable features)
/// - Prevent unnecessary API calls that would fail permission checks
/// - Provide better UX by hiding unavailable actions
///
/// **Backend Role:**
/// - Source of truth for ALL permission enforcement
/// - Validates JWT token + role + requested resource/operation
/// - Returns 403 Forbidden if permission denied
///
/// **Security:**
/// Frontend checks are for UX only - never rely on them for security!
/// Always validate permissions on backend before allowing any action.
///
/// Provides strongly-typed resources and operations that mirror
/// the backend permission matrix exactly.
///
/// Last synced: 2025-11-07 (Added permission enforcement documentation)
library;

/// CRUD Operations
/// Standard operations for all resources
enum CrudOperation {
  create,
  read,
  update,
  delete;

  @override
  String toString() => name;
}

/// System Resources
/// All resources that can be permission-controlled
enum ResourceType {
  users,
  roles,
  workOrders('work_orders'),
  auditLogs('audit_logs'),
  projects, // Future
  tasks, // Future
  invoices, // Future
  documents; // Future

  final String? _value;
  const ResourceType([this._value]);

  /// Get backend-compatible string (snake_case)
  String toBackendString() => _value ?? name;

  @override
  String toString() => _value ?? name;
}

/// User Roles (matches backend hierarchy)
enum UserRole {
  admin(5),
  manager(4),
  dispatcher(3),
  technician(2),
  client(1);

  final int priority;
  const UserRole(this.priority);

  /// Get role by name (case-insensitive)
  static UserRole? fromString(String? roleName) {
    if (roleName == null) return null;
    try {
      return UserRole.values.firstWhere(
        (r) => r.name.toLowerCase() == roleName.toLowerCase(),
      );
    } catch (_) {
      return null;
    }
  }

  @override
  String toString() => name;
}

/// Permission Check Result
/// Provides detailed information about permission denial
class PermissionResult {
  final bool allowed;
  final String? denialReason;
  final UserRole? minimumRequired;

  const PermissionResult.allowed()
    : allowed = true,
      denialReason = null,
      minimumRequired = null;

  const PermissionResult.denied({
    required this.denialReason,
    this.minimumRequired,
  }) : allowed = false;

  @override
  String toString() => allowed ? 'Allowed' : 'Denied: $denialReason';
}
