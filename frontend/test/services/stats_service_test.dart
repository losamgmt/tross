/// StatsService Unit Tests (DI-Based)
///
/// Tests the stats aggregation service using dependency injection.
/// Uses MockApiClient + MockTokenProvider for full testability.
///
/// ARCHITECTURE:
/// - MockApiClient: Mocks HTTP responses
/// - MockTokenProvider: Provides mock token (no flutter_secure_storage)
/// - Service constructed with both mocks = fully testable
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/services/stats_service.dart';

import '../mocks/mock_api_client.dart';
import '../mocks/mock_token_provider.dart';

void main() {
  late MockApiClient mockApiClient;
  late MockTokenProvider mockTokenProvider;
  late StatsService statsService;

  setUp(() {
    mockApiClient = MockApiClient();
    mockTokenProvider = MockTokenProvider();
    statsService = StatsService(mockApiClient, mockTokenProvider);
  });

  tearDown(() {
    mockApiClient.reset();
  });

  group('StatsService', () {
    group('DI Construction', () {
      test('can be constructed with ApiClient', () {
        expect(statsService, isNotNull);
        expect(statsService, isA<StatsService>());
      });

      test('count method exists with correct signature', () {
        // Verify the method signature is correct
        Future<int> Function(String, {Map<String, dynamic>? filters}) countFn =
            statsService.count;
        expect(countFn, isNotNull);
      });

      test('countGrouped method exists with correct signature', () {
        Future<List<GroupedCount>> Function(
          String,
          String, {
          Map<String, dynamic>? filters,
        })
        fn = statsService.countGrouped;
        expect(fn, isNotNull);
      });

      test('sum method exists with correct signature', () {
        Future<double> Function(String, String, {Map<String, dynamic>? filters})
        fn = statsService.sum;
        expect(fn, isNotNull);
      });
    });

    group('GroupedCount', () {
      test('fromJson parses correctly', () {
        final json = {'value': 'pending', 'count': 42};
        final result = GroupedCount.fromJson(json);

        expect(result.value, equals('pending'));
        expect(result.count, equals(42));
      });

      test('fromJson handles null value', () {
        final json = {'value': null, 'count': 10};
        final result = GroupedCount.fromJson(json);

        expect(result.value, equals(''));
        expect(result.count, equals(10));
      });

      test('fromJson handles null count', () {
        final json = {'value': 'active', 'count': null};
        final result = GroupedCount.fromJson(json);

        expect(result.value, equals('active'));
        expect(result.count, equals(0));
      });

      test('fromJson handles missing fields', () {
        final result = GroupedCount.fromJson({});

        expect(result.value, equals(''));
        expect(result.count, equals(0));
      });

      test('fromJson converts numeric value to string', () {
        final json = {'value': 123, 'count': 5};
        final result = GroupedCount.fromJson(json);

        expect(result.value, equals('123'));
        expect(result.count, equals(5));
      });

      test('toString returns readable format', () {
        const grouped = GroupedCount(value: 'completed', count: 99);
        expect(grouped.toString(), equals('GroupedCount(completed: 99)'));
      });

      test('const constructor works correctly', () {
        const grouped = GroupedCount(value: 'test', count: 1);

        expect(grouped.value, equals('test'));
        expect(grouped.count, equals(1));
      });
    });

    group('Error Handling (no token)', () {
      // These tests verify graceful failure when not authenticated
      test('count throws when not authenticated', () async {
        // Create service with unauthenticated token provider
        final unauthService = StatsService(
          mockApiClient,
          MockTokenProvider.unauthenticated(),
        );
        expect(() => unauthService.count('work_order'), throwsException);
      });

      test('countGrouped throws when not authenticated', () async {
        final unauthService = StatsService(
          mockApiClient,
          MockTokenProvider.unauthenticated(),
        );
        expect(
          () => unauthService.countGrouped('work_order', 'status'),
          throwsException,
        );
      });

      test('sum throws when not authenticated', () async {
        final unauthService = StatsService(
          mockApiClient,
          MockTokenProvider.unauthenticated(),
        );
        expect(() => unauthService.sum('invoice', 'total'), throwsException);
      });
    });

    group('API Integration (with MockTokenProvider)', () {
      // These tests verify full API interaction with mocked token
      test('count returns mocked count', () async {
        mockApiClient.mockResponse('/stats/work_order', {
          'success': true,
          'data': {'count': 42},
        });

        final result = await statsService.count('work_order');
        expect(result, equals(42));
      });

      test('count with filters builds correct query', () async {
        mockApiClient.mockResponse('/stats/work_order?status=pending', {
          'success': true,
          'data': {'count': 10},
        });

        final result = await statsService.count(
          'work_order',
          filters: {'status': 'pending'},
        );
        expect(result, equals(10));
      });

      test('countGrouped returns mocked grouped data', () async {
        mockApiClient.mockResponse('/stats/work_order/grouped/status', {
          'success': true,
          'data': [
            {'value': 'pending', 'count': 5},
            {'value': 'completed', 'count': 10},
          ],
        });

        final result = await statsService.countGrouped('work_order', 'status');
        expect(result.length, equals(2));
        expect(result[0].value, equals('pending'));
        expect(result[0].count, equals(5));
      });

      test('sum returns mocked sum value', () async {
        mockApiClient.mockResponse('/stats/invoice/sum/total', {
          'success': true,
          'data': {'sum': 12500.50},
        });

        final result = await statsService.sum('invoice', 'total');
        expect(result, equals(12500.50));
      });
    });
  });
}
