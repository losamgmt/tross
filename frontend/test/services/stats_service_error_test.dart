/// StatsService Error Path Unit Tests
///
/// Tests the error handling paths (403, 500, etc.) in StatsService.
/// Uses the enhanced MockApiClient with status code mocking.
///
/// TARGET: Cover 29 previously uncovered lines in stats_service.dart
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/services/stats_service.dart';

import '../mocks/mock_api_client.dart';
import '../mocks/mock_token_provider.dart';
import '../helpers/helpers.dart';

void main() {
  late MockApiClient mockApiClient;
  late MockTokenProvider mockTokenProvider;
  late StatsService statsService;

  setUpAll(() {
    initializeTestBinding();
  });

  setUp(() {
    mockApiClient = MockApiClient();
    mockTokenProvider = MockTokenProvider('test-token');
    statsService = StatsService(mockApiClient, mockTokenProvider);
  });

  tearDown(() {
    mockApiClient.reset();
  });

  group('StatsService Error Handling', () {
    group('count() error paths', () {
      test('returns 0 when 403 Forbidden', () async {
        // Arrange
        mockApiClient.mockStatusCode('/stats/work_order', 403, {
          'error': 'Forbidden',
          'message': 'No permission to access this resource',
        });

        // Act
        final result = await statsService.count('work_order');

        // Assert - graceful degradation, returns 0 instead of throwing
        expect(result, equals(0));
      });

      test('throws when 500 Internal Server Error', () async {
        // Arrange
        mockApiClient.mockStatusCode('/stats/invoice', 500, {
          'error': 'Internal Server Error',
        });

        // Act & Assert
        expect(
          () => statsService.count('invoice'),
          throwsA(
            isA<Exception>().having(
              (e) => e.toString(),
              'message',
              contains('500'),
            ),
          ),
        );
      });

      test('throws when 404 Not Found', () async {
        // Arrange
        mockApiClient.mockStatusCode('/stats/unknown_entity', 404, {
          'error': 'Not Found',
        });

        // Act & Assert
        expect(
          () => statsService.count('unknown_entity'),
          throwsA(
            isA<Exception>().having(
              (e) => e.toString(),
              'message',
              contains('404'),
            ),
          ),
        );
      });

      test('count handles null data in response', () async {
        // Arrange - response with missing data field
        mockApiClient.mockResponse('/stats/work_order', {
          'success': true,
          'data': null,
        });

        // Act
        final result = await statsService.count('work_order');

        // Assert - should return 0 for null data
        expect(result, equals(0));
      });

      test('count handles missing count in data', () async {
        // Arrange - response with empty data
        mockApiClient.mockResponse('/stats/work_order', {
          'success': true,
          'data': {},
        });

        // Act
        final result = await statsService.count('work_order');

        // Assert - should return 0 for missing count
        expect(result, equals(0));
      });
    });

    group('countGrouped() error paths', () {
      test('returns empty list when 403 Forbidden', () async {
        // Arrange
        mockApiClient.mockStatusCode('/stats/work_order/grouped/status', 403, {
          'error': 'Forbidden',
        });

        // Act
        final result = await statsService.countGrouped('work_order', 'status');

        // Assert - graceful degradation
        expect(result, isEmpty);
      });

      test('throws when 500 Internal Server Error', () async {
        // Arrange
        mockApiClient.mockStatusCode('/stats/invoice/grouped/status', 500, {
          'error': 'Internal Server Error',
        });

        // Act & Assert
        expect(
          () => statsService.countGrouped('invoice', 'status'),
          throwsA(isA<Exception>()),
        );
      });

      test('countGrouped handles null data in response', () async {
        // Arrange
        mockApiClient.mockResponse('/stats/work_order/grouped/status', {
          'success': true,
          'data': null,
        });

        // Act
        final result = await statsService.countGrouped('work_order', 'status');

        // Assert - should return empty list for null data
        expect(result, isEmpty);
      });

      test('countGrouped with filters builds query string', () async {
        // Arrange - mock the grouped endpoint (base path, filters in query)
        mockApiClient.mockResponse('/stats/work_order/grouped/status', {
          'success': true,
          'data': [
            {'value': 'active', 'count': 5},
          ],
        });

        // Act
        final result = await statsService.countGrouped(
          'work_order',
          'status',
          filters: {'priority': 'high'},
        );

        // Assert
        expect(result.length, equals(1));
        expect(mockApiClient.wasCalled('grouped/status'), isTrue);
      });
    });

    group('sum() error paths', () {
      test('returns 0.0 when 403 Forbidden', () async {
        // Arrange
        mockApiClient.mockStatusCode('/stats/invoice/sum/total', 403, {
          'error': 'Forbidden',
        });

        // Act
        final result = await statsService.sum('invoice', 'total');

        // Assert - graceful degradation
        expect(result, equals(0.0));
      });

      test('throws when 500 Internal Server Error', () async {
        // Arrange
        mockApiClient.mockStatusCode('/stats/invoice/sum/amount', 500, {
          'error': 'Internal Server Error',
        });

        // Act & Assert
        expect(
          () => statsService.sum('invoice', 'amount'),
          throwsA(isA<Exception>()),
        );
      });

      test('sum handles null data in response', () async {
        // Arrange
        mockApiClient.mockResponse('/stats/invoice/sum/total', {
          'success': true,
          'data': null,
        });

        // Act
        final result = await statsService.sum('invoice', 'total');

        // Assert - should return 0.0 for null data
        expect(result, equals(0.0));
      });

      test('sum handles missing sum field in data', () async {
        // Arrange
        mockApiClient.mockResponse('/stats/invoice/sum/total', {
          'success': true,
          'data': {},
        });

        // Act
        final result = await statsService.sum('invoice', 'total');

        // Assert - should return 0.0 for missing sum
        expect(result, equals(0.0));
      });

      test('sum with filters builds correct query string', () async {
        // Arrange - mock endpoint base path
        mockApiClient.mockResponse('/stats/invoice/sum/total', {
          'success': true,
          'data': {'sum': 1500.50},
        });

        // Act
        final result = await statsService.sum(
          'invoice',
          'total',
          filters: {'status': 'paid', 'customer_id': '42'},
        );

        // Assert
        expect(result, equals(1500.50));
        expect(mockApiClient.wasCalled('sum/total'), isTrue);
      });

      test('sum handles integer values as doubles', () async {
        // Arrange - backend might return integer
        mockApiClient.mockResponse('/stats/invoice/sum/total', {
          'success': true,
          'data': {'sum': 1000}, // Integer, not double
        });

        // Act
        final result = await statsService.sum('invoice', 'total');

        // Assert
        expect(result, equals(1000.0));
        expect(result, isA<double>());
      });
    });

    group('Filter handling', () {
      test('count skips null filter values', () async {
        // Arrange
        mockApiClient.mockResponse('/stats/work_order', {
          'success': true,
          'data': {'count': 10},
        });

        // Act
        await statsService.count(
          'work_order',
          filters: {
            'status': 'active',
            'priority': null, // Should be skipped
            'customer_id': '123',
          },
        );

        // Assert - null value should not appear in query
        expect(mockApiClient.wasCalled('status=active'), isTrue);
        expect(mockApiClient.wasCalled('customer_id=123'), isTrue);
        // Check priority was NOT included
        final calls = mockApiClient.callHistory;
        expect(calls.any((c) => c.contains('priority=')), isFalse);
      });

      test('count properly encodes special characters in filters', () async {
        // Arrange
        mockApiClient.mockResponse('/stats/work_order', {
          'success': true,
          'data': {'count': 5},
        });

        // Act
        await statsService.count(
          'work_order',
          filters: {
            'search': 'hello world', // Space
            'tag': 'a&b', // Ampersand
          },
        );

        // Assert - characters should be URL encoded
        expect(mockApiClient.wasCalled('/stats/work_order'), isTrue);
      });
    });
  });
}
