import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/services/auth_test_service.dart';

/// Unit Tests for AuthTestService - Model Validation Only
///
/// Integration tests (HTTP calls) are in:
/// test/integration/auth_test_service_integration_test.dart
void main() {
  group('AuthTestService Unit Tests', () {
    group('AuthTestResult Model', () {
      test('can be created with all fields', () {
        final result = AuthTestResult(
          endpoint: '/test',
          description: 'Test Description',
          success: true,
          message: 'Test message',
          statusCode: 200,
          responseTime: const Duration(milliseconds: 100),
        );

        expect(result.endpoint, '/test');
        expect(result.description, 'Test Description');
        expect(result.success, isTrue);
        expect(result.message, 'Test message');
        expect(result.statusCode, 200);
        expect(result.responseTime, const Duration(milliseconds: 100));
      });

      test('can be created without optional fields', () {
        final result = AuthTestResult(
          endpoint: '/test',
          description: 'Test Description',
          success: false,
          message: 'Error occurred',
        );

        expect(result.statusCode, isNull);
        expect(result.responseTime, isNull);
      });

      test('success field reflects test outcome', () {
        final successResult = AuthTestResult(
          endpoint: '/api/test',
          description: 'Success Test',
          success: true,
          message: 'All good',
        );

        final failureResult = AuthTestResult(
          endpoint: '/api/test',
          description: 'Failure Test',
          success: false,
          message: 'Something went wrong',
        );

        expect(successResult.success, isTrue);
        expect(failureResult.success, isFalse);
      });
    });
  });
}
