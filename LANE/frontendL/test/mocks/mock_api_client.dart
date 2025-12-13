/// Mock API Client
///
/// Mock implementation of API client for testing
library;

/// Mock HTTP response
class MockHttpResponse {
  final int statusCode;
  final dynamic data;
  final Map<String, String> headers;

  MockHttpResponse({
    required this.statusCode,
    this.data,
    this.headers = const {},
  });

  bool get isSuccess => statusCode >= 200 && statusCode < 300;
}

/// Mock API client for testing
class MockApiClient {
  final Map<String, dynamic> _responses = {};
  final List<String> _callHistory = [];
  bool _shouldFail = false;
  String _failureMessage = 'Mock API Error';

  /// Get call history
  List<String> get callHistory => List.unmodifiable(_callHistory);

  /// Set mock response for endpoint
  void setResponse(String endpoint, dynamic data, {int statusCode = 200}) {
    _responses[endpoint] = MockHttpResponse(statusCode: statusCode, data: data);
  }

  /// Set mock to fail next request
  void setShouldFail(bool value, {String? message}) {
    _shouldFail = value;
    if (message != null) {
      _failureMessage = message;
    }
  }

  /// Mock GET request
  Future<MockHttpResponse> get(String endpoint) async {
    _callHistory.add('GET $endpoint');

    if (_shouldFail) {
      _shouldFail = false; // Reset after one failure
      throw Exception(_failureMessage);
    }

    final response = _responses[endpoint];
    if (response == null) {
      return MockHttpResponse(
        statusCode: 404,
        data: {'error': 'Endpoint not found'},
      );
    }

    return response;
  }

  /// Mock POST request
  Future<MockHttpResponse> post(
    String endpoint, {
    Map<String, dynamic>? body,
  }) async {
    _callHistory.add('POST $endpoint');

    if (_shouldFail) {
      _shouldFail = false;
      throw Exception(_failureMessage);
    }

    final response = _responses[endpoint];
    if (response == null) {
      return MockHttpResponse(
        statusCode: 404,
        data: {'error': 'Endpoint not found'},
      );
    }

    return response;
  }

  /// Mock PUT request
  Future<MockHttpResponse> put(
    String endpoint, {
    Map<String, dynamic>? body,
  }) async {
    _callHistory.add('PUT $endpoint');

    if (_shouldFail) {
      _shouldFail = false;
      throw Exception(_failureMessage);
    }

    final response = _responses[endpoint];
    if (response == null) {
      return MockHttpResponse(
        statusCode: 404,
        data: {'error': 'Endpoint not found'},
      );
    }

    return response;
  }

  /// Mock DELETE request
  Future<MockHttpResponse> delete(String endpoint) async {
    _callHistory.add('DELETE $endpoint');

    if (_shouldFail) {
      _shouldFail = false;
      throw Exception(_failureMessage);
    }

    final response = _responses[endpoint];
    if (response == null) {
      return MockHttpResponse(
        statusCode: 404,
        data: {'error': 'Endpoint not found'},
      );
    }

    return response;
  }

  /// Clear all mock responses
  void clearResponses() {
    _responses.clear();
  }

  /// Clear call history
  void clearHistory() {
    _callHistory.clear();
  }

  /// Reset mock to initial state
  void reset() {
    _responses.clear();
    _callHistory.clear();
    _shouldFail = false;
    _failureMessage = 'Mock API Error';
  }

  /// Verify endpoint was called
  bool wasCalled(String endpoint, {String method = 'GET'}) {
    return _callHistory.contains('$method $endpoint');
  }

  /// Get number of calls to endpoint
  int getCallCount(String endpoint, {String method = 'GET'}) {
    return _callHistory.where((call) => call == '$method $endpoint').length;
  }
}
