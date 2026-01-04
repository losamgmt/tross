/// StatsService Unit Tests (DI-Based)
///
/// Tests the stats aggregation service using dependency injection.
/// Uses MockApiClient for DI pattern demonstration.
/// Note: Full API tests require token mocking (Phase 2).
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/services/stats_service.dart';

import '../mocks/mock_api_client.dart';

void main() {
  late MockApiClient mockApiClient;
  late StatsService statsService;

  setUp(() {
    mockApiClient = MockApiClient();
    statsService = StatsService(mockApiClient);
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
      // Full API mocking requires TokenManager mocking (Phase 2)

      test('count throws when not authenticated', () async {
        // Without token, service should throw (caught in caller)
        expect(() => statsService.count('work_order'), throwsException);
      });

      test('countGrouped throws when not authenticated', () async {
        expect(
          () => statsService.countGrouped('work_order', 'status'),
          throwsException,
        );
      });

      test('sum throws when not authenticated', () async {
        expect(() => statsService.sum('invoice', 'total'), throwsException);
      });
    });
  });
}
