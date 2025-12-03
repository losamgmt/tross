/// Modal Handlers - Pure functions for showing CRUD modals
///
/// **SOLE RESPONSIBILITY:** Orchestrate FormModal.show() calls for User/Role operations
///
/// Pure orchestration functions - no widgets, just composition.
/// - Loads dependencies (e.g., roles for user dropdown)
/// - Composes FormModal with field configs
/// - Calls service methods (create/update)
/// - Shows success/error snackbars
/// - Triggers refresh callbacks
///
/// SRP: Each function handles ONE modal show operation
/// Pattern: Similar to CrudHandlers (orchestration without widgets)
/// Testing: Easy to test - mock services, verify modal shown with correct config
///
/// Usage:
/// ```dart
/// IconButton(
///   icon: const Icon(Icons.add),
///   onPressed: () => ModalHandlers.showCreateUserModal(
///     context,
///     onSuccess: _refreshUserTable,
///   ),
/// )
/// ```
library;

import 'package:flutter/material.dart';
import '../models/user_model.dart';
import '../models/role_model.dart';
import '../services/user_service.dart';
import '../services/role_service.dart';
import '../widgets/organisms/modals/form_modal.dart';
import 'form_field_configs.dart';

class ModalHandlers {
  // Private constructor - static class only
  ModalHandlers._();

  /// Show create user modal
  ///
  /// Flow:
  /// 1. Load roles for dropdown
  /// 2. Show FormModal with empty user + fields
  /// 3. On save: call UserService.create()
  /// 4. Show success snackbar
  /// 5. Trigger onSuccess refresh
  ///
  /// @param context - BuildContext for modal/snackbar
  /// @param onSuccess - Callback to refresh table after creation
  static Future<void> showCreateUserModal(
    BuildContext context, {
    required VoidCallback onSuccess,
  }) async {
    try {
      // Load roles for dropdown
      final roles = await RoleService.getAll();

      if (!context.mounted) return;

      await FormModal.show<User>(
        context: context,
        title: 'Create New User',
        value: UserFieldConfigs.createEmpty(),
        fields: [
          UserFieldConfigs.email,
          UserFieldConfigs.firstName,
          UserFieldConfigs.lastName,
          UserFieldConfigs.role(roles),
        ],
        saveButtonText: 'Create User',
        onSave: (user) async {
          await UserService.create(
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            roleId: user.roleId,
          );

          if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('User "${user.email}" created successfully'),
              ),
            );
          }

          onSuccess();
        },
      );
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to load roles: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  /// Show edit user modal
  ///
  /// Flow:
  /// 1. Load roles for dropdown
  /// 2. Show FormModal with existing user + fields
  /// 3. On save: call UserService.update()
  /// 4. Show success snackbar
  /// 5. Trigger onSuccess refresh
  ///
  /// @param context - BuildContext for modal/snackbar
  /// @param user - Existing user to edit
  /// @param onSuccess - Callback to refresh table after update
  static Future<void> showEditUserModal(
    BuildContext context, {
    required User user,
    required VoidCallback onSuccess,
  }) async {
    try {
      // Load roles for dropdown
      final roles = await RoleService.getAll();

      if (!context.mounted) return;

      await FormModal.show<User>(
        context: context,
        title: 'Edit User: ${user.fullName}',
        value: user,
        fields: [
          UserFieldConfigs.email,
          UserFieldConfigs.firstName,
          UserFieldConfigs.lastName,
          UserFieldConfigs.role(roles),
          UserFieldConfigs.isActive,
        ],
        saveButtonText: 'Save Changes',
        onSave: (updatedUser) async {
          await UserService.updateUser(
            user.id,
            email: updatedUser.email,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            isActive: updatedUser.isActive,
          );

          // Separately update role if changed
          if (updatedUser.roleId != user.roleId) {
            await UserService.updateRole(user.id, updatedUser.roleId);
          }

          if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('User updated successfully')),
            );
          }

          onSuccess();
        },
      );
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to load roles: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  /// Show create role modal
  ///
  /// Flow:
  /// 1. Show FormModal with empty role + fields
  /// 2. On save: call RoleService.create()
  /// 3. Show success snackbar
  /// 4. Trigger onSuccess refresh
  ///
  /// @param context - BuildContext for modal/snackbar
  /// @param onSuccess - Callback to refresh table after creation
  static Future<void> showCreateRoleModal(
    BuildContext context, {
    required VoidCallback onSuccess,
  }) async {
    await FormModal.show<Role>(
      context: context,
      title: 'Create New Role',
      value: RoleFieldConfigs.createEmpty(),
      fields: [RoleFieldConfigs.name, RoleFieldConfigs.description],
      saveButtonText: 'Create Role',
      onSave: (role) async {
        await RoleService.create(role.name);

        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Role "${role.name}" created successfully')),
          );
        }

        onSuccess();
      },
    );
  }

  /// Show edit role modal
  ///
  /// Flow:
  /// 1. Show FormModal with existing role + fields
  /// 2. On save: call RoleService.update()
  /// 3. Show success snackbar
  /// 4. Trigger onSuccess refresh
  ///
  /// @param context - BuildContext for modal/snackbar
  /// @param role - Existing role to edit
  /// @param onSuccess - Callback to refresh table after update
  static Future<void> showEditRoleModal(
    BuildContext context, {
    required Role role,
    required VoidCallback onSuccess,
  }) async {
    await FormModal.show<Role>(
      context: context,
      title: 'Edit Role: ${role.name}',
      value: role,
      fields: [
        RoleFieldConfigs.name,
        RoleFieldConfigs.description,
        RoleFieldConfigs.priority,
        RoleFieldConfigs.isActive,
      ],
      saveButtonText: 'Save Changes',
      onSave: (updatedRole) async {
        // Build updates map with only changed fields
        await RoleService.update(
          role.id,
          name: updatedRole.name,
          description: updatedRole.description?.isEmpty == true
              ? null
              : updatedRole.description,
          priority: updatedRole.priority,
          isActive: updatedRole.isActive,
        );

        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Role updated successfully')),
          );
        }

        onSuccess();
      },
    );
  }
}
