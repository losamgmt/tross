// Auth Token Service - Token validation and refresh operations
import 'token_manager.dart';
import '../api_client.dart';
import '../error_service.dart';
import 'auth0_service.dart';

class AuthTokenService {
  final Auth0Service _auth0Service = Auth0Service();

  // Singleton pattern
  static final AuthTokenService _instance = AuthTokenService._internal();
  factory AuthTokenService() => _instance;
  AuthTokenService._internal();

  /// Validate token by checking with backend
  Future<Map<String, dynamic>?> validateToken(String token) async {
    try {
      final profile = await ApiClient.getUserProfile(token);
      if (profile != null) {
        ErrorService.logInfo('Token is valid');
        return profile;
      } else {
        ErrorService.logInfo('Token is invalid');
        return null;
      }
    } catch (e) {
      ErrorService.logError('Token validation failed', error: e);
      return null;
    }
  }

  /// Refresh access token using refresh token
  Future<Map<String, dynamic>?> refreshToken() async {
    try {
      final refreshToken = await TokenManager.getStoredRefreshToken();
      if (refreshToken == null) {
        ErrorService.logInfo('No refresh token available');
        return null;
      }

      final credentials = await _auth0Service.refreshToken(refreshToken);
      if (credentials?.accessToken.isNotEmpty == true) {
        // Get updated profile
        final profile = await ApiClient.getUserProfile(
          credentials!.accessToken,
        );
        if (profile != null) {
          // Return both token and user data
          return {
            'token': credentials.accessToken,
            'user': profile,
            'refreshToken': credentials.refreshToken ?? refreshToken,
          };
        }
      }

      ErrorService.logInfo('Token refresh failed');
      return null;
    } catch (e) {
      ErrorService.logError('Token refresh failed', error: e);
      return null;
    }
  }

  /// Get stored authentication data
  Future<Map<String, dynamic>?> getStoredAuthData() async {
    try {
      final storedData = await TokenManager.getStoredAuthData();
      if (storedData != null) {
        ErrorService.logInfo('Auth data loaded from storage');
        return storedData;
      } else {
        ErrorService.logInfo('No stored auth data found');
        return null;
      }
    } catch (e) {
      ErrorService.logError('Failed to load stored auth data', error: e);
      return null;
    }
  }

  /// Store authentication data
  Future<void> storeAuthData({
    required String token,
    required Map<String, dynamic> user,
    String? refreshToken,
  }) async {
    try {
      await TokenManager.storeAuthData(
        token: token,
        user: user,
        refreshToken: refreshToken,
      );
      ErrorService.logInfo('Auth data stored successfully');
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
