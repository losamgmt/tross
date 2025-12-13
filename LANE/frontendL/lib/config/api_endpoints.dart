/// API Endpoint Constants - Single source of truth for all API paths
/// KISS Principle: Centralized endpoint definitions prevent typos and inconsistencies
///
/// Usage:
/// ```dart
/// final response = await apiClient.get(ApiEndpoints.userProfile);
/// ```
class ApiEndpoints {
  // Private constructor to prevent instantiation
  ApiEndpoints._();

  // ============================================================================
  // AUTHENTICATION ENDPOINTS
  // ============================================================================

  static const String authMe = '/auth/me';
  static const String authLogout = '/auth/logout';

  // ============================================================================
  // DEVELOPMENT/STATUS ENDPOINTS
  // ============================================================================

  static const String devStatus = '/dev/status';
  static const String healthCheck = '/health';

  // ============================================================================
  // USER MANAGEMENT ENDPOINTS
  // ============================================================================

  static const String users = '/users';
  static const String usersBase = '/users'; // For dynamic IDs: '$usersBase/$id'

  // ============================================================================
  // ROLE MANAGEMENT ENDPOINTS
  // ============================================================================

  static const String roles = '/roles';
  static const String rolesBase = '/roles'; // For dynamic IDs: '$rolesBase/$id'

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /// Get user by ID endpoint
  static String userById(int id) => '/users/$id';

  /// Get role by ID endpoint
  static String roleById(int id) => '/roles/$id';

  /// Verify if a path is an authentication endpoint
  static bool isAuthEndpoint(String path) {
    return path.startsWith('/auth/');
  }
}
