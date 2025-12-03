// API Client - Handles authenticated requests to backend
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/app_config.dart';
import '../config/api_endpoints.dart';
import '../utils/helpers/string_helper.dart';
import 'error_service.dart';
import 'auth/token_manager.dart';

class ApiClient {
  // Token refresh callback - set by AuthService
  static Future<String?> Function()? onTokenRefreshNeeded;

  /// Make authenticated request to backend with auto token refresh on 401
  static Future<http.Response> authenticatedRequest(
    String method,
    String endpoint, {
    required String token,
    Map<String, dynamic>? body,
    Map<String, String>? additionalHeaders,
    bool isRetry = false, // Prevent infinite retry loops
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
          onTokenRefreshNeeded != null) {
        ErrorService.logInfo('Received 401 - attempting token refresh');

        try {
          final newToken = await onTokenRefreshNeeded!();

          if (newToken != null) {
            ErrorService.logInfo(
              'Token refreshed successfully - retrying request',
            );

            // Retry the original request with new token
            return await authenticatedRequest(
              method,
              endpoint,
              token: newToken,
              body: body,
              additionalHeaders: additionalHeaders,
              isRetry: true, // Prevent double retry
            );
          }
        } catch (e) {
          ErrorService.logError('Token refresh failed', error: e);
          // Fall through to return original 401 response
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

  /// Get user profile from backend
  static Future<Map<String, dynamic>?> getUserProfile(String token) async {
    ErrorService.logInfo('Getting user profile from backend');
    try {
      ErrorService.logInfo('Making GET request to ${ApiEndpoints.authMe}');
      final response = await authenticatedRequest(
        'GET',
        ApiEndpoints.authMe,
        token: token,
      );

      ErrorService.logInfo(
        'User profile response received',
        context: {'statusCode': response.statusCode},
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);

        ErrorService.logInfo(
          'Profile data decoded',
          context: {
            'dataKeys': data.keys.toList(),
            'hasData': data['data'] != null,
          },
        );

        final result = data['data'];
        ErrorService.logInfo(
          'Returning profile',
          context: {'hasProfile': result != null},
        );
        return result;
      } else {
        ErrorService.logError(
          'Failed to fetch user profile',
          error: 'HTTP ${response.statusCode}',
        );
        return null;
      }
    } catch (e) {
      ErrorService.logError('Error fetching user profile', error: e);
      return null;
    }
  }

  /// Convenience method: GET request
  static Future<Map<String, dynamic>> get(
    String endpoint, {
    Map<String, String>? queryParameters,
    String? token,
  }) async {
    try {
      // Get token from storage if not provided
      final authToken = token ?? await _getStoredToken();
      if (authToken == null) {
        throw Exception('No authentication token available');
      }

      // Add query parameters to endpoint
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

  /// Convenience method: POST request
  static Future<Map<String, dynamic>> post(
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

  /// Convenience method: PUT request
  static Future<Map<String, dynamic>> put(
    String endpoint, {
    Map<String, dynamic>? body,
    String? token,
  }) async {
    try {
      ErrorService.logInfo(
        '📤 [ApiClient] PUT request starting',
        context: {'endpoint': endpoint, 'bodyKeys': body?.keys.toList() ?? []},
      );

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

      ErrorService.logInfo(
        '📥 [ApiClient] PUT response received',
        context: {'endpoint': endpoint, 'statusCode': response.statusCode},
      );

      return _parseResponse(response);
    } catch (e) {
      ErrorService.logError(
        '❌ [ApiClient] PUT request failed',
        error: e,
        context: {'endpoint': endpoint},
      );
      rethrow;
    }
  }

  /// Convenience method: DELETE request
  static Future<Map<String, dynamic>> delete(
    String endpoint, {
    String? token,
  }) async {
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
  static Future<String?> _getStoredToken() async {
    try {
      return await TokenManager.getStoredToken();
    } catch (e) {
      ErrorService.logError('Failed to get stored token', error: e);
      return null;
    }
  }

  /// Helper: Parse HTTP response to Map
  static Map<String, dynamic> _parseResponse(http.Response response) {
    ErrorService.logInfo(
      '🔍 [ApiClient] Parsing response',
      context: {
        'statusCode': response.statusCode,
        'bodyLength': response.body.length,
      },
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      try {
        final data = json.decode(response.body);
        ErrorService.logInfo(
          '✅ [ApiClient] Response parsed successfully',
          context: {
            'dataType': data.runtimeType.toString(),
            'hasSuccess': data is Map ? data.containsKey('success') : false,
            'success': data is Map ? data['success'] : null,
          },
        );
        return data is Map<String, dynamic> ? data : {'data': data};
      } catch (e) {
        ErrorService.logError(
          '❌ [ApiClient] JSON decode failed',
          error: e,
          context: {'rawBody': response.body.substring(0, 200)},
        );
        rethrow;
      }
    } else {
      // Handle error responses (400, 404, 500, etc.)
      try {
        final errorData = json.decode(response.body);
        final errorMessage =
            errorData['message'] ??
            errorData['error'] ??
            'Request failed: ${response.statusCode}';

        ErrorService.logError(
          '❌ [ApiClient] HTTP error response',
          error: 'HTTP ${response.statusCode}',
          context: {'body': response.body},
        );

        // Throw exception with the backend's error message
        throw Exception(errorMessage);
      } catch (e) {
        // If JSON parsing fails, throw generic error
        if (e is Exception && e.toString().contains('Exception:')) {
          rethrow; // Re-throw if it's already our formatted exception
        }
        throw Exception('Request failed: ${response.statusCode}');
      }
    }
  }

  /// Helper: Parse success response with data validation
  ///
  /// DRY helper to eliminate repeated `response['success'] && response['data']` checks
  /// Used by services to safely extract and parse data from API responses
  ///
  /// @param response - Raw API response Map
  /// @param fromJson - Model factory function (e.g., User.fromJson)
  /// @returns Parsed model instance
  /// @throws Exception if response format is invalid
  ///
  /// Example:
  /// ```dart
  /// final response = await ApiClient.get('/users/1');
  /// return ApiClient.parseSuccessResponse(response, User.fromJson);
  /// ```
  static T parseSuccessResponse<T>(
    Map<String, dynamic> response,
    T Function(Map<String, dynamic>) fromJson,
  ) {
    if (response['success'] == true && response['data'] != null) {
      return fromJson(response['data'] as Map<String, dynamic>);
    }
    throw Exception('Invalid response format from backend');
  }

  /// Helper: Parse success response with list data
  ///
  /// DRY helper for endpoints that return arrays
  ///
  /// Example:
  /// ```dart
  /// final response = await ApiClient.get('/users');
  /// return ApiClient.parseSuccessListResponse(response, User.fromJson);
  /// ```
  static List<T> parseSuccessListResponse<T>(
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

  /// Get test token (development only)
  ///
  /// Supports all roles: admin, manager, dispatcher, technician, client
  /// Defaults to technician if no role specified (backward compatible)
  static Future<String?> getTestToken({String role = 'technician'}) async {
    // Validate role
    const validRoles = [
      'admin',
      'manager',
      'dispatcher',
      'technician',
      'client',
    ];
    if (!validRoles.contains(role)) {
      ErrorService.logError(
        'Invalid role for dev token',
        error: 'Role must be one of: ${validRoles.join(", ")}',
      );
      return null;
    }

    // Build endpoint with role query parameter
    final endpoint = '${AppConfig.devTokenEndpoint}?role=$role';

    try {
      final response = await http
          .get(
            Uri.parse(endpoint),
            headers: {'Content-Type': 'application/json'},
          )
          .timeout(AppConfig.httpTimeout);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
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
}
