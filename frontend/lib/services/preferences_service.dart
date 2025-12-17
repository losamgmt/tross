/// PreferencesService - User Preferences API Client
///
/// SOLE RESPONSIBILITY: Communicate with backend preferences API
///
/// This service:
/// - Loads preferences from backend /preferences endpoint
/// - Updates preferences via API
/// - Handles offline fallback with cached defaults
/// - Provides type-safe preference access
///
/// DESIGN:
/// - Static methods for direct API access
/// - Uses ApiClient for authenticated requests
/// - Returns UserPreferences objects from config/preference_keys.dart
/// - Logs errors but doesn't throw to prevent UI crashes
///
/// USAGE:
/// ```dart
/// // Get current preferences
/// final prefs = await PreferencesService.load(token);
///
/// // Update preferences
/// await PreferencesService.updatePreferences(token, {'theme': 'dark'});
///
/// // Update single preference
/// await PreferencesService.updatePreference(token, 'theme', 'dark');
///
/// // Reset to defaults
/// await PreferencesService.reset(token);
/// ```
library;

import 'dart:convert';
import '../config/preference_keys.dart';
import 'api_client.dart';
import 'error_service.dart';

/// PreferencesService - API client for user preferences
class PreferencesService {
  PreferencesService._(); // Private constructor - static class only

  // API endpoints (baseUrl already includes /api)
  static const String _baseEndpoint = '/preferences';
  static const String _schemaEndpoint = '/preferences/schema';
  static const String _resetEndpoint = '/preferences/reset';

  /// Load user preferences from backend
  ///
  /// Returns [UserPreferences] with current values from backend.
  /// Falls back to defaults on error.
  static Future<UserPreferences> load(String token) async {
    try {
      ErrorService.logInfo('[PreferencesService] Loading preferences from API');

      final response = await ApiClient.authenticatedRequest(
        'GET',
        _baseEndpoint,
        token: token,
      );

      if (response.statusCode == 200) {
        final body = json.decode(response.body) as Map<String, dynamic>;
        final data = body['data'] as Map<String, dynamic>?;

        if (data != null) {
          ErrorService.logInfo(
            '[PreferencesService] Preferences loaded successfully',
          );
          return UserPreferences.fromJson(data);
        }
      }

      ErrorService.logWarning(
        '[PreferencesService] Failed to load preferences',
        context: {'statusCode': response.statusCode, 'body': response.body},
      );

      return UserPreferences.defaults();
    } catch (e) {
      ErrorService.logError(
        '[PreferencesService] Error loading preferences',
        error: e,
      );
      return UserPreferences.defaults();
    }
  }

  /// Update multiple preferences
  ///
  /// [updates] is a map of preference keys to new values.
  /// Returns updated [UserPreferences] on success, null on failure.
  static Future<UserPreferences?> updatePreferences(
    String token,
    Map<String, dynamic> updates,
  ) async {
    try {
      ErrorService.logInfo(
        '[PreferencesService] Updating preferences',
        context: {'keys': updates.keys.toList()},
      );

      final response = await ApiClient.authenticatedRequest(
        'PUT',
        _baseEndpoint,
        token: token,
        body: updates,
      );

      if (response.statusCode == 200) {
        final body = json.decode(response.body) as Map<String, dynamic>;
        final data = body['data'] as Map<String, dynamic>?;

        if (data != null) {
          ErrorService.logInfo(
            '[PreferencesService] Preferences updated successfully',
          );
          return UserPreferences.fromJson(data);
        }
      }

      ErrorService.logWarning(
        '[PreferencesService] Failed to update preferences',
        context: {'statusCode': response.statusCode, 'body': response.body},
      );

      return null;
    } catch (e) {
      ErrorService.logError(
        '[PreferencesService] Error updating preferences',
        error: e,
      );
      return null;
    }
  }

  /// Update a single preference
  ///
  /// [key] is the preference key (use PreferenceKeys constants).
  /// [value] is the new value.
  /// Returns updated [UserPreferences] on success, null on failure.
  static Future<UserPreferences?> updatePreference(
    String token,
    String key,
    dynamic value,
  ) async {
    try {
      ErrorService.logInfo(
        '[PreferencesService] Updating single preference',
        context: {'key': key, 'value': value},
      );

      final response = await ApiClient.authenticatedRequest(
        'PUT',
        '$_baseEndpoint/$key',
        token: token,
        body: {'value': value},
      );

      if (response.statusCode == 200) {
        final body = json.decode(response.body) as Map<String, dynamic>;
        final data = body['data'] as Map<String, dynamic>?;

        if (data != null) {
          ErrorService.logInfo(
            '[PreferencesService] Preference updated successfully',
            context: {'key': key},
          );
          return UserPreferences.fromJson(data);
        }
      }

      ErrorService.logWarning(
        '[PreferencesService] Failed to update preference',
        context: {
          'key': key,
          'statusCode': response.statusCode,
          'body': response.body,
        },
      );

      return null;
    } catch (e) {
      ErrorService.logError(
        '[PreferencesService] Error updating preference',
        error: e,
        context: {'key': key},
      );
      return null;
    }
  }

  /// Reset preferences to defaults
  ///
  /// Returns reset [UserPreferences] on success, null on failure.
  static Future<UserPreferences?> reset(String token) async {
    try {
      ErrorService.logInfo('[PreferencesService] Resetting preferences');

      final response = await ApiClient.authenticatedRequest(
        'POST',
        _resetEndpoint,
        token: token,
      );

      if (response.statusCode == 200) {
        final body = json.decode(response.body) as Map<String, dynamic>;
        final data = body['data'] as Map<String, dynamic>?;

        if (data != null) {
          ErrorService.logInfo(
            '[PreferencesService] Preferences reset successfully',
          );
          return UserPreferences.fromJson(data);
        }
      }

      ErrorService.logWarning(
        '[PreferencesService] Failed to reset preferences',
        context: {'statusCode': response.statusCode, 'body': response.body},
      );

      return null;
    } catch (e) {
      ErrorService.logError(
        '[PreferencesService] Error resetting preferences',
        error: e,
      );
      return null;
    }
  }

  /// Get preference schema from backend
  ///
  /// Returns schema map on success, null on failure.
  static Future<Map<String, dynamic>?> getSchema(String token) async {
    try {
      ErrorService.logInfo('[PreferencesService] Fetching preference schema');

      final response = await ApiClient.authenticatedRequest(
        'GET',
        _schemaEndpoint,
        token: token,
      );

      if (response.statusCode == 200) {
        final body = json.decode(response.body) as Map<String, dynamic>;
        final data = body['data'] as Map<String, dynamic>?;

        if (data != null) {
          ErrorService.logInfo(
            '[PreferencesService] Schema loaded successfully',
          );
          return data;
        }
      }

      return null;
    } catch (e) {
      ErrorService.logError(
        '[PreferencesService] Error fetching schema',
        error: e,
      );
      return null;
    }
  }

  /// Update theme preference (convenience method)
  static Future<UserPreferences?> updateTheme(
    String token,
    ThemePreference theme,
  ) async {
    return updatePreference(token, PreferenceKeys.theme, theme.value);
  }

  /// Update notifications enabled preference (convenience method)
  static Future<UserPreferences?> updateNotificationsEnabled(
    String token,
    bool enabled,
  ) async {
    return updatePreference(
      token,
      PreferenceKeys.notificationsEnabled,
      enabled,
    );
  }
}
