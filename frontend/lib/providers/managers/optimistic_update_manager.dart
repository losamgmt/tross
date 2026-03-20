/// OptimisticUpdateManager - Reusable optimistic update orchestration
///
/// SOLE RESPONSIBILITY: Coordinate snapshot → apply → persist → rollback
///
/// This manager is NOT a ChangeNotifier. It's a composable state handler
/// that notifies its parent via callback. This enables:
/// - Composition over inheritance
/// - Clean separation of concerns
/// - Reuse across multiple providers
///
/// Integrates with ErrorService for consistent error logging.
///
/// USAGE:
/// ```dart
/// class MyProvider extends ChangeNotifier implements Mutatable {
///   late final OptimisticUpdateManager _optimistic;
///
///   MyProvider() {
///     _optimistic = OptimisticUpdateManager(notifyListeners);
///   }
///
///   @override
///   Future<MutationResult> updateEntity(String entity, int id, Map<String, dynamic> changes) async {
///     final snapshot = _captureSnapshot(id);
///
///     return _optimistic.run(
///       snapshot: snapshot,
///       applyOptimistic: () => _applyChanges(id, changes),
///       persist: () => _service.update(entity, id, changes),
///       rollback: (old) => _restoreSnapshot(id, old),
///       errorContext: 'MyProvider.updateEntity',
///     );
///   }
/// }
/// ```
library;

import '../../models/mutation_result.dart';
import '../../services/error_service.dart';

/// Callback for parent notification (typically notifyListeners)
typedef NotifyCallback = void Function();

/// Reusable optimistic update orchestration
///
/// Encapsulates the standard optimistic update lifecycle:
/// 1. Capture snapshot (caller provides)
/// 2. Apply optimistic change immediately
/// 3. Notify UI
/// 4. Persist to backend
/// 5. On failure: rollback and notify again
///
/// Thread-safe: Multiple concurrent runs are allowed (no blocking).
class OptimisticUpdateManager {
  final NotifyCallback _notify;

  OptimisticUpdateManager(this._notify);

  /// Run an optimistic update with automatic rollback on failure
  ///
  /// Type parameter [T] is the snapshot type - can be anything the caller
  /// needs to restore state (Map, List, custom object, etc.)
  ///
  /// [snapshot] - The current state before mutation (for rollback)
  /// [applyOptimistic] - Apply the change to local state immediately
  /// [persist] - Async call to persist the change to backend
  /// [rollback] - Restore from snapshot if persist fails
  /// [errorContext] - Label for error logging (e.g., 'ScheduleProvider.updateEntity')
  ///
  /// Returns [MutationResult.success] with data on success,
  /// or [MutationResult.failure] with error message on failure.
  Future<MutationResult> run<T>({
    required T snapshot,
    required void Function() applyOptimistic,
    required Future<Map<String, dynamic>> Function() persist,
    required void Function(T snapshot) rollback,
    String errorContext = 'OptimisticUpdate',
  }) async {
    return _execute(
      snapshot: snapshot,
      applyOptimistic: applyOptimistic,
      persist: () async => await persist(),
      rollback: rollback,
      errorContext: errorContext,
    );
  }

  /// Run an optimistic update that doesn't return data
  ///
  /// Convenience method for mutations where the persist call
  /// doesn't return meaningful data (e.g., delete operations).
  Future<MutationResult> runVoid<T>({
    required T snapshot,
    required void Function() applyOptimistic,
    required Future<void> Function() persist,
    required void Function(T snapshot) rollback,
    String errorContext = 'OptimisticUpdate',
  }) async {
    return _execute(
      snapshot: snapshot,
      applyOptimistic: applyOptimistic,
      persist: () async {
        await persist();
        return null;
      },
      rollback: rollback,
      errorContext: errorContext,
    );
  }

  /// Core optimistic update execution
  ///
  /// Handles the snapshot → apply → persist → rollback lifecycle.
  /// Returns data from persist (or null for void operations).
  Future<MutationResult> _execute<T>({
    required T snapshot,
    required void Function() applyOptimistic,
    required Future<Map<String, dynamic>?> Function() persist,
    required void Function(T snapshot) rollback,
    required String errorContext,
  }) async {
    // Step 1: Apply optimistic change and notify UI
    applyOptimistic();
    _notify();

    // Step 2: Persist to backend
    try {
      final result = await persist();
      return MutationResult.success(result);
    } catch (e, stackTrace) {
      // Step 3: On failure, rollback and notify
      ErrorService.logError(
        '[$errorContext] Failed - rolling back',
        error: e,
        stackTrace: stackTrace,
      );
      rollback(snapshot);
      _notify();
      return MutationResult.failure(e.toString());
    }
  }
}
