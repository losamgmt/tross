/// PreferencesProvider - 100% Metadata-Driven User Preferences
///
/// SOLE RESPONSIBILITY: Provide reactive preference state to UI
///
/// This provider is FULLY METADATA-DRIVEN:
/// - Stores preferences as Map (no hardcoded fields)
/// - Gets defaults from preferenceSchema in entity-metadata.json
/// - Handles ANY preference key without code changes
/// - Only ThemePreference enum exists for MaterialApp binding
///
/// To add a new preference:
/// 1. Add it to backend/config/models/preferences-metadata.js preferenceSchema
/// 2. Run: node scripts/sync-entity-metadata.js
/// 3. Done! It appears in the UI automatically. No provider changes needed.
///
/// USAGE:
/// ```dart
/// // Get any preference value (reads from map, falls back to metadata default)
/// final pageSize = prefs.getPreference('defaultPageSize');
///
/// // Update any preference (generic, works with any key)
/// prefs.updatePreference('tableDensity', 'compact');
///
/// // Theme specifically (for MaterialApp binding)
/// final theme = prefs.theme; // Returns ThemePreference enum
/// ```
library;

import 'package:flutter/foundation.dart';
import '../config/preference_keys.dart';
import '../services/preferences_service.dart';
import '../services/entity_metadata.dart';
import '../services/error_service.dart';
import 'auth_provider.dart';

/// Provider for reactive preference state management
///
/// Stores preferences as a simple Map, driven by metadata.
class PreferencesProvider extends ChangeNotifier {
  PreferencesService? _preferencesService;

  /// Raw preferences map from API
  Map<String, dynamic> _preferences = {};

  /// Preference schema from metadata (for defaults)
  Map<String, PreferenceFieldDefinition>? _schema;

  bool _isLoading = false;
  String? _error;
  String? _token;
  int? _userId;

  // Auth provider reference for listening to auth changes
  AuthProvider? _authProvider;
  bool _wasAuthenticated = false;

  /// Set the PreferencesService dependency
  void setPreferencesService(PreferencesService service) {
    _preferencesService = service;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC GETTERS
  // ═══════════════════════════════════════════════════════════════════════════

  /// Whether preferences are being loaded
  bool get isLoading => _isLoading;

  /// Whether preferences have been loaded from backend
  bool get isLoaded => _preferences.isNotEmpty;

  /// Current error message (null if no error)
  String? get error => _error;

  // ═══════════════════════════════════════════════════════════════════════════
  // THEME ACCESS (Only typed getter - needed for MaterialApp)
  // ═══════════════════════════════════════════════════════════════════════════

  /// Current theme preference
  ///
  /// This is the ONLY typed getter because MaterialApp needs ThemeMode.
  /// All other preferences use getPreference(key).
  /// Returns 'system' during early startup before preferences load.
  ThemePreference get theme {
    // Check loaded preferences first
    if (_preferences.containsKey('theme')) {
      return ThemePreference.fromString(_preferences['theme'] as String?);
    }

    // Try schema default
    _ensureSchemaLoaded();
    final fieldDef = _schema?['theme'];
    if (fieldDef != null) {
      return ThemePreference.fromString(fieldDef.defaultValue as String?);
    }

    // Hardcoded fallback for early startup (before metadata loads)
    // This prevents warning logs during the initial app build
    return ThemePreference.system;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERIC PREFERENCE ACCESS (100% Metadata-Driven)
  // ═══════════════════════════════════════════════════════════════════════════

  /// Track if preferences have been loaded at least once
  bool _hasLoadedOnce = false;

  /// Get preference value by key
  ///
  /// Returns current value from preferences map, or default from metadata schema.
  /// Works with ANY preference key defined in preferenceSchema.
  dynamic getPreference(String key) {
    // Return current value if set
    if (_preferences.containsKey(key)) {
      return _preferences[key];
    }

    // Fall back to default from metadata schema
    _ensureSchemaLoaded();
    final fieldDef = _schema?[key];
    if (fieldDef != null) {
      return fieldDef.defaultValue;
    }

    // Only warn about unknown keys AFTER preferences have been loaded once
    // During startup, it's normal for preferences to be empty
    if (_hasLoadedOnce) {
      ErrorService.logWarning(
        '[PreferencesProvider] Unknown preference key: $key',
      );
    }
    return null;
  }

  /// Update preference by key
  ///
  /// Generic update with optimistic UI. Works with ANY preference key.
  /// [key] is the preference key from preferenceSchema.
  /// [value] is the new value (type must match schema).
  Future<void> updatePreference(String key, dynamic value) async {
    if (_token == null || _userId == null) {
      ErrorService.logWarning(
        '[PreferencesProvider] Cannot update - not authenticated',
      );
      return;
    }

    // Store old value for rollback
    final oldValue = _preferences[key];

    // Optimistic update
    _preferences[key] = value;
    notifyListeners();

    try {
      if (_preferencesService == null) {
        ErrorService.logWarning(
          '[PreferencesProvider] No preferences service set',
        );
        return;
      }
      // Use generic entity pattern: PATCH /preferences/:userId
      final updated = await _preferencesService!.updateField(
        _token!,
        _userId!,
        key,
        value,
      );
      if (updated != null) {
        // Merge updated preferences from backend
        _preferences = updated;
        _error = null;
        ErrorService.logInfo(
          '[PreferencesProvider] Preference saved to database',
          context: {'key': key, 'value': value},
        );
      } else {
        // Service returned null - backend save failed, rollback
        ErrorService.logWarning(
          '[PreferencesProvider] Preference save failed - rolling back',
        );
        if (oldValue != null) {
          _preferences[key] = oldValue;
        } else {
          _preferences.remove(key);
        }
        _error = 'Failed to save preference';
      }
      notifyListeners();
    } catch (e) {
      // Rollback on failure
      ErrorService.logError(
        '[PreferencesProvider] Failed to persist preference',
        error: e,
      );
      if (oldValue != null) {
        _preferences[key] = oldValue;
      } else {
        _preferences.remove(key);
      }
      _error = 'Failed to save preference';
      notifyListeners();
    }
  }

  /// Update multiple preferences from a map
  ///
  /// Generic batch update for use with GenericForm. Compares incoming
  /// values against current state and only persists changed fields.
  /// Works with ANY preference keys defined in the fields metadata.
  ///
  /// [newValues] - Map of preference key -> value pairs
  void updatePreferences(Map<String, dynamic> newValues) {
    // Find changed fields by comparing with current values
    final changedKeys = <String>[];
    for (final entry in newValues.entries) {
      final key = entry.key;
      final newValue = entry.value;
      final currentValue = _preferences[key];

      // Skip if value hasn't changed
      if (currentValue == newValue) continue;

      changedKeys.add(key);
    }

    // Update each changed preference
    for (final key in changedKeys) {
      updatePreference(key, newValues[key]);
    }
  }

  /// Get all current preferences as a map
  ///
  /// Returns a copy of the current preferences map for use with GenericForm.
  /// The returned map can be passed as the initial value to GenericForm.
  Map<String, dynamic> get preferencesMap => Map.from(_preferences);

  /// Ensure preference schema is loaded from metadata
  void _ensureSchemaLoaded() {
    if (_schema != null) return;

    try {
      final metadata = EntityMetadataRegistry.get('preferences');
      _schema = metadata.preferenceSchema;
    } catch (e) {
      ErrorService.logError(
        '[PreferencesProvider] Failed to load preference schema from metadata',
        error: e,
      );
    }
  }

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
    if (authProvider.isAuthenticated &&
        authProvider.token != null &&
        authProvider.userId != null) {
      load(authProvider.token!, authProvider.userId!);
    }
  }

  /// Handle auth state changes
  void _onAuthChanged() {
    final isNowAuthenticated = _authProvider?.isAuthenticated ?? false;
    final token = _authProvider?.token;
    final userId = _authProvider?.userId;

    // Detect transition: not authenticated → authenticated
    if (!_wasAuthenticated &&
        isNowAuthenticated &&
        token != null &&
        userId != null) {
      ErrorService.logDebug(
        '[PreferencesProvider] Auth state changed - loading preferences',
      );
      load(token, userId);
    }

    // Detect transition: authenticated → not authenticated (logout)
    if (_wasAuthenticated && !isNowAuthenticated) {
      ErrorService.logDebug(
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
  /// [userId] is the user's ID (preferences.id = users.id via shared-PK).
  Future<void> load(String token, int userId) async {
    if (_isLoading) return;

    _isLoading = true;
    _error = null;
    _token = token;
    _userId = userId;
    notifyListeners();

    try {
      ErrorService.logDebug('[PreferencesProvider] Loading preferences');

      if (_preferencesService == null) {
        ErrorService.logWarning(
          '[PreferencesProvider] No preferences service set',
        );
        return;
      }
      // Use generic entity pattern: GET /preferences/:userId
      final result = await _preferencesService!.load(token, userId);
      _preferences = result;
      _error = null;
      _hasLoadedOnce = true; // Mark that we've completed initial load

      ErrorService.logDebug(
        '[PreferencesProvider] Preferences loaded',
        context: {'keys': _preferences.keys.toList()},
      );
    } catch (e) {
      ErrorService.logError(
        '[PreferencesProvider] Failed to load preferences',
        error: e,
      );
      _error = 'Failed to load preferences';
      _preferences = {};
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Clear preferences (on logout)
  void clear() {
    _preferences = {};
    _error = null;
    _token = null;
    _userId = null;
    _hasLoadedOnce = false; // Reset so we don't warn on next session
    notifyListeners();
  }

  /// Reset all preferences to defaults
  ///
  /// Uses metadata defaults to build a reset payload, then updates via
  /// the generic entity PATCH endpoint.
  Future<void> reset() async {
    if (_token == null || _userId == null || _preferencesService == null) {
      return;
    }

    _isLoading = true;
    notifyListeners();

    try {
      // Build defaults from metadata schema
      _ensureSchemaLoaded();
      final defaults = <String, dynamic>{};
      if (_schema != null) {
        for (final entry in _schema!.entries) {
          if (entry.value.defaultValue != null) {
            defaults[entry.key] = entry.value.defaultValue;
          }
        }
      }

      // Update with defaults via generic PATCH
      final result = await _preferencesService!.update(
        _token!,
        _userId!,
        defaults,
      );
      _preferences = result ?? {};
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
