/// FilterableDataTable - Organism composing FilterBar + AppDataTable
///
/// **SOLE RESPONSIBILITY:** Compose FilterBar molecule with AppDataTable organism
/// - Pure composition - ZERO business logic
/// - FilterBar handles search/filter UI
/// - AppDataTable handles table rendering
/// - Parent manages all state and callbacks
///
/// GENERIC: Works for any filterable table context
///
/// Features:
/// - Search input with debouncing handled by parent
/// - Multiple filter dropdowns
/// - Full AppDataTable functionality (sorting, pagination, actions)
/// - Consistent spacing between filter bar and table
///
/// Usage:
/// ```dart
/// FilterableDataTable<User>(
///   // Filter bar props
///   searchValue: searchQuery,
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
///   actionsBuilder: (user) => [EditButton(user), DeleteButton(user)],
/// )
/// ```
library;

import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';
import '../../../config/table_column.dart';
import '../../molecules/forms/filter_bar.dart';
import 'data_table.dart';

class FilterableDataTable<T> extends StatelessWidget {
  // ===== Filter Bar Props =====

  /// Current search query
  final String? searchValue;

  /// Callback when search query changes
  final ValueChanged<String>? onSearchChanged;

  /// Placeholder text for search input
  final String searchPlaceholder;

  /// Filter configurations
  final List<FilterConfig> filters;

  /// Whether the filter bar is enabled
  final bool filterBarEnabled;

  /// Whether to show the filter bar at all
  final bool showFilterBar;

  /// Custom trailing widget for filter bar
  final Widget? filterBarTrailing;

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

  /// Builder for row actions
  final List<Widget> Function(T item)? actionsBuilder;

  /// Table title
  final String? title;

  /// Custom title widget
  final Widget? titleWidget;

  /// Toolbar actions
  final List<Widget>? toolbarActions;

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
    // Filter bar
    this.searchValue,
    this.onSearchChanged,
    this.searchPlaceholder = 'Search...',
    this.filters = const [],
    this.filterBarEnabled = true,
    this.showFilterBar = true,
    this.filterBarTrailing,
    // Data table
    required this.columns,
    this.data = const [],
    this.state = AppDataTableState.loaded,
    this.errorMessage,
    this.onRowTap,
    this.actionsBuilder,
    this.title,
    this.titleWidget,
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
    final spacing = context.spacing;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Filter Bar
        if (showFilterBar && onSearchChanged != null) ...[
          FilterBar(
            searchValue: searchValue ?? '',
            onSearchChanged: onSearchChanged!,
            searchPlaceholder: searchPlaceholder,
            filters: filters,
            enabled: filterBarEnabled,
            trailing: filterBarTrailing,
          ),
          SizedBox(height: spacing.md),
        ],
        // Data Table
        Expanded(
          child: AppDataTable<T>(
            columns: columns,
            data: data,
            state: state,
            errorMessage: errorMessage,
            onRowTap: onRowTap,
            actionsBuilder: actionsBuilder,
            title: title,
            titleWidget: titleWidget,
            toolbarActions: toolbarActions,
            paginated: paginated,
            itemsPerPage: itemsPerPage,
            totalItems: totalItems,
            emptyMessage: emptyMessage,
            emptyAction: emptyAction,
            showCustomizationMenu: showCustomizationMenu,
            entityName: entityName,
          ),
        ),
      ],
    );
  }
}
