/// User Table Configuration
///
/// Defines columns and behavior for displaying users in a DataTable
/// Uses atoms/molecules for rich cell rendering
library;

import 'package:flutter/material.dart';
import '../../../models/user_model.dart';
import '../../../config/config.dart';
import '../../../utils/table_cell_builders.dart';
import '../../../services/user_service.dart';

class UserTableConfig {
  /// Get column definitions for user table
  static List<TableColumn<User>> getColumns({
    List<Widget> Function(User)? actionsBuilder,
    VoidCallback? onUserUpdated,
  }) {
    return [
      // Name column - reasonable width, not excessive
      TableColumn<User>(
        id: 'name',
        label: 'Name',
        sortable: true,
        width: 2,
        cellBuilder: (user) => TableCellBuilders.textCell(user.fullName),
        comparator: (a, b) => a.fullName.compareTo(b.fullName),
      ),

      // Email column - reasonable width, not excessive
      TableColumn<User>(
        id: 'email',
        label: 'Email',
        sortable: true,
        width: 2.5,
        cellBuilder: (user) => TableCellBuilders.emailCell(user.email),
        comparator: (a, b) => a.email.compareTo(b.email),
      ),

      // Role column - compact for badges
      TableColumn<User>(
        id: 'role',
        label: 'Role',
        sortable: true,
        width: 1.2,
        cellBuilder: (user) => TableCellBuilders.roleBadgeCell(user.role),
        comparator: (a, b) => a.role.compareTo(b.role),
      ),

      // Status column - compact for badges + inline editing
      TableColumn<User>(
        id: 'status',
        label: 'Status',
        sortable: true,
        width: 1.5,
        cellBuilder: (user) => TableCellBuilders.editableBooleanCell<User>(
          item: user,
          value: user.isActive,
          onUpdate: (newValue) async {
            await UserService.updateUser(user.id, isActive: newValue);
            return true;
          },
          onChanged: onUserUpdated,
          fieldName: 'user status',
          trueAction: 'activate this user',
          falseAction: 'deactivate this user',
        ),
        comparator: (a, b) => a.isActive == b.isActive
            ? 0
            : a.isActive
            ? -1
            : 1,
      ),

      // Created date column - reasonable width
      TableColumn<User>(
        id: 'created',
        label: 'Created',
        sortable: true,
        width: 1.5,
        cellBuilder: (user) => TableCellBuilders.timestampCell(user.createdAt),
        comparator: (a, b) => a.createdAt.compareTo(b.createdAt),
      ),
    ];
  }
}
