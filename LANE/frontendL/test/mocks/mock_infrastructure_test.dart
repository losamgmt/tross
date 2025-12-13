/// Mock Infrastructure Tests
///
/// Verifies that MockSetup and TestApiClient work correctly.
/// These tests serve dual purpose:
/// 1. Validate our mocking infrastructure
/// 2. Provide working examples for future service tests
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import '../helpers/helpers.dart';

void main() {
  group('Mock Infrastructure Validation', () {
    late MockClient mockHttpClient;
    late MockSetup mockSetup;
    late TestApiClient testApiClient;

    setUp(() {
      mockHttpClient = MockClient();
      mockSetup = MockSetup(mockHttpClient);
      testApiClient = TestApiClient(
        httpClient: mockHttpClient,
        testToken: 'test-token-123',
      );
    });

    tearDown(() {
      mockSetup.resetMocks();
      testApiClient.close();
    });

    group('MockSetup - GET Requests', () {
      test('setupGetSuccess configures mock correctly', () async {
        // Arrange
        mockSetup.setupGetSuccess('/test', {
          'success': true,
          'data': {'id': 1, 'name': 'Test'},
        });

        // Act
        final result = await testApiClient.get('/test');

        // Assert
        expect(result['success'], true);
        expect(result['data'], isA<Map<String, dynamic>>());
        expect(result['data']['id'], 1);
        expect(result['data']['name'], 'Test');
      });

      test('setupGetSuccess with array response', () async {
        // Arrange
        mockSetup.setupGetSuccess('/roles', {
          'success': true,
          'data': [
            {'id': 1, 'name': 'Admin'},
            {'id': 2, 'name': 'User'},
          ],
        });

        // Act
        final result = await testApiClient.get('/roles');

        // Assert
        expect(result['success'], true);
        expect(result['data'], isA<List>());
        expect(result['data'], hasLength(2));
      });

      test('verifyGetCalled confirms request was made', () async {
        // Arrange
        mockSetup.setupGetSuccess('/test', {'success': true});

        // Act
        await testApiClient.get('/test');

        // Assert
        expect(() => mockSetup.verifyGetCalled('/test'), returnsNormally);
      });
    });

    group('MockSetup - POST Requests', () {
      test('setupPostSuccess configures mock correctly', () async {
        // Arrange
        final expectedResponse = {
          'success': true,
          'data': {'id': 1, 'name': 'Created Item'},
        };
        mockSetup.setupPostSuccess('/items', expectedResponse);

        // Act
        final result = await testApiClient.post(
          '/items',
          body: {'name': 'New Item'},
        );

        // Assert
        expect(result['success'], true);
        expect(result['data']['id'], 1);
      });

      test('verifyPostCalled confirms request body', () async {
        // Arrange
        mockSetup.setupPostSuccess('/items', {'success': true});
        final requestBody = {'name': 'Test Item', 'active': true};

        // Act
        await testApiClient.post('/items', body: requestBody);

        // Assert
        expect(
          () => mockSetup.verifyPostCalled('/items', requestBody),
          returnsNormally,
        );
      });
    });

    group('MockSetup - PUT Requests', () {
      test('setupPutSuccess configures mock correctly', () async {
        // Arrange
        final expectedResponse = {
          'success': true,
          'data': {'id': 1, 'name': 'Updated Item'},
        };
        mockSetup.setupPutSuccess('/items/1', expectedResponse);

        // Act
        final result = await testApiClient.put(
          '/items/1',
          body: {'name': 'Updated Item'},
        );

        // Assert
        expect(result['success'], true);
        expect(result['data']['name'], 'Updated Item');
      });

      test('verifyPutCalled confirms request body', () async {
        // Arrange
        mockSetup.setupPutSuccess('/items/1', {'success': true});
        final requestBody = {'name': 'Updated', 'is_active': false};

        // Act
        await testApiClient.put('/items/1', body: requestBody);

        // Assert
        expect(
          () => mockSetup.verifyPutCalled('/items/1', requestBody),
          returnsNormally,
        );
      });
    });

    group('MockSetup - DELETE Requests', () {
      test('setupDeleteSuccess configures mock correctly', () async {
        // Arrange
        mockSetup.setupDeleteSuccess('/items/1');

        // Act
        final result = await testApiClient.delete('/items/1');

        // Assert
        expect(result['message'], 'Deleted successfully');
      });

      test('setupDeleteSuccess with custom message', () async {
        // Arrange
        mockSetup.setupDeleteSuccess('/items/1', message: 'Item removed');

        // Act
        final result = await testApiClient.delete('/items/1');

        // Assert
        expect(result['message'], 'Item removed');
      });

      test('verifyDeleteCalled confirms request was made', () async {
        // Arrange
        mockSetup.setupDeleteSuccess('/items/1');

        // Act
        await testApiClient.delete('/items/1');

        // Assert
        expect(() => mockSetup.verifyDeleteCalled('/items/1'), returnsNormally);
      });
    });

    group('MockSetup - Error Handling', () {
      test('setupError configures 404 response', () async {
        // Arrange
        mockSetup.setupError('/items/999', 404, 'Not found');

        // Act & Assert
        expect(() => testApiClient.get('/items/999'), throwsException);
      });

      test('setupError configures 403 response', () async {
        // Arrange
        mockSetup.setupError('/admin/secret', 403, 'Forbidden');

        // Act & Assert
        expect(() => testApiClient.get('/admin/secret'), throwsException);
      });

      test('setupException configures network error', () async {
        // Arrange
        mockSetup.setupException('/items', Exception('Network timeout'));

        // Act & Assert
        expect(() => testApiClient.get('/items'), throwsException);
      });
    });

    group('TestApiClient - Configuration', () {
      test('uses provided test token', () async {
        // Arrange
        final customClient = TestApiClient(
          httpClient: mockHttpClient,
          testToken: 'custom-token-456',
        );

        final uri = Uri.parse('http://localhost:3001/api/test');
        when(
          mockHttpClient.get(uri, headers: anyNamed('headers')),
        ).thenAnswer((_) async => http.Response('{"success": true}', 200));

        // Act
        await customClient.get('/test');

        // Assert - Verify the token was used in headers
        verify(
          mockHttpClient.get(
            uri,
            headers: argThat(contains('Authorization'), named: 'headers'),
          ),
        ).called(1);

        customClient.close();
      });

      test('parses successful JSON response', () async {
        // Arrange
        mockSetup.setupGetSuccess('/data', {
          'success': true,
          'count': 42,
          'items': ['a', 'b', 'c'],
        });

        // Act
        final result = await testApiClient.get('/data');

        // Assert
        expect(result['success'], true);
        expect(result['count'], 42);
        expect(result['items'], isA<List>());
      });

      test('handles empty response body', () async {
        // Arrange - Empty 200 response
        final uri = Uri.parse('http://localhost:3001/api/empty');
        when(
          mockHttpClient.get(uri, headers: anyNamed('headers')),
        ).thenAnswer((_) async => http.Response('', 200));

        // Act
        final result = await testApiClient.get('/empty');

        // Assert
        expect(result, isEmpty);
      });
    });

    group('Real-World Patterns', () {
      test('example: role creation flow', () async {
        // Arrange - Setup mock for POST /api/roles
        mockSetup.setupPostSuccess('/roles', {
          'success': true,
          'data': {
            'id': 5,
            'name': 'CustomRole',
            'is_active': true,
            'created_at': '2025-11-04T12:00:00Z',
          },
        });

        // Act - Create a role
        final result = await testApiClient.post(
          '/roles',
          body: {'name': 'CustomRole'},
        );

        // Assert - Verify response structure
        expect(result['success'], true);
        expect(result['data']['id'], 5);
        expect(result['data']['name'], 'CustomRole');

        // Verify request was made
        mockSetup.verifyPostCalled('/roles', {'name': 'CustomRole'});
      });

      test('example: role update flow', () async {
        // Arrange - Setup mock for PUT /api/roles/1
        mockSetup.setupPutSuccess('/roles/1', {
          'success': true,
          'data': {
            'id': 1,
            'name': 'Admin',
            'is_active': false,
            'description': 'Deactivated role',
          },
        });

        // Act - Update role
        final result = await testApiClient.put(
          '/roles/1',
          body: {'is_active': false, 'description': 'Deactivated role'},
        );

        // Assert
        expect(result['data']['is_active'], false);
        expect(result['data']['description'], 'Deactivated role');
      });

      test('example: handle protected role error', () async {
        // Arrange - Setup 403 error for protected role
        mockSetup.setupError('/roles/1', 403, 'Cannot modify protected role');

        // Act & Assert
        expect(() => testApiClient.delete('/roles/1'), throwsException);
      });
    });
  });
}
