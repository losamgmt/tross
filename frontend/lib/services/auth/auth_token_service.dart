// Auth Token Service - Token validation and refresh operations
//
// Handles JWT parsing for expiry detection and token refresh via backend.
// Uses backend /api/auth/refresh endpoint for secure token rotation.
import 'dart:convert';
import 'token_manager.dart';
import '../api/api_client.dart';
import '../error_service.dart';

class AuthTokenService {
  /// API client for HTTP requests - injected via constructor
  final ApiClient _apiClient;

  /// Constructor - requires ApiClient injection
  AuthTokenService(this._apiClient);

  /// Validate token by checking with backend
  Future<Map<String, dynamic>?> validateToken(String token) async {
    try {
      final profile = await _apiClient.getUserProfile(token);
      if (profile != null) {
        ErrorService.logDebug('Token validated successfully');
        return profile;
      } else {
        // Not an error - token is invalid/expired, normal flow
        return null;
      }
    } catch (e) {
      ErrorService.logError('Token validation failed', error: e);
      return null;
    }
  }

  /// Parse JWT and extract expiration timestamp (exp claim)
  /// Returns Unix timestamp in seconds, or null if parsing fails
  int? getTokenExpiry(String token) {
    try {
      // JWT format: header.payload.signature
      final parts = token.split('.');
      if (parts.length != 3) {
        ErrorService.logDebug('Invalid JWT format - not 3 parts');
        return null;
      }

      // Decode payload (base64url encoded)
      final payload = parts[1];
      // Add padding if needed for base64 decoding
      final normalized = base64Url.normalize(payload);
      final decoded = utf8.decode(base64Url.decode(normalized));
      final claims = json.decode(decoded) as Map<String, dynamic>;

      final exp = claims['exp'];
      if (exp is int) {
        return exp;
      } else if (exp is double) {
        return exp.toInt();
      }

      ErrorService.logDebug('No exp claim in JWT');
      return null;
    } catch (e) {
      ErrorService.logError('Failed to parse JWT expiry', error: e);
      return null;
    }
  }

  /// Refresh access token via backend /api/auth/refresh endpoint
  /// Uses our backend's token rotation for security (revokes old, issues new)
  Future<Map<String, dynamic>?> refreshTokenViaBackend() async {
    try {
      final refreshToken = await TokenManager.getStoredRefreshToken();
      if (refreshToken == null) {
        ErrorService.logInfo('No refresh token available for backend refresh');
        return null;
      }

      ErrorService.logInfo('Refreshing token via backend');

      // Call backend refresh endpoint
      final response = await _apiClient.postUnauthenticated(
        '/auth/refresh',
        body: {'refreshToken': refreshToken},
      );

      if (response['success'] == true && response['data'] != null) {
        final data = response['data'] as Map<String, dynamic>;
        final newAccessToken = data['accessToken'] as String?;
        final newRefreshToken = data['refreshToken'] as String?;

        if (newAccessToken != null) {
          // Parse expiry from new access token
          final expiresAt = getTokenExpiry(newAccessToken);

          // Get user profile with new token
          final profile = await _apiClient.getUserProfile(newAccessToken);

          if (profile != null) {
            ErrorService.logInfo('Backend token refresh successful');
            return {
              'token': newAccessToken,
              'user': profile,
              'refreshToken': newRefreshToken ?? refreshToken,
              'expiresAt': expiresAt,
            };
          }
        }
      }

      ErrorService.logInfo('Backend token refresh failed - invalid response');
      return null;
    } catch (e) {
      ErrorService.logError('Backend token refresh failed', error: e);
      return null;
    }
  }

  /// Refresh access token using refresh token (legacy Auth0 path)
  /// @deprecated Use refreshTokenViaBackend() for new code
  Future<Map<String, dynamic>?> refreshToken() async {
    // Delegate to backend refresh for unified token management
    return refreshTokenViaBackend();
  }

  /// Get stored authentication data
  Future<Map<String, dynamic>?> getStoredAuthData() async {
    try {
      final storedData = await TokenManager.getStoredAuthData();
      if (storedData != null) {
        ErrorService.logInfo('Auth data loaded from storage');
        return storedData;
      } else {
        ErrorService.logDebug('No stored auth data found');
        return null;
      }
    } catch (e) {
      ErrorService.logError('Failed to load stored auth data', error: e);
      return null;
    }
  }

  /// Store authentication data
  /// [expiresAt] - Unix timestamp (seconds) when the access token expires
  Future<void> storeAuthData({
    required String token,
    required Map<String, dynamic> user,
    String? refreshToken,
    String? provider,
    int? expiresAt,
  }) async {
    try {
      await TokenManager.storeAuthData(
        token: token,
        user: user,
        refreshToken: refreshToken,
        provider: provider,
        expiresAt: expiresAt,
      );
    } catch (e) {
      ErrorService.logError('Failed to store auth data', error: e);
      rethrow;
    }
  }

  /// Clear all stored authentication data
  Future<void> clearAuthData() async {
    try {
      await TokenManager.clearAuthData();
      ErrorService.logInfo('Auth data cleared');
    } catch (e) {
      ErrorService.logError('Failed to clear auth data', error: e);
    }
  }
}
