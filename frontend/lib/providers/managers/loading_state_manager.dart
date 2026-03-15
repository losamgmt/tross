/// LoadingStateManager - Reusable loading/error/lastUpdated state management
///
/// SOLE RESPONSIBILITY: Manage async operation lifecycle state
///
/// This manager is NOT a ChangeNotifier. It's a composable state container
/// that notifies its parent via callback. This enables:
/// - Composition over inheritance
/// - Clean separation of concerns
/// - Reuse across multiple providers
///
/// USAGE:
/// ```dart
/// class MyProvider extends ChangeNotifier {
///   late final LoadingStateManager _loadingManager;
///
///   MyProvider() {
///     _loadingManager = LoadingStateManager(notifyListeners);
///   }
///
///   bool get isLoading => _loadingManager.isLoading;
///   String? get error => _loadingManager.error;
///
///   Future<void> loadData() async {
///     await _loadingManager.runAsync(() async {
///       // Do async work
///     });
///   }
/// }
/// ```
library;

/// Callback for parent notification (typically notifyListeners)
typedef NotifyCallback = void Function();

/// Reusable loading/error/lastUpdated state management
///
/// Encapsulates the standard async operation lifecycle:
/// - startLoading() -> completeSuccess() or completeError()
/// - Or use runAsync() for automatic lifecycle management
///
/// Thread-safe against concurrent loads - runAsync ignores calls while loading.
class LoadingStateManager {
  final NotifyCallback _notify;

  bool _isLoading = false;
  String? _error;
  DateTime? _lastUpdated;

  LoadingStateManager(this._notify);

  // ===========================================================================
  // PUBLIC GETTERS
  // ===========================================================================

  /// Whether an async operation is in progress
  bool get isLoading => _isLoading;

  /// Current error message (null if no error)
  String? get error => _error;

  /// When the last successful operation completed
  DateTime? get lastUpdated => _lastUpdated;

  /// Whether at least one successful load has completed
  bool get isLoaded => _lastUpdated != null;

  // ===========================================================================
  // MANUAL STATE MANAGEMENT
  // ===========================================================================

  /// Begin loading state - clears any previous error
  void startLoading() {
    _isLoading = true;
    _error = null;
    _notify();
  }

  /// Complete with success - sets lastUpdated timestamp
  void completeSuccess() {
    _isLoading = false;
    _lastUpdated = DateTime.now();
    _notify();
  }

  /// Complete with error - sets error message
  void completeError(String message) {
    _isLoading = false;
    _error = message;
    _notify();
  }

  /// Reset all state to initial values
  void reset() {
    _isLoading = false;
    _error = null;
    _lastUpdated = null;
    _notify();
  }

  // ===========================================================================
  // AUTOMATIC STATE MANAGEMENT
  // ===========================================================================

  /// Run async operation with automatic state management
  ///
  /// Handles the entire loading lifecycle:
  /// 1. If already loading, returns null (prevents concurrent loads)
  /// 2. Calls startLoading()
  /// 3. Executes operation
  /// 4. On success: completeSuccess(), returns result
  /// 5. On error: completeError(), returns null
  ///
  /// Example:
  /// ```dart
  /// final result = await _loadingManager.runAsync(
  ///   () async => await api.fetchItems(),
  ///   errorMessage: 'Failed to load items',
  /// );
  /// if (result != null) {
  ///   _items = result;
  /// }
  /// ```
  Future<T?> runAsync<T>(
    Future<T> Function() operation, {
    String errorMessage = 'Operation failed',
  }) async {
    // Prevent concurrent operations
    if (_isLoading) return null;

    startLoading();
    try {
      final result = await operation();
      completeSuccess();
      return result;
    } catch (e) {
      completeError(errorMessage);
      return null;
    }
  }

  /// Run async operation that returns void
  ///
  /// Same as runAsync but for operations with no return value.
  /// Returns true on success, false on error or if already loading.
  Future<bool> runAsyncVoid(
    Future<void> Function() operation, {
    String errorMessage = 'Operation failed',
  }) async {
    final result = await runAsync<bool>(() async {
      await operation();
      return true;
    }, errorMessage: errorMessage);
    return result ?? false;
  }
}
