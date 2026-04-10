/// Mock Failure Configuration
///
/// Provides typed, configurable failure behavior for all test mocks.
/// Replaces the crude `_shouldFail` boolean with a proper configuration.
///
/// USAGE:
/// ```dart
/// // Persistent 401 error (fails until cleared)
/// mockApiClient.setFailure(MockFailureConfig.unauthorized());
///
/// // One-shot 500 error (auto-resets after first failure)
/// mockApiClient.setFailure(MockFailureConfig.serverError(persistent: false));
///
/// // Fail after N successful calls
/// mockApiClient.setFailure(MockFailureConfig.afterCalls(3, MockFailureConfig.timeout()));
///
/// // Clear failure mode
/// mockApiClient.setFailure(MockFailureConfig.disabled);
/// ```
library;

/// HTTP status codes for error simulation
enum MockHttpStatus {
  badRequest(400, 'Bad Request'),
  unauthorized(401, 'Unauthorized'),
  forbidden(403, 'Forbidden'),
  notFound(404, 'Not Found'),
  conflict(409, 'Conflict'),
  unprocessable(422, 'Unprocessable Entity'),
  tooManyRequests(429, 'Too Many Requests'),
  serverError(500, 'Internal Server Error'),
  badGateway(502, 'Bad Gateway'),
  serviceUnavailable(503, 'Service Unavailable'),
  gatewayTimeout(504, 'Gateway Timeout');

  final int code;
  final String reason;

  const MockHttpStatus(this.code, this.reason);
}

/// Configurable failure behavior for mocks
///
/// Immutable configuration object that defines how and when a mock should fail.
class MockFailureConfig {
  /// Whether failure mode is enabled
  final bool enabled;

  /// Error message to include in exception
  final String message;

  /// HTTP status code (null = generic Exception, not HTTP error)
  final MockHttpStatus? httpStatus;

  /// If true, failure persists until explicitly cleared
  /// If false, auto-resets after one failure (legacy behavior)
  final bool persistent;

  /// Optional: fail only after N successful calls
  /// Useful for testing retry logic or partial success scenarios
  final int? failAfterCalls;

  /// Optional: additional error details (e.g., validation errors)
  final Map<String, dynamic>? errorDetails;

  const MockFailureConfig({
    this.enabled = false,
    this.message = 'Mock failure',
    this.httpStatus,
    this.persistent = true,
    this.failAfterCalls,
    this.errorDetails,
  });

  // ===========================================================================
  // FACTORY CONSTRUCTORS - Semantic, readable failure configurations
  // ===========================================================================

  /// No failure - default state
  static const disabled = MockFailureConfig();

  /// Generic exception (non-HTTP, e.g., network timeout)
  factory MockFailureConfig.exception(
    String message, {
    bool persistent = true,
  }) => MockFailureConfig(
    enabled: true,
    message: message,
    persistent: persistent,
  );

  /// 400 Bad Request - validation errors
  factory MockFailureConfig.badRequest({
    String message = 'Validation failed',
    Map<String, dynamic>? errors,
    bool persistent = true,
  }) => MockFailureConfig(
    enabled: true,
    message: message,
    httpStatus: MockHttpStatus.badRequest,
    errorDetails: errors,
    persistent: persistent,
  );

  /// 401 Unauthorized - invalid/expired token
  factory MockFailureConfig.unauthorized({
    String message = 'Token invalid or expired',
    bool persistent = true,
  }) => MockFailureConfig(
    enabled: true,
    message: message,
    httpStatus: MockHttpStatus.unauthorized,
    persistent: persistent,
  );

  /// 403 Forbidden - insufficient permissions
  factory MockFailureConfig.forbidden({
    String message = 'Insufficient permissions',
    bool persistent = true,
  }) => MockFailureConfig(
    enabled: true,
    message: message,
    httpStatus: MockHttpStatus.forbidden,
    persistent: persistent,
  );

  /// 404 Not Found - entity doesn't exist
  factory MockFailureConfig.notFound({
    String message = 'Resource not found',
    bool persistent = true,
  }) => MockFailureConfig(
    enabled: true,
    message: message,
    httpStatus: MockHttpStatus.notFound,
    persistent: persistent,
  );

  /// 500 Internal Server Error
  factory MockFailureConfig.serverError({
    String message = 'Internal server error',
    bool persistent = true,
  }) => MockFailureConfig(
    enabled: true,
    message: message,
    httpStatus: MockHttpStatus.serverError,
    persistent: persistent,
  );

  /// Network timeout (non-HTTP error)
  factory MockFailureConfig.timeout({
    String message = 'Connection timed out',
    bool persistent = true,
  }) => MockFailureConfig(
    enabled: true,
    message: message,
    persistent: persistent,
  );

  /// Fail after N successful calls
  ///
  /// Useful for testing:
  /// - Retry logic with eventual failure
  /// - Partial batch success
  /// - Rate limiting scenarios
  factory MockFailureConfig.afterCalls(
    int callCount,
    MockFailureConfig thenFail,
  ) => MockFailureConfig(
    enabled: true,
    message: thenFail.message,
    httpStatus: thenFail.httpStatus,
    persistent: thenFail.persistent,
    failAfterCalls: callCount,
    errorDetails: thenFail.errorDetails,
  );

  /// Create from HTTP status enum
  factory MockFailureConfig.fromStatus(
    MockHttpStatus status, {
    String? message,
    bool persistent = true,
  }) => MockFailureConfig(
    enabled: true,
    message: message ?? status.reason,
    httpStatus: status,
    persistent: persistent,
  );

  // ===========================================================================
  // UTILITY METHODS
  // ===========================================================================

  /// Get HTTP status code (or null for non-HTTP errors)
  int? get statusCode => httpStatus?.code;

  /// Whether this is an HTTP error (vs generic exception)
  bool get isHttpError => httpStatus != null;

  /// Create a copy with modifications
  MockFailureConfig copyWith({
    bool? enabled,
    String? message,
    MockHttpStatus? httpStatus,
    bool? persistent,
    int? failAfterCalls,
    Map<String, dynamic>? errorDetails,
  }) => MockFailureConfig(
    enabled: enabled ?? this.enabled,
    message: message ?? this.message,
    httpStatus: httpStatus ?? this.httpStatus,
    persistent: persistent ?? this.persistent,
    failAfterCalls: failAfterCalls ?? this.failAfterCalls,
    errorDetails: errorDetails ?? this.errorDetails,
  );

  @override
  String toString() =>
      'MockFailureConfig(enabled: $enabled, status: ${httpStatus?.code}, '
      'message: "$message", persistent: $persistent)';
}

/// Mixin providing standardized failure handling for mocks
///
/// Add this to any mock class to get consistent failure behavior.
mixin MockFailureMixin {
  MockFailureConfig _failureConfig = MockFailureConfig.disabled;
  MockFailureConfig? _activeFailureConfig; // Preserved for throwFailure()
  int _callCount = 0;

  /// Current failure configuration
  MockFailureConfig get failureConfig => _failureConfig;

  /// Set failure configuration
  ///
  /// Use factory constructors for readable configuration:
  /// ```dart
  /// setFailure(MockFailureConfig.unauthorized());
  /// setFailure(MockFailureConfig.serverError(persistent: false));
  /// setFailure(MockFailureConfig.disabled);
  /// ```
  void setFailure(MockFailureConfig config) {
    _failureConfig = config;
    _callCount = 0;
  }

  /// Legacy API - prefer setFailure() for new code
  @Deprecated('Use setFailure(MockFailureConfig) instead')
  void setShouldFail(bool value, {String? message}) {
    if (value) {
      setFailure(
        MockFailureConfig.exception(
          message ?? 'Mock API Error',
          persistent: false, // Legacy behavior: one-shot
        ),
      );
    } else {
      setFailure(MockFailureConfig.disabled);
    }
  }

  /// Check if mock should fail on this call
  ///
  /// Call this at the start of each mock method.
  /// Returns true if the call should fail.
  /// Handles call counting and auto-reset for non-persistent failures.
  bool shouldFail() {
    if (!_failureConfig.enabled) return false;

    _callCount++;

    // Check if we should fail after N calls
    if (_failureConfig.failAfterCalls != null) {
      if (_callCount <= _failureConfig.failAfterCalls!) {
        return false; // Not yet time to fail
      }
    }

    // Capture the config BEFORE any potential reset
    _activeFailureConfig = _failureConfig;

    // Auto-reset for non-persistent failures
    if (!_failureConfig.persistent) {
      _failureConfig = MockFailureConfig.disabled;
      _callCount = 0;
    }

    return true;
  }

  /// Throw appropriate exception based on failure config
  ///
  /// Call this when shouldFail() returns true.
  Never throwFailure() {
    // Use preserved config from shouldFail(), fallback to current config
    final config = _activeFailureConfig ?? _failureConfig;
    _activeFailureConfig = null; // Clear after use

    // For HTTP errors, throw HttpException (or similar)
    // For generic errors, throw Exception
    if (config.isHttpError) {
      throw MockHttpException(
        config.statusCode!,
        config.message,
        details: config.errorDetails,
      );
    } else {
      throw Exception(config.message);
    }
  }

  /// Combined check-and-throw helper
  ///
  /// Call at the start of mock methods:
  /// ```dart
  /// @override
  /// Future<Map<String, dynamic>> fetchEntity(String name, int id) async {
  ///   checkFailure();
  ///   return _mockResponse(name, id);
  /// }
  /// ```
  void checkFailure() {
    if (shouldFail()) {
      throwFailure();
    }
  }

  /// Reset failure state
  void resetFailure() {
    _failureConfig = MockFailureConfig.disabled;
    _activeFailureConfig = null;
    _callCount = 0;
  }
}

/// HTTP-style exception for mock failures
///
/// Allows tests to distinguish between different error types.
class MockHttpException implements Exception {
  final int statusCode;
  final String message;
  final Map<String, dynamic>? details;

  const MockHttpException(this.statusCode, this.message, {this.details});

  @override
  String toString() => 'MockHttpException: $statusCode $message';

  /// Check if this is a specific status code
  bool isStatus(int code) => statusCode == code;

  /// Check if this is a client error (4xx)
  bool get isClientError => statusCode >= 400 && statusCode < 500;

  /// Check if this is a server error (5xx)
  bool get isServerError => statusCode >= 500;
}
