/// AuthTestService - Service for testing authentication endpoints
///
/// Single Responsibility: Test authenticated API endpoints and return results
/// Used by development tools to verify auth system is working correctly
library;

import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_endpoints.dart';
import '../config/app_config.dart';

/// Result of an authentication endpoint test
class AuthTestResult {
  final String endpoint;
  final String description;
  final bool success;
  final String message;
  final int? statusCode;
  final Duration? responseTime;

  const AuthTestResult({
    required this.endpoint,
    required this.description,
    required this.success,
    required this.message,
    this.statusCode,
    this.responseTime,
  });

  /// Format result as display string
  String toDisplayString() {
    final icon = success ? '✅' : '❌';
    final timing = responseTime != null
        ? ' (${responseTime!.inMilliseconds}ms)'
        : '';
    return '$icon $description$timing: $message';
  }
}

class AuthTestService {
  AuthTestService._(); // Private constructor

  /// Test /dev/status endpoint
  static Future<AuthTestResult> testDevStatus(String token) async {
    final stopwatch = Stopwatch()..start();

    try {
      final uri = Uri.parse('${AppConfig.baseUrl}${ApiEndpoints.devStatus}');
      final response = await http
          .get(
            uri,
            headers: {
              'Authorization': 'Bearer $token',
              'Content-Type': 'application/json',
            },
          )
          .timeout(AppConfig.httpTimeout);

      stopwatch.stop();

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final authMode = data['authentication'] ?? 'unknown';

        return AuthTestResult(
          endpoint: ApiEndpoints.devStatus,
          description: 'Development Status',
          success: true,
          message: 'Auth mode: $authMode',
          statusCode: response.statusCode,
          responseTime: stopwatch.elapsed,
        );
      } else {
        return AuthTestResult(
          endpoint: ApiEndpoints.devStatus,
          description: 'Development Status',
          success: false,
          message: 'Unexpected status ${response.statusCode}',
          statusCode: response.statusCode,
          responseTime: stopwatch.elapsed,
        );
      }
    } catch (e) {
      stopwatch.stop();
      return AuthTestResult(
        endpoint: ApiEndpoints.devStatus,
        description: 'Development Status',
        success: false,
        message: e.toString(),
        responseTime: stopwatch.elapsed,
      );
    }
  }

  /// Test /auth/me endpoint (current user profile)
  static Future<AuthTestResult> testAuthMe(String token) async {
    final stopwatch = Stopwatch()..start();

    try {
      final uri = Uri.parse('${AppConfig.baseUrl}${ApiEndpoints.authMe}');
      final response = await http
          .get(
            uri,
            headers: {
              'Authorization': 'Bearer $token',
              'Content-Type': 'application/json',
            },
          )
          .timeout(AppConfig.httpTimeout);

      stopwatch.stop();

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final userData = data['data'] ?? data;
        final email = userData['email'] ?? 'unknown';
        final role = userData['role'] ?? 'unknown';

        return AuthTestResult(
          endpoint: ApiEndpoints.authMe,
          description: 'User Profile',
          success: true,
          message: '$email ($role)',
          statusCode: response.statusCode,
          responseTime: stopwatch.elapsed,
        );
      } else {
        return AuthTestResult(
          endpoint: ApiEndpoints.authMe,
          description: 'User Profile',
          success: false,
          message: 'Unexpected status ${response.statusCode}',
          statusCode: response.statusCode,
          responseTime: stopwatch.elapsed,
        );
      }
    } catch (e) {
      stopwatch.stop();
      return AuthTestResult(
        endpoint: ApiEndpoints.authMe,
        description: 'User Profile',
        success: false,
        message: e.toString(),
        responseTime: stopwatch.elapsed,
      );
    }
  }

  /// Test /api/users endpoint (admin-only - proves role-based access control)
  static Future<AuthTestResult> testAdminUsersEndpoint(String token) async {
    final stopwatch = Stopwatch()..start();

    try {
      // Test the actual /users endpoint (not /auth/users - that doesn't exist)
      final uri = Uri.parse(
        '${AppConfig.baseUrl}/users',
      ).replace(queryParameters: {'page': '1', 'limit': '10'});
      final response = await http
          .get(
            uri,
            headers: {
              'Authorization': 'Bearer $token',
              'Content-Type': 'application/json',
            },
          )
          .timeout(AppConfig.httpTimeout);

      stopwatch.stop();

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final userData = data['data'] ?? [];
        final count = (userData as List?)?.length ?? 0;

        return AuthTestResult(
          endpoint: '/users',
          description: 'Admin Access Control',
          success: true,
          message: 'Verified admin-only endpoint (retrieved $count users)',
          statusCode: response.statusCode,
          responseTime: stopwatch.elapsed,
        );
      } else if (response.statusCode == 403) {
        return AuthTestResult(
          endpoint: '/users',
          description: 'Admin Access Control',
          success: false,
          message: 'Access denied - user is not admin',
          statusCode: response.statusCode,
          responseTime: stopwatch.elapsed,
        );
      } else {
        return AuthTestResult(
          endpoint: '/users',
          description: 'Admin Access Control',
          success: false,
          message: 'Unexpected status ${response.statusCode}',
          statusCode: response.statusCode,
          responseTime: stopwatch.elapsed,
        );
      }
    } catch (e) {
      stopwatch.stop();
      return AuthTestResult(
        endpoint: '/users',
        description: 'Admin Access Control',
        success: false,
        message: e.toString(),
        responseTime: stopwatch.elapsed,
      );
    }
  }

  /// Test /health endpoint (overall system health)
  static Future<AuthTestResult> testHealthEndpoint() async {
    final stopwatch = Stopwatch()..start();

    try {
      final uri = Uri.parse('${AppConfig.baseUrl}${ApiEndpoints.healthCheck}');
      final response = await http.get(uri).timeout(AppConfig.httpTimeout);

      stopwatch.stop();

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final status = data['status'] ?? 'unknown';

        return AuthTestResult(
          endpoint: ApiEndpoints.healthCheck,
          description: 'System Health',
          success: true,
          message: 'Status: $status',
          statusCode: response.statusCode,
          responseTime: stopwatch.elapsed,
        );
      } else {
        return AuthTestResult(
          endpoint: ApiEndpoints.healthCheck,
          description: 'System Health',
          success: false,
          message: 'Unexpected status ${response.statusCode}',
          statusCode: response.statusCode,
          responseTime: stopwatch.elapsed,
        );
      }
    } catch (e) {
      stopwatch.stop();
      return AuthTestResult(
        endpoint: ApiEndpoints.healthCheck,
        description: 'System Health',
        success: false,
        message: e.toString(),
        responseTime: stopwatch.elapsed,
      );
    }
  }

  /// Run all authentication tests
  static Future<List<AuthTestResult>> runAllTests({
    required String token,
    required bool isAdmin,
  }) async {
    final results = <AuthTestResult>[];

    // 1. System Health (no auth) - Proves backend is alive
    results.add(await testHealthEndpoint());

    // 2. Dev Status (requires auth) - Proves token authentication works
    results.add(await testDevStatus(token));

    // 3. User Profile (requires auth) - Proves user data retrieval works
    results.add(await testAuthMe(token));

    // 4. Admin Access Control (requires admin role) - Proves role-based permissions work
    if (isAdmin) {
      results.add(await testAdminUsersEndpoint(token));
    }

    return results;
  }
}
