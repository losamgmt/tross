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
import '../../config/table_config.dart';
import '../../config/constants.dart';
import '../../utils/helpers/pagination_helper.dart';
import '../atoms/typography/column_header.dart';
import '../molecules/empty_state.dart';
import '../molecules/pagination/pagination_display.dart';
import 'tables/table_toolbar.dart';
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

  /// Tracks user-resized column widths by column id
  /// Columns not in this map use default width
  final Map<String, double> _columnWidths = {};

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
  ///
  /// Uses IntrinsicColumnWidth so columns size to their content naturally.
  /// Horizontal scroll enabled when content exceeds viewport.
  Widget _buildNativeTable() {
    final theme = Theme.of(context);
    final hasActions = widget.actionsBuilder != null;
    final data = _sortedAndPaginatedData;

    final scrollController = ScrollController();
    return Scrollbar(
      controller: scrollController,
      thumbVisibility: true,
      trackVisibility: true,
      thickness: StyleConstants.scrollbarThickness,
      radius: Radius.circular(StyleConstants.scrollbarRadius),
      child: SingleChildScrollView(
        controller: scrollController,
        scrollDirection: Axis.horizontal,
        child: _buildUnifiedTable(theme, data, includeActions: hasActions),
      ),
    );
  }

  /// Builds a unified table with sticky header + scrollable body
  Widget _buildUnifiedTable(
    ThemeData theme,
    List<T> data, {
    bool includeActions = false,
  }) {
    final spacing = context.spacing;
    final borderColor = theme.colorScheme.outline.withValues(alpha: 0.1);
    final headerBorderColor = theme.colorScheme.outline.withValues(alpha: 0.2);
    final headerColor = theme.colorScheme.surfaceContainerHighest.withValues(
      alpha: 0.5,
    );

    // Determine which columns to render
    final List<dynamic> columnsToRender;
    if (includeActions) {
      columnsToRender = ['__actions__', ...widget.columns];
    } else {
      columnsToRender = widget.columns;
    }

    // Column widths: Use tracked widths (resizable) or defaults
    // Actions column gets fixed width; data columns are resizable
    final columnWidths = <int, TableColumnWidth>{};
    for (var i = 0; i < columnsToRender.length; i++) {
      final col = columnsToRender[i];
      if (col == '__actions__') {
        columnWidths[i] = const FixedColumnWidth(
          TableConfig.actionsColumnWidth,
        );
      } else {
        final column = col as TableColumn<T>;
        // Use user-resized width if set, otherwise default
        final width =
            _columnWidths[column.id] ?? TableConfig.defaultColumnWidth;
        columnWidths[i] = FixedColumnWidth(width);
      }
    }

    // Build header row
    final headerRow = TableRow(
      decoration: BoxDecoration(
        color: headerColor,
        border: Border(bottom: BorderSide(color: headerBorderColor, width: 2)),
      ),
      children: columnsToRender.map((col) {
        if (col == '__actions__') {
          return _buildHeaderCell(
            child: Text(
              'Actions',
              style: theme.textTheme.labelLarge?.copyWith(
                fontWeight: FontWeight.w700,
              ),
              textAlign: TextAlign.center,
            ),
            spacing: spacing,
            // Actions column is not resizable
          );
        } else {
          final column = col as TableColumn<T>;
          final isCurrentSort = _sortColumnId == column.id;
          return _buildHeaderCell(
            child: ColumnHeader(
              label: column.label,
              sortable: column.sortable,
              sortDirection: isCurrentSort
                  ? _sortDirection
                  : SortDirection.none,
              onSort: column.sortable ? () => _handleSort(column.id) : null,
              textAlign: column.alignment,
            ),
            spacing: spacing,
            onTap: column.sortable ? () => _handleSort(column.id) : null,
            columnId: column.id, // Enable resize for this column
          );
        }
      }).toList(),
    );

    // Build data rows
    final dataRows = data.asMap().entries.map((entry) {
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
          if (col == '__actions__') {
            return _buildDataCell(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                mainAxisAlignment: MainAxisAlignment.center,
                children: widget.actionsBuilder?.call(item) ?? [],
              ),
              spacing: spacing,
            );
          } else {
            final column = col as TableColumn<T>;
            return _buildDataCell(
              child: column.cellBuilder(item),
              spacing: spacing,
              onTap: widget.onRowTap != null
                  ? () => widget.onRowTap!(item)
                  : null,
            );
          }
        }).toList(),
      );
    }).toList();

    // Single unified table - header and data rows together for perfect column alignment
    // This ensures IntrinsicColumnWidth measures ALL content (header + data) together
    final unifiedTable = Table(
      columnWidths: columnWidths,
      defaultVerticalAlignment: TableCellVerticalAlignment.middle,
      border: TableBorder(
        verticalInside: BorderSide(color: borderColor, width: 1),
      ),
      children: [headerRow, ...dataRows],
    );

    // Wrap in constrained scrollable container for vertical scroll when needed
    return ConstrainedBox(
      constraints: const BoxConstraints(maxHeight: TableConfig.maxBodyHeight),
      child: SingleChildScrollView(
        controller: _dataScrollController,
        child: unifiedTable,
      ),
    );
  }

  /// Build a header cell with proper constraints, padding, and optional resize handle
  Widget _buildHeaderCell({
    required Widget child,
    required AppSpacing spacing,
    VoidCallback? onTap,
    String? columnId, // For resize tracking - null means not resizable
  }) {
    final theme = Theme.of(context);

    Widget content = Padding(padding: EdgeInsets.all(spacing.md), child: child);

    if (onTap != null) {
      content = InkWell(onTap: onTap, child: content);
    }

    // Add resize handle for resizable columns
    if (columnId != null) {
      content = Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Expanded(child: content),
          // Resize handle - positioned at edge of column
          GestureDetector(
            behavior: HitTestBehavior.opaque, // Ensure full area is draggable
            onHorizontalDragStart: (_) {
              // Optional: could add visual feedback here
            },
            onHorizontalDragUpdate: (details) {
              setState(() {
                final currentWidth =
                    _columnWidths[columnId] ?? TableConfig.defaultColumnWidth;
                final newWidth = (currentWidth + details.delta.dx).clamp(
                  TableConfig.cellMinWidth,
                  TableConfig.cellMaxWidth,
                );
                _columnWidths[columnId] = newWidth;
              });
            },
            child: MouseRegion(
              cursor: SystemMouseCursors.resizeColumn,
              child: Container(
                width: TableConfig.resizeHandleWidth,
                color: Colors.transparent, // Invisible but draggable
                alignment: Alignment.center,
                child: Container(
                  width: TableConfig.resizeIndicatorWidth,
                  height: 24,
                  decoration: BoxDecoration(
                    color: theme.colorScheme.outline.withValues(alpha: 0.4),
                    borderRadius: BorderRadius.circular(1),
                  ),
                ),
              ),
            ),
          ),
        ],
      );
    }

    return TableCell(
      verticalAlignment: TableCellVerticalAlignment.middle,
      child: content,
    );
  }

  /// Build a data cell with proper constraints and padding
  Widget _buildDataCell({
    required Widget child,
    required AppSpacing spacing,
    VoidCallback? onTap,
  }) {
    Widget content = ConstrainedBox(
      constraints: const BoxConstraints(
        minWidth: TableConfig.cellMinWidth,
        maxWidth: TableConfig.cellMaxWidth,
      ),
      child: Padding(padding: EdgeInsets.all(spacing.md), child: child),
    );

    if (onTap != null) {
      content = Material(
        type: MaterialType.transparency,
        child: InkWell(onTap: onTap, child: content),
      );
    }

    return TableCell(
      verticalAlignment: TableCellVerticalAlignment.middle,
      child: content,
    );
  }
}
