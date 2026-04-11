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

  /// Shared horizontal padding calculator for action cells
  /// Desktop inline: zero padding - buttons ARE the content and fill edge-to-edge
  /// Mobile overflow: minimal padding for visual breathing room
  double _actionHorizontalPadding(
    AppSpacing spacing,
    ActionMenuMode actionMode,
  ) => actionMode == ActionMenuMode.inline
      ? 0.0 // Desktop: buttons fill cell, no extra padding needed
      : spacing.xxs; // Mobile/hybrid: minimal padding

  /// ACTION BUTTON SIZE fits WITHIN the row content area (geometric truth)
  /// Buttons are squares that fit inside the row's padded content area.
  /// This ensures action rows have the same height as data rows.
  double _actionButtonSize(AppSpacing spacing) {
    final vPadding = _actionVerticalPadding(spacing);
    return _density.rowHeight - 2 * vPadding;
  }

  /// Computed action cell width based on geometry
  /// Width = (buttons × buttonSize) + gaps + padding + buffer
  double _actionCellWidth(ActionMenuMode mode, AppSpacing spacing) {
    final buttonSize = _actionButtonSize(spacing);
    final gap = spacing.sm;
    final hPadding = _actionHorizontalPadding(spacing, mode);
    // Buffer for subpixel rounding and column spacing
    const buffer = 8.0;

    return switch (mode) {
      // Overflow: 1 button + padding + buffer
      ActionMenuMode.overflow => buttonSize + 2 * hPadding + buffer,
      // Inline: N buttons + (N-1) gaps + padding + buffer
      ActionMenuMode.inline =>
        widget.maxRowActions * buttonSize +
            (widget.maxRowActions - 1) * gap +
            2 * hPadding +
            buffer,
      // Hybrid: 2 inline + 1 overflow = 3 buttons + 2 gaps + padding + buffer
      ActionMenuMode.hybrid => 3 * buttonSize + 2 * gap + 2 * hPadding + buffer,
    };
  }

  /// Show action bottom sheet for touch devices (long-press pattern)
  void _showActionBottomSheet(BuildContext context, List<ActionItem> actions) {
    final theme = Theme.of(context);
    final spacing = context.spacing;

    showModalBottomSheet<void>(
      context: context,
      backgroundColor: theme.colorScheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
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
                  width: 32,
                  height: 4,
                  margin: EdgeInsets.only(bottom: spacing.md),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.onSurfaceVariant.withValues(
                      alpha: 0.4,
                    ),
                    borderRadius: BorderRadius.circular(2),
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

  /// Builds the table using DataTable2 for proper pinned columns and row alignment
  Widget _buildNativeTable() {
    final hasActions = widget.rowActionItems != null;
    final hasPointer = _hasPointerCapability(context);
    final data = _sortedAndPaginatedData;
    final spacing = context.spacing;
    final colors = TableColors.of(context);
    final actionMode = _getRowActionMode(context);

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
          fixedWidth: _actionCellWidth(actionMode, spacing),
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
      headingRowHeight: _density.rowHeight + spacing.md,
      dataRowHeight: _density.rowHeight,
      horizontalMargin: spacing.md,
      columnSpacing: spacing.md,
      dividerThickness: 1,
      // Header styling
      headingRowDecoration: colors.headerDecoration,
      // Scrolling - minWidth ensures horizontal scroll instead of squishing
      minWidth:
          _visibleColumns.length * TableConfig.cellMinWidth +
          (showActionsColumn ? _actionCellWidth(actionMode, spacing) : 0),
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
              buttonSize: _actionButtonSize(spacing),
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
