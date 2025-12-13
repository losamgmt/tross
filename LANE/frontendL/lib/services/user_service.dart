/// User Service - API client for user operations
/// Handles all HTTP requests to /api/users endpoints
///
/// SECURITY: All endpoints require admin authentication
/// Backend validates JWT tokens and admin role
///
/// ARCHITECTURE:
/// - Pure API client - no business logic
/// - Uses ApiClient for HTTP with auto token refresh
/// - Error handling: catch-rethrow pattern with context
/// - Response validation: parseSuccessResponse() helpers
///
/// DEPENDENCIES:
/// - ApiClient: HTTP client with authentication
/// - User model: fromJson() validation with toSafe*()
library;

import 'package:flutter/foundation.dart' show debugPrint;

import '../models/user_model.dart';
import 'api_client.dart';

class UserService {
  // Private constructor - static class only
  UserService._();

  /// Create new user (admin only)
  ///
  /// Pre-provisions user account that will be linked on first Auth0 login.
  /// Useful for setting up users before they log in for the first time.
  ///
  /// @param email - Required user email (validated by backend)
  /// @param roleId - Optional role ID (defaults to client if not provided)
  /// @param firstName - Optional first name
  /// @param lastName - Optional last name
  /// @returns Created User instance with generated ID
  /// @throws Exception on validation errors or auth failures
  ///
  /// Example:
  /// ```dart
  /// final user = await UserService.create(
  ///   email: 'dispatcher@example.com',
  ///   roleId: 3,
  ///   firstName: 'John',
  ///   lastName: 'Doe',
  /// );
  /// ```
  static Future<User> create({
    required String email,
    int? roleId,
    String? firstName,
    String? lastName,
  }) async {
    try {
      debugPrint('[USER_SERVICE] Creating user with:');
      debugPrint('[USER_SERVICE]   email: "$email" (${email.runtimeType})');
      debugPrint(
        '[USER_SERVICE]   firstName: "$firstName" (${firstName.runtimeType})',
      );
      debugPrint(
        '[USER_SERVICE]   lastName: "$lastName" (${lastName.runtimeType})',
      );
      debugPrint('[USER_SERVICE]   roleId: $roleId');

      final body = <String, dynamic>{'email': email};
      if (roleId != null) body['role_id'] = roleId;
      if (firstName != null) body['first_name'] = firstName;
      if (lastName != null) body['last_name'] = lastName;

      debugPrint('[USER_SERVICE] Request body: $body');
      final response = await ApiClient.post('/users', body: body);
      return ApiClient.parseSuccessResponse(response, User.fromJson);
    } catch (e) {
      if (e.toString().contains('Exception:')) {
        rethrow;
      }
      throw Exception('Failed to create user: ${e.toString()}');
    }
  }

  /// Fetch all users (admin only)
  ///
  /// Returns list of all users in the system with their roles.
  /// Useful for user management screens and admin dashboards.
  ///
  /// @returns List of User instances sorted by creation date (newest first)
  /// @throws Exception on auth failures or server errors
  ///
  /// Example:
  /// ```dart
  /// final users = await UserService.getAll();
  /// for (final user in users) {
  ///   print('${user.email} - ${user.role?.name}');
  /// }
  /// ```
  static Future<List<User>> getAll() async {
    try {
      final response = await ApiClient.get(
        '/users',
        queryParameters: {
          'page': '1',
          'limit': '100', // Reasonable default for admin user list
        },
      );

      return ApiClient.parseSuccessListResponse(response, User.fromJson);
    } catch (e) {
      if (e.toString().contains('Exception:')) {
        rethrow;
      }
      throw Exception('Failed to fetch users: ${e.toString()}');
    }
  }

  /// Fetch single user by ID (admin only)
  ///
  /// Retrieves complete user information including role and metadata.
  ///
  /// @param userId - Database user ID (positive integer)
  /// @returns User instance with populated role information
  /// @throws Exception if user not found or auth fails
  ///
  /// Example:
  /// ```dart
  /// final user = await UserService.getById(42);
  /// print('Found: ${user.email}');
  /// ```
  static Future<User> getById(int userId) async {
    try {
      final response = await ApiClient.get('/users/$userId');

      return ApiClient.parseSuccessResponse(response, User.fromJson);
    } catch (e) {
      if (e.toString().contains('Exception:')) {
        rethrow;
      }
      throw Exception('Failed to fetch user: ${e.toString()}');
    }
  }

  /// Update user's role (admin only)
  ///
  /// Changes a user's role and recalculates their permissions.
  /// Cannot change own role (backend enforces this).
  ///
  /// @param userId - Target user's database ID
  /// @param newRoleId - New role ID (must exist in roles table)
  /// @returns Updated User instance with new role
  /// @throws Exception if role invalid, user not found, or trying to change own role
  ///
  /// Example:
  /// ```dart
  /// // Promote user to manager
  /// final updated = await UserService.updateRole(42, 4);
  /// ```
  static Future<User> updateRole(int userId, int newRoleId) async {
    try {
      final response = await ApiClient.put(
        '/users/$userId/role',
        body: {'role_id': newRoleId},
      );

      return ApiClient.parseSuccessResponse(response, User.fromJson);
    } catch (e) {
      if (e.toString().contains('Exception:')) {
        rethrow;
      }
      throw Exception('Failed to update user role: ${e.toString()}');
    }
  }

  /// Update user information (admin only)
  ///
  /// Updates user profile fields. All fields are optional - only provided fields are updated.
  /// Cannot change email after creation (backend enforces immutability).
  ///
  /// @param userId - Target user's database ID
  /// @param isActive - Optional: Enable/disable user account
  /// @param email - Optional: New email (validation enforced by backend)
  /// @param firstName - Optional: New first name
  /// @param lastName - Optional: New last name
  /// @returns Updated User instance
  /// @throws Exception on validation errors or auth failures
  ///
  /// Example:
  /// ```dart
  /// // Deactivate user
  /// await UserService.updateUser(42, isActive: false);
  ///
  /// // Update name
  /// await UserService.updateUser(42, firstName: 'Jane', lastName: 'Smith');
  /// ```
  static Future<User> updateUser(
    int userId, {
    bool? isActive,
    String? email,
    String? firstName,
    String? lastName,
  }) async {
    try {
      // Build request body with only provided fields
      final body = <String, dynamic>{};
      if (isActive != null) body['is_active'] = isActive;
      if (email != null) body['email'] = email;
      if (firstName != null) body['first_name'] = firstName;
      if (lastName != null) body['last_name'] = lastName;

      if (body.isEmpty) {
        throw Exception('At least one field must be provided for update');
      }

      debugPrint('🔍 [UserService] Updating user $userId with: $body');

      final response = await ApiClient.put('/users/$userId', body: body);

      debugPrint('✅ [UserService] Update response received: ${response.keys}');

      final updatedUser = ApiClient.parseSuccessResponse(
        response,
        User.fromJson,
      );

      debugPrint(
        '✅ [UserService] User parsed successfully: ${updatedUser.email}',
      );

      return updatedUser;
    } catch (e) {
      debugPrint('❌ [UserService] Update failed: $e');
      if (e.toString().contains('Exception:')) {
        rethrow;
      }
      throw Exception('Failed to update user: ${e.toString()}');
    }
  }

  /// Delete user (admin only)
  ///
  /// Permanently removes user from the system. This action is irreversible.
  /// Cascade deletes associated audit logs and work orders (if configured).
  ///
  /// SECURITY: Cannot delete own account (backend enforces)
  ///
  /// @param userId - Target user's database ID
  /// @returns true if deletion successful
  /// @throws Exception if user not found, trying to delete self, or auth fails
  ///
  /// Example:
  /// ```dart
  /// final success = await UserService.delete(42);
  /// if (success) {
  ///   NotificationService.showSuccess(context, 'User deleted');
  /// }
  /// ```
  static Future<bool> delete(int userId) async {
    try {
      final response = await ApiClient.delete('/users/$userId');

      if (response['success'] == true) {
        return true;
      }

      throw Exception('Invalid response format from backend');
    } catch (e) {
      if (e.toString().contains('Exception:')) {
        rethrow;
      }
      throw Exception('Failed to delete user: ${e.toString()}');
    }
  }
}
