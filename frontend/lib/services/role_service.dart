/// Role Service - API client for role operations
/// Handles all HTTP requests to /api/roles endpoints
///
/// SECURITY:
/// - GET /api/roles requires authentication (manager+)
/// - Other operations (create/update/delete) require admin authentication
///
/// ARCHITECTURE:
/// - Pure API client - no business logic
/// - Dev mode support with hardcoded roles matching backend
/// - Uses ApiClient for HTTP with auto token refresh
/// - Response validation: parseSuccessResponse() helpers
///
/// DEPENDENCIES:
/// - ApiClient: HTTP client with authentication
/// - Role model: fromJson() validation with toSafe*()
library;

import 'package:flutter/foundation.dart' show debugPrint;

import '../models/role_model.dart';
import 'api_client.dart';

class RoleService {
  // Private constructor - static class only
  RoleService._();

  /// Hardcoded dev roles - matches backend/config/test-users.js
  /// Used in dev mode ONLY to populate role selector before authentication
  ///
  /// BACKEND PARITY: Must match backend test users exactly (role_id, name, priority)
  /// - admin (id: 1, priority: 5) - Full system access
  /// - manager (id: 2, priority: 4) - Operational management
  /// - dispatcher (id: 3, priority: 3) - Service coordination
  /// - technician (id: 4, priority: 2) - Field service
  /// - client (id: 5, priority: 1) - Customer access
  static final List<Role> _devRoles = [
    Role(
      id: 1,
      name: 'admin',
      priority: 5,
      description: 'Administrator - Full system access',
      createdAt: DateTime.parse('2025-01-01T00:00:00.000Z'),
      updatedAt: DateTime.parse('2025-01-01T00:00:00.000Z'),
      isActive: true,
    ),
    Role(
      id: 2,
      name: 'manager',
      priority: 4,
      description: 'Manager - Operational management',
      createdAt: DateTime.parse('2025-01-01T00:00:00.000Z'),
      updatedAt: DateTime.parse('2025-01-01T00:00:00.000Z'),
      isActive: true,
    ),
    Role(
      id: 3,
      name: 'dispatcher',
      priority: 3,
      description: 'Dispatcher - Service coordination',
      createdAt: DateTime.parse('2025-01-01T00:00:00.000Z'),
      updatedAt: DateTime.parse('2025-01-01T00:00:00.000Z'),
      isActive: true,
    ),
    Role(
      id: 4,
      name: 'technician',
      priority: 2,
      description: 'Technician - Field service',
      createdAt: DateTime.parse('2025-01-01T00:00:00.000Z'),
      updatedAt: DateTime.parse('2025-01-01T00:00:00.000Z'),
      isActive: true,
    ),
    Role(
      id: 5,
      name: 'client',
      priority: 1,
      description: 'Client - Customer access',
      createdAt: DateTime.parse('2025-01-01T00:00:00.000Z'),
      updatedAt: DateTime.parse('2025-01-01T00:00:00.000Z'),
      isActive: true,
    ),
  ];

  /// Get all roles for dev mode (no auth required)
  ///
  /// DEV ONLY: Returns hardcoded role list matching backend test users.
  /// Used by login screen to populate role selector BEFORE authentication.
  ///
  /// SECURITY: Only callable in dev mode (checked by caller via AppConfig.devAuthEnabled)
  /// In production, this should never be called - use getAll() instead.
  ///
  /// @returns Unmodifiable list of 5 hardcoded roles
  ///
  /// Example:
  /// ```dart
  /// if (AppConfig.devAuthEnabled) {
  ///   final roles = RoleService.getAllForDevMe();
  ///   // Show role selector in login screen
  /// }
  /// ```
  static List<Role> getAllForDevMode() {
    // Return copy to prevent external modification
    return List.unmodifiable(_devRoles);
  }

  /// Fetch all roles (requires auth: manager+)
  ///
  /// Returns list of all active roles in the system with their priorities.
  /// Used for role management screens and permission checks.
  ///
  /// @returns List of Role instances sorted by priority descending (admin first)
  /// @throws Exception on auth failures or server errors
  ///
  /// Example:
  /// ```dart
  /// final roles = await RoleService.getAll();
  /// // Display in role management screen
  /// ```
  static Future<List<Role>> getAll() async {
    try {
      // Use ApiClient which automatically adds auth token
      final response = await ApiClient.get(
        '/roles',
        queryParameters: {
          'page': '1',
          'limit': '100', // Get all roles (there are only 5)
        },
      );

      return ApiClient.parseSuccessListResponse(response, Role.fromJson);
    } catch (e) {
      if (e.toString().contains('Exception:')) {
        rethrow;
      }
      throw Exception('Failed to fetch roles: ${e.toString()}');
    }
  }

  /// Fetch single role by ID (requires auth: manager+)
  ///
  /// Retrieves complete role information including priority and description.
  ///
  /// @param roleId - Database role ID (1-5 for standard roles)
  /// @returns Role instance with all metadata
  /// @throws Exception if role not found or auth fails
  ///
  /// Example:
  /// ```dart
  /// final role = await RoleService.getById(3); // Get dispatcher role
  /// print('${role.name} (priority: ${role.priority})');
  /// ```
  static Future<Role> getById(int roleId) async {
    try {
      final response = await ApiClient.get('/roles/$roleId');

      return ApiClient.parseSuccessResponse(response, Role.fromJson);
    } catch (e) {
      if (e.toString().contains('Exception:')) {
        rethrow;
      }
      throw Exception('Failed to fetch role: ${e.toString()}');
    }
  }

  /// Get available role names sorted by priority (requires auth: manager+)
  ///
  /// Returns list of role names ordered highest priority first (admin → client).
  /// Useful for dropdowns and role selection UI.
  ///
  /// @returns List of role name strings sorted by priority descending
  /// @throws Exception on auth failures or server errors
  ///
  /// Example:
  /// ```dart
  /// final roleNames = await RoleService.getAvailableRoleNames();
  /// // ['admin', 'manager', 'dispatcher', 'technician', 'customer']
  /// ```
  static Future<List<String>> getAvailableRoleNames() async {
    final roles = await getAll();
    // Sort by priority descending (admin first)
    roles.sort((a, b) => (b.priority ?? 0).compareTo(a.priority ?? 0));
    return roles.map((role) => role.name).toList();
  }

  /// Create new role (admin only)
  ///
  /// Creates a new role with the specified name and default priority.
  ///
  /// @param name - Unique role name (lowercase, alphanumeric + underscore)
  /// @returns Created Role instance with generated ID
  /// @throws Exception if name already exists or validation fails
  ///
  /// Example:
  /// ```dart
  /// final newRole = await RoleService.create('supervisor');
  /// ```
  static Future<Role> create(String name) async {
    try {
      final response = await ApiClient.post('/roles', body: {'name': name});

      return ApiClient.parseSuccessResponse(response, Role.fromJson);
    } catch (e) {
      if (e.toString().contains('Exception:')) {
        rethrow;
      }
      throw Exception('Failed to create role: ${e.toString()}');
    }
  }

  /// Update role (admin only)
  ///
  /// Updates role fields. All fields optional - only provided fields are updated.
  /// Cannot update protected system roles (enforced by backend).
  ///
  /// @param roleId - Target role's database ID
  /// @param name - Optional: New role name
  /// @param isActive - Optional: Enable/disable role
  /// @param description - Optional: New description
  /// @param priority - Optional: Role hierarchy (1-100)
  /// @param permissions - Optional: New permissions array
  /// @returns Updated Role instance
  /// @throws Exception if role is protected, in use, or validation fails
  ///
  /// Example:
  /// ```dart
  /// await RoleService.update(7, description: 'Updated description', priority: 75);
  /// ```
  static Future<Role> update(
    int roleId, {
    String? name,
    bool? isActive,
    String? description,
    int? priority,
    List<String>? permissions,
  }) async {
    try {
      // Build request body with only provided fields
      final body = <String, dynamic>{};
      if (name != null) body['name'] = name;
      if (isActive != null) body['is_active'] = isActive;
      if (description != null) body['description'] = description;
      if (priority != null) body['priority'] = priority;
      if (permissions != null) body['permissions'] = permissions;

      if (body.isEmpty) {
        throw Exception('At least one field must be provided for update');
      }

      debugPrint('🔍 [RoleService] Updating role $roleId with: $body');

      final response = await ApiClient.put('/roles/$roleId', body: body);

      debugPrint('✅ [RoleService] Update response received: ${response.keys}');

      final updatedRole = ApiClient.parseSuccessResponse(
        response,
        Role.fromJson,
      );

      debugPrint(
        '✅ [RoleService] Role parsed successfully: ${updatedRole.name}',
      );

      return updatedRole;
    } catch (e) {
      debugPrint('❌ [RoleService] Update failed: $e');
      if (e.toString().contains('Exception:')) {
        rethrow;
      }
      throw Exception('Failed to update role: ${e.toString()}');
    }
  }

  /// Delete role (admin only)
  ///
  /// Permanently removes role from the system. This action is irreversible.
  /// Cannot delete protected system roles or roles currently assigned to users.
  ///
  /// @param roleId - Target role's database ID
  /// @returns true if deletion successful
  /// @throws Exception if role is protected, in use, not found, or auth fails
  ///
  /// Example:
  /// ```dart
  /// final success = await RoleService.delete(7); // Delete custom role
  /// ```
  static Future<bool> delete(int roleId) async {
    try {
      final response = await ApiClient.delete('/roles/$roleId');

      if (response['success'] == true) {
        return true;
      }

      throw Exception('Invalid response format from backend');
    } catch (e) {
      if (e.toString().contains('Exception:')) {
        rethrow;
      }
      throw Exception('Failed to delete role: ${e.toString()}');
    }
  }
}
