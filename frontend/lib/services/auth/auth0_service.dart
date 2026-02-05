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
      ErrorService.logInfo(
        'Auth0 login starting',
        context: {
          'domain': AppConfig.auth0Domain,
          'clientId': AppConfig.auth0ClientId,
          'scheme': AppConfig.auth0Scheme,
        },
      );

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
    } on WebAuthenticationException catch (e) {
      // Specific Auth0 exception - has detailed error info
      ErrorService.logError(
        'Auth0 WebAuthenticationException',
        error: e,
        context: {
          'code': e.code,
          'message': e.message,
          'details': e.details.toString(),
          'isUserCancelled': e.isUserCancelledException,
          'domain': AppConfig.auth0Domain,
          'scheme': AppConfig.auth0Scheme,
        },
      );
      // Re-throw so caller knows it failed
      rethrow;
    } catch (e, stackTrace) {
      ErrorService.logError(
        'Auth0 login failed (unknown error)',
        error: e,
        stackTrace: stackTrace,
        context: {
          'errorType': e.runtimeType.toString(),
          'domain': AppConfig.auth0Domain,
          'scheme': AppConfig.auth0Scheme,
        },
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
