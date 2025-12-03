/// Test Data Builders - Factory functions for test fixtures
///
/// Provides consistent, reusable test data across the test suite.
/// Follows the Builder pattern for flexibility.
///
/// Usage:
/// ```dart
/// import 'package:tross_app/test/helpers/test_data_builders.dart';
///
/// void main() {
///   test('admin user access', () {
///     final admin = TestDataBuilders.adminUser();
///     expect(admin['role'], equals('admin'));
///   });
///
///   test('custom user', () {
///     final user = TestDataBuilders.user(
///       role: 'manager',
///       email: 'manager@test.com',
///       name: 'Test Manager',
///     );
///     expect(user['role'], equals('manager'));
///   });
/// }
/// ```
library;

class TestDataBuilders {
  // Prevent instantiation
  TestDataBuilders._();

  // ============================================================================
  // USER BUILDERS
  // ============================================================================

  /// Create a generic test user
  static Map<String, dynamic> user({
    String? id,
    String role = 'technician',
    String? email,
    String? name,
    String provider = 'development',
    Map<String, dynamic>? additionalFields,
  }) {
    final Map<String, dynamic> baseUser = {
      'id': id ?? 'test_user_${DateTime.now().millisecondsSinceEpoch}',
      'role': role,
      'email': email ?? '$role@test.com',
      'name': name ?? 'Test ${role.capitalize()}',
      'provider': provider,
      'created_at': DateTime.now().toIso8601String(),
    };

    if (additionalFields != null) {
      baseUser.addAll(additionalFields);
    }

    return baseUser;
  }

  /// Create an admin user
  static Map<String, dynamic> adminUser({
    String? id,
    String? email,
    String? name,
  }) {
    return user(
      id: id,
      role: 'admin',
      email: email ?? 'admin@test.com',
      name: name ?? 'Test Admin',
    );
  }

  /// Create a technician user
  static Map<String, dynamic> technicianUser({
    String? id,
    String? email,
    String? name,
  }) {
    return user(
      id: id,
      role: 'technician',
      email: email ?? 'tech@test.com',
      name: name ?? 'Test Technician',
    );
  }

  /// Create an Auth0 user
  static Map<String, dynamic> auth0User({
    String? id,
    String role = 'technician',
    String? email,
    String? name,
  }) {
    return user(
      id: id,
      role: role,
      email: email,
      name: name,
      provider: 'auth0',
      additionalFields: {
        'auth0_id': 'auth0|${DateTime.now().millisecondsSinceEpoch}',
        'picture': 'https://example.com/avatar.jpg',
      },
    );
  }

  // ============================================================================
  // TOKEN BUILDERS
  // ============================================================================

  /// Create a mock JWT token
  static String jwtToken({
    String? userId,
    String role = 'technician',
    int? expiresInSeconds,
  }) {
    final header = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'; // Mock header
    final payload =
        'eyJzdWIiOiIkdXNlcklkIiwicm9sZSI6IiRyb2xlIn0'; // Mock payload
    final signature = 'mock_signature_${DateTime.now().millisecondsSinceEpoch}';

    return '$header.$payload.$signature';
  }

  /// Create a development token
  static String devToken({bool isAdmin = false}) {
    return 'dev_token_${isAdmin ? 'admin' : 'tech'}_${DateTime.now().millisecondsSinceEpoch}';
  }

  /// Create an Auth0 token
  static String auth0Token() {
    return 'auth0_token_${DateTime.now().millisecondsSinceEpoch}';
  }

  // ============================================================================
  // AUTH STATE BUILDERS
  // ============================================================================

  /// Create complete auth state (token + user)
  static Map<String, dynamic> authState({
    String? token,
    Map<String, dynamic>? user,
    String? refreshToken,
  }) {
    return {
      'token': token ?? devToken(),
      'user': user ?? technicianUser(),
      if (refreshToken != null) 'refreshToken': refreshToken,
    };
  }

  /// Create authenticated admin state
  static Map<String, dynamic> adminAuthState({
    String? token,
    Map<String, dynamic>? user,
  }) {
    return authState(
      token: token ?? devToken(isAdmin: true),
      user: user ?? adminUser(),
    );
  }

  /// Create authenticated technician state
  static Map<String, dynamic> techAuthState({
    String? token,
    Map<String, dynamic>? user,
  }) {
    return authState(
      token: token ?? devToken(),
      user: user ?? technicianUser(),
    );
  }

  // ============================================================================
  // ERROR BUILDERS
  // ============================================================================

  /// Create a network error
  static Exception networkError([String message = 'Network error']) {
    return Exception(message);
  }

  /// Create an auth error
  static Exception authError([String message = 'Authentication failed']) {
    return Exception(message);
  }

  /// Create a timeout error
  static Exception timeoutError([String message = 'Request timeout']) {
    return Exception(message);
  }

  // ============================================================================
  // HEALTH DATA BUILDERS
  // ============================================================================

  /// Create database health data
  static Map<String, dynamic> databaseHealth({
    bool isConnected = true,
    int? responseTime,
    String status = 'healthy',
  }) {
    return {
      'isConnected': isConnected,
      'status': status,
      'responseTime': responseTime ?? (isConnected ? 50 : null),
      'timestamp': DateTime.now().toIso8601String(),
    };
  }

  /// Create API response
  static Map<String, dynamic> apiResponse({
    required dynamic data,
    int statusCode = 200,
    String? message,
  }) {
    return {
      'statusCode': statusCode,
      'data': data,
      if (message != null) 'message': message,
      'timestamp': DateTime.now().toIso8601String(),
    };
  }
}

// Extension for string capitalization
extension StringExtension on String {
  String capitalize() {
    if (isEmpty) return this;
    return '${this[0].toUpperCase()}${substring(1)}';
  }
}
