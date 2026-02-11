/// EditableDataTable - Organism composing InlineEditCell + AppDataTable
///
/// **SOLE RESPONSIBILITY:** Compose InlineEditCell molecule with AppDataTable
/// - Pure composition - ZERO business logic
/// - InlineEditCell handles edit/display mode switching
/// - AppDataTable handles table rendering
/// - Parent manages all state, validation, and persistence
///
/// GENERIC: Works for any editable table context
///
/// Features:
/// - Cell-level inline editing
/// - Configurable edit trigger (double-tap, single-tap, long-press)
/// - Edit mode indicators
/// - Full AppDataTable functionality (sorting, pagination, actions)
/// - Parent controls which cells are editable
///
/// Usage:
/// ```dart
/// EditableDataTable<User>(
///   columns: [
///     EditableColumn<User>(
///       id: 'name',
///       label: 'Name',
///       getValue: (user) => user.name,
///     ),
///   ],
///   data: users,
///   editingCell: _editingCell, // CellPosition(rowIndex, columnId)
///   onEditStart: (rowIndex, columnId, item) {
///     setState(() => _editingCell = CellPosition(rowIndex, columnId));
///   },
///   onEditEnd: (rowIndex, columnId, item, newValue) {
///     updateUser(item, columnId, newValue);
///     setState(() => _editingCell = null);
///   },
///   onEditCancel: () => setState(() => _editingCell = null),
///   editWidgetBuilder: (item, columnId, currentValue) => TextField(
///     controller: TextEditingController(text: currentValue),
///     autofocus: true,
///     onSubmitted: (value) => _handleSubmit(value),
///   ),
/// )
/// ```
library;

import 'package:flutter/material.dart';
import '../../../config/table_column.dart';
import '../../molecules/display/inline_edit_cell.dart';
import '../../molecules/menus/action_item.dart';
import 'data_table.dart';

/// Position of a cell being edited
class CellPosition {
  final int rowIndex;
  final String columnId;

  const CellPosition(this.rowIndex, this.columnId);

  @override
  bool operator ==(Object other) =>
      other is CellPosition &&
      other.rowIndex == rowIndex &&
      other.columnId == columnId;

  @override
  int get hashCode => Object.hash(rowIndex, columnId);
}

/// Column configuration for editable tables
class EditableColumn<T> {
  final String id;
  final String label;
  final String Function(T item) getValue;
  final Widget Function(T item)? displayBuilder;
  final double? width;
  final bool sortable;
  final TextAlign alignment;
  final bool editable;

  const EditableColumn({
    required this.id,
    required this.label,
    required this.getValue,
    this.displayBuilder,
    this.width,
    this.sortable = false,
    this.alignment = TextAlign.left,
    this.editable = true,
  });
}

class EditableDataTable<T> extends StatelessWidget {
  // ===== Edit Props =====

  /// Editable column configurations
  final List<EditableColumn<T>> columns;

  /// Currently editing cell position (null = not editing)
  final CellPosition? editingCell;

  /// Called when user starts editing a cell
  final void Function(int rowIndex, String columnId, T item)? onEditStart;

  /// Called when user finishes editing with new value
  final void Function(int rowIndex, String columnId, T item, String newValue)?
  onEditEnd;

  /// Called when editing is cancelled
  final VoidCallback? onEditCancel;

  /// Builder for edit widget given item, column id, and current value
  final Widget Function(T item, String columnId, String currentValue)?
  editWidgetBuilder;

  /// Edit mode trigger
  final InlineEditTrigger editTrigger;

  /// Whether to show edit hint icons
  final bool showEditHints;

  // ===== Data Table Props =====

  /// Table data
  final List<T> data;

  /// Table state
  final AppDataTableState state;

  /// Error message for error state
  final String? errorMessage;

  /// Callback when row is tapped
  final void Function(T item)? onRowTap;

  /// Builder for row action items
  final List<ActionItem> Function(T item)? rowActionItems;

  /// Toolbar action items (data-driven, rendered by ActionMenu)
  final List<ActionItem>? toolbarActions;

  /// Whether pagination is enabled
  final bool paginated;

  /// Items per page
  final int itemsPerPage;

  /// Total items (for pagination)
  final int? totalItems;

  /// Empty state message
  final String? emptyMessage;

  /// Empty state action widget
  final Widget? emptyAction;

  /// Whether to show customization menu
  final bool showCustomizationMenu;

  /// Entity name for saved views
  final String? entityName;

  const EditableDataTable({
    super.key,
    // Edit props
    required this.columns,
    this.editingCell,
    this.onEditStart,
    this.onEditEnd,
    this.onEditCancel,
    this.editWidgetBuilder,
    this.editTrigger = InlineEditTrigger.doubleTap,
    this.showEditHints = true,
    // Data table props
    this.data = const [],
    this.state = AppDataTableState.loaded,
    this.errorMessage,
    this.onRowTap,
    this.rowActionItems,
    this.toolbarActions,
    this.paginated = false,
    this.itemsPerPage = 10,
    this.totalItems,
    this.emptyMessage,
    this.emptyAction,
    this.showCustomizationMenu = true,
    this.entityName,
  });

  /// Check if a specific cell is currently being edited
  bool _isEditingCell(int rowIndex, String columnId) {
    if (editingCell == null) return false;
    return editingCell!.rowIndex == rowIndex &&
        editingCell!.columnId == columnId;
  }

  /// Build TableColumn list for AppDataTable
  List<TableColumn<T>> _buildTableColumns() {
    return columns.map((col) {
      return TableColumn<T>(
        id: col.id,
        label: col.label,
        width: col.width,
        sortable: col.sortable,
        alignment: col.alignment,
        comparator: col.sortable
            ? (a, b) => col.getValue(a).compareTo(col.getValue(b))
            : null,
        cellBuilder: (item) {
          final rowIndex = data.indexOf(item);
          final isEditing = _isEditingCell(rowIndex, col.id);
          final currentValue = col.getValue(item);
          final hasEditWidget = editWidgetBuilder != null && col.editable;

          // If not editable or no edit widget builder, return simple display
          if (!hasEditWidget) {
            return col.displayBuilder?.call(item) ??
                Text(
                  currentValue,
                  textAlign: col.alignment,
                  overflow: TextOverflow.ellipsis,
                );
          }

          // Editable cell with InlineEditCell
          return InlineEditCell(
            value: currentValue,
            displayWidget: col.displayBuilder?.call(item),
            editWidget: editWidgetBuilder!(item, col.id, currentValue),
            isEditing: isEditing,
            onEditStart: onEditStart != null
                ? () => onEditStart!(rowIndex, col.id, item)
                : null,
            onEditEnd: onEditEnd != null
                ? (newValue) => onEditEnd!(rowIndex, col.id, item, newValue)
                : null,
            onCancel: onEditCancel,
            showEditHint: showEditHints,
            enabled: true,
            editTrigger: editTrigger,
          );
        },
      );
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return AppDataTable<T>(
      columns: _buildTableColumns(),
      data: data,
      state: state,
      errorMessage: errorMessage,
      onRowTap: onRowTap,
      rowActionItems: rowActionItems,
      toolbarActions: toolbarActions,
      paginated: paginated,
      itemsPerPage: itemsPerPage,
      totalItems: totalItems,
      emptyMessage: emptyMessage,
      emptyAction: emptyAction,
      showCustomizationMenu: showCustomizationMenu,
      entityName: entityName,
    );
  }
}
