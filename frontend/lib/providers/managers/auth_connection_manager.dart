/// AuthConnectionManager - Reusable auth lifecycle management
///
/// RESPONSIBILITIES:
/// 1. React to authentication state changes (login → load, logout → clear)
/// 2. Auto-register/unregister refreshable providers with RefreshCoordinator
///
/// This manager is NOT a ChangeNotifier. It's a composable lifecycle handler
/// that connects a provider to AuthProvider state changes.
///
/// STRICT ASYNC PATTERN:
/// - Callbacks are `FutureOr<void>` and are awaited
/// - Ensures deterministic ordering (e.g., technicians load before schedule)
/// - Proper error propagation to call site
/// - Clean test assertions without race conditions
///
/// REFRESH COORDINATION:
/// Pass optional `coordinator` and `refreshable` to enable auto-registration.
/// The refreshable will be registered when connect() is called (if authenticated)
/// and unregistered when dispose() is called.
///
/// USAGE:
/// ```dart
/// class MyProvider extends ChangeNotifier implements EntityAwareRefreshable {
///   late final AuthConnectionManager _authManager;
///
///   MyProvider({RefreshCoordinator? coordinator}) {
///     _authManager = AuthConnectionManager(
///       onLogin: _loadData,
///       onLogout: _clearData,
///       coordinator: coordinator,
///       refreshable: this,
///     );
///   }
///
///   @override
///   Set<String> get interestedEntities => {'work_order', 'invoice'};
///
///   @override
///   Future<void> refresh() => _loadData();
///
///   // ...
/// }
/// ```
library;

import 'dart:async';
import '../auth_provider.dart';
import '../interfaces/refreshable.dart';
import '../refresh_coordinator.dart';

/// Callback for auth lifecycle events (can be sync or async)
typedef LifecycleCallback = FutureOr<void> Function();

/// Reusable auth lifecycle management (login → load, logout → clear)
///
/// Callbacks are awaited by default to ensure:
/// - Deterministic ordering
/// - Proper error propagation
/// - Clean test assertions
///
/// REFRESH COORDINATION (optional):
/// Pass `coordinator` and `refreshable` to enable auto-registration.
/// - Registers refreshable with coordinator on connect
/// - Unregisters on dispose
class AuthConnectionManager {
  /// Called when user logs in (or was already logged in on connect)
  final LifecycleCallback onLogin;

  /// Called when user logs out
  final LifecycleCallback onLogout;

  /// Optional coordinator for refresh registration
  final RefreshCoordinator? _coordinator;

  /// Optional refreshable (the provider implementing EntityAwareRefreshable)
  final EntityAwareRefreshable? _refreshable;

  AuthProvider? _authProvider;
  bool _wasAuthenticated = false;
  bool _isRegistered = false;

  AuthConnectionManager({
    required this.onLogin,
    required this.onLogout,
    RefreshCoordinator? coordinator,
    EntityAwareRefreshable? refreshable,
  }) : _coordinator = coordinator,
       _refreshable = refreshable;

  // ===========================================================================
  // PUBLIC GETTERS
  // ===========================================================================

  /// Current user's role (defaults to 'customer' if not connected)
  String get userRole => _authProvider?.userRole ?? 'customer';

  /// Whether user is currently authenticated
  bool get isAuthenticated => _authProvider?.isAuthenticated ?? false;

  // ===========================================================================
  // LIFECYCLE
  // ===========================================================================

  /// Connect to auth provider and trigger onLogin if already authenticated.
  ///
  /// Also registers refreshable with coordinator if both are provided.
  ///
  /// Returns Future that completes when initial login callback finishes.
  /// This ensures deterministic initialization order.
  Future<void> connect(AuthProvider authProvider) async {
    _authProvider = authProvider;
    _wasAuthenticated = authProvider.isAuthenticated;
    authProvider.addListener(_onAuthChanged);

    // Register with coordinator for coordinated refresh
    _registerWithCoordinator();

    // If already authenticated, await onLogin before returning
    if (authProvider.isAuthenticated) {
      await onLogin();
    }
  }

  /// Register refreshable with coordinator (if both provided)
  void _registerWithCoordinator() {
    if (_coordinator != null && _refreshable != null && !_isRegistered) {
      _coordinator.register(_refreshable);
      _isRegistered = true;
    }
  }

  /// Unregister refreshable from coordinator
  void _unregisterFromCoordinator() {
    if (_coordinator != null && _refreshable != null && _isRegistered) {
      _coordinator.unregister(_refreshable);
      _isRegistered = false;
    }
  }

  /// Sync listener callback - schedules async work separately
  ///
  /// Flutter listener contract is void, so we use unawaited() explicitly
  /// to schedule async work. The _handleAuthChange method does the actual work.
  void _onAuthChanged() {
    // Schedule async work without blocking the sync callback
    unawaited(_handleAuthChange());
  }

  /// Handle auth state change asynchronously
  ///
  /// Awaits callbacks to ensure proper ordering and error propagation.
  Future<void> _handleAuthChange() async {
    final isNowAuthenticated = _authProvider?.isAuthenticated ?? false;

    if (!_wasAuthenticated && isNowAuthenticated) {
      // Just logged in
      await onLogin();
    } else if (_wasAuthenticated && !isNowAuthenticated) {
      // Just logged out
      await onLogout();
    }

    _wasAuthenticated = isNowAuthenticated;
  }

  /// Disconnect from auth provider - removes listener and unregisters from coordinator
  void dispose() {
    _unregisterFromCoordinator();
    _authProvider?.removeListener(_onAuthChanged);
    _authProvider = null;
  }
}
