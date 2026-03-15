/// LoadingStateManager Unit Tests
///
/// Tests loading state management, error handling, and async lifecycle.
/// Following TEST_PHILOSOPHY.md behavioral testing patterns.
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross/providers/managers/loading_state_manager.dart';

void main() {
  group('LoadingStateManager', () {
    group('initial state', () {
      test('starts with not loading', () {
        final manager = LoadingStateManager(() {});

        expect(manager.isLoading, false);
      });

      test('starts with no error', () {
        final manager = LoadingStateManager(() {});

        expect(manager.error, isNull);
      });

      test('starts with no lastUpdated', () {
        final manager = LoadingStateManager(() {});

        expect(manager.lastUpdated, isNull);
      });

      test('isLoaded is false initially', () {
        final manager = LoadingStateManager(() {});

        expect(manager.isLoaded, false);
      });
    });

    group('startLoading', () {
      test('sets loading state', () {
        final manager = LoadingStateManager(() {});

        manager.startLoading();

        expect(manager.isLoading, true);
      });

      test('clears error', () {
        final manager = LoadingStateManager(() {});
        manager.completeError('Previous error');

        manager.startLoading();

        expect(manager.error, isNull);
      });

      test('notifies listener', () {
        int notifyCount = 0;
        final manager = LoadingStateManager(() => notifyCount++);

        manager.startLoading();

        expect(notifyCount, 1);
      });
    });

    group('completeSuccess', () {
      test('clears loading state', () {
        final manager = LoadingStateManager(() {});
        manager.startLoading();

        manager.completeSuccess();

        expect(manager.isLoading, false);
      });

      test('sets lastUpdated', () {
        final manager = LoadingStateManager(() {});
        final before = DateTime.now();

        manager.completeSuccess();

        expect(manager.lastUpdated, isNotNull);
        expect(
          manager.lastUpdated!.isAfter(before.subtract(Duration(seconds: 1))),
          true,
        );
      });

      test('sets isLoaded to true', () {
        final manager = LoadingStateManager(() {});

        manager.completeSuccess();

        expect(manager.isLoaded, true);
      });

      test('notifies listener', () {
        int notifyCount = 0;
        final manager = LoadingStateManager(() => notifyCount++);
        manager.startLoading();
        notifyCount = 0; // Reset after startLoading

        manager.completeSuccess();

        expect(notifyCount, 1);
      });
    });

    group('completeError', () {
      test('clears loading state', () {
        final manager = LoadingStateManager(() {});
        manager.startLoading();

        manager.completeError('Test error');

        expect(manager.isLoading, false);
      });

      test('sets error message', () {
        final manager = LoadingStateManager(() {});

        manager.completeError('Test error');

        expect(manager.error, 'Test error');
      });

      test('notifies listener', () {
        int notifyCount = 0;
        final manager = LoadingStateManager(() => notifyCount++);

        manager.completeError('Test error');

        expect(notifyCount, 1);
      });
    });

    group('reset', () {
      test('clears loading state', () {
        final manager = LoadingStateManager(() {});
        manager.startLoading();

        manager.reset();

        expect(manager.isLoading, false);
      });

      test('clears error', () {
        final manager = LoadingStateManager(() {});
        manager.completeError('Test error');

        manager.reset();

        expect(manager.error, isNull);
      });

      test('clears lastUpdated', () {
        final manager = LoadingStateManager(() {});
        manager.completeSuccess();

        manager.reset();

        expect(manager.lastUpdated, isNull);
        expect(manager.isLoaded, false);
      });

      test('notifies listener', () {
        int notifyCount = 0;
        final manager = LoadingStateManager(() => notifyCount++);

        manager.reset();

        expect(notifyCount, 1);
      });
    });

    group('runAsync', () {
      test('returns result on success', () async {
        final manager = LoadingStateManager(() {});

        final result = await manager.runAsync(() async => 42);

        expect(result, 42);
      });

      test('sets loading state during operation', () async {
        bool wasLoadingDuringOperation = false;
        final manager = LoadingStateManager(() {});

        await manager.runAsync(() async {
          wasLoadingDuringOperation = manager.isLoading;
          return 'done';
        });

        expect(wasLoadingDuringOperation, true);
        expect(manager.isLoading, false);
      });

      test('sets lastUpdated on success', () async {
        final manager = LoadingStateManager(() {});

        await manager.runAsync(() async => 'done');

        expect(manager.lastUpdated, isNotNull);
      });

      test('returns null on error', () async {
        final manager = LoadingStateManager(() {});

        final result = await manager.runAsync(
          () async => throw Exception('fail'),
          errorMessage: 'Custom error',
        );

        expect(result, isNull);
      });

      test('sets error message on failure', () async {
        final manager = LoadingStateManager(() {});

        await manager.runAsync(
          () async => throw Exception('fail'),
          errorMessage: 'Custom error',
        );

        expect(manager.error, 'Custom error');
      });

      test('uses default error message', () async {
        final manager = LoadingStateManager(() {});

        await manager.runAsync(() async => throw Exception('fail'));

        expect(manager.error, 'Operation failed');
      });

      test('ignores concurrent calls', () async {
        final manager = LoadingStateManager(() {});
        int callCount = 0;

        manager.startLoading(); // Simulate already loading

        final result = await manager.runAsync(() async {
          callCount++;
          return 'done';
        });

        expect(result, isNull); // Ignored since already loading
        expect(callCount, 0); // Operation never executed
      });

      test('notifies on start and completion', () async {
        int notifyCount = 0;
        final manager = LoadingStateManager(() => notifyCount++);

        await manager.runAsync(() async => 'done');

        expect(notifyCount, 2); // Once for start, once for complete
      });
    });

    group('runAsyncVoid', () {
      test('returns true on success', () async {
        final manager = LoadingStateManager(() {});

        final result = await manager.runAsyncVoid(() async {
          // Do some work
        });

        expect(result, true);
      });

      test('returns false on error', () async {
        final manager = LoadingStateManager(() {});

        final result = await manager.runAsyncVoid(
          () async => throw Exception('fail'),
          errorMessage: 'Failed',
        );

        expect(result, false);
      });

      test('returns false when already loading', () async {
        final manager = LoadingStateManager(() {});
        manager.startLoading();

        final result = await manager.runAsyncVoid(() async {});

        expect(result, false);
      });
    });
  });
}
