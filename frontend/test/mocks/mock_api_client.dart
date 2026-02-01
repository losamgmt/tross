/// Mock API Client - Test Implementation
///
/// Implements the ApiClient interface for unit testing.
/// Provides controllable responses for all API operations.
///
/// USAGE:
/// ```dart
/// final mock = MockApiClient();
///
/// // For entity lists - use typed helper
/// mock.mockEntityList('customer', [
///   {'id': 1, 'name': 'Test'},
/// ]);
///
/// // For single entities
/// mock.mockEntity('customer', 42, {'id': 42, 'name': 'Test'});
///
/// // For custom responses
/// mock.mockResponse('/custom/endpoint', {'data': 'value'});
///
/// // Verify calls
/// expect(mock.wasCalled('fetchEntities customer'), isTrue);
/// ```
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
  // MOCK CONFIGURATION - Entity Helpers (Type-Safe)
  // ═══════════════════════════════════════════════════════════════════════════

  /// Mock an entity list response with proper typing
  ///
  /// Ensures the response is correctly typed for GenericEntityService
  void mockEntityList(
    String entityName,
    List<Map<String, dynamic>> data, {
    int page = 1,
    int limit = 50,
    int? total,
    bool hasNext = false,
  }) {
    _mockResponses['entities:$entityName'] = {
      'success': true,
      'data': data,
      'count': data.length,
      'pagination': {
        'page': page,
        'limit': limit,
        'total': total ?? data.length,
        'totalPages': ((total ?? data.length) / limit).ceil(),
        'hasNext': hasNext,
      },
    };
  }

  /// Mock a single entity response
  void mockEntity(String entityName, int id, Map<String, dynamic> data) {
    _mockResponses['entity:$entityName:$id'] = data;
  }

  /// Mock entity creation response
  void mockCreate(String entityName, Map<String, dynamic> response) {
    _mockResponses['create:$entityName'] = response;
  }

  /// Mock entity update response
  void mockUpdate(String entityName, int id, Map<String, dynamic> response) {
    _mockResponses['update:$entityName:$id'] = response;
  }

  /// Mock entity delete response
  void mockDelete(String entityName, int id, Map<String, dynamic> response) {
    _mockResponses['delete:$entityName:$id'] = response;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MOCK CONFIGURATION - Generic
  // ═══════════════════════════════════════════════════════════════════════════

  /// Set up a mock response for a specific key (for custom endpoints)
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

  /// Endpoint-specific error tracking
  final Map<String, String> _endpointErrors = {};

  /// Mock an error for a specific endpoint
  void mockErrorFor(String endpoint, String message) {
    _endpointErrors[endpoint] = message;
  }

  /// Endpoint-specific status code responses (for testing error paths)
  final Map<String, int> _endpointStatusCodes = {};
  final Map<String, dynamic> _endpointBodies = {};

  /// Mock a response with specific status code for an endpoint
  ///
  /// Use this to test error handling paths (403, 404, 500, etc.)
  /// ```dart
  /// mockApiClient.mockStatusCode('/stats/work_order', 403, {'error': 'Forbidden'});
  /// ```
  void mockStatusCode(
    String endpoint,
    int statusCode, [
    Map<String, dynamic>? body,
  ]) {
    _endpointStatusCodes[endpoint] = statusCode;
    if (body != null) {
      _endpointBodies[endpoint] = body;
    }
  }

  /// Clear endpoint-specific errors
  void clearEndpointErrors() {
    _endpointErrors.clear();
  }

  /// Reset all mock state
  void reset() {
    _callHistory.clear();
    _mockResponses.clear();
    _endpointErrors.clear();
    _endpointStatusCodes.clear();
    _endpointBodies.clear();
    _shouldFail = false;
    _failureMessage = 'Mock API Error';
    _currentToken = null;
    _onTokenRefreshNeeded = null;
  }

  /// Verify endpoint was called
  bool wasCalled(String pattern) {
    return _callHistory.any((call) => call.contains(pattern));
  }

  /// Get count of calls matching pattern
  int callCount(String pattern) {
    return _callHistory.where((call) => call.contains(pattern)).length;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  void _recordCall(String call) {
    _callHistory.add(call);
  }

  /// Check if an endpoint has a specific error configured
  void _checkEndpointError(String endpoint) {
    // Check for exact match or partial match
    for (final entry in _endpointErrors.entries) {
      if (endpoint.contains(entry.key) || entry.key.contains(endpoint)) {
        throw Exception(entry.value);
      }
    }
  }

  T? _getResponse<T>(String key, {String? endpoint}) {
    if (endpoint != null) {
      _checkEndpointError(endpoint);
    }
    if (_shouldFail) {
      _shouldFail = false;
      throw Exception(_failureMessage);
    }
    return _mockResponses[key] as T?;
  }

  /// Get entity list response with proper default typing
  Map<String, dynamic> _getEntityListResponse(String entityName) {
    if (_shouldFail) {
      _shouldFail = false;
      throw Exception(_failureMessage);
    }

    final response = _mockResponses['entities:$entityName'];
    if (response != null) {
      return response as Map<String, dynamic>;
    }

    // Default empty response with correct typing
    return {
      'success': true,
      'data': <Map<String, dynamic>>[],
      'count': 0,
      'pagination': {
        'page': 1,
        'limit': 50,
        'total': 0,
        'totalPages': 0,
        'hasNext': false,
      },
    };
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

    // Check for endpoint-specific status code mocking (supports partial match)
    for (final entry in _endpointStatusCodes.entries) {
      if (endpoint.contains(entry.key) || entry.key.contains(endpoint)) {
        final statusCode = entry.value;
        final mockBody = _endpointBodies[entry.key];
        final responseBody = mockBody != null
            ? json.encode(mockBody)
            : '{"error": "Mocked error"}';
        return http.Response(responseBody, statusCode);
      }
    }

    // Check for mocked response - supports both exact and partial match
    dynamic response = _mockResponses[endpoint];
    if (response == null) {
      // Try partial match for endpoints with query params
      for (final entry in _mockResponses.entries) {
        if (endpoint.startsWith(entry.key) ||
            entry.key.startsWith(endpoint.split('?')[0])) {
          response = entry.value;
          break;
        }
      }
    }

    // Use json.encode for proper JSON formatting
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

  @override
  Future<Map<String, dynamic>> postUnauthenticated(
    String endpoint, {
    Map<String, dynamic>? body,
  }) async {
    _recordCall('POST_UNAUTH $endpoint');
    return _getResponse<Map<String, dynamic>>(endpoint) ??
        {
          'success': true,
          'data': {'accessToken': 'mock-token', 'refreshToken': 'mock-refresh'},
        };
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
    return _getEntityListResponse(entityName);
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
