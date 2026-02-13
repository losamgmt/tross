/// FilterableDataTable - Organism composing filters with AppDataTable
///
/// **SOLE RESPONSIBILITY:** Compose filter widgets with AppDataTable organism
/// - Pure composition - ZERO business logic
/// - All filtering happens in ONE toolbar row
/// - AppDataTable handles table rendering
/// - Parent manages all state and callbacks
///
/// GENERIC: Works for any filterable table context
///
/// Layout (single row):
/// [Search...........................][Filters][Actions][Customize]
///
/// Features:
/// - Search input with debouncing handled by parent
/// - Filter dropdowns (rendered inline with actions)
/// - Full AppDataTable functionality (sorting, pagination, actions)
///
/// Usage:
/// ```dart
/// FilterableDataTable<User>(
///   // Search props
///   onSearchChanged: (value) => setState(() => searchQuery = value),
///   searchPlaceholder: 'Search users...',
///   filters: [
///     FilterConfig(
///       value: statusFilter,
///       items: ['Active', 'Inactive'],
///       onChanged: (v) => setState(() => statusFilter = v),
///       label: 'Status',
///     ),
///   ],
///   // Table props
///   columns: userColumns,
///   data: filteredUsers,
///   onRowTap: (user) => showDetails(user),
///   rowActionItems: (user) => [ActionItem.edit(...), ActionItem.delete(...)],
/// )
/// ```
library;

import 'package:flutter/material.dart';
import '../../../config/table_column.dart';
import '../../molecules/forms/filter_bar.dart';
import '../../molecules/menus/action_item.dart';
import 'data_table.dart';

class FilterableDataTable<T> extends StatelessWidget {
  // ===== Search/Filter Props =====

  /// Callback when search query changes
  final ValueChanged<String>? onSearchChanged;

  /// Placeholder text for search input
  final String searchPlaceholder;

  /// Filter configurations (rendered as trailing widgets)
  final List<FilterConfig> filters;

  // ===== Data Table Props =====

  /// Table columns
  final List<TableColumn<T>> columns;

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

  /// Maximum row actions for geometric width calculation (from SSOT)
  final int maxRowActions;

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

  const FilterableDataTable({
    super.key,
    // Search/filter
    this.onSearchChanged,
    this.searchPlaceholder = 'Search...',
    this.filters = const [],
    // Data table
    required this.columns,
    this.data = const [],
    this.state = AppDataTableState.loaded,
    this.errorMessage,
    this.onRowTap,
    this.rowActionItems,
    this.maxRowActions = 2,
    this.toolbarActions,
    this.paginated = false,
    this.itemsPerPage = 10,
    this.totalItems,
    this.emptyMessage,
    this.emptyAction,
    this.showCustomizationMenu = true,
    this.entityName,
  });

  @override
  Widget build(BuildContext context) {
    // Pass everything to AppDataTable - it handles the unified toolbar
    return AppDataTable<T>(
      columns: columns,
      data: data,
      state: state,
      errorMessage: errorMessage,
      onRowTap: onRowTap,
      rowActionItems: rowActionItems,
      maxRowActions: maxRowActions,
      onSearch: onSearchChanged,
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
