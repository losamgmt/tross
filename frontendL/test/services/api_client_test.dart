/// API Client Tests - Core HTTP client functionality
///
/// Tests for ApiClient service including:
/// - Response validation helpers (parseSuccessResponse, parseSuccessListResponse)
/// - Error handling patterns
/// - Response format validation
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/services/api_client.dart';
import 'package:tross_app/models/user_model.dart';
import 'package:tross_app/models/role_model.dart';

void main() {
  group('ApiClient Response Helpers', () {
    group('parseSuccessResponse', () {
      test('successfully parses valid response with data', () {
        // Arrange
        final validResponse = {
          'success': true,
          'data': {
            'id': 1,
            'email': 'test@example.com',
            'auth0_id': 'auth0|123456',
            'role_id': 4,
            'role': 'technician',
            'is_active': true,
            'created_at': '2025-01-01T00:00:00.000Z',
            'updated_at': '2025-01-01T00:00:00.000Z',
          },
        };

        // Act
        final user = ApiClient.parseSuccessResponse(
          validResponse,
          User.fromJson,
        );

        // Assert
        expect(user, isA<User>());
        expect(user.email, 'test@example.com');
        expect(user.id, 1);
        expect(user.isActive, true);
        expect(user.auth0Id, 'auth0|123456');
        expect(user.roleId, 4);
        expect(user.role, 'technician');
      });

      test('throws exception when success is false', () {
        // Arrange
        final failedResponse = {
          'success': false,
          'data': {'id': 1, 'email': 'test@example.com'},
        };

        // Act & Assert
        expect(
          () => ApiClient.parseSuccessResponse(failedResponse, User.fromJson),
          throwsA(
            predicate(
              (e) =>
                  e.toString().contains('Invalid response format from backend'),
            ),
          ),
        );
      });

      test('throws exception when data is null', () {
        // Arrange
        final nullDataResponse = {'success': true, 'data': null};

        // Act & Assert
        expect(
          () => ApiClient.parseSuccessResponse(nullDataResponse, User.fromJson),
          throwsA(
            predicate(
              (e) =>
                  e.toString().contains('Invalid response format from backend'),
            ),
          ),
        );
      });

      test('throws exception when success field missing', () {
        // Arrange
        final noSuccessResponse = {
          'data': {'id': 1, 'email': 'test@example.com'},
        };

        // Act & Assert
        expect(
          () =>
              ApiClient.parseSuccessResponse(noSuccessResponse, User.fromJson),
          throwsA(
            predicate(
              (e) =>
                  e.toString().contains('Invalid response format from backend'),
            ),
          ),
        );
      });

      test('throws exception when data field missing', () {
        // Arrange
        final noDataResponse = {'success': true};

        // Act & Assert
        expect(
          () => ApiClient.parseSuccessResponse(noDataResponse, User.fromJson),
          throwsA(
            predicate(
              (e) =>
                  e.toString().contains('Invalid response format from backend'),
            ),
          ),
        );
      });

      test('passes through fromJson validation errors', () {
        // Arrange - Invalid user data (missing required email)
        final invalidDataResponse = {
          'success': true,
          'data': {
            'id': 1,
            // Missing required 'email' field
            'is_active': true,
            'created_at': '2025-01-01T00:00:00.000Z',
          },
        };

        // Act & Assert
        expect(
          () => ApiClient.parseSuccessResponse(
            invalidDataResponse,
            User.fromJson,
          ),
          throwsA(
            predicate(
              (e) => e is ArgumentError && e.toString().contains('email'),
            ),
          ),
        );
      });
    });

    group('parseSuccessListResponse', () {
      test('successfully parses valid response with array data', () {
        // Arrange
        final validListResponse = {
          'success': true,
          'data': [
            {
              'id': 1,
              'name': 'admin',
              'priority': 5,
              'created_at': '2025-01-01T00:00:00.000Z',
              'updated_at': '2025-01-01T00:00:00.000Z',
              'is_active': true,
            },
            {
              'id': 2,
              'name': 'manager',
              'priority': 4,
              'created_at': '2025-01-01T00:00:00.000Z',
              'updated_at': '2025-01-01T00:00:00.000Z',
              'is_active': true,
            },
          ],
        };

        // Act
        final roles = ApiClient.parseSuccessListResponse(
          validListResponse,
          Role.fromJson,
        );

        // Assert
        expect(roles, isA<List<Role>>());
        expect(roles.length, 2);
        expect(roles[0].name, 'admin');
        expect(roles[1].name, 'manager');
      });

      test('successfully parses empty array', () {
        // Arrange
        final emptyListResponse = {'success': true, 'data': []};

        // Act
        final roles = ApiClient.parseSuccessListResponse(
          emptyListResponse,
          Role.fromJson,
        );

        // Assert
        expect(roles, isA<List<Role>>());
        expect(roles.length, 0);
        expect(roles, isEmpty);
      });

      test('throws exception when success is false', () {
        // Arrange
        final failedResponse = {
          'success': false,
          'data': [
            {'id': 1, 'name': 'admin'},
          ],
        };

        // Act & Assert
        expect(
          () =>
              ApiClient.parseSuccessListResponse(failedResponse, Role.fromJson),
          throwsA(
            predicate(
              (e) =>
                  e.toString().contains('Invalid response format from backend'),
            ),
          ),
        );
      });

      test('throws exception when data is null', () {
        // Arrange
        final nullDataResponse = {'success': true, 'data': null};

        // Act & Assert
        expect(
          () => ApiClient.parseSuccessListResponse(
            nullDataResponse,
            Role.fromJson,
          ),
          throwsA(
            predicate(
              (e) =>
                  e.toString().contains('Invalid response format from backend'),
            ),
          ),
        );
      });

      test('throws exception when data is not an array', () {
        // Arrange
        final objectDataResponse = {
          'success': true,
          'data': {'id': 1, 'name': 'admin'}, // Object instead of array
        };

        // Act & Assert - Should throw TypeError, not Exception
        expect(
          () => ApiClient.parseSuccessListResponse(
            objectDataResponse,
            Role.fromJson,
          ),
          throwsA(isA<TypeError>()),
        );
      });

      test('passes through fromJson validation errors for list items', () {
        // Arrange - One invalid role in list (missing required name)
        final invalidListResponse = {
          'success': true,
          'data': [
            {
              'id': 1,
              'name': 'admin',
              'priority': 5,
              'created_at': '2025-01-01T00:00:00.000Z',
              'updated_at': '2025-01-01T00:00:00.000Z',
              'is_active': true,
            },
            {
              'id': 2,
              // Missing required 'name' field
              'priority': 4,
              'created_at': '2025-01-01T00:00:00.000Z',
              'updated_at': '2025-01-01T00:00:00.000Z',
              'is_active': true,
            },
          ],
        };

        // Act & Assert
        expect(
          () => ApiClient.parseSuccessListResponse(
            invalidListResponse,
            Role.fromJson,
          ),
          throwsA(
            predicate(
              (e) => e is ArgumentError && e.toString().contains('name'),
            ),
          ),
        );
      });
    });

    group('Edge Cases', () {
      test('parseSuccessResponse handles nested role data', () {
        // Arrange - User with role_id and role name
        final userWithRoleResponse = {
          'success': true,
          'data': {
            'id': 1,
            'email': 'admin@example.com',
            'auth0_id': 'auth0|admin123',
            'is_active': true,
            'created_at': '2025-01-01T00:00:00.000Z',
            'updated_at': '2025-01-01T00:00:00.000Z',
            'role_id': 1,
            'role': 'admin',
          },
        };

        // Act
        final user = ApiClient.parseSuccessResponse(
          userWithRoleResponse,
          User.fromJson,
        );

        // Assert
        expect(user, isA<User>());
        expect(user.email, 'admin@example.com');
        expect(user.role, 'admin');
        expect(user.roleId, 1);
        expect(user.auth0Id, 'auth0|admin123');
      });

      test('parseSuccessListResponse handles list with single item', () {
        // Arrange
        final singleItemResponse = {
          'success': true,
          'data': [
            {
              'id': 1,
              'name': 'admin',
              'priority': 5,
              'created_at': '2025-01-01T00:00:00.000Z',
              'updated_at': '2025-01-01T00:00:00.000Z',
              'is_active': true,
            },
          ],
        };

        // Act
        final roles = ApiClient.parseSuccessListResponse(
          singleItemResponse,
          Role.fromJson,
        );

        // Assert
        expect(roles.length, 1);
        expect(roles.first.name, 'admin');
      });
    });
  });
}
