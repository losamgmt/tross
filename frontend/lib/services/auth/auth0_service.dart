// coverage:ignore-file
// Auth0 Service - Focused on Auth0 OAuth2 operations only
// This is a thin wrapper around Auth0's SDK - we rely on Auth0 for testing their SDK.
import 'package:auth0_flutter/auth0_flutter.dart';
import '../../config/app_config.dart';
import '../error_service.dart';

class Auth0Service {
  late Auth0 _auth0;

  Auth0Service() {
    _auth0 = Auth0(AppConfig.auth0Domain, AppConfig.auth0ClientId);
  }

  /// Perform Auth0 login and return credentials
  Future<Credentials?> login() async {
    try {
      // useHTTPS: false - use custom scheme (com.tross.auth0://) for mobile
      // useHTTPS: true would require Android App Links / iOS Universal Links setup
      final credentials = await _auth0
          .webAuthentication(scheme: AppConfig.auth0Scheme)
          .login();

      ErrorService.logInfo(
        'Auth0 login successful',
        context: {
          'hasAccessToken': credentials.accessToken.isNotEmpty,
          'hasRefreshToken': credentials.refreshToken != null,
        },
      );

      return credentials;
    } catch (e) {
      ErrorService.logError(
        'Auth0 login failed',
        error: e,
        context: {'domain': AppConfig.auth0Domain},
      );
      return null;
    }
  }

  /// Refresh Auth0 tokens
  Future<Credentials?> refreshToken(String refreshToken) async {
    try {
      final credentials = await _auth0.api.renewCredentials(
        refreshToken: refreshToken,
      );

      ErrorService.logInfo('Auth0 token refresh successful');
      return credentials;
    } catch (e) {
      ErrorService.logError('Auth0 token refresh failed', error: e);
      return null;
    }
  }

  /// Perform Auth0 logout
  Future<bool> logout() async {
    try {
      await _auth0.webAuthentication(scheme: AppConfig.auth0Scheme).logout();
      ErrorService.logInfo('Auth0 logout successful');
      return true;
    } catch (e) {
      ErrorService.logError('Auth0 logout failed', error: e);
      return false;
    }
  }
}
