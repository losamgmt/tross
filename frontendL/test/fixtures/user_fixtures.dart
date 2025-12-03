/// User Test Fixtures
///
/// Provides mock user data for testing
library;

/// Mock user data for testing
class UserFixtures {
  /// Admin user fixture
  static const Map<String, dynamic> admin = {
    'id': 1,
    'name': 'Admin User',
    'email': 'admin@trossapp.com',
    'auth0_id': 'auth0|admin123',
    'role_name': 'admin',
    'is_active': true,
    'created_at': '2024-01-01T00:00:00Z',
    'updated_at': '2024-01-01T00:00:00Z',
  };

  /// Manager user fixture
  static const Map<String, dynamic> manager = {
    'id': 2,
    'name': 'Manager User',
    'email': 'manager@trossapp.com',
    'auth0_id': 'auth0|manager123',
    'role_name': 'manager',
    'is_active': true,
    'created_at': '2024-01-01T00:00:00Z',
    'updated_at': '2024-01-01T00:00:00Z',
  };

  /// User fixture
  static const Map<String, dynamic> user = {
    'id': 3,
    'name': 'Regular User',
    'email': 'user@trossapp.com',
    'auth0_id': 'auth0|user123',
    'role_name': 'user',
    'is_active': true,
    'created_at': '2024-01-01T00:00:00Z',
    'updated_at': '2024-01-01T00:00:00Z',
  };

  /// Viewer user fixture
  static const Map<String, dynamic> viewer = {
    'id': 4,
    'name': 'Viewer User',
    'email': 'viewer@trossapp.com',
    'auth0_id': 'auth0|viewer123',
    'role_name': 'viewer',
    'is_active': true,
    'created_at': '2024-01-01T00:00:00Z',
    'updated_at': '2024-01-01T00:00:00Z',
  };

  /// Inactive user fixture
  static const Map<String, dynamic> inactive = {
    'id': 5,
    'name': 'Inactive User',
    'email': 'inactive@trossapp.com',
    'auth0_id': 'auth0|inactive123',
    'role_name': 'user',
    'is_active': false,
    'created_at': '2024-01-01T00:00:00Z',
    'updated_at': '2024-01-01T00:00:00Z',
  };

  /// List of all user fixtures
  static const List<Map<String, dynamic>> all = [
    admin,
    manager,
    user,
    viewer,
    inactive,
  ];

  /// List of active user fixtures
  static const List<Map<String, dynamic>> active = [
    admin,
    manager,
    user,
    viewer,
  ];

  /// Get user by role
  static Map<String, dynamic> byRole(String role) {
    switch (role.toLowerCase()) {
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

  /// Get user by id
  static Map<String, dynamic>? byId(int id) {
    try {
      return all.firstWhere((user) => user['id'] == id);
    } catch (e) {
      return null;
    }
  }

  /// Get user by email
  static Map<String, dynamic>? byEmail(String email) {
    try {
      return all.firstWhere((user) => user['email'] == email);
    } catch (e) {
      return null;
    }
  }
}
