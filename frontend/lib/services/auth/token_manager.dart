// Token Manager - Handles secure token storage and management
//
// Proactive Token Refresh: Stores token expiry time and provides methods
// for TokenRefreshManager to schedule background refresh before expiration.
// See also: token_refresh_manager.dart for proactive refresh logic.
import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../error_service.dart';

class TokenManager {
  // Configure secure storage with web support
  // On web: Uses IndexedDB with encryption
  // On mobile: Uses Keychain (iOS) / Custom ciphers (Android)
  static const _secureStorage = FlutterSecureStorage(
    webOptions: WebOptions(
      dbName: 'TrossSecureStorage',
      publicKey: 'TrossAuth',
    ),
  );

  // Storage keys
  static const String _tokenKey = 'auth_token';
  static const String _userKey = 'auth_user';
  static const String _refreshTokenKey = 'refresh_token';
  static const String _providerKey = 'auth_provider';
  static const String _expiresAtKey = 'token_expires_at';

  /// Store authentication data securely
  /// [expiresAt] - Unix timestamp (seconds) when the access token expires
  static Future<void> storeAuthData({
    required String token,
    required Map<String, dynamic> user,
    String? refreshToken,
    String? provider,
    int? expiresAt,
  }) async {
    try {
      await _secureStorage.write(key: _tokenKey, value: token);
      await _secureStorage.write(key: _userKey, value: json.encode(user));

      if (refreshToken != null) {
        await _secureStorage.write(key: _refreshTokenKey, value: refreshToken);
      }

      if (provider != null) {
        await _secureStorage.write(key: _providerKey, value: provider);
      }

      if (expiresAt != null) {
        await _secureStorage.write(
          key: _expiresAtKey,
          value: expiresAt.toString(),
        );
      }

      ErrorService.logDebug(
        'Auth data stored securely',
        context: {'provider': provider, 'expiresAt': expiresAt},
      );
    } catch (e) {
      ErrorService.logError('Failed to store auth data', error: e);
      rethrow;
    }
  }

  /// Retrieve stored authentication data
  static Future<Map<String, dynamic>?> getStoredAuthData() async {
    try {
      final token = await _secureStorage.read(key: _tokenKey);
      final userJson = await _secureStorage.read(key: _userKey);
      final refreshToken = await _secureStorage.read(key: _refreshTokenKey);
      final provider = await _secureStorage.read(key: _providerKey);

      if (token != null && userJson != null) {
        return {
          'token': token,
          'user': json.decode(userJson),
          'refreshToken': refreshToken,
          'provider': provider,
        };
      }

      return null;
    } catch (e) {
      ErrorService.logError('Failed to retrieve stored auth data', error: e);
      return null;
    }
  }

  /// Clear all stored authentication data
  static Future<void> clearAuthData() async {
    try {
      await _secureStorage.delete(key: _tokenKey);
      await _secureStorage.delete(key: _userKey);
      await _secureStorage.delete(key: _refreshTokenKey);
      await _secureStorage.delete(key: _providerKey);
      await _secureStorage.delete(key: _expiresAtKey);

      ErrorService.logInfo('Auth data cleared');
    } catch (e) {
      ErrorService.logError('Failed to clear auth data', error: e);
    }
  }

  /// Get stored token only
  static Future<String?> getStoredToken() async {
    try {
      return await _secureStorage.read(key: _tokenKey);
    } catch (e) {
      ErrorService.logError('Failed to get stored token', error: e);
      return null;
    }
  }

  /// Get stored refresh token only
  static Future<String?> getStoredRefreshToken() async {
    try {
      return await _secureStorage.read(key: _refreshTokenKey);
    } catch (e) {
      ErrorService.logError('Failed to get stored refresh token', error: e);
      return null;
    }
  }

  /// Store refresh token (for immediate storage during token rotation)
  static Future<void> storeRefreshToken(String refreshToken) async {
    try {
      await _secureStorage.write(key: _refreshTokenKey, value: refreshToken);
      ErrorService.logDebug('Refresh token stored');
    } catch (e) {
      ErrorService.logError('Failed to store refresh token', error: e);
      rethrow;
    }
  }

  /// Get stored auth provider (auth0 or development)
  static Future<String?> getStoredProvider() async {
    try {
      return await _secureStorage.read(key: _providerKey);
    } catch (e) {
      ErrorService.logError('Failed to get stored provider', error: e);
      return null;
    }
  }

  /// Get stored user role from user JSON (for dev mode re-authentication)
  static Future<String?> getStoredUserRole() async {
    try {
      final userJson = await _secureStorage.read(key: _userKey);
      if (userJson == null) return null;

      final user = json.decode(userJson) as Map<String, dynamic>;
      return user['role'] as String?;
    } catch (e) {
      ErrorService.logError('Failed to get stored user role', error: e);
      return null;
    }
  }

  /// Get stored token expiry time as DateTime
  /// Returns null if no expiry is stored or if parsing fails
  static Future<DateTime?> getTokenExpiry() async {
    try {
      final expiresAtStr = await _secureStorage.read(key: _expiresAtKey);
      if (expiresAtStr == null) return null;

      final expiresAtSeconds = int.tryParse(expiresAtStr);
      if (expiresAtSeconds == null) return null;

      return DateTime.fromMillisecondsSinceEpoch(expiresAtSeconds * 1000);
    } catch (e) {
      ErrorService.logError('Failed to get token expiry', error: e);
      return null;
    }
  }

  /// Check if token is expired or will expire within the given duration
  /// Returns true if token should be refreshed
  static Future<bool> shouldRefreshToken({
    Duration buffer = const Duration(minutes: 5),
  }) async {
    final expiry = await getTokenExpiry();
    if (expiry == null) {
      // No expiry stored - can't determine, assume needs refresh
      return true;
    }

    final refreshThreshold = expiry.subtract(buffer);
    return DateTime.now().isAfter(refreshThreshold);
  }
}
