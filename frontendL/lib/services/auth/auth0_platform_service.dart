// Platform-agnostic Auth0 service - automatically uses correct implementation
// Supports: Web (browser), iOS, Android, Windows, macOS, Linux
import 'package:flutter/foundation.dart' show kIsWeb;
import 'dart:io' show Platform;
import 'auth0_service.dart'; // Mobile implementation (iOS/Android)
// Conditional import: use real web service on web, stub on VM/test platforms
import 'auth0_web_service_stub.dart'
    if (dart.library.html) 'auth0_web_service.dart';
import '../error_service.dart';

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
          return Auth0Credentials(
            accessToken: credentials.accessToken,
            idToken: credentials.idToken,
            refreshToken: credentials.refreshToken,
          );
        }
        return null;
      } else {
        // Desktop: Not supported yet, but could use web flow
        throw UnsupportedError(
          'Auth0 login not yet implemented for $platformName. '
          'Consider using web browser or mobile app.',
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
        // Web: refresh via backend API
        // Future: Implement backend refresh endpoint
        throw UnimplementedError(
          'Web token refresh via backend not yet implemented',
        );
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
}
