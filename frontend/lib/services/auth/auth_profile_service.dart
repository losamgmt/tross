/// Auth Profile Service
///
/// Handles user profile operations and validation
/// Integrates with backend /api/auth/me endpoint
library;

import '../../models/permission.dart';
import '../../services/permission_service_dynamic.dart';
import '../../config/api_endpoints.dart';
import '../../utils/helpers/string_helper.dart';
import '../api/api_client.dart';
import '../error_service.dart';
import '../../utils/validators.dart';

class AuthProfileService {
  /// API client for HTTP requests - injected via constructor
  final ApiClient _apiClient;

  /// Constructor - requires ApiClient injection
  AuthProfileService(this._apiClient);

  /// Get user profile from backend
  ///
  /// DEFENSIVE: Validates all profile fields from API response
  Future<Map<String, dynamic>?> getUserProfile(String token) async {
    ErrorService.logDebug('Getting user profile');
    try {
      final profile = await _apiClient.getUserProfile(token);

      if (profile != null) {
        // VALIDATE: API response data before using it
        final validatedProfile = _validateProfileData(profile);
        return validatedProfile;
      } else {
        ErrorService.logWarning('ApiClient returned null profile');
        return null;
      }
    } catch (e) {
      ErrorService.logError('Get user profile failed', error: e);
      return null;
    }
  }

  /// Validate profile data from API response
  ///
  /// DEFENSIVE: Use toSafe*() validators to protect against malformed backend responses
  /// Returns validated Map or throws ArgumentError with field context
  Map<String, dynamic> _validateProfileData(Map<String, dynamic> rawProfile) {
    try {
      ErrorService.logInfo(
        'Validating raw profile',
        context: {'rawProfile': rawProfile},
      );

      return {
        // KISS: id is null for dev users (no DB record), integer for real users
        'id': Validators.toSafeInt(
          rawProfile['id'],
          'profile.id',
          min: 1,
          allowNull: true, // Dev users have null IDs
        ),
        'email': Validators.toSafeEmail(rawProfile['email'], 'profile.email'),
        // auth0_id is intentionally stripped by backend for security
        // Frontend doesn't need it - only backend uses it for Auth0 lookups
        'auth0_id': Validators.toSafeString(
          rawProfile['auth0_id'],
          'profile.auth0_id',
          allowNull: true, // Backend strips this field for security
        ),
        'first_name': Validators.toSafeString(
          rawProfile['first_name'],
          'profile.first_name',
          allowNull: true,
        ),
        'last_name': Validators.toSafeString(
          rawProfile['last_name'],
          'profile.last_name',
          allowNull: true,
        ),
        'name': Validators.toSafeString(
          rawProfile['name'],
          'profile.name',
          allowNull: true,
        ),
        'role_id': Validators.toSafeInt(
          rawProfile['role_id'],
          'profile.role_id',
          min: 1,
        ),
        'role': Validators.toSafeString(
          rawProfile['role'],
          'profile.role',
          minLength: 3,
        ),
        // Role priority for O(1) permission checks (1=customer, 5=admin)
        'role_priority': Validators.toSafeInt(
          rawProfile['role_priority'],
          'profile.role_priority',
          min: 1,
          max: 10, // Allow room for future roles
          allowNull: true, // Fallback to role name lookup if not present
        ),
        'is_active':
            Validators.toSafeBool(
              rawProfile['is_active'],
              'profile.is_active',
            ) ??
            true,
        // KEEP AS STRINGS: DateTime objects break JSON encoding in secure storage
        'created_at': Validators.toSafeString(
          rawProfile['created_at'],
          'profile.created_at',
          allowNull: true,
        ),
        'updated_at': Validators.toSafeString(
          rawProfile['updated_at'],
          'profile.updated_at',
          allowNull: true,
        ),
        // Optional fields that might be in response
        if (rawProfile.containsKey('picture'))
          'picture': Validators.toSafeString(
            rawProfile['picture'],
            'profile.picture',
            allowNull: true,
          ),
        if (rawProfile.containsKey('email_verified'))
          'email_verified': Validators.toSafeBool(
            rawProfile['email_verified'],
            'profile.email_verified',
          ),
      };
    } catch (e) {
      ErrorService.logError(
        'Profile validation failed',
        error: e,
        context: {'rawProfile': rawProfile},
      );
      rethrow;
    }
  }

  /// Update user profile
  ///
  /// DEFENSIVE: Validates input updates AND response data
  Future<Map<String, dynamic>?> updateProfile(
    String token,
    Map<String, dynamic> updates,
  ) async {
    try {
      // VALIDATE: Input updates before sending to API
      final validatedUpdates = _validateProfileUpdates(updates);

      // Backend uses PATCH for partial profile updates
      final response = await _apiClient.authenticatedRequest(
        'PATCH',
        ApiEndpoints.authMe,
        token: token,
        body: validatedUpdates,
      );

      if (response.statusCode == 200) {
        final profile = await _apiClient.getUserProfile(token);
        if (profile != null) {
          // VALIDATE: Response data (already done in getUserProfile)
          ErrorService.logInfo('Profile updated successfully');
          return profile;
        }
      }

      ErrorService.logInfo('Profile update failed');
      return null;
    } catch (e) {
      ErrorService.logError('Profile update failed', error: e);
      return null;
    }
  }

  /// Validate profile update fields
  ///
  /// DEFENSIVE: Only allow updating first_name and last_name with valid strings
  Map<String, dynamic> _validateProfileUpdates(Map<String, dynamic> updates) {
    final validated = <String, dynamic>{};

    if (updates.containsKey('first_name')) {
      validated['first_name'] = Validators.toSafeString(
        updates['first_name'],
        'updates.first_name',
        minLength: 1,
        maxLength: 100,
      );
    }

    if (updates.containsKey('last_name')) {
      validated['last_name'] = Validators.toSafeString(
        updates['last_name'],
        'updates.last_name',
        minLength: 1,
        maxLength: 100,
      );
    }

    if (validated.isEmpty) {
      throw ArgumentError('No valid update fields provided');
    }

    return validated;
  }

  /// Check if user has specific role (exact match)
  static bool hasRole(Map<String, dynamic>? user, String roleName) {
    return StringHelper.toLowerCase(user?['role']) ==
        StringHelper.toLowerCase(roleName);
  }

  /// Check if user is admin
  static bool isAdmin(Map<String, dynamic>? user) {
    return user?['role']?.toString().toLowerCase() == 'admin';
  }

  /// Check if user is manager or above
  static bool isManager(Map<String, dynamic>? user) {
    return PermissionService.hasMinimumRole(user?['role'], UserRole.manager);
  }

  /// Check if user is dispatcher or above
  static bool isDispatcher(Map<String, dynamic>? user) {
    return PermissionService.hasMinimumRole(user?['role'], UserRole.dispatcher);
  }

  /// Check if user is technician or above
  static bool isTechnician(Map<String, dynamic>? user) {
    return PermissionService.hasMinimumRole(user?['role'], UserRole.technician);
  }

  /// Check if user has permission to perform operation on resource
  static bool canPerform(
    Map<String, dynamic>? user,
    ResourceType resource,
    CrudOperation operation,
  ) {
    return PermissionService.hasPermission(user?['role'], resource, operation);
  }

  /// Check if user meets minimum role requirement
  static bool meetsMinimumRole(
    Map<String, dynamic>? user,
    UserRole requiredRole,
  ) {
    return PermissionService.hasMinimumRole(user?['role'], requiredRole);
  }

  /// Get user's display name
  static String getDisplayName(Map<String, dynamic>? user) {
    return user?['name'] ?? user?['email'] ?? 'Unknown User';
  }

  /// Get user's email
  static String? getEmail(Map<String, dynamic>? user) {
    return user?['email'];
  }

  /// Get user's role
  static String? getRole(Map<String, dynamic>? user) {
    return user?['role'];
  }
}
