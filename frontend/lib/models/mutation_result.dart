/// MutationResult - Typed result wrapper for entity mutations
///
/// SOLE RESPONSIBILITY: Represent success/failure of a mutation operation
///
/// Provides:
/// - Success with optional data payload
/// - Failure with error message
/// - Named constructors following codebase pattern (RouteGuardResult, PermissionResult)
///
/// USAGE:
/// ```dart
/// Future<MutationResult> updateEntity(int id, Map<String, dynamic> changes) async {
///   try {
///     final result = await service.update(id, changes);
///     return MutationResult.success(result);
///   } catch (e) {
///     return MutationResult.failure(e.toString());
///   }
/// }
///
/// // Consuming:
/// final result = await provider.updateEntity(1, {'status': 'completed'});
/// if (result.success) {
///   showSuccess('Updated!');
/// } else {
///   showError(result.error ?? 'Unknown error');
/// }
/// ```
library;

/// Result of a mutation operation (create, update, delete)
///
/// Immutable, with named constructors for clarity.
class MutationResult {
  /// Whether the mutation succeeded
  final bool success;

  /// The updated entity data (on success)
  final Map<String, dynamic>? data;

  /// Error message (on failure)
  final String? error;

  /// Mutation succeeded, optionally with updated data
  const MutationResult.success([this.data]) : success = true, error = null;

  /// Mutation failed with an error message
  const MutationResult.failure(String message)
    : success = false,
      data = null,
      error = message;

  /// Check if this is a successful result
  bool get isSuccess => success;

  /// Check if this is a failed result
  bool get isFailure => !success;

  @override
  String toString() => success
      ? 'MutationResult.success(${data != null ? "with data" : ""})'
      : 'MutationResult.failure($error)';

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is MutationResult &&
          runtimeType == other.runtimeType &&
          success == other.success &&
          error == other.error;

  @override
  int get hashCode => Object.hash(success, error);
}
