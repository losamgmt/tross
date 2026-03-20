/// Mutatable Interface - Generic mutation contract for providers
///
/// DESIGN PRINCIPLES:
/// - Entity-agnostic: Works with any entity type via entityName string
/// - Generic: Arbitrary field changes via `Map<String, dynamic>`
/// - Composable: Implement alongside Refreshable for full CRUD capability
/// - SRP: Single responsibility - "I can mutate entities"
///
/// USAGE:
/// ```dart
/// class ScheduleProvider extends ChangeNotifier implements Mutatable {
///   @override
///   Future<MutationResult> updateEntity(
///     String entityName,
///     int id,
///     Map<String, dynamic> changes,
///   ) async {
///     // Use OptimisticUpdateManager for consistent behavior
///     return _optimistic.run(...);
///   }
/// }
///
/// // At usage site (e.g., DropZone callback):
/// context.read<ScheduleProvider>().updateEntity('work_order', 42, {
///   'scheduled_start': newStart.toIso8601String(),
///   'assigned_technician_id': techId,
/// });
/// ```
library;

import '../../models/mutation_result.dart';

/// Generic mutation interface - completely entity-agnostic
///
/// ANY provider that can mutate entities can implement this.
/// This is a pure SRP unit: "I can update entities."
///
/// Use with OptimisticUpdateManager for consistent optimistic update behavior.
abstract interface class Mutatable {
  /// Update an entity with arbitrary field changes
  ///
  /// [entityName] - The entity type (e.g., 'work_order', 'property')
  /// [id] - The entity's primary key
  /// [changes] - Map of field names to new values
  ///
  /// Returns [MutationResult.success] with updated entity on success,
  /// or [MutationResult.failure] with error message on failure.
  ///
  /// Implementations should:
  /// - Apply optimistic updates (instant UI feedback)
  /// - Persist to backend
  /// - Rollback on failure
  /// - Trigger coordinated refresh on success
  Future<MutationResult> updateEntity(
    String entityName,
    int id,
    Map<String, dynamic> changes,
  );
}
