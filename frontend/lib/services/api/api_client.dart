/// ApiClient - Abstract contract for API operations
///
/// SOLE RESPONSIBILITY: Define the contract for HTTP API operations
///
/// Implementations:
/// - [HttpApiClient] for production (real HTTP calls)
/// - [MockApiClient] for testing (controlled responses)
///
/// This is the core dependency that all services receive via DI.
/// Services never instantiate this directly - they receive it via Provider.
library;

import 'dart:async';
import 'package:http/http.dart' as http;

/// Abstract contract for API client operations
///
/// All HTTP operations go through this interface, enabling:
/// - Dependency injection for testability
/// - Mock implementations for unit/widget tests
/// - Clean separation of concerns
abstract class ApiClient {
  // ==========================================================================
  // TOKEN REFRESH CALLBACK
  // ==========================================================================

  /// Callback for token refresh on 401 responses
  /// Set by AuthService during initialization
  Future<String?> Function()? get onTokenRefreshNeeded;
  set onTokenRefreshNeeded(Future<String?> Function()? callback);

  // ==========================================================================
  // LOW-LEVEL HTTP OPERATIONS
  // ==========================================================================

  /// Make authenticated request with auto token refresh on 401
  ///
  /// This is the core method that handles:
  /// - Adding auth headers
  /// - Making the HTTP request
  /// - Auto-refreshing token on 401
  /// - Retrying request with new token
  Future<http.Response> authenticatedRequest(
    String method,
    String endpoint, {
    required String token,
    Map<String, dynamic>? body,
    Map<String, String>? additionalHeaders,
    bool isRetry = false,
  });

  // ==========================================================================
  // CONVENIENCE HTTP METHODS
  // ==========================================================================

  /// GET request with optional query parameters
  Future<Map<String, dynamic>> get(
    String endpoint, {
    Map<String, String>? queryParameters,
    String? token,
  });

  /// POST request with optional body
  Future<Map<String, dynamic>> post(
    String endpoint, {
    Map<String, dynamic>? body,
    String? token,
  });

  /// PUT request with optional body
  Future<Map<String, dynamic>> put(
    String endpoint, {
    Map<String, dynamic>? body,
    String? token,
  });

  /// PATCH request with optional body (partial updates)
  Future<Map<String, dynamic>> patch(
    String endpoint, {
    Map<String, dynamic>? body,
    String? token,
  });

  /// DELETE request
  Future<Map<String, dynamic>> delete(String endpoint, {String? token});

  // ==========================================================================
  // ENTITY CRUD OPERATIONS
  // ==========================================================================

  /// Fetch paginated list of entities
  ///
  /// Returns standardized response with data, pagination, and metadata.
  Future<Map<String, dynamic>> fetchEntities(
    String entityName, {
    int page = 1,
    int limit = 50,
    String? search,
    Map<String, dynamic>? filters,
    String? sortBy,
    String sortOrder = 'DESC',
  });

  /// Fetch single entity by ID
  Future<Map<String, dynamic>> fetchEntity(String entityName, int id);

  /// Create new entity
  Future<Map<String, dynamic>> createEntity(
    String entityName,
    Map<String, dynamic> data,
  );

  /// Update existing entity (partial update via PATCH)
  Future<Map<String, dynamic>> updateEntity(
    String entityName,
    int id,
    Map<String, dynamic> data,
  );

  /// Delete entity by ID
  Future<void> deleteEntity(String entityName, int id);

  // ==========================================================================
  // USER PROFILE
  // ==========================================================================

  /// Get user profile from backend
  Future<Map<String, dynamic>?> getUserProfile(String token);

  // ==========================================================================
  // DEVELOPMENT UTILITIES
  // ==========================================================================

  /// Get test token (development only)
  ///
  /// Supports all roles: admin, manager, dispatcher, technician, customer
  Future<String?> getTestToken({String role = 'technician'});

  // ==========================================================================
  // RESPONSE PARSING UTILITIES
  // ==========================================================================

  /// Parse success response with data validation
  ///
  /// DRY helper to eliminate repeated `response['success'] && response['data']` checks
  T parseSuccessResponse<T>(
    Map<String, dynamic> response,
    T Function(Map<String, dynamic>) fromJson,
  );

  /// Parse success response with list data
  List<T> parseSuccessListResponse<T>(
    Map<String, dynamic> response,
    T Function(Map<String, dynamic>) fromJson,
  );
}
