/// Role Test Fixtures
///
/// Provides mock role data for testing
library;

/// Mock role data for testing
class RoleFixtures {
  /// Admin role fixture
  static const Map<String, dynamic> admin = {
    'id': 1,
    'name': 'admin',
    'description': 'Full system access and control',
    'can_manage_users': true,
    'can_manage_roles': true,
    'can_view_audit_logs': true,
    'created_at': '2024-01-01T00:00:00Z',
    'updated_at': '2024-01-01T00:00:00Z',
  };

  /// Manager role fixture
  static const Map<String, dynamic> manager = {
    'id': 2,
    'name': 'manager',
    'description': 'Can manage users and view reports',
    'can_manage_users': true,
    'can_manage_roles': false,
    'can_view_audit_logs': true,
    'created_at': '2024-01-01T00:00:00Z',
    'updated_at': '2024-01-01T00:00:00Z',
  };

  /// User role fixture
  static const Map<String, dynamic> user = {
    'id': 3,
    'name': 'user',
    'description': 'Standard user access',
    'can_manage_users': false,
    'can_manage_roles': false,
    'can_view_audit_logs': false,
    'created_at': '2024-01-01T00:00:00Z',
    'updated_at': '2024-01-01T00:00:00Z',
  };

  /// Viewer role fixture
  static const Map<String, dynamic> viewer = {
    'id': 4,
    'name': 'viewer',
    'description': 'Read-only access',
    'can_manage_users': false,
    'can_manage_roles': false,
    'can_view_audit_logs': false,
    'created_at': '2024-01-01T00:00:00Z',
    'updated_at': '2024-01-01T00:00:00Z',
  };

  /// List of all role fixtures
  static const List<Map<String, dynamic>> all = [admin, manager, user, viewer];

  /// Get role by name
  static Map<String, dynamic> byName(String name) {
    switch (name.toLowerCase()) {
      case 'admin':
        return admin;
      case 'manager':
        return manager;
      case 'viewer':
        return viewer;
      case 'user':
      default:
        return user;
    }
  }

  /// Get role by id
  static Map<String, dynamic>? byId(int id) {
    try {
      return all.firstWhere((role) => role['id'] == id);
    } catch (e) {
      return null;
    }
  }

  /// Get roles that can manage users
  static List<Map<String, dynamic>> canManageUsers() {
    return all.where((role) => role['can_manage_users'] == true).toList();
  }

  /// Get roles that can manage roles
  static List<Map<String, dynamic>> canManageRoles() {
    return all.where((role) => role['can_manage_roles'] == true).toList();
  }

  /// Get roles that can view audit logs
  static List<Map<String, dynamic>> canViewAuditLogs() {
    return all.where((role) => role['can_view_audit_logs'] == true).toList();
  }
}
