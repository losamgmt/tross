/// AppDataTable - Generic table organism using Flutter's native Table widget
///
/// A clean, composable table component following atomic design principles
/// Uses Flutter's native Table widget for optimal column sizing and rendering
/// Type-safe, sortable, filterable, with loading/error/empty states
///
/// Key Features:
/// - Native Table widget for responsive column widths (IntrinsicColumnWidth)
/// - Actions as first column (always visible, perfect height alignment)
/// - Sortable columns
/// - Pagination support
/// - Loading/error/empty states
/// - Fully generic and type-safe
///
/// Usage:
/// ```dart
/// AppDataTable<User>(
///   columns: [
///     TableColumn.text(
///       id: 'name',
///       label: 'Name',
///       getText: (user) => user.fullName,
///       sortable: true,
///     ),
///   ],
///   data: users,
///   onRowTap: (user) => showDetails(user),
///   actionsBuilder: (user) => [
///     IconButton(icon: Icon(Icons.edit), onPressed: () => edit(user)),
///   ],
/// )
/// ```
library;

import 'package:flutter/material.dart';
import '../../config/app_spacing.dart';
import '../../config/table_column.dart';
import '../../utils/helpers/pagination_helper.dart';
import '../atoms/typography/column_header.dart';
import '../molecules/empty_state.dart';
import '../molecules/pagination/pagination_display.dart';
import '../molecules/table_toolbar.dart';
import '../atoms/indicators/loading_indicator.dart';

enum AppDataTableState { loading, loaded, error, empty }

class AppDataTable<T> extends StatefulWidget {
  // Data
  final List<T> data;
  final AppDataTableState state;
  final String? errorMessage;

  // Columns
  final List<TableColumn<T>> columns;

  // Interactions
  final void Function(T item)? onRowTap;
  final List<Widget> Function(T item)? actionsBuilder; // Row-level actions

  // Toolbar
  final String? title;
  final void Function(String query)? onSearch;
  final List<Widget>? toolbarActions;

  // Pagination
  final bool paginated;
  final int itemsPerPage;
  final int? totalItems;

  // Empty state
  final String? emptyMessage;
  final Widget? emptyAction;

  const AppDataTable({
    super.key,
    required this.columns,
    this.data = const [],
    this.state = AppDataTableState.loaded,
    this.errorMessage,
    this.onRowTap,
    this.actionsBuilder,
    this.title,
    this.onSearch,
    this.toolbarActions,
    this.paginated = false,
    this.itemsPerPage = 10,
    this.totalItems,
    this.emptyMessage,
    this.emptyAction,
  });

  @override
  State<AppDataTable<T>> createState() => _AppDataTableState<T>();
}

class _AppDataTableState<T> extends State<AppDataTable<T>> {
  String? _sortColumnId;
  SortDirection _sortDirection = SortDirection.none;
  int _currentPage = 1;
  final ScrollController _dataScrollController = ScrollController();

  @override
  void initState() {
    super.initState();
  }

  @override
  void dispose() {
    _dataScrollController.dispose();
    super.dispose();
  }

  List<T> get _sortedAndPaginatedData {
    List<T> data = List.from(widget.data);

    // Apply sorting
    if (_sortColumnId != null && _sortDirection != SortDirection.none) {
      final column = widget.columns.firstWhere(
        (col) => col.id == _sortColumnId,
      );
      if (column.comparator != null) {
        data.sort(column.comparator!);
        if (_sortDirection == SortDirection.descending) {
          data = data.reversed.toList();
        }
      }
    }

    // Apply pagination
    if (widget.paginated) {
      final startIndex = (_currentPage - 1) * widget.itemsPerPage;
      final endIndex = startIndex + widget.itemsPerPage;
      if (startIndex < data.length) {
        data = data.sublist(
          startIndex,
          endIndex > data.length ? data.length : endIndex,
        );
      } else {
        data = [];
      }
    }

    return data;
  }

  int get _totalPages {
    if (!widget.paginated) return 1;
    final total = widget.totalItems ?? widget.data.length;
    return (total / widget.itemsPerPage).ceil();
  }

  void _handleSort(String columnId) {
    setState(() {
      if (_sortColumnId == columnId) {
        // Cycle through: none -> ascending -> descending -> none
        _sortDirection = _sortDirection == SortDirection.none
            ? SortDirection.ascending
            : _sortDirection == SortDirection.ascending
            ? SortDirection.descending
            : SortDirection.none;

        if (_sortDirection == SortDirection.none) {
          _sortColumnId = null;
        }
      } else {
        _sortColumnId = columnId;
        _sortDirection = SortDirection.ascending;
      }
    });
  }

  void _handlePageChange(int newPage) {
    setState(() {
      _currentPage = newPage;
    });
  }

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;

    // No container - let the parent (DashboardCard) handle borders/shadows
    // This widget focuses purely on table layout and functionality
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Toolbar (with padding)
        if (widget.title != null ||
            widget.onSearch != null ||
            widget.toolbarActions != null)
          Padding(
            padding: EdgeInsets.fromLTRB(
              spacing.md,
              spacing.md,
              spacing.md,
              spacing.md,
            ),
            child: TableToolbar(
              title: widget.title,
              onSearch: widget.onSearch,
              actions: widget.toolbarActions,
            ),
          ),

        // Table content (NO padding - extends to edges!)
        _buildTableContent(),

        // Pagination (with padding)
        if (widget.paginated && widget.state == AppDataTableState.loaded)
          Padding(
            padding: EdgeInsets.all(spacing.md),
            child: PaginationDisplay(
              rangeText: PaginationHelper.getPageRangeText(
                _currentPage,
                widget.itemsPerPage,
                widget.totalItems ?? widget.data.length,
              ),
              canGoPrevious: PaginationHelper.canGoPrevious(_currentPage),
              canGoNext: PaginationHelper.canGoNext(_currentPage, _totalPages),
              onPrevious: () => _handlePageChange(_currentPage - 1),
              onNext: () => _handlePageChange(_currentPage + 1),
            ),
          ),
      ],
    );
  }

  /// Builds the main table content using Flutter's native Table widget
  Widget _buildTableContent() {
    switch (widget.state) {
      case AppDataTableState.loading:
        return const SizedBox(
          height: 200,
          child: Center(child: LoadingIndicator()),
        );

      case AppDataTableState.error:
        return SizedBox(
          height: 200,
          child: Center(
            child: Text(
              widget.errorMessage ?? 'An error occurred',
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ),
        );

      case AppDataTableState.empty:
        return SizedBox(
          height: 200,
          child: EmptyState.noData(
            title: 'No Data',
            message: widget.emptyMessage ?? 'No data available',
          ),
        );

      case AppDataTableState.loaded:
        if (_sortedAndPaginatedData.isEmpty) {
          return SizedBox(
            height: 200,
            child: EmptyState.noData(
              title: 'No Results',
              message: widget.emptyMessage ?? 'No data available',
            ),
          );
        }
        return _buildNativeTable();
    }
  }

  /// Builds the table using Flutter's native Table widget
  Widget _buildNativeTable() {
    final theme = Theme.of(context);
    final hasActions = widget.actionsBuilder != null;
    final data = _sortedAndPaginatedData;

    // Simple scrollable table with actions as first column (if present)
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minWidth: 800),
        child: IntrinsicWidth(
          child: _buildUnifiedTable(theme, data, includeActions: hasActions),
        ),
      ),
    );
  }

  /// Builds a unified table with STICKY header + scrollable body
  /// Actions column (if present) is rendered first for perfect alignment
  Widget _buildUnifiedTable(
    ThemeData theme,
    List<T> data, {
    bool includeActions = false,
  }) {
    final borderColor = theme.colorScheme.outline.withValues(alpha: 0.1);
    final headerBorderColor = theme.colorScheme.outline.withValues(alpha: 0.2);
    final headerColor = theme.colorScheme.surfaceContainerHighest.withValues(
      alpha: 0.5,
    );

    // Determine which columns to render
    final List<dynamic> columnsToRender;
    if (includeActions) {
      // Actions FIRST, then data columns
      columnsToRender = ['__actions__', ...widget.columns];
    } else {
      // Data only
      columnsToRender = widget.columns;
    }

    // Calculate column widths
    final columnWidths = <int, TableColumnWidth>{};
    for (var i = 0; i < columnsToRender.length; i++) {
      final col = columnsToRender[i];
      if (col == '__actions__') {
        columnWidths[i] = const FixedColumnWidth(120);
      } else {
        final column = col as TableColumn<T>;
        if (column.width != null) {
          columnWidths[i] = FlexColumnWidth(column.width!);
        } else {
          columnWidths[i] = const IntrinsicColumnWidth();
        }
      }
    }

    // Build the scrollable data table
    final dataTable = Table(
      columnWidths: columnWidths,
      border: TableBorder(
        verticalInside: BorderSide(color: borderColor, width: 1),
      ),
      children: [
        // Data rows
        ...data.asMap().entries.map((entry) {
          final index = entry.key;
          final item = entry.value;
          final isEvenRow = index % 2 == 0;

          return TableRow(
            decoration: BoxDecoration(
              color: isEvenRow
                  ? theme.colorScheme.surfaceContainerHighest.withValues(
                      alpha: 0.05,
                    )
                  : null,
              border: Border(bottom: BorderSide(color: borderColor, width: 1)),
            ),
            children: columnsToRender.map((col) {
              final spacing = context.spacing;

              if (col == '__actions__') {
                // Render actions cell
                return TableCell(
                  verticalAlignment: TableCellVerticalAlignment.middle,
                  child: Padding(
                    padding: EdgeInsets.all(spacing.md),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: widget.actionsBuilder?.call(item) ?? [],
                    ),
                  ),
                );
              } else {
                // Render data cell
                final column = col as TableColumn<T>;
                return TableCell(
                  verticalAlignment: TableCellVerticalAlignment.middle,
                  child: Material(
                    type: MaterialType.transparency,
                    child: InkWell(
                      onTap: widget.onRowTap != null
                          ? () => widget.onRowTap!(item)
                          : null,
                      child: Padding(
                        padding: EdgeInsets.all(spacing.md),
                        child: column.cellBuilder(item),
                      ),
                    ),
                  ),
                );
              }
            }).toList(),
          );
        }),
      ],
    );

    // Build sticky header separately (uses same column widths)
    final stickyHeader = Container(
      decoration: BoxDecoration(
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Table(
        columnWidths: columnWidths,
        border: TableBorder(
          verticalInside: BorderSide(color: borderColor, width: 1),
        ),
        children: [
          TableRow(
            decoration: BoxDecoration(
              color: headerColor,
              border: Border(
                bottom: BorderSide(color: headerBorderColor, width: 2),
              ),
            ),
            children: columnsToRender.map((col) {
              final spacing = context.spacing;

              if (col == '__actions__') {
                // Render actions header
                return TableCell(
                  verticalAlignment: TableCellVerticalAlignment.middle,
                  child: Padding(
                    padding: EdgeInsets.all(spacing.md),
                    child: Center(
                      child: Text(
                        'Actions',
                        style: theme.textTheme.labelLarge?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                );
              } else {
                // Render data column header
                final column = col as TableColumn<T>;
                final isCurrentSort = _sortColumnId == column.id;

                return TableCell(
                  verticalAlignment: TableCellVerticalAlignment.middle,
                  child: Material(
                    type: MaterialType.transparency,
                    child: InkWell(
                      onTap: column.sortable
                          ? () => _handleSort(column.id)
                          : null,
                      child: Padding(
                        padding: EdgeInsets.all(spacing.md),
                        child: ColumnHeader(
                          label: column.label,
                          sortable: column.sortable,
                          sortDirection: isCurrentSort
                              ? _sortDirection
                              : SortDirection.none,
                          onSort: column.sortable
                              ? () => _handleSort(column.id)
                              : null,
                          textAlign: column.alignment,
                        ),
                      ),
                    ),
                  ),
                );
              }
            }).toList(),
          ),
        ],
      ),
    );

    // Simplified layout: sticky header + scrollable data
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Sticky header (always visible)
        stickyHeader,

        // Scrollable data rows (max height 400px)
        ConstrainedBox(
          constraints: const BoxConstraints(maxHeight: 400),
          child: SingleChildScrollView(
            controller: _dataScrollController,
            child: dataTable,
          ),
        ),
      ],
    );
  }

  /// Builds ONLY the actions column with matching row heights
  /// This is overlaid on the right side of the table
}
