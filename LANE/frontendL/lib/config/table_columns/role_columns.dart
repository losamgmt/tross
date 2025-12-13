/// Role Table Column Definitions
///
/// **SOLE RESPONSIBILITY:** Define column structure for role tables
/// - Pure data definitions (no classes, just functions)
/// - Uses TableCellBuilders for cell rendering
/// - Returns `List<TableColumn<Role>>`
///
/// This is a config file, not a widget or helper class
library;

import 'package:flutter/material.dart';
import '../../models/role_model.dart';
import '../../widgets/atoms/atoms.dart'; // For BadgeStyle enum
import '../../utils/table_cell_builders.dart';
import '../../services/role_service.dart';
import '../table_column.dart';

/// Get column definitions for role table
List<TableColumn<Role>> getRoleColumns({VoidCallback? onRoleUpdated}) {
  return [
    // Role name column - reasonable width
    TableColumn<Role>(
      id: 'name',
      label: 'Role Name',
      sortable: true,
      width: 2,
      cellBuilder: (role) => TableCellBuilders.roleBadgeCell(role.name),
      comparator: (a, b) => a.name.compareTo(b.name),
    ),

    // ID column - compact
    TableColumn<Role>(
      id: 'id',
      label: 'ID',
      sortable: true,
      width: 0.8,
      alignment: TextAlign.center,
      cellBuilder: (role) => TableCellBuilders.idCell(role.id.toString()),
      comparator: (a, b) => a.id.compareTo(b.id),
    ),

    // Priority column - compact (Phase 0: Role hierarchy)
    TableColumn<Role>(
      id: 'priority',
      label: 'Priority',
      sortable: true,
      width: 1.0,
      alignment: TextAlign.center,
      cellBuilder: (role) =>
          TableCellBuilders.nullableNumericCell(role.priority),
      comparator: (a, b) {
        if (a.priority == null && b.priority == null) return 0;
        if (a.priority == null) return 1;
        if (b.priority == null) return -1;
        return b.priority!.compareTo(a.priority!); // Higher priority first
      },
    ),

    // Description column - moderate width (Phase 0)
    TableColumn<Role>(
      id: 'description',
      label: 'Description',
      sortable: false,
      width: 2.5,
      cellBuilder: (role) =>
          TableCellBuilders.nullableTextCell(role.description),
    ),

    // Status column - compact for badges + inline editing (Phase 9)
    TableColumn<Role>(
      id: 'status',
      label: 'Status',
      sortable: true,
      width: 1.5,
      cellBuilder: (role) => TableCellBuilders.editableBooleanCell<Role>(
        item: role,
        value: role.isActive,
        onUpdate: (newValue) async {
          await RoleService.update(role.id, isActive: newValue);
          return true;
        },
        onChanged: onRoleUpdated,
        fieldName: 'role status',
        trueAction: 'activate this role',
        falseAction: 'deactivate this role',
      ),
      comparator: (a, b) => a.isActive == b.isActive
          ? 0
          : a.isActive
          ? -1
          : 1,
    ),

    // Protected status column - compact
    TableColumn<Role>(
      id: 'protected',
      label: 'Protected',
      sortable: true,
      width: 1.2,
      cellBuilder: (role) => TableCellBuilders.booleanBadgeCell(
        value: role.isProtected,
        trueLabel: 'Yes',
        falseLabel: 'No',
        trueStyle: BadgeStyle.warning,
        falseStyle: BadgeStyle.neutral,
        trueIcon: Icons.lock,
        falseIcon: Icons.lock_open,
        compact: true,
      ),
      comparator: (a, b) => a.isProtected == b.isProtected
          ? 0
          : a.isProtected
          ? -1
          : 1,
    ),

    // Created date column - reasonable width
    TableColumn<Role>(
      id: 'created',
      label: 'Created',
      sortable: true,
      width: 1.5,
      cellBuilder: (role) => TableCellBuilders.timestampCell(role.createdAt),
      comparator: (a, b) => a.createdAt.compareTo(b.createdAt),
    ),
  ];
}
