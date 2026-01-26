/// PreferencesService - User Preferences API Client (Generic Entity Pattern)
///
/// SOLE RESPONSIBILITY: Communicate with backend preferences entity API
///
/// Uses the GENERIC ENTITY PATTERN:
/// - GET /preferences/:userId - Load user's preferences
/// - PATCH /preferences/:userId - Update preferences (partial update)
///
/// This service is 100% METADATA-DRIVEN:
/// - Returns raw Map (no typed classes)
/// - Provider handles defaults from metadata
/// - Works with ANY preference field defined in preferences-metadata
///
/// USAGE:
/// ```dart
/// // Get from Provider (userId comes from AuthProvider)
/// final prefs = await prefsService.load(token, userId);
///
/// // Update preferences
/// final updated = await prefsService.update(token, userId, {'theme': 'dark'});
/// ```
library;

import 'dart:convert';
import 'api/api_client.dart';
import 'error_service.dart';

/// PreferencesService - API client for user preferences
///
/// Uses generic entity endpoints. Returns raw Map - no typed wrapper classes.
/// Defaults are handled by PreferencesProvider using metadata.
class PreferencesService {
  /// API client for HTTP requests - injected via constructor
  final ApiClient _apiClient;

  /// Constructor - requires ApiClient injection
  PreferencesService(this._apiClient);

  // API endpoint (generic entity pattern)
  static const String _baseEndpoint = '/preferences';

  /// Load user preferences from backend
  ///
  /// [userId] is the user's ID (preferences.id = users.id due to shared-PK).
  /// Returns raw preferences map from API.
  /// Returns empty map on error (provider uses metadata defaults).
  Future<Map<String, dynamic>> load(String token, int userId) async {
    try {
      ErrorService.logDebug(
        '[PreferencesService] Loading preferences from API',
        context: {'userId': userId},
      );

      final response = await _apiClient.authenticatedRequest(
        'GET',
        '$_baseEndpoint/$userId',
        token: token,
      );

      if (response.statusCode == 200) {
        final body = json.decode(response.body) as Map<String, dynamic>;
        final data = body['data'] as Map<String, dynamic>?;

        if (data != null) {
          // Generic entity returns the full record directly
          // Extract preference fields (exclude system fields)
          final prefs = _extractPreferenceFields(data);
          ErrorService.logDebug(
            '[PreferencesService] Preferences loaded successfully',
            context: {'keys': prefs.keys.toList()},
          );
          return prefs;
        }
      }

      // 404 means no preferences record yet - that's OK, use defaults
      if (response.statusCode == 404) {
        ErrorService.logDebug(
          '[PreferencesService] No preferences record found, using defaults',
        );
        return {};
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

  /// Update preferences (partial update via PATCH)
  ///
  /// [userId] is the user's ID.
  /// [updates] is a map of preference fields to new values.
  /// Returns updated preferences map on success, null on failure.
  Future<Map<String, dynamic>?> update(
    String token,
    int userId,
    Map<String, dynamic> updates,
  ) async {
    try {
      ErrorService.logInfo(
        '[PreferencesService] Updating preferences',
        context: {'userId': userId, 'keys': updates.keys.toList()},
      );

      final response = await _apiClient.authenticatedRequest(
        'PATCH',
        '$_baseEndpoint/$userId',
        token: token,
        body: updates,
      );

      if (response.statusCode == 200) {
        final body = json.decode(response.body) as Map<String, dynamic>;
        final data = body['data'] as Map<String, dynamic>?;

        if (data != null) {
          final prefs = _extractPreferenceFields(data);
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

  /// Update a single preference field
  ///
  /// Convenience method that wraps update() for single-field updates.
  /// [key] is the preference field name (e.g., 'theme', 'density').
  /// [value] is the new value.
  Future<Map<String, dynamic>?> updateField(
    String token,
    int userId,
    String key,
    dynamic value,
  ) async {
    return update(token, userId, {key: value});
  }

  /// Extract preference fields from entity record
  ///
  /// Filters out system fields (id, created_at, updated_at) to return
  /// only the actual preference values.
  Map<String, dynamic> _extractPreferenceFields(Map<String, dynamic> record) {
    // System fields to exclude from preferences map
    const systemFields = {'id', 'created_at', 'updated_at'};

    return Map.fromEntries(
      record.entries.where((e) => !systemFields.contains(e.key)),
    );
  }
}
