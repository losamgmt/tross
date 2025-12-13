// Stub for non-web platforms (VM, iOS, Android, etc.)
// This file is used when running tests in VM environment
// Provides same interface as auth0_web_service.dart but throws UnsupportedError

class Auth0WebService {
  Future<void> login() async {
    throw UnsupportedError(
      'Auth0WebService.login is only available on web platform',
    );
  }

  static String? getAuthorizationCode() {
    throw UnsupportedError(
      'Auth0WebService.getAuthorizationCode is only available on web platform',
    );
  }

  Future<Map<String, dynamic>?> exchangeCodeForToken(String code) async {
    throw UnsupportedError(
      'Auth0WebService.exchangeCodeForToken is only available on web platform',
    );
  }

  Future<void> logout() async {
    throw UnsupportedError(
      'Auth0WebService.logout is only available on web platform',
    );
  }
}
