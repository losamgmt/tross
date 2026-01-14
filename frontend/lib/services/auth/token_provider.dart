/// TokenProvider - Injectable Token Access Abstraction
///
/// ARCHITECTURAL PURPOSE:
/// Provides an injectable abstraction for token retrieval, enabling:
/// - Full unit testability without platform dependencies
/// - Consistent token access pattern across all services
/// - Easy mocking in tests
///
/// PRODUCTION: Uses DefaultTokenProvider (delegates to TokenManager)
/// TESTING: Uses MockTokenProvider (returns configurable mock token)
///
/// USAGE IN SERVICES:
/// ```dart
/// class MyService {
///   final ApiClient _apiClient;
///   final TokenProvider _tokenProvider;
///
///   MyService(this._apiClient, [TokenProvider? tokenProvider])
///       : _tokenProvider = tokenProvider ?? DefaultTokenProvider();
///
///   Future<void> doAuthenticatedWork() async {
///     final token = await _tokenProvider.getToken();
///     if (token == null) throw Exception('No authentication token');
///     // Use token...
///   }
/// }
/// ```
///
/// USAGE IN TESTS:
/// ```dart
/// final mockTokenProvider = MockTokenProvider('test-token');
/// final service = MyService(mockApiClient, mockTokenProvider);
/// // Now service.doAuthenticatedWork() won't hit flutter_secure_storage
/// ```
library;

import 'token_manager.dart';

/// Abstract interface for token retrieval
///
/// Implement this interface for different token sources:
/// - DefaultTokenProvider: Production (uses TokenManager/flutter_secure_storage)
/// - MockTokenProvider: Testing (returns configurable mock token)
abstract class TokenProvider {
  /// Retrieve the current authentication token
  ///
  /// Returns null if no token is available (user not authenticated)
  Future<String?> getToken();

  /// Check if a valid token exists
  Future<bool> hasToken() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }
}

/// Default production implementation using TokenManager
///
/// This is the standard implementation used in production.
/// It delegates to TokenManager which uses flutter_secure_storage.
///
/// DO NOT use this in unit tests - use MockTokenProvider instead.
class DefaultTokenProvider implements TokenProvider {
  /// Singleton instance for production use
  static final DefaultTokenProvider _instance = DefaultTokenProvider._();

  /// Private constructor for singleton
  DefaultTokenProvider._();

  /// Factory constructor returns singleton
  factory DefaultTokenProvider() => _instance;

  @override
  Future<String?> getToken() async {
    return TokenManager.getStoredToken();
  }

  @override
  Future<bool> hasToken() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }
}
