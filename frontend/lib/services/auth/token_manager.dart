// Token Manager - Handles secure token storage and management
import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../error_service.dart';

class TokenManager {
  // Configure secure storage with web support
  // On web: Uses IndexedDB with encryption
  // On mobile: Uses Keychain (iOS) / EncryptedSharedPreferences (Android)
  static const _secureStorage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    webOptions: WebOptions(
      dbName: 'TrossAppSecureStorage',
      publicKey: 'TrossAppAuth',
    ),
  );

  // Storage keys
  static const String _tokenKey = 'auth_token';
  static const String _userKey = 'auth_user';
  static const String _refreshTokenKey = 'refresh_token';
  static const String _providerKey = 'auth_provider';

  /// Store authentication data securely
  static Future<void> storeAuthData({
    required String token,
    required Map<String, dynamic> user,
    String? refreshToken,
    String? provider,
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

      ErrorService.logInfo(
        'Auth data stored securely',
        context: {'provider': provider},
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
}
