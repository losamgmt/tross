/// AppDataTable - Generic table organism using DataTable2
///
/// A clean, composable table component following atomic design principles.
/// Uses DataTable2 for proper pinned columns and responsive layout.
/// Type-safe, sortable, filterable, with loading/error/empty states.
///
/// Key Features:
/// - DataTable2 for unified table with pinned actions column
/// - Left-pinned actions column stays visible during horizontal scroll
/// - Responsive action modes: inline (desktop), hybrid (tablet), overflow (mobile)
/// - Touch devices: Long-press shows action bottom sheet
/// - Sortable columns with visual indicators
/// - Pagination support
/// - Loading/error/empty states
/// - Column visibility and density customization
/// - Dynamic minWidth triggers horizontal scroll instead of squishing
/// - Fully generic and type-safe
///
/// Utilities:
/// - [TableColors] for centralized, theme-aware styling
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

import 'package:data_table_2/data_table_2.dart';
import 'package:flutter/foundation.dart' show defaultTargetPlatform, kIsWeb;
import 'package:flutter/material.dart';
import '../../../config/app_borders.dart';
import '../../../config/app_opacity.dart';
import '../../../config/app_sizes.dart';
import '../../../config/app_spacing.dart';
import '../../../config/table_colors.dart';
import '../../../config/table_column.dart';
import '../../../config/table_config.dart';
import '../../../utils/helpers/pagination_helper.dart';
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

  /// Maximum number of row actions for geometric width calculation
  /// Should match the SSOT (e.g., GenericTableActionBuilders.maxRowActionCount)
  /// Defaults to 2 (edit + delete) if not specified
  final int maxRowActions;

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

  /// Initial table density. When provided, overrides the default (standard).
  /// Use TableDensity.compact for Related lists, inline tables, etc.
  final TableDensity? initialDensity;

  const AppDataTable({
    super.key,
    required this.columns,
    this.data = const [],
    this.state = AppDataTableState.loaded,
    this.errorMessage,
    this.onRowTap,
    this.rowActionItems,
    this.maxRowActions = 2,
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
    this.initialDensity,
  });

  @override
  State<AppDataTable<T>> createState() => _AppDataTableState<T>();
}

class _AppDataTableState<T> extends State<AppDataTable<T>> {
  String? _sortColumnId;
  SortDirection _sortDirection = SortDirection.none;
  int _currentPage = 1;

  /// Hidden column IDs (session-only, not persisted)
  final Set<String> _hiddenColumnIds = {};

  /// Table density - initialized from widget.initialDensity or defaults to standard
  late TableDensity _density;

  /// Get visible columns (filtered by hidden state)
  List<TableColumn<T>> get _visibleColumns =>
      widget.columns.where((c) => !_hiddenColumnIds.contains(c.id)).toList();

  /// Check if device has pointer (mouse) capability
  /// Touch devices: long-press shows action bottom sheet
  /// Pointer devices: inline actions in dedicated column
  bool _hasPointerCapability(BuildContext context) {
    // Web: assume pointer capability (desktop browsers)
    if (kIsWeb) return true;

    // Native: desktop platforms have pointer, mobile doesn't
    // Use defaultTargetPlatform for test compatibility
    final platform = defaultTargetPlatform;
    return platform == TargetPlatform.macOS ||
        platform == TargetPlatform.windows ||
        platform == TargetPlatform.linux;
  }

  /// Get responsive action menu mode based on screen size
  /// Mobile: overflow menu (single "more" button)
  /// Tablet: hybrid (2 inline + overflow)
  /// Desktop: inline (all actions visible)
  ActionMenuMode _getRowActionMode(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    if (AppBreakpoints.isMobile(width)) return ActionMenuMode.overflow;
    if (AppBreakpoints.isTablet(width)) return ActionMenuMode.hybrid;
    return ActionMenuMode.inline;
  }

  /// Shared vertical padding calculator for action cells
  /// Matches _buildDataCell padding for consistent row heights
  double _actionVerticalPadding(AppSpacing spacing) => switch (_density) {
    TableDensity.compact => spacing.xs,
    TableDensity.standard => spacing.sm,
    TableDensity.comfortable => spacing.md,
  };

  /// ACTION BUTTON SIZE fits WITHIN the row content area (geometric truth)
  /// Buttons are squares that fit inside the row's padded content area.
  /// This ensures action rows have the same height as data rows.
  double _actionButtonSize(AppSpacing spacing, AppSizes sizes) {
    final vPadding = _actionVerticalPadding(spacing);
    return _density.getRowHeight(sizes) - 2 * vPadding;
  }

  /// Gap between action buttons - tight spacing to minimize column width
  double _actionButtonGap(AppSpacing spacing) => spacing.xs;

  /// Computed action cell width based on geometry
  /// Width = (buttons × buttonSize) + gaps (tight, no extra padding)
  /// This is CONTENT width only - DataTable2's margins are separate
  double _actionCellWidth(
    ActionMenuMode mode,
    AppSpacing spacing,
    AppSizes sizes,
  ) {
    final buttonSize = _actionButtonSize(spacing, sizes);
    final gap = _actionButtonGap(spacing);

    return switch (mode) {
      // Overflow: 1 button only
      ActionMenuMode.overflow => buttonSize,
      // Inline/Hybrid: Use hybrid width (N inline + 1 overflow)
      // Inline mode falls back to hybrid when actions > maxInline, so always
      // reserve hybrid width to prevent overflow
      ActionMenuMode.inline || ActionMenuMode.hybrid =>
        (widget.maxRowActions + 1) * buttonSize + widget.maxRowActions * gap,
    };
  }

  /// Show action bottom sheet for touch devices (long-press pattern)
  void _showActionBottomSheet(BuildContext context, List<ActionItem> actions) {
    final theme = Theme.of(context);
    final spacing = context.spacing;
    final sizes = context.sizes;

    showModalBottomSheet<void>(
      context: context,
      backgroundColor: theme.colorScheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: AppBorders.radiusTopLarge,
      ),
      builder: (sheetContext) {
        return SafeArea(
          child: Padding(
            padding: EdgeInsets.symmetric(vertical: spacing.md),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Drag handle
                Container(
                  width: sizes.dragHandleWidth,
                  height: sizes.dragHandleHeight,
                  margin: EdgeInsets.only(bottom: spacing.md),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.onSurfaceVariant.withValues(
                      alpha: AppOpacity.subtle,
                    ),
                    borderRadius: BorderRadius.circular(spacing.xxs),
                  ),
                ),
                // Action list
                ...actions.map((action) {
                  final isDestructive = action.style == ActionStyle.danger;
                  return ListTile(
                    leading: action.icon != null
                        ? Icon(
                            action.icon,
                            color: isDestructive
                                ? theme.colorScheme.error
                                : theme.colorScheme.onSurface,
                          )
                        : null,
                    title: Text(
                      action.label,
                      style: TextStyle(
                        color: isDestructive
                            ? theme.colorScheme.error
                            : theme.colorScheme.onSurface,
                      ),
                    ),
                    onTap: () {
                      Navigator.of(sheetContext).pop();
                      if (action.onTapAsync != null) {
                        action.onTapAsync!(context);
                      } else if (action.onTap != null) {
                        action.onTap!();
                      }
                    },
                  );
                }),
              ],
            ),
          ),
        );
      },
    );
  }

  /// Show customization options in a bottom sheet
  void _showCustomizationSheet(BuildContext context) {
    final spacing = context.spacing;
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: AppBorders.radiusTopLarge,
      ),
      builder: (sheetContext) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            return SafeArea(
              child: Padding(
                padding: spacing.paddingLG,
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
                    spacing.gapLG,

                    // Density selection
                    Text(
                      'Density',
                      style: Theme.of(context).textTheme.titleSmall,
                    ),
                    spacing.gapSM,
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
                    spacing.gapLG,

                    // Column visibility
                    Text(
                      'Columns',
                      style: Theme.of(context).textTheme.titleSmall,
                    ),
                    spacing.gapSM,
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
  void initState() {
    super.initState();
    _density = widget.initialDensity ?? TableDensity.standard;
  }

  @override
  void dispose() {
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

  /// Calculate intrinsic table height to enable "hug content" sizing
  /// Returns: header height + (row height × row count) + dividers
  double _calculateIntrinsicTableHeight(AppSpacing spacing, AppSizes sizes) {
    final data = _sortedAndPaginatedData;
    final rowHeight = _density.getRowHeight(sizes);
    final headerHeight = rowHeight + spacing.md;
    final dataHeight = rowHeight * data.length;
    // Dividers between rows (n rows = n-1 dividers, but also header divider)
    final dividerHeight = data.length * sizes.dividerThin;
    return headerHeight + dataHeight + dividerHeight + sizes.scrollbarBuffer;
  }

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final sizes = context.sizes;

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

        // Calculate heights for smart sizing
        final intrinsicTableHeight = _calculateIntrinsicTableHeight(
          spacing,
          sizes,
        );
        // Account for toolbar and pagination in available space
        final toolbarHeight = hasToolbarContent
            ? sizes.buttonHeightXLarge
            : 0.0;
        final paginationHeight =
            widget.paginated && widget.state == AppDataTableState.loaded
            ? sizes.buttonHeightXLarge + spacing.md * 2
            : 0.0;
        final availableForTable = hasFiniteHeight
            ? constraints.maxHeight - toolbarHeight - paginationHeight
            : double.infinity;

        // Use MIN(intrinsic, available) - "hug content when small, scroll when large"
        final tableHeight = hasFiniteHeight
            ? intrinsicTableHeight.clamp(0.0, availableForTable)
            : intrinsicTableHeight;

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

              // Table content with intrinsic-aware sizing
              // Uses calculated height to "hug" content when smaller than container
              // Falls back to available space when content exceeds container
              SizedBox(
                height: tableHeight.isFinite ? tableHeight : null,
                child: _buildTableContent(sizes),
              ),

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
  Widget _buildTableContent(AppSizes sizes) {
    switch (widget.state) {
      case AppDataTableState.loading:
        return SizedBox(
          height: sizes.placeholderHeightMedium,
          child: const Center(child: LoadingIndicator()),
        );

      case AppDataTableState.error:
        return SizedBox(
          height: sizes.placeholderHeightMedium,
          child: Center(
            child: Text(
              widget.errorMessage ?? 'An error occurred',
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ),
        );

      case AppDataTableState.empty:
        return SizedBox(
          height: sizes.placeholderHeightMedium,
          child: EmptyState.noData(
            title: 'No Data',
            message: widget.emptyMessage ?? 'No data available',
          ),
        );

      case AppDataTableState.loaded:
        if (_sortedAndPaginatedData.isEmpty) {
          return SizedBox(
            height: sizes.placeholderHeightMedium,
            child: EmptyState.noData(
              title: 'No Results',
              message: widget.emptyMessage ?? 'No data available',
            ),
          );
        }
        return _buildNativeTable();
    }
  }

  /// Builds the table using DataTable2 for proper pinned columns and row alignment
  Widget _buildNativeTable() {
    final hasActions = widget.rowActionItems != null;
    final hasPointer = _hasPointerCapability(context);
    final data = _sortedAndPaginatedData;
    final spacing = context.spacing;
    final sizes = context.sizes;
    final colors = TableColors.of(context);
    final actionMode = _getRowActionMode(context);
    final rowHeight = _density.getRowHeight(sizes);

    // Determine if we should show actions column
    final showActionsColumn =
        hasActions && (hasPointer || actionMode == ActionMenuMode.inline);

    // Build columns for DataTable2
    final columns = <DataColumn2>[
      // Actions column FIRST (pinned left)
      if (showActionsColumn)
        DataColumn2(
          label: const SizedBox.shrink(), // Empty header for actions
          size: ColumnSize.S,
          fixedWidth: _actionCellWidth(actionMode, spacing, sizes),
        ),
      // Data columns - use flexible sizing to prevent assertion on narrow viewports
      for (final column in _visibleColumns)
        DataColumn2(
          label: ColumnHeader(
            label: column.label,
            sortable: column.sortable,
            sortDirection: _sortColumnId == column.id
                ? _sortDirection
                : SortDirection.none,
            onSort: column.sortable ? () => _handleSort(column.id) : null,
            textAlign: column.alignment,
          ),
          size: widget.autoSizeColumns ? ColumnSize.L : ColumnSize.M,
          onSort: column.sortable
              ? (columnIndex, ascending) => _handleSort(column.id)
              : null,
        ),
    ];

    // Build rows for DataTable2
    final rows = <DataRow2>[
      for (var i = 0; i < data.length; i++)
        _buildDataRow2(
          item: data[i],
          index: i,
          showActionsColumn: showActionsColumn,
          actionMode: actionMode,
          spacing: spacing,
          sizes: sizes,
          colors: colors,
        ),
    ];

    return DataTable2(
      // Column configuration
      columns: columns,
      rows: rows,
      // Pin actions column to the left
      fixedLeftColumns: showActionsColumn ? 1 : 0,
      // Appearance
      headingRowHeight: rowHeight + spacing.md,
      dataRowHeight: rowHeight,
      horizontalMargin: spacing.xs, // Minimal edge margin
      columnSpacing: spacing.sm, // Tight column spacing
      dividerThickness: sizes.dividerThin,
      // Header styling
      headingRowDecoration: colors.headerDecoration,
      // Scrolling - minWidth ensures horizontal scroll instead of squishing
      minWidth:
          _visibleColumns.length * TableConfig.cellMinWidth +
          (showActionsColumn
              ? _actionCellWidth(actionMode, spacing, sizes)
              : 0),
      isHorizontalScrollBarVisible: true,
      isVerticalScrollBarVisible: true,
    );
  }

  /// Build a DataRow2 for a single item
  DataRow2 _buildDataRow2({
    required T item,
    required int index,
    required bool showActionsColumn,
    required ActionMenuMode actionMode,
    required AppSpacing spacing,
    required AppSizes sizes,
    required TableColors colors,
  }) {
    final actionItems = widget.rowActionItems?.call(item) ?? <ActionItem>[];
    final hasPointer = _hasPointerCapability(context);

    return DataRow2(
      decoration: colors.dataRowDecoration(index),
      onTap: widget.onRowTap != null ? () => widget.onRowTap!(item) : null,
      onLongPress: !hasPointer && actionItems.isNotEmpty
          ? () => _showActionBottomSheet(context, actionItems)
          : null,
      cells: [
        // Actions cell FIRST (pinned left)
        if (showActionsColumn)
          DataCell(
            ActionMenu(
              actions: actionItems,
              mode: actionMode,
              maxInline: widget.maxRowActions,
              buttonSize: _actionButtonSize(spacing, sizes),
              buttonGap: _actionButtonGap(spacing),
            ),
          ),
        // Data cells
        for (final column in _visibleColumns)
          DataCell(
            Align(
              alignment: Alignment.centerLeft,
              child: column.cellBuilder(item),
            ),
          ),
      ],
    );
  }
}
