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
  /// For development mode: re-requests a dev token with the same role
  Future<Map<String, dynamic>?> refreshTokenViaBackend() async {
    try {
      // Check if this is a development token - handle differently
      final provider = await TokenManager.getStoredProvider();
      if (provider == 'development') {
        return await _refreshDevToken();
      }

      // Auth0/production flow: use refresh token
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

        if (newAccessToken != null && newRefreshToken != null) {
          // CRITICAL: Store the new refresh token IMMEDIATELY
          // The backend has already revoked the old one via token rotation.
          // If we don't store the new one now and something fails later,
          // the user would be locked out.
          await TokenManager.storeRefreshToken(newRefreshToken);
          ErrorService.logInfo('New refresh token stored immediately');

          // Parse expiry from new access token
          final expiresAt = getTokenExpiry(newAccessToken);

          // Get user profile with new token
          final profile = await _apiClient.getUserProfile(newAccessToken);

          if (profile != null) {
            ErrorService.logInfo('Backend token refresh successful');
            return {
              'token': newAccessToken,
              'user': profile,
              'refreshToken': newRefreshToken,
              'expiresAt': expiresAt,
              'provider': 'auth0',
            };
          } else {
            // Profile fetch failed but we have valid tokens
            // Return what we have - caller should handle missing profile
            ErrorService.logWarning(
              'Token refresh succeeded but profile fetch failed',
            );
            return {
              'token': newAccessToken,
              'refreshToken': newRefreshToken,
              'expiresAt': expiresAt,
              'provider': 'auth0',
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

  /// Refresh development token by requesting a new one with the same role
  Future<Map<String, dynamic>?> _refreshDevToken() async {
    try {
      final role = await TokenManager.getStoredUserRole();
      if (role == null) {
        ErrorService.logWarning('Cannot refresh dev token - no role stored');
        return null;
      }

      ErrorService.logInfo(
        'Refreshing dev token',
        context: {'role': role},
      );

      // Request a new dev token with the same role
      final newToken = await _apiClient.getTestToken(role: role);
      if (newToken == null) {
        ErrorService.logWarning('Dev token refresh failed - no token returned');
        return null;
      }

      // Parse expiry from new token
      final expiresAt = getTokenExpiry(newToken);

      // Get user profile with new token
      final profile = await _apiClient.getUserProfile(newToken);

      if (profile != null) {
        ErrorService.logInfo('Dev token refresh successful');
        return {
          'token': newToken,
          'user': profile,
          'expiresAt': expiresAt,
          'provider': 'development',
        };
      }

      return null;
    } catch (e) {
      ErrorService.logError('Dev token refresh failed', error: e);
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
