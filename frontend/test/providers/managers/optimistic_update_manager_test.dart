/// OptimisticUpdateManager Unit Tests
///
/// Tests optimistic update lifecycle: apply → persist → rollback on failure.
/// Following TEST_PHILOSOPHY.md behavioral testing patterns.
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross/providers/managers/optimistic_update_manager.dart';
import 'package:tross/services/error_service.dart';

void main() {
  // Suppress error logging during tests
  setUp(() {
    ErrorService.setTestMode(true);
  });

  tearDown(() {
    ErrorService.setTestMode(false);
  });

  group('OptimisticUpdateManager', () {
    group('successful update', () {
      test('applies optimistic change immediately', () async {
        int notifyCount = 0;
        final manager = OptimisticUpdateManager(() => notifyCount++);
        bool optimisticApplied = false;

        await manager.run<Map<String, dynamic>>(
          snapshot: {'id': 1, 'status': 'old'},
          applyOptimistic: () => optimisticApplied = true,
          persist: () async => {'id': 1, 'status': 'new'},
          rollback: (_) {},
        );

        expect(optimisticApplied, isTrue);
      });

      test('notifies listener after optimistic apply', () async {
        int notifyCount = 0;
        final manager = OptimisticUpdateManager(() => notifyCount++);

        await manager.run<int>(
          snapshot: 0,
          applyOptimistic: () {},
          persist: () async => {'success': true},
          rollback: (_) {},
        );

        // Should notify once for optimistic apply (not on success - no rollback needed)
        expect(notifyCount, 1);
      });

      test('returns success result with data', () async {
        final manager = OptimisticUpdateManager(() {});
        final expectedData = {'id': 1, 'status': 'completed'};

        final result = await manager.run<int>(
          snapshot: 0,
          applyOptimistic: () {},
          persist: () async => expectedData,
          rollback: (_) {},
        );

        expect(result.success, isTrue);
        expect(result.data, equals(expectedData));
        expect(result.error, isNull);
      });

      test('does not call rollback on success', () async {
        final manager = OptimisticUpdateManager(() {});
        bool rollbackCalled = false;

        await manager.run<int>(
          snapshot: 0,
          applyOptimistic: () {},
          persist: () async => {},
          rollback: (_) => rollbackCalled = true,
        );

        expect(rollbackCalled, isFalse);
      });
    });

    group('failed update', () {
      test('calls rollback with original snapshot', () async {
        final manager = OptimisticUpdateManager(() {});
        Map<String, dynamic>? restoredSnapshot;
        final originalSnapshot = {'id': 1, 'status': 'original'};

        await manager.run<Map<String, dynamic>>(
          snapshot: originalSnapshot,
          applyOptimistic: () {},
          persist: () async => throw Exception('Network error'),
          rollback: (snapshot) => restoredSnapshot = snapshot,
        );

        expect(restoredSnapshot, equals(originalSnapshot));
      });

      test('notifies listener twice: apply and rollback', () async {
        int notifyCount = 0;
        final manager = OptimisticUpdateManager(() => notifyCount++);

        await manager.run<int>(
          snapshot: 0,
          applyOptimistic: () {},
          persist: () async => throw Exception('Error'),
          rollback: (_) {},
        );

        expect(notifyCount, 2); // Once for apply, once for rollback
      });

      test('returns failure result with error message', () async {
        final manager = OptimisticUpdateManager(() {});

        final result = await manager.run<int>(
          snapshot: 0,
          applyOptimistic: () {},
          persist: () async => throw Exception('Database error'),
          rollback: (_) {},
        );

        expect(result.success, isFalse);
        expect(result.error, contains('Database error'));
        expect(result.data, isNull);
      });
    });

    group('runVoid', () {
      test('returns success for void persist', () async {
        final manager = OptimisticUpdateManager(() {});

        final result = await manager.runVoid<int>(
          snapshot: 0,
          applyOptimistic: () {},
          persist: () async {},
          rollback: (_) {},
        );

        expect(result.success, isTrue);
        expect(result.data, isNull); // No data for void operations
      });

      test('handles failure same as run', () async {
        final manager = OptimisticUpdateManager(() {});
        bool rollbackCalled = false;

        final result = await manager.runVoid<int>(
          snapshot: 0,
          applyOptimistic: () {},
          persist: () async => throw Exception('Error'),
          rollback: (_) => rollbackCalled = true,
        );

        expect(result.success, isFalse);
        expect(rollbackCalled, isTrue);
      });
    });

    group('generic snapshot type', () {
      test('works with Map snapshot', () async {
        final manager = OptimisticUpdateManager(() {});
        Map<String, dynamic>? captured;

        await manager.run<Map<String, dynamic>>(
          snapshot: {'key': 'value'},
          applyOptimistic: () {},
          persist: () async => throw Exception('Error'),
          rollback: (s) => captured = s,
        );

        expect(captured, equals({'key': 'value'}));
      });

      test('works with List snapshot', () async {
        final manager = OptimisticUpdateManager(() {});
        List<int>? captured;

        await manager.run<List<int>>(
          snapshot: [1, 2, 3],
          applyOptimistic: () {},
          persist: () async => throw Exception('Error'),
          rollback: (s) => captured = s,
        );

        expect(captured, equals([1, 2, 3]));
      });

      test('works with primitive snapshot', () async {
        final manager = OptimisticUpdateManager(() {});
        String? captured;

        await manager.run<String>(
          snapshot: 'original',
          applyOptimistic: () {},
          persist: () async => throw Exception('Error'),
          rollback: (s) => captured = s,
        );

        expect(captured, equals('original'));
      });
    });
  });
}
