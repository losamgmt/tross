/// PreferencesProvider - Reactive State Management for User Preferences
///
/// SOLE RESPONSIBILITY: Provide reactive preference state to UI
///
/// This provider:
/// - Loads preferences from backend via PreferencesService
/// - Provides reactive access to preference values
/// - Handles preference updates with optimistic UI
/// - Syncs preferences across sessions via backend
/// - Listens to AuthProvider to auto-load on login
///
/// USAGE:
/// ```dart
/// // In main.dart MultiProvider:
/// ChangeNotifierProvider(create: (_) => PreferencesProvider())
///
/// // Connect to auth provider (in _AppWithRouter):
/// preferencesProvider.connectToAuth(authProvider);
///
/// // In widgets:
/// Consumer<PreferencesProvider>(
///   builder: (context, prefs, _) {
///     final theme = prefs.theme;
///     return ThemeSelector(
///       value: theme,
///       onChanged: (t) => prefs.updateTheme(t),
///     );
///   }
/// )
/// ```
library;

import 'package:flutter/foundation.dart';
import '../config/preference_keys.dart';
import '../services/preferences_service.dart';
import '../services/error_service.dart';
import 'auth_provider.dart';

/// Provider for reactive preference state management
class PreferencesProvider extends ChangeNotifier {
  UserPreferences _preferences = UserPreferences.defaults();
  bool _isLoading = false;
  String? _error;
  String? _token;

  // Auth provider reference for listening to auth changes
  AuthProvider? _authProvider;
  bool _wasAuthenticated = false;

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC GETTERS
  // ═══════════════════════════════════════════════════════════════════════════

  /// Current preferences
  UserPreferences get preferences => _preferences;

  /// Whether preferences are being loaded
  bool get isLoading => _isLoading;

  /// Whether preferences have been loaded from backend
  bool get isLoaded => _preferences.id != null;

  /// Current error message (null if no error)
  String? get error => _error;

  // ═══════════════════════════════════════════════════════════════════════════
  // TYPE-SAFE PREFERENCE ACCESS
  // ═══════════════════════════════════════════════════════════════════════════

  /// Current theme preference
  ThemePreference get theme => _preferences.theme;

  /// Whether notifications are enabled
  bool get notificationsEnabled => _preferences.notificationsEnabled;

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTH INTEGRATION
  // ═══════════════════════════════════════════════════════════════════════════

  /// Connect to AuthProvider to auto-load preferences on login
  /// Call this once during app initialization
  void connectToAuth(AuthProvider authProvider) {
    _authProvider = authProvider;
    _wasAuthenticated = authProvider.isAuthenticated;
    authProvider.addListener(_onAuthChanged);

    // If already authenticated, load preferences immediately
    if (authProvider.isAuthenticated && authProvider.token != null) {
      load(authProvider.token!);
    }
  }

  /// Handle auth state changes
  void _onAuthChanged() {
    final isNowAuthenticated = _authProvider?.isAuthenticated ?? false;
    final token = _authProvider?.token;

    // Detect transition: not authenticated → authenticated
    if (!_wasAuthenticated && isNowAuthenticated && token != null) {
      ErrorService.logInfo(
        '[PreferencesProvider] Auth state changed - loading preferences',
      );
      load(token);
    }

    // Detect transition: authenticated → not authenticated (logout)
    if (_wasAuthenticated && !isNowAuthenticated) {
      ErrorService.logInfo(
        '[PreferencesProvider] Auth state changed - clearing preferences',
      );
      clear();
    }

    _wasAuthenticated = isNowAuthenticated;
  }

  @override
  void dispose() {
    _authProvider?.removeListener(_onAuthChanged);
    super.dispose();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LIFECYCLE METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /// Load preferences for authenticated user
  ///
  /// Called after user authentication to load their preferences.
  /// [token] is the auth token for API calls.
  Future<void> load(String token) async {
    if (_isLoading) return;

    _isLoading = true;
    _error = null;
    _token = token;
    notifyListeners();

    try {
      ErrorService.logInfo('[PreferencesProvider] Loading preferences');

      _preferences = await PreferencesService.load(token);
      _error = null;

      ErrorService.logInfo(
        '[PreferencesProvider] Preferences loaded',
        context: {
          'theme': _preferences.theme.value,
          'notifications': _preferences.notificationsEnabled,
        },
      );
    } catch (e) {
      ErrorService.logError(
        '[PreferencesProvider] Failed to load preferences',
        error: e,
      );
      _error = 'Failed to load preferences';
      // Keep defaults if load fails
      _preferences = UserPreferences.defaults();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Clear preferences (on logout)
  void clear() {
    _preferences = UserPreferences.defaults();
    _error = null;
    _token = null;
    notifyListeners();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE METHODS (Type-Safe)
  // ═══════════════════════════════════════════════════════════════════════════

  /// Update theme preference
  ///
  /// Uses optimistic UI - updates local state immediately,
  /// then persists to backend asynchronously.
  Future<void> updateTheme(ThemePreference theme) async {
    if (_token == null) {
      ErrorService.logWarning(
        '[PreferencesProvider] Cannot update - not authenticated',
      );
      return;
    }

    // Optimistic update
    final oldTheme = _preferences.theme;
    _preferences = _preferences.copyWith(theme: theme);
    notifyListeners();

    try {
      final updated = await PreferencesService.updateTheme(_token!, theme);
      if (updated != null) {
        _preferences = updated;
        _error = null;
        ErrorService.logInfo(
          '[PreferencesProvider] Theme saved to database',
          context: {'theme': theme.value},
        );
      } else {
        // Service returned null - backend save failed, rollback
        ErrorService.logWarning(
          '[PreferencesProvider] Theme save failed - rolling back',
        );
        _preferences = _preferences.copyWith(theme: oldTheme);
        _error = 'Failed to save theme preference';
      }
      notifyListeners();
    } catch (e) {
      // Rollback on failure
      ErrorService.logError(
        '[PreferencesProvider] Failed to persist theme',
        error: e,
      );
      _preferences = _preferences.copyWith(theme: oldTheme);
      _error = 'Failed to save theme preference';
      notifyListeners();
    }
  }

  /// Update notifications enabled preference
  Future<void> updateNotificationsEnabled(bool enabled) async {
    if (_token == null) {
      ErrorService.logWarning(
        '[PreferencesProvider] Cannot update - not authenticated',
      );
      return;
    }

    // Optimistic update
    final oldValue = _preferences.notificationsEnabled;
    _preferences = _preferences.copyWith(notificationsEnabled: enabled);
    notifyListeners();

    try {
      final updated = await PreferencesService.updateNotificationsEnabled(
        _token!,
        enabled,
      );
      if (updated != null) {
        _preferences = updated;
        _error = null;
        ErrorService.logInfo(
          '[PreferencesProvider] Notifications setting saved to database',
          context: {'enabled': enabled},
        );
      } else {
        // Service returned null - backend save failed, rollback
        ErrorService.logWarning(
          '[PreferencesProvider] Notifications save failed - rolling back',
        );
        _preferences = _preferences.copyWith(notificationsEnabled: oldValue);
        _error = 'Failed to save notifications preference';
      }
      notifyListeners();
    } catch (e) {
      // Rollback on failure
      ErrorService.logError(
        '[PreferencesProvider] Failed to persist notifications setting',
        error: e,
      );
      _preferences = _preferences.copyWith(notificationsEnabled: oldValue);
      _error = 'Failed to save notifications preference';
      notifyListeners();
    }
  }

  /// Update multiple preferences at once
  Future<void> updateAll(Map<String, dynamic> values) async {
    if (_token == null) {
      ErrorService.logWarning(
        '[PreferencesProvider] Cannot update - not authenticated',
      );
      return;
    }

    // Store old preferences for rollback
    final oldPreferences = _preferences;

    // Optimistic update
    UserPreferences newPrefs = _preferences;
    if (values.containsKey(PreferenceKeys.theme)) {
      newPrefs = newPrefs.copyWith(
        theme: ThemePreference.fromString(
          values[PreferenceKeys.theme] as String,
        ),
      );
    }
    if (values.containsKey(PreferenceKeys.notificationsEnabled)) {
      newPrefs = newPrefs.copyWith(
        notificationsEnabled:
            values[PreferenceKeys.notificationsEnabled] as bool,
      );
    }
    _preferences = newPrefs;
    notifyListeners();

    try {
      final updated = await PreferencesService.updatePreferences(
        _token!,
        values,
      );
      if (updated != null) {
        _preferences = updated;
        notifyListeners();
      }
    } catch (e) {
      // Rollback on failure
      ErrorService.logError(
        '[PreferencesProvider] Failed to persist preferences',
        error: e,
      );
      _preferences = oldPreferences;
      _error = 'Failed to save preferences';
      notifyListeners();
    }
  }

  /// Reset all preferences to defaults
  Future<void> reset() async {
    if (_token == null) return;

    _isLoading = true;
    notifyListeners();

    try {
      final reset = await PreferencesService.reset(_token!);
      if (reset != null) {
        _preferences = reset;
      } else {
        _preferences = UserPreferences.defaults();
      }
      _error = null;
    } catch (e) {
      ErrorService.logError(
        '[PreferencesProvider] Failed to reset preferences',
        error: e,
      );
      _error = 'Failed to reset preferences';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
