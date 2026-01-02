/// Mock services for testing without platform dependencies
/// Provides test doubles for services that would normally require platform code
library;

import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:tross_app/models/permission.dart';
import 'package:tross_app/providers/auth_provider.dart';

/// Mock AuthProvider for testing components that need authenticated state
/// without requiring actual authentication or backend connectivity
class MockAuthProvider extends ChangeNotifier implements AuthProvider {
  bool _isAuthenticated;
  Map<String, dynamic>? _user;
  bool _isLoading;
  bool _isRedirecting;
  String? _error;
  String? _token;
  String? _provider;

  MockAuthProvider({
    bool isAuthenticated = false,
    Map<String, dynamic>? user,
    bool isLoading = false,
    bool isRedirecting = false,
    String? error,
    String? token,
    String? provider,
  }) : _isAuthenticated = isAuthenticated,
       _user = user,
       _isLoading = isLoading,
       _isRedirecting = isRedirecting,
       _error = error,
       _token = token,
       _provider = provider;

  /// Create an authenticated mock user with admin role
  factory MockAuthProvider.authenticated({
    String role = 'admin',
    String? email,
    String? name,
  }) {
    return MockAuthProvider(
      isAuthenticated: true,
      token: 'mock-token-${DateTime.now().millisecondsSinceEpoch}',
      provider: 'mock',
      user: {
        'id': 1,
        'email': email ?? 'test@example.com',
        'name': name ?? 'Test User',
        'role': role,
        'role_priority': _rolePriority(role),
      },
    );
  }

  static int _rolePriority(String role) {
    switch (role) {
      case 'admin':
        return 5;
      case 'manager':
        return 4;
      case 'dispatcher':
        return 3;
      case 'technician':
        return 2;
      case 'customer':
        return 1;
      default:
        return 0;
    }
  }

  @override
  bool get isAuthenticated => _isAuthenticated;

  @override
  Map<String, dynamic>? get user => _user;

  @override
  bool get isLoading => _isLoading;

  @override
  bool get isRedirecting => _isRedirecting;

  @override
  String? get error => _error;

  @override
  String? get token => _token;

  @override
  String? get provider => _provider;

  @override
  String get userRole => _user?['role'] as String? ?? 'unknown';

  @override
  String get userName => _user?['name'] as String? ?? 'User';

  @override
  String get userEmail => _user?['email'] as String? ?? '';

  @override
  int? get userId => _user?['id'] as int?;

  // Stub implementations for other AuthProvider methods
  @override
  Future<bool> loginWithTestToken({String role = 'admin'}) async => true;

  @override
  Future<bool> loginWithAuth0() async => true;

  @override
  Future<bool> handleAuth0Callback() async => true;

  @override
  Future<void> logout() async {
    _isAuthenticated = false;
    _user = null;
    _token = null;
    notifyListeners();
  }

  @override
  Future<void> initialize() async {}

  @override
  Future<bool> updateProfile(Map<String, dynamic> updates) async => true;

  @override
  bool hasPermission(ResourceType resource, CrudOperation operation) => true;

  // noSuchMethod handles any other AuthProvider members we haven't stubbed
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

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
