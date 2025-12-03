/// Table Action Builders - Pure functions for building table actions
///
/// **SOLE RESPONSIBILITY:** Compose action buttons with permission checks
///
/// These are PURE UTILITY FUNCTIONS - no widgets, no state, just composition.
/// - Input: user role, data item, refresh callback
/// - Output: `List<Widget>` of action buttons
/// - Permission-aware: only show actions user can perform
///
/// SRP: Each function builds ONE specific action list
/// Pattern: Similar to TableCellBuilders (pure composers)
/// Testing: Easy to test - pass role, verify correct buttons returned
///
/// Usage:
/// ```dart
/// AppDataTable<User>(
///   actionsBuilder: (user) => TableActionBuilders.buildUserRowActions(
///     context,
///     user,
///     currentUserRole,
///     _refreshUserTable,
///   ),
/// )
/// ```
library;

import 'package:flutter/material.dart';
import '../config/permissions.dart';
import '../models/user_model.dart';
import '../models/role_model.dart';
import '../widgets/atoms/buttons/action_button.dart';
import '../services/user_service.dart';
import '../services/role_service.dart';
import 'crud_handlers.dart';
import 'modal_handlers.dart';

class TableActionBuilders {
  // Private constructor - static class only
  TableActionBuilders._();

  /// Build per-row actions for users table
  ///
  /// Actions:
  /// - Edit (admin only, shows modal)
  /// - Delete (admin only, shows confirmation, blocks self-delete)
  ///
  /// Note: Inline editing exists via EditableField for quick status toggles
  static List<Widget> buildUserRowActions(
    BuildContext context,
    User user,
    String? userRole,
    String? currentUserId,
    VoidCallback onRefresh,
  ) {
    final actions = <Widget>[];

    // Edit action (admin only)
    if (hasPermission(userRole, 'users', 'update')) {
      actions.add(
        ActionButton.edit(
          onPressed: () async {
            await ModalHandlers.showEditUserModal(
              context,
              user: user,
              onSuccess: onRefresh,
            );
          },
        ),
      );
    }

    // Delete action (admin only, prevent self-delete)
    if (hasPermission(userRole, 'users', 'delete')) {
      final isSelf =
          currentUserId != null && user.id.toString() == currentUserId;
      actions.add(
        ActionButton.delete(
          onPressed: isSelf
              ? null
              : () async {
                  await CrudHandlers.handleDelete(
                    context: context,
                    entityType: 'user',
                    entityName: user.fullName,
                    deleteOperation: () => UserService.delete(user.id),
                    onSuccess: onRefresh,
                  );
                },
          tooltip: isSelf ? 'Cannot delete your own account' : 'Delete user',
        ),
      );
    }

    return actions;
  }

  /// Build per-row actions for roles table
  ///
  /// Actions:
  /// - Edit (admin only, shows modal)
  /// - Delete (admin only, shows confirmation)
  ///
  /// Note: Deleting a role also refreshes the users table since role assignments may be affected
  static List<Widget> buildRoleRowActions(
    BuildContext context,
    Role role,
    String? userRole, {
    required VoidCallback onRoleRefresh,
    required VoidCallback onUserRefresh,
  }) {
    final actions = <Widget>[];

    // Edit action (admin only)
    if (hasPermission(userRole, 'roles', 'update')) {
      actions.add(
        ActionButton.edit(
          onPressed: () async {
            await ModalHandlers.showEditRoleModal(
              context,
              role: role,
              onSuccess: onRoleRefresh,
            );
          },
        ),
      );
    }

    // Delete action (admin only)
    // Cascades refresh to users table since deleting a role may affect user role assignments
    if (hasPermission(userRole, 'roles', 'delete')) {
      actions.add(
        ActionButton.delete(
          onPressed: () async {
            await CrudHandlers.handleDelete(
              context: context,
              entityType: 'role',
              entityName: role.name,
              deleteOperation: () => RoleService.delete(role.id),
              onSuccess: onRoleRefresh,
              additionalRefreshCallbacks: [onUserRefresh],
            );
          },
        ),
      );
    }

    return actions;
  }

  /// Build toolbar actions for users table
  ///
  /// Actions:
  /// - Refresh (always available)
  /// - Create New User (admin only, shows modal)
  static List<Widget> buildUserToolbarActions(
    BuildContext context,
    String? userRole,
    VoidCallback onRefresh,
  ) {
    final actions = <Widget>[];

    // Refresh action (always available)
    actions.add(
      IconButton(
        icon: const Icon(Icons.refresh),
        tooltip: 'Refresh users',
        onPressed: onRefresh,
      ),
    );

    // Create action (admin only)
    if (hasPermission(userRole, 'users', 'create')) {
      actions.add(
        IconButton(
          icon: const Icon(Icons.add),
          tooltip: 'Create new user',
          onPressed: () async {
            await ModalHandlers.showCreateUserModal(
              context,
              onSuccess: onRefresh,
            );
          },
        ),
      );
    }

    return actions;
  }

  /// Build toolbar actions for roles table
  ///
  /// Actions:
  /// - Refresh (always available)
  /// - Create New Role (admin only, shows modal)
  static List<Widget> buildRoleToolbarActions(
    BuildContext context,
    String? userRole,
    VoidCallback onRefresh,
  ) {
    final actions = <Widget>[];

    // Refresh action (always available)
    actions.add(
      IconButton(
        icon: const Icon(Icons.refresh),
        tooltip: 'Refresh roles',
        onPressed: onRefresh,
      ),
    );

    // Create action (admin only)
    if (hasPermission(userRole, 'roles', 'create')) {
      actions.add(
        IconButton(
          icon: const Icon(Icons.add),
          tooltip: 'Create new role',
          onPressed: () async {
            await ModalHandlers.showCreateRoleModal(
              context,
              onSuccess: onRefresh,
            );
          },
        ),
      );
    }

    return actions;
  }
}
