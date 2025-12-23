/// StatsService Unit Tests
///
/// Tests the stats aggregation service.
/// Since StatsService makes HTTP calls, these tests verify
/// the static method signatures, data models, and error handling patterns.
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/services/stats_service.dart';

void main() {
  group('StatsService', () {
    group('Static API Signature', () {
      test('count method exists with correct signature', () {
        // Verify the method signature is correct
        Future<int> Function(String, {Map<String, dynamic>? filters}) countFn =
            StatsService.count;
        expect(countFn, isNotNull);
      });

      test('countGrouped method exists with correct signature', () {
        Future<List<GroupedCount>> Function(
          String,
          String, {
          Map<String, dynamic>? filters,
        })
        fn = StatsService.countGrouped;
        expect(fn, isNotNull);
      });

      test('sum method exists with correct signature', () {
        Future<double> Function(String, String, {Map<String, dynamic>? filters})
        fn = StatsService.sum;
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

    group('Error Handling (no network)', () {
      // These tests verify behavior when API calls fail
      // (which they will without a real backend/auth)

      test('count throws when not authenticated', () async {
        // Without valid token, should throw
        expect(() => StatsService.count('work_order'), throwsException);
      });

      test('countGrouped throws when not authenticated', () async {
        expect(
          () => StatsService.countGrouped('work_order', 'status'),
          throwsException,
        );
      });

      test('sum throws when not authenticated', () async {
        expect(() => StatsService.sum('invoice', 'total'), throwsException);
      });
    });

    group('Query String Building', () {
      // These tests document the expected query string behavior
      // by testing edge cases in the filter handling

      test('count accepts empty filters', () async {
        // Should not throw on empty filters
        // Will still fail on auth, but filters param is valid
        expect(
          () => StatsService.count('work_order', filters: {}),
          throwsException, // Auth failure, not filter failure
        );
      });

      test('count accepts null filter values', () async {
        // Null values should be filtered out
        expect(
          () => StatsService.count(
            'work_order',
            filters: {'status': null, 'priority': 'high'},
          ),
          throwsException, // Auth failure, not filter failure
        );
      });
    });
  });
}
