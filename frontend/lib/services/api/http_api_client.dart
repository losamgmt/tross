/// HttpApiClient - Production implementation of ApiClient
///
/// SOLE RESPONSIBILITY: Make real HTTP calls to the backend
///
/// This is the production implementation of [ApiClient].
/// For testing, use [MockApiClient] instead.
library;

import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../config/api_endpoints.dart';
import '../../config/app_config.dart';
import '../../utils/helpers/string_helper.dart';
import '../error_service.dart';
import '../auth/token_manager.dart';
import 'api_client.dart';

/// Production HTTP implementation of [ApiClient]
class HttpApiClient implements ApiClient {
  // Token refresh callback - set by AuthService
  Future<String?> Function()? _onTokenRefreshNeeded;

  // Token refresh mutex - prevents concurrent refresh attempts
  Completer<String?>? _refreshCompleter;

  @override
  Future<String?> Function()? get onTokenRefreshNeeded => _onTokenRefreshNeeded;

  @override
  set onTokenRefreshNeeded(Future<String?> Function()? callback) {
    _onTokenRefreshNeeded = callback;
  }

  // TODO: Implement all ApiClient methods
  // Methods will be added incrementally in subsequent edits

  @override
  Future<http.Response> authenticatedRequest(
    String method,
    String endpoint, {
    required String token,
    Map<String, dynamic>? body,
    Map<String, String>? additionalHeaders,
    bool isRetry = false,
  }) async {
    final headers = {
      'Authorization': 'Bearer $token',
      'Content-Type': 'application/json',
      ...?additionalHeaders,
    };

    final uri = Uri.parse('${AppConfig.baseUrl}$endpoint');

    try {
      http.Response response;

      switch (StringHelper.toUpperCase(method)) {
        case 'GET':
          response = await http
              .get(uri, headers: headers)
              .timeout(AppConfig.httpTimeout);
          break;
        case 'POST':
          response = await http
              .post(
                uri,
                headers: headers,
                body: body != null ? json.encode(body) : null,
              )
              .timeout(AppConfig.httpTimeout);
          break;
        case 'PUT':
          response = await http
              .put(
                uri,
                headers: headers,
                body: body != null ? json.encode(body) : null,
              )
              .timeout(AppConfig.httpTimeout);
          break;
        case 'PATCH':
          response = await http
              .patch(
                uri,
                headers: headers,
                body: body != null ? json.encode(body) : null,
              )
              .timeout(AppConfig.httpTimeout);
          break;
        case 'DELETE':
          response = await http
              .delete(uri, headers: headers)
              .timeout(AppConfig.httpTimeout);
          break;
        default:
          throw Exception('Unsupported HTTP method: $method');
      }

      // Auto token refresh on 401 Unauthorized
      if (response.statusCode == 401 &&
          !isRetry &&
          _onTokenRefreshNeeded != null) {
        ErrorService.logInfo('Received 401 - attempting token refresh');

        try {
          final newToken = await _refreshTokenWithMutex();

          if (newToken != null) {
            ErrorService.logInfo(
              'Token refreshed successfully - retrying request',
            );

            return await authenticatedRequest(
              method,
              endpoint,
              token: newToken,
              body: body,
              additionalHeaders: additionalHeaders,
              isRetry: true,
            );
          }
        } catch (e) {
          ErrorService.logError('Token refresh failed', error: e);
        }
      }

      return response;
    } catch (e) {
      ErrorService.logError(
        'API request failed',
        error: e,
        context: {'method': method, 'endpoint': endpoint},
      );
      rethrow;
    }
  }

  /// Refresh token with mutex - prevents concurrent refresh attempts
  Future<String?> _refreshTokenWithMutex() async {
    if (_refreshCompleter != null) {
      ErrorService.logInfo('Token refresh already in progress - waiting');
      return _refreshCompleter!.future;
    }

    _refreshCompleter = Completer<String?>();
    try {
      final newToken = await _onTokenRefreshNeeded!();
      _refreshCompleter!.complete(newToken);
      return newToken;
    } catch (e) {
      _refreshCompleter!.completeError(e);
      rethrow;
    } finally {
      _refreshCompleter = null;
    }
  }

  @override
  Future<Map<String, dynamic>> get(
    String endpoint, {
    Map<String, String>? queryParameters,
    String? token,
  }) async {
    try {
      final authToken = token ?? await _getStoredToken();
      if (authToken == null) {
        throw Exception('No authentication token available');
      }

      String finalEndpoint = endpoint;
      if (queryParameters != null && queryParameters.isNotEmpty) {
        final queryString = queryParameters.entries
            .map((e) => '${e.key}=${Uri.encodeComponent(e.value)}')
            .join('&');
        finalEndpoint = '$endpoint?$queryString';
      }

      final response = await authenticatedRequest(
        'GET',
        finalEndpoint,
        token: authToken,
      );

      return _parseResponse(response);
    } catch (e) {
      ErrorService.logError('GET request failed', error: e);
      rethrow;
    }
  }

  @override
  Future<Map<String, dynamic>> post(
    String endpoint, {
    Map<String, dynamic>? body,
    String? token,
  }) async {
    try {
      final authToken = token ?? await _getStoredToken();
      if (authToken == null) {
        throw Exception('No authentication token available');
      }

      final response = await authenticatedRequest(
        'POST',
        endpoint,
        token: authToken,
        body: body,
      );

      return _parseResponse(response);
    } catch (e) {
      ErrorService.logError('POST request failed', error: e);
      rethrow;
    }
  }

  @override
  Future<Map<String, dynamic>> put(
    String endpoint, {
    Map<String, dynamic>? body,
    String? token,
  }) async {
    try {
      final authToken = token ?? await _getStoredToken();
      if (authToken == null) {
        throw Exception('No authentication token available');
      }

      final response = await authenticatedRequest(
        'PUT',
        endpoint,
        token: authToken,
        body: body,
      );

      return _parseResponse(response);
    } catch (e) {
      ErrorService.logError('PUT request failed', error: e);
      rethrow;
    }
  }

  @override
  Future<Map<String, dynamic>> patch(
    String endpoint, {
    Map<String, dynamic>? body,
    String? token,
  }) async {
    try {
      final authToken = token ?? await _getStoredToken();
      if (authToken == null) {
        throw Exception('No authentication token available');
      }

      final response = await authenticatedRequest(
        'PATCH',
        endpoint,
        token: authToken,
        body: body,
      );

      return _parseResponse(response);
    } catch (e) {
      ErrorService.logError('PATCH request failed', error: e);
      rethrow;
    }
  }

  @override
  Future<Map<String, dynamic>> delete(String endpoint, {String? token}) async {
    try {
      final authToken = token ?? await _getStoredToken();
      if (authToken == null) {
        throw Exception('No authentication token available');
      }

      final response = await authenticatedRequest(
        'DELETE',
        endpoint,
        token: authToken,
      );

      return _parseResponse(response);
    } catch (e) {
      ErrorService.logError('DELETE request failed', error: e);
      rethrow;
    }
  }

  /// Helper: Get stored auth token from secure storage
  Future<String?> _getStoredToken() async {
    try {
      return await TokenManager.getStoredToken();
    } catch (e) {
      ErrorService.logError('Failed to get stored token', error: e);
      return null;
    }
  }

  /// Helper: Parse HTTP response to Map
  Map<String, dynamic> _parseResponse(http.Response response) {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      try {
        final data = json.decode(response.body);
        return data is Map<String, dynamic> ? data : {'data': data};
      } catch (e) {
        ErrorService.logError('JSON decode failed', error: e);
        rethrow;
      }
    } else {
      try {
        final errorData = json.decode(response.body);
        final errorMessage =
            errorData['message'] ??
            errorData['error'] ??
            'Request failed: ${response.statusCode}';
        throw Exception(errorMessage);
      } catch (e) {
        if (e is Exception && e.toString().contains('Exception:')) {
          rethrow;
        }
        throw Exception('Request failed: ${response.statusCode}');
      }
    }
  }

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
    final queryParams = <String, String>{
      'page': page.toString(),
      'limit': limit.toString(),
    };

    if (search != null && search.isNotEmpty) {
      queryParams['search'] = search;
    }
    if (sortBy != null) {
      queryParams['sortBy'] = sortBy;
      queryParams['sortOrder'] = sortOrder;
    }
    if (filters != null) {
      filters.forEach((key, value) {
        if (value != null) {
          queryParams[key] = value.toString();
        }
      });
    }

    final response = await get(
      _entityEndpoint(entityName),
      queryParameters: queryParams,
    );

    if (response['success'] == true) {
      final data = response['data'];
      return {
        'data': (data is List)
            ? data.map((e) => e as Map<String, dynamic>).toList()
            : <Map<String, dynamic>>[],
        'pagination': response['pagination'],
        'count': response['count'],
        'appliedFilters': response['appliedFilters'],
        'timestamp': response['timestamp'],
      };
    }
    throw Exception(response['error'] ?? 'Failed to fetch $entityName list');
  }

  /// Build API endpoint from entity name
  String _entityEndpoint(String entityName) {
    const endpointMap = <String, String>{
      'user': '/users',
      'role': '/roles',
      'customer': '/customers',
      'technician': '/technicians',
      'work_order': '/work_orders',
      'invoice': '/invoices',
      'contract': '/contracts',
      'inventory': '/inventory',
      'preferences': '/preferences',
    };

    if (endpointMap.containsKey(entityName)) {
      return endpointMap[entityName]!;
    }

    final plural = entityName.endsWith('y')
        ? '${entityName.substring(0, entityName.length - 1)}ies'
        : entityName.endsWith('s')
        ? entityName
        : '${entityName}s';
    return '/$plural';
  }

  @override
  Future<Map<String, dynamic>> fetchEntity(String entityName, int id) async {
    final response = await get('${_entityEndpoint(entityName)}/$id');

    if (response['success'] == true && response['data'] != null) {
      return response['data'] as Map<String, dynamic>;
    }
    throw Exception(response['error'] ?? '$entityName not found');
  }

  @override
  Future<Map<String, dynamic>> createEntity(
    String entityName,
    Map<String, dynamic> data,
  ) async {
    final response = await post(_entityEndpoint(entityName), body: data);

    if (response['success'] == true && response['data'] != null) {
      return response['data'] as Map<String, dynamic>;
    }
    throw Exception(response['error'] ?? 'Failed to create $entityName');
  }

  @override
  Future<Map<String, dynamic>> updateEntity(
    String entityName,
    int id,
    Map<String, dynamic> data,
  ) async {
    final response = await patch(
      '${_entityEndpoint(entityName)}/$id',
      body: data,
    );

    if (response['success'] == true && response['data'] != null) {
      return response['data'] as Map<String, dynamic>;
    }
    throw Exception(response['error'] ?? 'Failed to update $entityName');
  }

  @override
  Future<void> deleteEntity(String entityName, int id) async {
    final response = await delete('${_entityEndpoint(entityName)}/$id');

    if (response['success'] != true) {
      throw Exception(response['error'] ?? 'Failed to delete $entityName');
    }
  }

  @override
  Future<Map<String, dynamic>?> getUserProfile(String token) async {
    try {
      final response = await authenticatedRequest(
        'GET',
        ApiEndpoints.authMe,
        token: token,
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return data['data'];
      } else if (response.statusCode == 401 || response.statusCode == 403) {
        ErrorService.logDebug(
          'No active session',
          context: {'statusCode': response.statusCode},
        );
        return null;
      } else {
        ErrorService.logWarning(
          'Unexpected response from /auth/me',
          context: {'statusCode': response.statusCode},
        );
        return null;
      }
    } catch (e) {
      ErrorService.logError('Error fetching user profile', error: e);
      return null;
    }
  }

  @override
  Future<String?> getTestToken({String role = 'technician'}) async {
    const validRoles = [
      'admin',
      'manager',
      'dispatcher',
      'technician',
      'customer',
    ];
    if (!validRoles.contains(role)) {
      ErrorService.logError(
        'Invalid role for dev token',
        error: 'Role must be one of: ${validRoles.join(", ")}',
      );
      return null;
    }

    final endpoint = '${AppConfig.devTokenEndpoint}?role=$role';

    try {
      final response = await http
          .get(
            Uri.parse(endpoint),
            headers: {'Content-Type': 'application/json'},
          )
          .timeout(AppConfig.httpTimeout);

      if (response.statusCode == 200) {
        final responseBody = json.decode(response.body);
        final data = responseBody['data'] ?? responseBody;
        return data['token'];
      } else {
        ErrorService.logError(
          'Failed to get test token',
          error: 'HTTP ${response.statusCode}',
        );
        return null;
      }
    } catch (e) {
      ErrorService.logError('Error getting test token', error: e);
      return null;
    }
  }

  @override
  T parseSuccessResponse<T>(
    Map<String, dynamic> response,
    T Function(Map<String, dynamic>) fromJson,
  ) {
    if (response['success'] == true && response['data'] != null) {
      return fromJson(response['data'] as Map<String, dynamic>);
    }
    throw Exception('Invalid response format from backend');
  }

  @override
  List<T> parseSuccessListResponse<T>(
    Map<String, dynamic> response,
    T Function(Map<String, dynamic>) fromJson,
  ) {
    if (response['success'] == true && response['data'] != null) {
      final List<dynamic> dataList = response['data'] as List<dynamic>;
      return dataList
          .map((item) => fromJson(item as Map<String, dynamic>))
          .toList();
    }
    throw Exception('Invalid response format from backend');
  }
}
