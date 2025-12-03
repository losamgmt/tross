/// User Table Column Definitions
///
/// **SOLE RESPONSIBILITY:** Define column structure for user tables
/// - Pure data definitions (no classes, just functions)
/// - Uses TableCellBuilders for cell rendering
/// - Returns `List<TableColumn<User>>`
///
/// This is a config file, not a widget or helper class
library;

import 'package:flutter/material.dart';
import '../../models/user_model.dart';
import '../../utils/table_cell_builders.dart';
import '../../services/user_service.dart';
import '../../widgets/atoms/indicators/status_badge.dart';
import '../table_column.dart';

/// Get column definitions for user table
List<TableColumn<User>> getUserColumns({VoidCallback? onUserUpdated}) {
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

    // Lifecycle Status column - compact for status badges
    TableColumn<User>(
      id: 'lifecycle_status',
      label: 'Lifecycle',
      sortable: true,
      width: 1.5,
      cellBuilder: (user) {
        // Determine badge style based on status
        final style = switch (user.status) {
          'pending_activation' => BadgeStyle.warning,
          'active' => BadgeStyle.success,
          'suspended' => BadgeStyle.error,
          _ => BadgeStyle.neutral,
        };

        // Show warning icon for data quality issues
        final icon = user.hasDataQualityIssue ? Icons.warning_amber : null;

        return TableCellBuilders.statusBadgeCell(
          label: user.statusLabel,
          style: style,
          icon: icon,
          compact: true,
        );
      },
      comparator: (a, b) => a.status.compareTo(b.status),
    ),

    // Active/Inactive toggle - compact for inline editing
    TableColumn<User>(
      id: 'is_active',
      label: 'Active',
      sortable: true,
      width: 1.3,
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
