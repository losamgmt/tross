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
/// - Pinned columns for mobile (auto-pins first column on compact screens)
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
///   rowActionItems: (user) => [
///     ActionItem.edit(onTap: () => edit(user)),
///     ActionItem.delete(onTap: () => delete(user)),
///   ],
/// )
/// ```
library;

import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';
import '../../../config/platform_utilities.dart';
import '../../../config/table_column.dart';
import '../../../config/table_config.dart';
import '../../../config/constants.dart';
import '../../../utils/helpers/pagination_helper.dart';
import '../../atoms/interactions/resize_handle.dart';
import '../../atoms/interactions/touch_target.dart';
import '../../atoms/typography/column_header.dart';
import '../../molecules/feedback/empty_state.dart';
import '../../molecules/menus/action_item.dart';
import '../../molecules/menus/action_menu.dart';
import '../../molecules/pagination/pagination_display.dart';
import 'table_toolbar.dart';
import '../../atoms/indicators/loading_indicator.dart';

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

  /// Row-level action items (data-driven, rendered via ActionMenu)
  final List<ActionItem> Function(T item)? rowActionItems;

  // Toolbar
  final void Function(String query)? onSearch;

  /// Toolbar action data - rendered appropriately for screen size
  final List<ActionItem>? toolbarActions;

  // Pagination
  final bool paginated;
  final int itemsPerPage;
  final int? totalItems;

  // Empty state
  final String? emptyMessage;
  final Widget? emptyAction;

  // Customization
  final bool showCustomizationMenu;

  /// When true, columns size to their content using IntrinsicColumnWidth.
  /// When false (default), columns use fixed widths that are resizable.
  final bool autoSizeColumns;

  /// Entity name for saved views (enables save/load view feature)
  final String? entityName;

  /// Number of columns to pin to the left when horizontally scrolling
  /// Set to null (default) for automatic behavior:
  /// - On compact screens: pins first data column (+ actions if present)
  /// - On wider screens: no pinning
  /// Set to 0 to disable pinning entirely
  final int? pinnedColumns;

  const AppDataTable({
    super.key,
    required this.columns,
    this.data = const [],
    this.state = AppDataTableState.loaded,
    this.errorMessage,
    this.onRowTap,
    this.rowActionItems,
    this.onSearch,
    this.toolbarActions,
    this.paginated = false,
    this.itemsPerPage = 10,
    this.totalItems,
    this.emptyMessage,
    this.emptyAction,
    this.showCustomizationMenu = true,
    this.autoSizeColumns = false,
    this.entityName,
    this.pinnedColumns,
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

  /// Hidden column IDs (session-only, not persisted)
  final Set<String> _hiddenColumnIds = {};

  /// Table density (session-only, not persisted)
  TableDensity _density = TableDensity.standard;

  /// Get visible columns (filtered by hidden state)
  List<TableColumn<T>> get _visibleColumns =>
      widget.columns.where((c) => !_hiddenColumnIds.contains(c.id)).toList();

  @override
  void initState() {
    super.initState();
  }

  /// Show customization options in a bottom sheet
  void _showCustomizationSheet(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (sheetContext) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            return SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Customize Table',
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        IconButton(
                          icon: const Icon(Icons.close),
                          onPressed: () => Navigator.of(context).pop(),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Density selection
                    Text(
                      'Density',
                      style: Theme.of(context).textTheme.titleSmall,
                    ),
                    const SizedBox(height: 8),
                    SegmentedButton<TableDensity>(
                      segments: TableDensity.values.map((d) {
                        return ButtonSegment(
                          value: d,
                          label: Text(
                            d.name[0].toUpperCase() + d.name.substring(1),
                          ),
                        );
                      }).toList(),
                      selected: {_density},
                      onSelectionChanged: (selected) {
                        setState(() => _density = selected.first);
                        setSheetState(() {});
                      },
                    ),
                    const SizedBox(height: 16),

                    // Column visibility
                    Text(
                      'Columns',
                      style: Theme.of(context).textTheme.titleSmall,
                    ),
                    const SizedBox(height: 8),
                    ...widget.columns.map((col) {
                      final isHidden = _hiddenColumnIds.contains(col.id);
                      return CheckboxListTile(
                        title: Text(col.label),
                        value: !isHidden,
                        onChanged: (checked) {
                          setState(() {
                            if (checked == true) {
                              _hiddenColumnIds.remove(col.id);
                            } else {
                              _hiddenColumnIds.add(col.id);
                            }
                          });
                          setSheetState(() {});
                        },
                        dense: true,
                        controlAffinity: ListTileControlAffinity.leading,
                      );
                    }),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
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

    // Build toolbar actions including customization
    final allToolbarActions = <ActionItem>[
      if (widget.toolbarActions != null) ...widget.toolbarActions!,
      if (widget.showCustomizationMenu)
        ActionItem.customize(onTap: () => _showCustomizationSheet(context)),
    ];

    // Determine if we have any toolbar content
    final hasToolbarContent =
        widget.onSearch != null || allToolbarActions.isNotEmpty;

    // No container - let the parent (DashboardCard) handle borders/shadows
    // This widget focuses purely on table layout and functionality
    return LayoutBuilder(
      builder: (context, constraints) {
        final hasFiniteHeight = constraints.maxHeight.isFinite;

        return ConstrainedBox(
          constraints: BoxConstraints(
            maxHeight: hasFiniteHeight
                ? constraints.maxHeight
                : double.infinity,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Toolbar - single row: search left, actions right
              if (hasToolbarContent)
                TableToolbar(
                  onSearch: widget.onSearch,
                  actionItems: allToolbarActions.isEmpty
                      ? null
                      : allToolbarActions,
                ),

              // Table content (NO padding - extends to edges!)
              // Use Expanded when we have finite height, otherwise just the content
              // to avoid "children have non-zero flex but incoming height constraints are unbounded"
              if (hasFiniteHeight)
                Expanded(child: _buildTableContent())
              else
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
                    canGoNext: PaginationHelper.canGoNext(
                      _currentPage,
                      _totalPages,
                    ),
                    onPrevious: () => _handlePageChange(_currentPage - 1),
                    onNext: () => _handlePageChange(_currentPage + 1),
                  ),
                ),
            ],
          ),
        );
      },
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
  /// Horizontal and vertical scroll enabled when content exceeds viewport.
  /// Supports pinned columns for mobile viewing.
  Widget _buildNativeTable() {
    final theme = Theme.of(context);
    final hasActions = widget.rowActionItems != null;
    final data = _sortedAndPaginatedData;

    // Determine effective pinned columns count
    final effectivePinnedColumns = _getEffectivePinnedColumns(context);

    // If pinning is active and we have enough columns, use split table layout
    if (effectivePinnedColumns > 0 &&
        _visibleColumns.length > effectivePinnedColumns) {
      return _buildPinnedColumnsTable(
        theme,
        data,
        hasActions,
        effectivePinnedColumns,
      );
    }

    // Standard single table (no pinning)
    final horizontalScrollController = ScrollController();
    final verticalScrollController = ScrollController();

    // When autoSizeColumns is true, table fills container width (no horizontal scroll)
    // When false, horizontal scroll allows wider tables to overflow
    final tableWidget = _buildUnifiedTable(
      theme,
      data,
      includeActions: hasActions,
    );

    // Standard table layout with nested scrollbars
    // Vertical scroll wraps horizontal scroll for 2D scrolling
    return Scrollbar(
      controller: verticalScrollController,
      thumbVisibility: true,
      trackVisibility: true,
      thickness: StyleConstants.scrollbarThickness,
      radius: Radius.circular(StyleConstants.scrollbarRadius),
      child: SingleChildScrollView(
        controller: verticalScrollController,
        scrollDirection: Axis.vertical,
        child: widget.autoSizeColumns
            // Auto-size: table stretches to fill container, no horizontal scroll
            // Add bottom padding only for vertical scrollbar track
            ? Padding(
                padding: EdgeInsets.only(
                  bottom: StyleConstants.scrollbarThickness + 4,
                ),
                child: tableWidget,
              )
            // Fixed widths: horizontal scroll for overflow
            // Add bottom padding inside scroll area so horizontal scrollbar
            // doesn't overlay table content
            : Scrollbar(
                controller: horizontalScrollController,
                thumbVisibility: true,
                trackVisibility: true,
                thickness: StyleConstants.scrollbarThickness,
                radius: Radius.circular(StyleConstants.scrollbarRadius),
                notificationPredicate: (notification) =>
                    notification.depth == 0,
                child: SingleChildScrollView(
                  controller: horizontalScrollController,
                  scrollDirection: Axis.horizontal,
                  child: Padding(
                    padding: EdgeInsets.only(
                      bottom: StyleConstants.scrollbarThickness + 4,
                    ),
                    child: tableWidget,
                  ),
                ),
              ),
      ),
    );
  }

  /// Get effective pinned columns count based on screen size and prop
  int _getEffectivePinnedColumns(BuildContext context) {
    // Explicit 0 disables pinning
    if (widget.pinnedColumns == 0) return 0;

    // Explicit value provided
    if (widget.pinnedColumns != null) return widget.pinnedColumns!;

    // Auto behavior: pin 1 column on compact screens, none on wider
    final isCompact = PlatformUtilities.breakpointAdaptive<bool>(
      context: context,
      compact: true,
      medium: false,
      expanded: false,
    );

    return isCompact ? 1 : 0;
  }

  /// Build table with pinned columns (split into frozen left + scrollable right)
  Widget _buildPinnedColumnsTable(
    ThemeData theme,
    List<T> data,
    bool hasActions,
    int pinnedCount,
  ) {
    final spacing = context.spacing;

    // Synchronize vertical scroll between pinned and scrollable sections
    final pinnedVerticalController = ScrollController();
    final scrollableVerticalController = ScrollController();
    final horizontalScrollController = ScrollController();

    bool isSyncing = false;

    void syncScroll(ScrollController source, ScrollController target) {
      if (isSyncing) return;
      isSyncing = true;
      target.jumpTo(source.offset);
      isSyncing = false;
    }

    pinnedVerticalController.addListener(() {
      syncScroll(pinnedVerticalController, scrollableVerticalController);
    });
    scrollableVerticalController.addListener(() {
      syncScroll(scrollableVerticalController, pinnedVerticalController);
    });

    // Split columns into pinned and scrollable
    final allCols = hasActions
        ? ['__actions__', ..._visibleColumns]
        : _visibleColumns.cast<dynamic>();

    final pinnedCols = allCols
        .take(pinnedCount + (hasActions ? 1 : 0))
        .toList();
    final scrollableCols = allCols
        .skip(pinnedCount + (hasActions ? 1 : 0))
        .toList();

    // Build pinned section
    final pinnedTable = _buildTableSection(
      theme: theme,
      data: data,
      columns: pinnedCols,
      spacing: spacing,
      isPinned: true,
    );

    // Build scrollable section
    final scrollableTable = _buildTableSection(
      theme: theme,
      data: data,
      columns: scrollableCols,
      spacing: spacing,
      isPinned: false,
    );

    return LayoutBuilder(
      builder: (context, constraints) {
        // Calculate pinned section width (capped at 40% of available width)
        final maxPinnedWidth = constraints.maxWidth * 0.4;

        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Pinned section (frozen)
            Container(
              constraints: BoxConstraints(maxWidth: maxPinnedWidth),
              decoration: BoxDecoration(
                border: Border(
                  right: BorderSide(
                    color: theme.colorScheme.outline.withValues(alpha: 0.3),
                    width: 2,
                  ),
                ),
                boxShadow: [
                  BoxShadow(
                    color: theme.colorScheme.shadow.withValues(alpha: 0.1),
                    blurRadius: 4,
                    offset: const Offset(2, 0),
                  ),
                ],
              ),
              child: SingleChildScrollView(
                controller: pinnedVerticalController,
                physics: PlatformUtilities.scrollPhysics,
                // Add bottom padding to clear horizontal scrollbar in scrollable section
                child: Padding(
                  padding: EdgeInsets.only(
                    bottom: StyleConstants.scrollbarThickness + 4,
                  ),
                  child: pinnedTable,
                ),
              ),
            ),

            // Scrollable section
            Expanded(
              child: Scrollbar(
                controller: horizontalScrollController,
                thumbVisibility: true,
                thickness: StyleConstants.scrollbarThickness,
                radius: Radius.circular(StyleConstants.scrollbarRadius),
                child: SingleChildScrollView(
                  controller: horizontalScrollController,
                  scrollDirection: Axis.horizontal,
                  physics: PlatformUtilities.scrollPhysics,
                  child: SingleChildScrollView(
                    controller: scrollableVerticalController,
                    physics: PlatformUtilities.scrollPhysics,
                    // Add bottom padding inside scroll area for horizontal scrollbar
                    child: Padding(
                      padding: EdgeInsets.only(
                        bottom: StyleConstants.scrollbarThickness + 4,
                      ),
                      child: scrollableTable,
                    ),
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  /// Build a table section (for pinned columns layout)
  Widget _buildTableSection({
    required ThemeData theme,
    required List<T> data,
    required List<dynamic> columns,
    required AppSpacing spacing,
    required bool isPinned,
  }) {
    final borderColor = theme.colorScheme.outline.withValues(alpha: 0.1);
    final headerBorderColor = theme.colorScheme.outline.withValues(alpha: 0.2);
    final headerColor = theme.colorScheme.surfaceContainerHighest.withValues(
      alpha: 0.5,
    );

    // Column widths
    final columnWidths = <int, TableColumnWidth>{};
    for (var i = 0; i < columns.length; i++) {
      final col = columns[i];
      if (col == '__actions__') {
        columnWidths[i] = const FixedColumnWidth(
          TableConfig.actionsColumnWidth,
        );
      } else if (widget.autoSizeColumns) {
        columnWidths[i] = const IntrinsicColumnWidth(flex: 1.0);
      } else {
        final column = col as TableColumn<T>;
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
      children: columns.map((col) {
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
            columnId: isPinned
                ? null
                : column.id, // Only scrollable columns are resizable
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
        children: columns.map((col) {
          if (col == '__actions__') {
            final actionItems = widget.rowActionItems?.call(item) ?? [];
            return _buildDataCell(
              child: actionItems.isNotEmpty
                  ? ActionMenu(
                      actions: actionItems,
                      mode: ActionMenuMode.inline,
                    )
                  : const SizedBox.shrink(),
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

    return Table(
      columnWidths: columnWidths,
      defaultVerticalAlignment: TableCellVerticalAlignment.middle,
      border: TableBorder(
        verticalInside: BorderSide(color: borderColor, width: 1),
      ),
      children: [headerRow, ...dataRows],
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

    // Use visible columns (respects hidden state)
    final visibleCols = _visibleColumns;

    // Determine which columns to render
    final List<dynamic> columnsToRender;
    if (includeActions) {
      columnsToRender = ['__actions__', ...visibleCols];
    } else {
      columnsToRender = visibleCols;
    }

    // Column widths: Use tracked widths (resizable) or defaults
    // Actions column gets fixed width; data columns are resizable or auto-sized
    final columnWidths = <int, TableColumnWidth>{};
    for (var i = 0; i < columnsToRender.length; i++) {
      final col = columnsToRender[i];
      if (col == '__actions__') {
        columnWidths[i] = const FixedColumnWidth(
          TableConfig.actionsColumnWidth,
        );
      } else if (widget.autoSizeColumns) {
        // Auto-size: columns size to content but stretch to fill container
        // flex: 1.0 distributes remaining space proportionally among columns
        columnWidths[i] = const IntrinsicColumnWidth(flex: 1.0);
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
            final actionItems = widget.rowActionItems?.call(item) ?? [];
            return _buildDataCell(
              child: actionItems.isNotEmpty
                  ? ActionMenu(
                      actions: actionItems,
                      mode: ActionMenuMode.inline,
                    )
                  : const SizedBox.shrink(),
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
      content = TouchTarget(
        onTap: onTap,
        semanticLabel: 'Sort column',
        child: content,
      );
    }

    // Add resize handle for resizable columns
    if (columnId != null) {
      content = Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Expanded(child: content),
          // Platform-aware resize handle
          ResizeHandle.horizontal(
            indicatorLength: 24,
            indicatorColor: theme.colorScheme.outline.withValues(alpha: 0.4),
            onDragUpdate: (delta) {
              setState(() {
                final currentWidth =
                    _columnWidths[columnId] ?? TableConfig.defaultColumnWidth;
                final newWidth = (currentWidth + delta).clamp(
                  TableConfig.cellMinWidth,
                  TableConfig.cellMaxWidth,
                );
                _columnWidths[columnId] = newWidth;
              });
            },
          ),
        ],
      );
    }

    return TableCell(
      verticalAlignment: TableCellVerticalAlignment.middle,
      child: content,
    );
  }

  /// Build a data cell with proper constraints, padding, and density-aware height
  Widget _buildDataCell({
    required Widget child,
    required AppSpacing spacing,
    VoidCallback? onTap,
  }) {
    // Calculate padding based on density
    final verticalPadding = switch (_density) {
      TableDensity.compact => spacing.xs,
      TableDensity.standard => spacing.sm,
      TableDensity.comfortable => spacing.md,
    };

    // When autoSizeColumns is true, let content determine width (no maxWidth)
    // When false, apply constraints for fixed-width columns
    Widget content = ConstrainedBox(
      constraints: BoxConstraints(
        minWidth: TableConfig.cellMinWidth,
        maxWidth: widget.autoSizeColumns
            ? double.infinity
            : TableConfig.cellMaxWidth,
        minHeight: _density.rowHeight,
      ),
      child: Padding(
        padding: EdgeInsets.symmetric(
          horizontal: spacing.md,
          vertical: verticalPadding,
        ),
        child: Align(alignment: Alignment.centerLeft, child: child),
      ),
    );

    if (onTap != null) {
      content = TouchTarget(
        onTap: onTap,
        semanticLabel: 'Select row',
        child: content,
      );
    }

    return TableCell(
      verticalAlignment: TableCellVerticalAlignment.middle,
      child: content,
    );
  }
}
