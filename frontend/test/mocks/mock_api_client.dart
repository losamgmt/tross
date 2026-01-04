/// Mock API Client - Test Implementation
///
/// Implements the ApiClient interface for unit testing.
/// Provides controllable responses for all API operations.
library;

import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:tross_app/services/api/api_client.dart';

/// Mock API client that implements the ApiClient interface for testing
class MockApiClient implements ApiClient {
  // ═══════════════════════════════════════════════════════════════════════════
  // MOCK STATE
  // ═══════════════════════════════════════════════════════════════════════════

  final List<String> _callHistory = [];
  final Map<String, dynamic> _mockResponses = {};
  bool _shouldFail = false;
  String _failureMessage = 'Mock API Error';
  String? _currentToken;

  /// Get call history for verification
  List<String> get callHistory => List.unmodifiable(_callHistory);

  // ═══════════════════════════════════════════════════════════════════════════
  // MOCK CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════════════

  /// Set up a mock response for a specific key
  void mockResponse(String key, dynamic response) {
    _mockResponses[key] = response;
  }

  /// Set mock to fail next request
  void setShouldFail(bool value, {String? message}) {
    _shouldFail = value;
    if (message != null) {
      _failureMessage = message;
    }
  }

  /// Set the current mock token
  void setToken(String? token) {
    _currentToken = token;
  }

  /// Reset all mock state
  void reset() {
    _callHistory.clear();
    _mockResponses.clear();
    _shouldFail = false;
    _failureMessage = 'Mock API Error';
    _currentToken = null;
    _onTokenRefreshNeeded = null;
  }

  /// Verify endpoint was called
  bool wasCalled(String pattern) {
    return _callHistory.any((call) => call.contains(pattern));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  void _recordCall(String call) {
    _callHistory.add(call);
  }

  T? _getResponse<T>(String key) {
    if (_shouldFail) {
      _shouldFail = false;
      throw Exception(_failureMessage);
    }
    return _mockResponses[key] as T?;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ApiClient IMPLEMENTATION - Token Refresh
  // ═══════════════════════════════════════════════════════════════════════════

  Future<String?> Function()? _onTokenRefreshNeeded;

  @override
  Future<String?> Function()? get onTokenRefreshNeeded => _onTokenRefreshNeeded;

  @override
  set onTokenRefreshNeeded(Future<String?> Function()? callback) {
    _onTokenRefreshNeeded = callback;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ApiClient IMPLEMENTATION - Low-Level HTTP
  // ═══════════════════════════════════════════════════════════════════════════

  @override
  Future<http.Response> authenticatedRequest(
    String method,
    String endpoint, {
    required String token,
    Map<String, dynamic>? body,
    Map<String, String>? additionalHeaders,
    bool isRetry = false,
  }) async {
    _recordCall('$method $endpoint');
    if (_shouldFail) {
      _shouldFail = false;
      throw Exception(_failureMessage);
    }
    // Use json.encode for proper JSON formatting
    final response = _mockResponses[endpoint];
    final responseBody = response != null
        ? json.encode(response)
        : '{"success": true}';
    return http.Response(responseBody, 200);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ApiClient IMPLEMENTATION - Convenience HTTP Methods
  // ═══════════════════════════════════════════════════════════════════════════

  @override
  Future<Map<String, dynamic>> get(
    String endpoint, {
    Map<String, String>? queryParameters,
    String? token,
  }) async {
    _recordCall('GET $endpoint');
    return _getResponse<Map<String, dynamic>>(endpoint) ?? {};
  }

  @override
  Future<Map<String, dynamic>> post(
    String endpoint, {
    Map<String, dynamic>? body,
    String? token,
  }) async {
    _recordCall('POST $endpoint');
    return _getResponse<Map<String, dynamic>>(endpoint) ?? {};
  }

  @override
  Future<Map<String, dynamic>> put(
    String endpoint, {
    Map<String, dynamic>? body,
    String? token,
  }) async {
    _recordCall('PUT $endpoint');
    return _getResponse<Map<String, dynamic>>(endpoint) ?? {};
  }

  @override
  Future<Map<String, dynamic>> patch(
    String endpoint, {
    Map<String, dynamic>? body,
    String? token,
  }) async {
    _recordCall('PATCH $endpoint');
    return _getResponse<Map<String, dynamic>>(endpoint) ?? {};
  }

  @override
  Future<Map<String, dynamic>> delete(String endpoint, {String? token}) async {
    _recordCall('DELETE $endpoint');
    return _getResponse<Map<String, dynamic>>(endpoint) ?? {};
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ApiClient IMPLEMENTATION - Entity CRUD
  // ═══════════════════════════════════════════════════════════════════════════

  @override
  Future<Map<String, dynamic>> fetchEntities(
    String entityName, {
    int page = 1,
    int limit = 50,
    String? search,
    Map<String, dynamic>? filters,
    String? sortBy,
    String sortOrder = 'DESC',
  }) async {
    _recordCall('fetchEntities $entityName');
    return _getResponse<Map<String, dynamic>>('entities:$entityName') ??
        {
          'success': true,
          'data': [],
          'pagination': {'page': page, 'limit': limit, 'totalCount': 0},
        };
  }

  @override
  Future<Map<String, dynamic>> fetchEntity(String entityName, int id) async {
    _recordCall('fetchEntity $entityName/$id');
    return _getResponse<Map<String, dynamic>>('entity:$entityName:$id') ??
        {
          'success': true,
          'data': {'id': id},
        };
  }

  @override
  Future<Map<String, dynamic>> createEntity(
    String entityName,
    Map<String, dynamic> data,
  ) async {
    _recordCall('createEntity $entityName');
    return _getResponse<Map<String, dynamic>>('create:$entityName') ??
        {
          'success': true,
          'data': {'id': 1, ...data},
        };
  }

  @override
  Future<Map<String, dynamic>> updateEntity(
    String entityName,
    int id,
    Map<String, dynamic> data,
  ) async {
    _recordCall('updateEntity $entityName/$id');
    return _getResponse<Map<String, dynamic>>('update:$entityName:$id') ??
        {
          'success': true,
          'data': {'id': id, ...data},
        };
  }

  @override
  Future<void> deleteEntity(String entityName, int id) async {
    _recordCall('deleteEntity $entityName/$id');
    if (_shouldFail) {
      _shouldFail = false;
      throw Exception(_failureMessage);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ApiClient IMPLEMENTATION - User Profile
  // ═══════════════════════════════════════════════════════════════════════════

  @override
  Future<Map<String, dynamic>?> getUserProfile(String token) async {
    _recordCall('getUserProfile');
    return _getResponse<Map<String, dynamic>>('userProfile');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ApiClient IMPLEMENTATION - Development Utilities
  // ═══════════════════════════════════════════════════════════════════════════

  @override
  Future<String?> getTestToken({String role = 'technician'}) async {
    _recordCall('getTestToken $role');
    return _currentToken ?? 'mock-token-$role';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ApiClient IMPLEMENTATION - Response Parsing
  // ═══════════════════════════════════════════════════════════════════════════

  @override
  T parseSuccessResponse<T>(
    Map<String, dynamic> response,
    T Function(Map<String, dynamic>) fromJson,
  ) {
    if (response['success'] != true || response['data'] == null) {
      throw Exception('Invalid response format');
    }
    return fromJson(response['data'] as Map<String, dynamic>);
  }

  @override
  List<T> parseSuccessListResponse<T>(
    Map<String, dynamic> response,
    T Function(Map<String, dynamic>) fromJson,
  ) {
    if (response['success'] != true || response['data'] == null) {
      throw Exception('Invalid response format');
    }
    return (response['data'] as List<dynamic>)
        .map((e) => fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
