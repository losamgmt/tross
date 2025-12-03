/// Mock services for testing without platform dependencies
/// Provides test doubles for services that would normally require platform code
library;

import 'dart:async';

/// Mock implementation of secure storage for testing
/// Replaces flutter_secure_storage in tests
class MockSecureStorage {
  final Map<String, String> _storage = {};

  Future<void> write({required String key, required String value}) async {
    _storage[key] = value;
  }

  Future<String?> read({required String key}) async {
    return _storage[key];
  }

  Future<void> delete({required String key}) async {
    _storage.remove(key);
  }

  Future<void> deleteAll() async {
    _storage.clear();
  }

  Future<Map<String, String>> readAll() async {
    return Map.from(_storage);
  }

  bool containsKey({required String key}) {
    return _storage.containsKey(key);
  }

  void clear() {
    _storage.clear();
  }
}

/// Mock implementation of connectivity service for testing
class MockConnectivityService {
  bool _isConnected = true;
  final _connectivityController = StreamController<bool>.broadcast();

  bool get isConnected => _isConnected;
  Stream<bool> get onConnectivityChanged => _connectivityController.stream;

  void setConnected(bool connected) {
    _isConnected = connected;
    _connectivityController.add(connected);
  }

  void simulateDisconnect() => setConnected(false);
  void simulateReconnect() => setConnected(true);

  void dispose() {
    _connectivityController.close();
  }
}

/// Mock implementation of HTTP client for testing
class MockHttpClient {
  final Map<String, dynamic> _responses = {};
  final List<MockHttpRequest> _requests = [];

  /// Register a mock response for a specific endpoint
  void registerResponse(
    String endpoint, {
    required int statusCode,
    dynamic body,
    Map<String, String>? headers,
  }) {
    _responses[endpoint] = MockHttpResponse(
      statusCode: statusCode,
      body: body,
      headers: headers ?? {},
    );
  }

  /// Get a mock response for an endpoint
  MockHttpResponse? getResponse(String endpoint) {
    return _responses[endpoint];
  }

  /// Record a request
  void recordRequest(MockHttpRequest request) {
    _requests.add(request);
  }

  /// Get all recorded requests
  List<MockHttpRequest> get requests => List.unmodifiable(_requests);

  /// Get requests to a specific endpoint
  List<MockHttpRequest> requestsTo(String endpoint) {
    return _requests.where((r) => r.endpoint == endpoint).toList();
  }

  /// Clear all mocks and recorded requests
  void reset() {
    _responses.clear();
    _requests.clear();
  }
}

/// Represents a mock HTTP response
class MockHttpResponse {
  final int statusCode;
  final dynamic body;
  final Map<String, String> headers;

  MockHttpResponse({
    required this.statusCode,
    this.body,
    this.headers = const {},
  });
}

/// Represents a recorded HTTP request
class MockHttpRequest {
  final String method;
  final String endpoint;
  final Map<String, dynamic>? body;
  final Map<String, String>? headers;
  final DateTime timestamp;

  MockHttpRequest({
    required this.method,
    required this.endpoint,
    this.body,
    this.headers,
    DateTime? timestamp,
  }) : timestamp = timestamp ?? DateTime.now();
}

/// Mock implementation of navigation service for testing
class MockNavigationService {
  final List<String> _navigationStack = [];

  List<String> get navigationStack => List.unmodifiable(_navigationStack);
  String? get currentRoute =>
      _navigationStack.isNotEmpty ? _navigationStack.last : null;

  void navigateTo(String route) {
    _navigationStack.add(route);
  }

  void pop() {
    if (_navigationStack.isNotEmpty) {
      _navigationStack.removeLast();
    }
  }

  void reset() {
    _navigationStack.clear();
  }

  bool hasNavigatedTo(String route) {
    return _navigationStack.contains(route);
  }
}
