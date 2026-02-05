// coverage:ignore-file
// Platform-agnostic Auth0 service - automatically uses correct implementation
// Supports: Web (browser), iOS, Android, Windows, macOS, Linux
// This is a thin wrapper around Auth0's SDK - we rely on Auth0 for testing their SDK.
import 'dart:convert';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'dart:io' show Platform;
import 'package:http/http.dart' as http;
import 'auth0_service.dart'; // Mobile implementation (iOS/Android)
// Conditional import: use real web service on web, stub on VM/test platforms
import 'auth0_web_service_stub.dart'
    if (dart.library.html) 'auth0_web_service.dart';
import '../error_service.dart';
import '../../config/app_config.dart';

/// Credentials returned from Auth0 (platform-agnostic)
class Auth0Credentials {
  final String accessToken; // Auth0 access token (for Auth0 API calls)
  final String? appToken; // Backend app token (for our API calls)
  final String? idToken;
  final String? refreshToken;
  final Map<String, dynamic>? userInfo;

  Auth0Credentials({
    required this.accessToken,
    this.appToken,
    this.idToken,
    this.refreshToken,
    this.userInfo,
  });

  bool get isValid => accessToken.isNotEmpty;
}

/// Platform-agnostic Auth0 service
/// Automatically detects platform and uses appropriate implementation
class Auth0PlatformService {
  // Lazy initialization based on platform
  static Auth0Service? _mobileService;
  static Auth0WebService? _webService;

  /// Detect current platform
  static bool get isWeb => kIsWeb;
  static bool get isMobile => !kIsWeb && (Platform.isIOS || Platform.isAndroid);
  static bool get isDesktop =>
      !kIsWeb && (Platform.isWindows || Platform.isMacOS || Platform.isLinux);

  /// Get platform name for logging
  static String get platformName {
    if (isWeb) return 'web';
    if (Platform.isIOS) return 'ios';
    if (Platform.isAndroid) return 'android';
    if (Platform.isWindows) return 'windows';
    if (Platform.isMacOS) return 'macos';
    if (Platform.isLinux) return 'linux';
    return 'unknown';
  }

  /// Login - automatically uses correct platform implementation
  Future<Auth0Credentials?> login() async {
    try {
      ErrorService.logInfo(
        'Auth0 login started',
        context: {'platform': platformName},
      );

      if (isWeb) {
        // Web: Use redirect-based OAuth flow
        _webService ??= Auth0WebService();
        await _webService!.login();
        // Note: Web redirects away, so this won't return normally
        // Credentials will be retrieved after callback redirect
        return null;
      } else if (isMobile) {
        // Mobile: Use auth0_flutter SDK (iOS/Android)
        _mobileService ??= Auth0Service();
        final credentials = await _mobileService!.login();

        if (credentials != null && credentials.accessToken.isNotEmpty) {
          // Exchange Auth0 ID token with backend for app token
          // This mirrors the web flow's _validateTokenAndGetProfile
          final backendTokens = await _exchangeAuth0TokenForAppToken(
            credentials.accessToken,
            credentials.idToken,
          );

          if (backendTokens != null) {
            return Auth0Credentials(
              accessToken: credentials.accessToken,
              appToken: backendTokens['app_token'] as String?,
              idToken: credentials.idToken,
              refreshToken: backendTokens['refresh_token'] as String?,
              userInfo: backendTokens['user'] as Map<String, dynamic>?,
            );
          } else {
            ErrorService.logError(
              'Mobile Auth0: Backend token exchange failed',
            );
            return null;
          }
        }
        return null;
      } else {
        // Desktop (Windows/macOS/Linux): Use web-based OAuth flow
        // Desktop apps can use the same PKCE flow as web via system browser
        throw UnsupportedError(
          'Auth0 login on $platformName requires web browser redirect. '
          'Desktop support available via system browser OAuth flow.',
        );
      }
    } catch (e) {
      ErrorService.logError(
        'Auth0 login failed',
        error: e,
        context: {'platform': platformName},
      );
      return null;
    }
  }

  /// Handle web callback after redirect (web-only)
  Future<Auth0Credentials?> handleWebCallback() async {
    if (!isWeb) return null;

    try {
      _webService ??= Auth0WebService();
      final code = Auth0WebService.getAuthorizationCode();

      if (code == null) {
        ErrorService.logError('No authorization code in callback URL');
        return null;
      }

      // Exchange code for tokens via backend
      final tokenData = await _webService!.exchangeCodeForToken(code);

      if (tokenData != null && tokenData['access_token'] != null) {
        return Auth0Credentials(
          accessToken: tokenData['access_token'] as String,
          appToken: tokenData['app_token'] as String?, // Backend app token!
          idToken: tokenData['id_token'] as String?,
          refreshToken: tokenData['refresh_token'] as String?,
        );
      }

      return null;
    } catch (e) {
      ErrorService.logError('Web callback handling failed', error: e);
      return null;
    }
  }

  /// Refresh token - works on all platforms
  Future<Auth0Credentials?> refreshToken(String refreshToken) async {
    try {
      if (isWeb) {
        // Web: refresh via backend API (backend has client_secret)
        _webService ??= Auth0WebService();
        final result = await _webService!.refreshToken(refreshToken);

        if (result != null && result['access_token'] != null) {
          return Auth0Credentials(
            accessToken: result['access_token'] as String,
            // Web refresh only returns new access token, keep existing refresh token
            refreshToken: refreshToken,
          );
        }
        return null;
      } else if (isMobile) {
        _mobileService ??= Auth0Service();
        final credentials = await _mobileService!.refreshToken(refreshToken);

        if (credentials != null && credentials.accessToken.isNotEmpty) {
          return Auth0Credentials(
            accessToken: credentials.accessToken,
            idToken: credentials.idToken,
            refreshToken: credentials.refreshToken,
          );
        }
        return null;
      } else {
        throw UnsupportedError('Token refresh not supported on $platformName');
      }
    } catch (e) {
      ErrorService.logError('Token refresh failed', error: e);
      return null;
    }
  }

  /// Logout - works on all platforms
  Future<bool> logout() async {
    try {
      ErrorService.logInfo(
        'Auth0 logout started',
        context: {'platform': platformName},
      );

      if (isWeb) {
        _webService ??= Auth0WebService();
        await _webService!.logout();
        return true;
      } else if (isMobile) {
        _mobileService ??= Auth0Service();
        return await _mobileService!.logout();
      } else {
        throw UnsupportedError('Logout not supported on $platformName');
      }
    } catch (e) {
      ErrorService.logError('Logout failed', error: e);
      return false;
    }
  }

  /// Exchange Auth0 token with backend to get app token (mobile only)
  ///
  /// This mirrors the web flow's _validateTokenAndGetProfile:
  /// 1. Send Auth0 ID token to backend /auth0/validate
  /// 2. Backend verifies token with Auth0
  /// 3. Backend creates/finds user in database
  /// 4. Backend returns app_token (JWT signed with backend secret)
  static Future<Map<String, dynamic>?> _exchangeAuth0TokenForAppToken(
    String accessToken,
    String? idToken,
  ) async {
    if (idToken == null || idToken.isEmpty) {
      ErrorService.logError('Mobile Auth0: No ID token to exchange');
      return null;
    }

    try {
      ErrorService.logInfo(
        'Mobile Auth0: Exchanging ID token with backend',
        context: {'baseUrl': AppConfig.baseUrl},
      );

      final response = await http.post(
        Uri.parse('${AppConfig.baseUrl}/auth0/validate'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $accessToken',
        },
        body: json.encode({'id_token': idToken}),
      );

      if (response.statusCode == 200) {
        final responseBody = json.decode(response.body);
        // Unwrap standard response envelope: { success, data, timestamp }
        final data = responseBody['data'] ?? responseBody;

        ErrorService.logInfo(
          'Mobile Auth0: Backend token exchange successful',
          context: {
            'hasAppToken': data['app_token'] != null,
            'hasRefreshToken': data['refresh_token'] != null,
          },
        );

        return data;
      } else {
        ErrorService.logError(
          'Mobile Auth0: Backend validation failed',
          context: {'status': response.statusCode, 'body': response.body},
        );
        return null;
      }
    } catch (e) {
      ErrorService.logError('Mobile Auth0: Token exchange error', error: e);
      return null;
    }
  }
}
