/// Test Helpers for Provider Testing
///
/// DRY utilities for creating mock data, auth states, and reusable assertions.
/// Reduces boilerplate in provider tests and ensures consistency.
library;

import 'package:tross_app/models/permission.dart';

/// Mock user data fixtures for various roles
class MockUserData {
  /// Create mock admin user
  static Map<String, dynamic> admin({
    int id = 1,
    String name = 'Admin User',
    String email = 'admin@test.com',
    bool isActive = true,
  }) {
    return {
      'id': id,
      'name': name,
      'email': email,
      'role': 'admin',
      'is_active': isActive,
      'permissions': ['all'], // Admin has all permissions
    };
  }

  /// Create mock manager user
  static Map<String, dynamic> manager({
    int id = 2,
    String name = 'Manager User',
    String email = 'manager@test.com',
    bool isActive = true,
  }) {
    return {
      'id': id,
      'name': name,
      'email': email,
      'role': 'manager',
      'is_active': isActive,
      'permissions': ['users:read', 'users:update', 'roles:read'],
    };
  }

  /// Create mock dispatcher user
  static Map<String, dynamic> dispatcher({
    int id = 3,
    String name = 'Dispatcher User',
    String email = 'dispatcher@test.com',
    bool isActive = true,
  }) {
    return {
      'id': id,
      'name': name,
      'email': email,
      'role': 'dispatcher',
      'is_active': isActive,
      'permissions': ['routes:read', 'routes:create', 'routes:update'],
    };
  }

  /// Create mock technician user
  static Map<String, dynamic> technician({
    int id = 4,
    String name = 'Tech User',
    String email = 'tech@test.com',
    bool isActive = true,
  }) {
    return {
      'id': id,
      'name': name,
      'email': email,
      'role': 'technician',
      'is_active': isActive,
      'permissions': ['routes:read', 'audits:read'],
    };
  }

  /// Create mock client user
  static Map<String, dynamic> client({
    int id = 5,
    String name = 'Client User',
    String email = 'client@test.com',
    bool isActive = true,
  }) {
    return {
      'id': id,
      'name': name,
      'email': email,
      'role': 'client',
      'is_active': isActive,
      'permissions': ['routes:read'], // Minimal permissions
    };
  }

  /// Create mock user with custom role and permissions
  static Map<String, dynamic> custom({
    required int id,
    required String name,
    required String email,
    required String role,
    List<String> permissions = const [],
    bool isActive = true,
  }) {
    return {
      'id': id,
      'name': name,
      'email': email,
      'role': role,
      'is_active': isActive,
      'permissions': permissions,
    };
  }

  /// Create inactive user (for testing deactivated accounts)
  static Map<String, dynamic> inactive({
    int id = 99,
    String name = 'Inactive User',
    String email = 'inactive@test.com',
    String role = 'technician',
  }) {
    return {
      'id': id,
      'name': name,
      'email': email,
      'role': role,
      'is_active': false,
      'permissions': [],
    };
  }
}

/// Auth state builders for testing various scenarios
class AuthStateBuilder {
  /// Create unauthenticated state
  static Map<String, dynamic> unauthenticated() {
    return {
      'isLoading': false,
      'isRedirecting': false,
      'error': null,
      'user': null,
      'isAuthenticated': false,
    };
  }

  /// Create loading state (authentication in progress)
  static Map<String, dynamic> loading() {
    return {
      'isLoading': true,
      'isRedirecting': false,
      'error': null,
      'user': null,
      'isAuthenticated': false,
    };
  }

  /// Create redirecting state (Auth0 OAuth in progress)
  static Map<String, dynamic> redirecting() {
    return {
      'isLoading': true,
      'isRedirecting': true,
      'error': null,
      'user': null,
      'isAuthenticated': false,
    };
  }

  /// Create authenticated state with user
  static Map<String, dynamic> authenticated(Map<String, dynamic> user) {
    return {
      'isLoading': false,
      'isRedirecting': false,
      'error': null,
      'user': user,
      'isAuthenticated': true,
    };
  }

  /// Create error state
  static Map<String, dynamic> error(String errorMessage) {
    return {
      'isLoading': false,
      'isRedirecting': false,
      'error': errorMessage,
      'user': null,
      'isAuthenticated': false,
    };
  }
}

/// Permission test scenarios for comprehensive permission testing
class PermissionTestScenarios {
  /// Get all resource types for exhaustive testing
  static List<ResourceType> get allResources => ResourceType.values;

  /// Get all CRUD operations
  static List<CrudOperation> get allOperations => CrudOperation.values;

  /// Get role hierarchy for testing (highest to lowest)
  static List<String> get roleHierarchy => [
    'admin',
    'manager',
    'dispatcher',
    'technician',
    'client',
  ];

  /// Test scenario: Admin can do everything
  static Map<ResourceType, List<CrudOperation>> get adminPermissions {
    return {
      for (var resource in allResources) resource: [...allOperations],
    };
  }

  /// Test scenario: Technician has limited read access
  static Map<ResourceType, List<CrudOperation>> get technicianPermissions {
    return {
      ResourceType.workOrders: [CrudOperation.read],
      ResourceType.auditLogs: [CrudOperation.read],
    };
  }

  /// Test scenario: Client has minimal access
  static Map<ResourceType, List<CrudOperation>> get clientPermissions {
    return {
      ResourceType.workOrders: [CrudOperation.read],
    };
  }
}

/// Reusable assertions for common provider test patterns
class ProviderAssertions {
  /// Assert provider is in unauthenticated state
  static void assertUnauthenticated(
    bool isAuthenticated,
    dynamic user,
    String? error,
  ) {
    assert(
      !isAuthenticated,
      'Expected isAuthenticated to be false, but was true',
    );
    assert(user == null, 'Expected user to be null, but was $user');
    // Error can be null or string
  }

  /// Assert provider is in authenticated state with valid user
  static void assertAuthenticated(
    bool isAuthenticated,
    Map<String, dynamic>? user,
    String expectedRole,
  ) {
    assert(
      isAuthenticated,
      'Expected isAuthenticated to be true, but was false',
    );
    assert(user != null, 'Expected user to be present, but was null');
    assert(
      user!['role'] == expectedRole,
      'Expected role to be $expectedRole, but was ${user['role']}',
    );
  }

  /// Assert provider is in loading state
  static void assertLoading(bool isLoading, bool isRedirecting) {
    assert(isLoading, 'Expected isLoading to be true, but was false');
    // isRedirecting can be true or false depending on scenario
  }

  /// Assert provider has error
  static void assertHasError(String? error, {String? containsText}) {
    assert(error != null, 'Expected error to be present, but was null');
    if (containsText != null) {
      assert(
        error!.contains(containsText),
        'Expected error to contain "$containsText", but was "$error"',
      );
    }
  }

  /// Assert permission check result
  static void assertPermission({
    required bool expected,
    required bool actual,
    required String resource,
    required String operation,
    required String role,
  }) {
    assert(
      expected == actual,
      'Permission check failed for $role: '
      'Expected $operation on $resource to be $expected, but was $actual',
    );
  }
}
