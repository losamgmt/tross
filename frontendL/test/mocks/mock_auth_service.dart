/// Mock Auth Service
///
/// Mock implementation of authentication service for testing
library;

/// Mock authentication service for testing
class MockAuthService {
  bool _isAuthenticated = false;
  Map<String, dynamic>? _currentUser;
  String? _accessToken;
  String? _idToken;

  /// Whether user is authenticated
  bool get isAuthenticated => _isAuthenticated;

  /// Current authenticated user
  Map<String, dynamic>? get currentUser => _currentUser;

  /// Access token
  String? get accessToken => _accessToken;

  /// ID token
  String? get idToken => _idToken;

  /// Set authenticated state
  void setAuthenticated(bool value) {
    _isAuthenticated = value;
  }

  /// Set current user
  void setCurrentUser(Map<String, dynamic>? user) {
    _currentUser = user;
  }

  /// Set access token
  void setAccessToken(String? token) {
    _accessToken = token;
  }

  /// Set ID token
  void setIdToken(String? token) {
    _idToken = token;
  }

  /// Mock login method
  Future<bool> login(String email, String password) async {
    // Simulate successful login
    _isAuthenticated = true;
    _currentUser = {
      'id': 1,
      'name': 'Test User',
      'email': email,
      'role_name': 'user',
    };
    _accessToken = 'mock_access_token';
    _idToken = 'mock_id_token';
    return true;
  }

  /// Mock logout method
  Future<void> logout() async {
    _isAuthenticated = false;
    _currentUser = null;
    _accessToken = null;
    _idToken = null;
  }

  /// Mock refresh token method
  Future<bool> refreshToken() async {
    // Simulate successful refresh
    if (_isAuthenticated) {
      _accessToken = 'refreshed_access_token';
      return true;
    }
    return false;
  }

  /// Mock get user method
  Future<Map<String, dynamic>?> getUser() async {
    return _currentUser;
  }

  /// Reset mock to initial state
  void reset() {
    _isAuthenticated = false;
    _currentUser = null;
    _accessToken = null;
    _idToken = null;
  }
}
