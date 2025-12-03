/// Test data fixtures and builders
/// Provides reusable test data for consistent testing
library;

/// Test data builders for common domain models
class TestData {
  // Prevent instantiation
  TestData._();

  /// Creates a test user with default or custom values
  static Map<String, dynamic> user({
    int? id,
    String? email,
    String? firstName,
    String? lastName,
    String? role,
    bool? isActive,
  }) {
    return {
      'id': id ?? 1,
      'email': email ?? 'test@example.com',
      'auth0_id': 'auth0|test123',
      'first_name': firstName ?? 'Test',
      'last_name': lastName ?? 'User',
      'role_id': 1,
      'role': role ?? 'user',
      'is_active': isActive ?? true,
      'created_at': DateTime.now().toIso8601String(),
      'updated_at': DateTime.now().toIso8601String(),
      'name': '${firstName ?? 'Test'} ${lastName ?? 'User'}',
    };
  }

  /// Creates a list of test users
  static List<Map<String, dynamic>> userList({int count = 3}) {
    return List.generate(
      count,
      (i) => user(
        id: i + 1,
        email: 'user$i@example.com',
        firstName: 'User',
        lastName: '$i',
      ),
    );
  }

  /// Creates a test role with default or custom values
  static Map<String, dynamic> role({
    int? id,
    String? name,
    String? description,
    int? level,
  }) {
    return {
      'id': id ?? 1,
      'name': name ?? 'user',
      'description': description ?? 'Standard User',
      'level': level ?? 1,
      'created_at': DateTime.now().toIso8601String(),
      'updated_at': DateTime.now().toIso8601String(),
    };
  }

  /// Creates a list of test roles
  static List<Map<String, dynamic>> roleList() {
    return [
      role(
        id: 1,
        name: 'super_admin',
        description: 'Super Administrator',
        level: 100,
      ),
      role(id: 2, name: 'admin', description: 'Administrator', level: 75),
      role(id: 3, name: 'manager', description: 'Manager', level: 50),
      role(id: 4, name: 'user', description: 'Standard User', level: 25),
      role(id: 5, name: 'guest', description: 'Guest', level: 0),
    ];
  }

  /// Creates a test API response wrapper
  static Map<String, dynamic> apiResponse({
    required dynamic data,
    bool success = true,
    String? message,
  }) {
    return {
      'success': success,
      'data': data,
      if (message != null) 'message': message,
      'timestamp': DateTime.now().toIso8601String(),
    };
  }

  /// Creates a test error response
  static Map<String, dynamic> errorResponse({
    String? message,
    int? statusCode,
    String? error,
  }) {
    return {
      'success': false,
      'error': error ?? 'Test Error',
      'message': message ?? 'An error occurred during testing',
      if (statusCode != null) 'statusCode': statusCode,
      'timestamp': DateTime.now().toIso8601String(),
    };
  }

  /// Creates test auth tokens
  static Map<String, String> authTokens({
    String? accessToken,
    String? idToken,
    String? refreshToken,
  }) {
    return {
      'access_token': accessToken ?? 'test_access_token_12345',
      'id_token': idToken ?? 'test_id_token_12345',
      'refresh_token': refreshToken ?? 'test_refresh_token_12345',
      'token_type': 'Bearer',
      'expires_in': '86400',
    };
  }
}

/// Builder pattern for complex test data
class UserBuilder {
  int _id = 1;
  String _email = 'test@example.com';
  String _firstName = 'Test';
  String _lastName = 'User';
  String _role = 'user';
  bool _isActive = true;

  UserBuilder withId(int id) {
    _id = id;
    return this;
  }

  UserBuilder withEmail(String email) {
    _email = email;
    return this;
  }

  UserBuilder withName(String firstName, String lastName) {
    _firstName = firstName;
    _lastName = lastName;
    return this;
  }

  UserBuilder withRole(String role) {
    _role = role;
    return this;
  }

  UserBuilder inactive() {
    _isActive = false;
    return this;
  }

  UserBuilder active() {
    _isActive = true;
    return this;
  }

  Map<String, dynamic> build() {
    return TestData.user(
      id: _id,
      email: _email,
      firstName: _firstName,
      lastName: _lastName,
      role: _role,
      isActive: _isActive,
    );
  }
}
