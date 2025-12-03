/// Mock Auth Service for Testing
///
/// Provides a controllable AuthService that doesn't make real HTTP calls
/// or access real storage.
///
/// Usage:
/// ```dart
/// import 'package:tross_app/test/helpers/mock_auth_service.dart';
///
/// void main() {
///   late MockAuthService mockAuth;
///
///   setUp(() {
///     mockAuth = MockAuthService();
///   });
///
///   test('successful login', () async {
///     // Control the behavior
///     mockAuth.mockLoginResult = true;
///     mockAuth.mockUser = {'role': 'admin', 'email': 'admin@test.com'};
///
///     final result = await mockAuth.loginWithTestToken(isAdmin: true);
///
///     expect(result, isTrue);
///     expect(mockAuth.isAuthenticated, isTrue);
///     expect(mockAuth.user!['role'], equals('admin'));
///   });
/// }
/// ```
library;

/// Mock AuthService that doesn't make real HTTP calls or access storage
class MockAuthService {
  String? _token;
  Map<String, dynamic>? _user;

  // Controllable mock behavior
  bool mockLoginResult = false;
  Map<String, dynamic>? mockUser;
  String? mockToken;
  bool mockLogoutShouldThrow = false;
  Exception? mockLoginException;

  // Call tracking
  int loginCalls = 0;
  int logoutCalls = 0;
  List<bool> loginIsAdminArgs = [];

  // Getters matching real AuthService
  String? get token => _token;
  Map<String, dynamic>? get user => _user;
  bool get isAuthenticated => _token != null;
  String get authStrategy {
    if (_user == null) return 'none';
    final provider = _user!['provider'];
    if (provider == 'auth0') return 'auth0';
    if (provider == 'development') return 'development';
    return 'unknown';
  }

  bool get isAuth0User => authStrategy == 'auth0';
  bool get isDevUser => authStrategy == 'development';
  bool get isAdmin => _user?['role'] == 'admin';
  bool get isTechnician => _user?['role'] == 'technician';
  String get displayName => _user?['name'] ?? 'User';

  /// Mock implementation of initialize
  Future<void> initialize() async {
    // No-op in mock - tests can set state directly
  }

  /// Mock implementation of loginWithTestToken
  Future<bool> loginWithTestToken({bool isAdmin = false}) async {
    loginCalls++;
    loginIsAdminArgs.add(isAdmin);

    if (mockLoginException != null) {
      throw mockLoginException!;
    }

    if (mockLoginResult) {
      _token =
          mockToken ?? 'mock_token_${DateTime.now().millisecondsSinceEpoch}';
      _user =
          mockUser ??
          {
            'role': isAdmin ? 'admin' : 'technician',
            'email': isAdmin ? 'admin@test.com' : 'tech@test.com',
            'name': isAdmin ? 'Test Admin' : 'Test Technician',
            'provider': 'development',
          };
    }

    return mockLoginResult;
  }

  /// Mock implementation of loginWithAuth0
  Future<bool> loginWithAuth0() async {
    loginCalls++;

    if (mockLoginException != null) {
      throw mockLoginException!;
    }

    if (mockLoginResult) {
      _token = mockToken ?? 'mock_auth0_token';
      _user =
          mockUser ??
          {
            'role': 'technician',
            'email': 'auth0@test.com',
            'name': 'Auth0 User',
            'provider': 'auth0',
          };
    }

    return mockLoginResult;
  }

  /// Mock implementation of logout
  Future<void> logout() async {
    logoutCalls++;

    if (mockLogoutShouldThrow) {
      throw Exception('Mock logout error');
    }

    _token = null;
    _user = null;
  }

  /// Reset mock state (call in tearDown)
  void reset() {
    _token = null;
    _user = null;
    mockLoginResult = false;
    mockUser = null;
    mockToken = null;
    mockLogoutShouldThrow = false;
    mockLoginException = null;
    loginCalls = 0;
    logoutCalls = 0;
    loginIsAdminArgs.clear();
  }

  /// Set authenticated state directly (for testing authenticated flows)
  void setAuthenticatedState({
    required String token,
    required Map<String, dynamic> user,
  }) {
    _token = token;
    _user = user;
  }
}
