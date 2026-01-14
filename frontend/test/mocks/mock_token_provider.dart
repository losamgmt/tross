/// MockTokenProvider - Test Implementation of TokenProvider
///
/// Provides a fully controllable token source for unit tests.
/// No platform dependencies - works perfectly in Flutter test environment.
///
/// USAGE:
/// ```dart
/// // Create with default token
/// final tokenProvider = MockTokenProvider();
///
/// // Create with custom token
/// final tokenProvider = MockTokenProvider('custom-test-token');
///
/// // Create without token (unauthenticated state)
/// final tokenProvider = MockTokenProvider.unauthenticated();
///
/// // Change token during test
/// tokenProvider.setToken('new-token');
///
/// // Simulate token expiration
/// tokenProvider.clearToken();
///
/// // Inject into service
/// final service = AuditLogService(mockApiClient, tokenProvider);
/// ```
library;

import 'package:tross_app/services/auth/token_provider.dart';

/// Mock implementation of TokenProvider for testing
///
/// Provides full control over token state without platform dependencies.
class MockTokenProvider implements TokenProvider {
  String? _token;

  /// Create with optional initial token
  ///
  /// Default token is 'mock-test-token-{timestamp}' if not specified
  MockTokenProvider([String? initialToken])
    : _token =
          initialToken ??
          'mock-test-token-${DateTime.now().millisecondsSinceEpoch}';

  /// Create an unauthenticated provider (no token)
  factory MockTokenProvider.unauthenticated() {
    return MockTokenProvider._withNullToken();
  }

  MockTokenProvider._withNullToken() : _token = null;

  /// Create with a specific token value
  factory MockTokenProvider.withToken(String token) {
    return MockTokenProvider(token);
  }

  @override
  Future<String?> getToken() async {
    return _token;
  }

  @override
  Future<bool> hasToken() async {
    return _token != null && _token!.isNotEmpty;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST CONTROL METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /// Set a new token value
  void setToken(String token) {
    _token = token;
  }

  /// Clear the token (simulate logout or expiration)
  void clearToken() {
    _token = null;
  }

  /// Get the current token synchronously (for test assertions)
  String? get currentToken => _token;

  /// Check if authenticated (synchronous, for test assertions)
  bool get isAuthenticated => _token != null && _token!.isNotEmpty;
}
