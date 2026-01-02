/// PreferencesService - User Preferences API Client
///
/// SOLE RESPONSIBILITY: Communicate with backend preferences API
///
/// This service is 100% METADATA-DRIVEN:
/// - Returns raw Map (no typed classes)
/// - Provider handles defaults from metadata
/// - Works with ANY preference key without code changes
///
/// USAGE:
/// ```dart
/// // Get current preferences as raw map
/// final prefs = await PreferencesService.loadRaw(token);
///
/// // Update single preference
/// final updated = await PreferencesService.updatePreference(token, 'theme', 'dark');
///
/// // Reset to defaults
/// final reset = await PreferencesService.resetRaw(token);
/// ```
library;

import 'dart:convert';
import 'api_client.dart';
import 'error_service.dart';

/// PreferencesService - API client for user preferences
///
/// Returns raw Map - no typed wrapper classes.
/// Defaults are handled by PreferencesProvider using metadata.
class PreferencesService {
  PreferencesService._(); // Private constructor - static class only

  // API endpoints (baseUrl already includes /api)
  static const String _baseEndpoint = '/preferences';
  static const String _schemaEndpoint = '/preferences/schema';
  static const String _resetEndpoint = '/preferences/reset';

  /// Load user preferences from backend
  ///
  /// Returns raw preferences map from API.
  /// Returns empty map on error (provider uses metadata defaults).
  static Future<Map<String, dynamic>> loadRaw(String token) async {
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
          // Extract just the preferences JSONB, not the wrapper
          final prefs = data['preferences'] as Map<String, dynamic>? ?? {};
          ErrorService.logInfo(
            '[PreferencesService] Preferences loaded successfully',
            context: {'keys': prefs.keys.toList()},
          );
          return prefs;
        }
      }

      ErrorService.logWarning(
        '[PreferencesService] Failed to load preferences',
        context: {'statusCode': response.statusCode, 'body': response.body},
      );

      return {};
    } catch (e) {
      ErrorService.logError(
        '[PreferencesService] Error loading preferences',
        error: e,
      );
      return {};
    }
  }

  /// Update a single preference
  ///
  /// [key] is the preference key from preferenceSchema.
  /// [value] is the new value.
  /// Returns updated preferences map on success, null on failure.
  static Future<Map<String, dynamic>?> updatePreference(
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
          final prefs = data['preferences'] as Map<String, dynamic>? ?? {};
          ErrorService.logInfo(
            '[PreferencesService] Preference updated successfully',
            context: {'key': key},
          );
          return prefs;
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

  /// Update multiple preferences at once
  ///
  /// [updates] is a map of preference keys to new values.
  /// Returns updated preferences map on success, null on failure.
  static Future<Map<String, dynamic>?> updatePreferences(
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
          final prefs = data['preferences'] as Map<String, dynamic>? ?? {};
          ErrorService.logInfo(
            '[PreferencesService] Preferences updated successfully',
          );
          return prefs;
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

  /// Reset preferences to defaults
  ///
  /// Returns reset preferences map on success, null on failure.
  static Future<Map<String, dynamic>?> resetRaw(String token) async {
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
          final prefs = data['preferences'] as Map<String, dynamic>? ?? {};
          ErrorService.logInfo(
            '[PreferencesService] Preferences reset successfully',
          );
          return prefs;
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
  /// Note: Frontend typically uses synced metadata instead of this endpoint.
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
}
