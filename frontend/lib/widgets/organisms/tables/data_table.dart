/// AppDataTable - Generic table organism using Flutter's native Table widget
///
/// A clean, composable table component following atomic design principles.
/// Uses Flutter's native Table widget for optimal column sizing and rendering.
/// Type-safe, sortable, filterable, with loading/error/empty states.
///
/// Key Features:
/// - Native Table widget for responsive column widths (IntrinsicColumnWidth)
/// - Right-pinned actions column visible during horizontal scroll
/// - Responsive action modes: inline (desktop), hybrid (tablet), overflow (mobile)
/// - Touch devices: Long-press shows action bottom sheet
/// - Sortable columns with visual indicators
/// - Pagination support
/// - Loading/error/empty states
/// - Column visibility and density customization
/// - Left-pinned columns support for wide tables
/// - Fully generic and type-safe
///
/// Architecture ("Burger Layout"):
/// - TOP BUN: Header row spans full width (no actions cell)
/// - INSIDES: Data rows + right-pinned actions (vertically scroll-synced)
/// - BOTTOM BUN: Horizontal scrollbar extends under actions area
///
/// This ensures actions only appear alongside data rows, not as a full-height
/// column with its own header. The horizontal scrollbar properly spans beneath
/// the actions for a clean, professional appearance.
///
/// Utilities:
/// - [ScrollSyncGroup] for coordinated scrolling between table sections
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

import 'package:flutter/foundation.dart' show defaultTargetPlatform, kIsWeb;
import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';
import '../../../config/platform_utilities.dart';
import '../../../config/table_colors.dart';
import '../../../config/table_column.dart';
import '../../../config/table_config.dart';
import '../../../config/constants.dart';
import '../../../utils/scroll_sync_group.dart';
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
  });

  @override
  State<AppDataTable<T>> createState() => _AppDataTableState<T>();
}

class _AppDataTableState<T> extends State<AppDataTable<T>> {
  String? _sortColumnId;
  SortDirection _sortDirection = SortDirection.none;
  int _currentPage = 1;

  // Scroll sync groups for coordinated scrolling between table sections
  final ScrollSyncGroup _verticalSync = ScrollSyncGroup();
  final ScrollSyncGroup _horizontalSync = ScrollSyncGroup();

  // Pre-created controllers - all vertical controllers sync together
  late final ScrollController _dataScrollController = _verticalSync
      .createController();
  late final ScrollController _actionsScrollController = _verticalSync
      .createController();
  late final ScrollController _pinnedLeftScrollController = _verticalSync
      .createController();

  // Horizontal scroll controllers - header and data sync together
  // Separate controllers needed because each ScrollView needs its own
  late final ScrollController _headerHorizontalScrollController =
      _horizontalSync.createController();
  late final ScrollController _dataHorizontalScrollController = _horizontalSync
      .createController();

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
  /// Width = (buttons × buttonSize) + gaps + padding
  double _actionCellWidth(ActionMenuMode mode, AppSpacing spacing) {
    final buttonSize = _actionButtonSize(spacing);
    final gap = spacing.sm;
    final hPadding = _actionHorizontalPadding(spacing, mode);

    return switch (mode) {
      // Overflow: 1 button + padding
      ActionMenuMode.overflow => buttonSize + 2 * hPadding,
      // Inline: N buttons + (N-1) gaps + padding
      ActionMenuMode.inline =>
        widget.maxRowActions * buttonSize +
            (widget.maxRowActions - 1) * gap +
            2 * hPadding,
      // Hybrid: 2 inline + 1 overflow = 3 buttons + 2 gaps + padding
      ActionMenuMode.hybrid => 3 * buttonSize + 2 * gap + 2 * hPadding,
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
  void dispose() {
    _verticalSync.dispose();
    _horizontalSync.dispose();
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

  /// Builds the table using Flutter's native Table widget ("Burger Layout")
  ///
  /// Structure:
  /// - TOP BUN: Header row (horizontal scroll synced, no actions cell)
  /// - INSIDES: Data rows + actions column (vertically scroll-synced)
  /// - BOTTOM BUN: Horizontal scrollbar (spans full width including under actions)
  ///
  /// When pinnedColumns > 0, delegates to [_buildPinnedColumnsTable] instead.
  Widget _buildNativeTable() {
    final hasActions = widget.rowActionItems != null;
    final data = _sortedAndPaginatedData;

    // Determine effective pinned columns count
    final effectivePinnedColumns = _getEffectivePinnedColumns(context);

    // If pinning is active and we have enough columns, use split table layout
    if (effectivePinnedColumns > 0 &&
        _visibleColumns.length > effectivePinnedColumns) {
      return _buildPinnedColumnsTable(
        Theme.of(context),
        data,
        hasActions,
        effectivePinnedColumns,
      );
    }

    // === BURGER LAYOUT ===
    // Top bun: Header row (full width, no actions)
    // Insides: Data rows + Actions (height-matched via IntrinsicHeight)
    // Bottom bun: Horizontal scrollbar (full width, extends under actions)

    // Build header table (just header row, no actions)
    final headerTable = _buildHeaderOnlyTable();

    // Simple case: no horizontal scroll needed (auto-size columns)
    if (widget.autoSizeColumns) {
      // When actions are present, use unified builder for exact height alignment
      // Otherwise just build data rows table
      final dataContent = hasActions
          ? _buildDataRowsWithActions(data)
          : _buildDataRowsOnlyTable(data);

      return Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // TOP BUN: Header (fixed, no scroll)
          headerTable,

          // INSIDES: Unified data rows with actions (perfect height alignment)
          Expanded(
            child: Scrollbar(
              controller: _dataScrollController,
              thumbVisibility: true,
              trackVisibility: true,
              thickness: StyleConstants.scrollbarThickness,
              radius: Radius.circular(StyleConstants.scrollbarRadius),
              child: SingleChildScrollView(
                controller: _dataScrollController,
                physics: PlatformUtilities.scrollPhysics,
                child: dataContent,
              ),
            ),
          ),

          // Bottom padding for scrollbar clearance
          SizedBox(height: StyleConstants.scrollbarThickness + 4),
        ],
      );
    }

    // Full case: horizontal scroll with burger layout
    // Actions are pinned right (outside horizontal scroll), synced vertically
    final dataRowsTable = _buildDataRowsOnlyTable(data);
    final actionsTable = hasActions
        ? _buildActionsTable(
            theme: Theme.of(context),
            data: data,
            spacing: context.spacing,
            scrollController: _actionsScrollController,
          )
        : null;

    // Data section: horizontally scrollable, vertically scrollable
    final dataSection = Scrollbar(
      controller: _dataScrollController,
      thumbVisibility: true,
      trackVisibility: true,
      thickness: StyleConstants.scrollbarThickness,
      radius: Radius.circular(StyleConstants.scrollbarRadius),
      child: SingleChildScrollView(
        controller: _dataScrollController,
        physics: PlatformUtilities.scrollPhysics,
        child: Scrollbar(
          controller: _dataHorizontalScrollController,
          thumbVisibility: true,
          trackVisibility: true,
          thickness: StyleConstants.scrollbarThickness,
          radius: Radius.circular(StyleConstants.scrollbarRadius),
          notificationPredicate: (notification) => notification.depth == 0,
          child: SingleChildScrollView(
            controller: _dataHorizontalScrollController,
            scrollDirection: Axis.horizontal,
            child: Padding(
              padding: EdgeInsets.only(
                bottom: StyleConstants.scrollbarThickness + 4,
              ),
              child: dataRowsTable,
            ),
          ),
        ),
      ),
    );

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // TOP BUN: Header (horizontal scroll synced, no vertical scroll)
        // Use IntrinsicHeight to ensure header and actions header match height
        IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header scrolls horizontally (synced with data)
              Expanded(
                child: SingleChildScrollView(
                  controller: _headerHorizontalScrollController,
                  scrollDirection: Axis.horizontal,
                  physics: const ClampingScrollPhysics(),
                  child: headerTable,
                ),
              ),
              // Actions header placeholder (matches data header height via IntrinsicHeight)
              if (hasActions) _buildActionsHeaderPlaceholder(context.spacing),
            ],
          ),
        ),

        // INSIDES: Data + Actions side by side
        Expanded(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Data section (scrolls horizontally and vertically)
              Expanded(child: dataSection),
              // Actions section (pinned right, syncs vertically)
              if (actionsTable != null) actionsTable,
            ],
          ),
        ),
      ],
    );
  }

  /// Build a placeholder for the actions header to maintain alignment
  /// Must match the width of action data cells and height of data header row
  Widget _buildActionsHeaderPlaceholder(AppSpacing spacing) {
    final colors = TableColors.of(context);
    final actionMode = _getRowActionMode(context);
    final leftBorder = Border(
      left: BorderSide(color: colors.headerBorder, width: 1),
    );

    // Use shared helpers for consistent sizing
    final horizontalPadding = _actionHorizontalPadding(spacing, actionMode);

    return Container(
      decoration: colors.headerDecoration,
      // Constrain width to match action data cells
      constraints: BoxConstraints(
        minWidth: _actionCellWidth(actionMode, spacing),
      ),
      child: Container(
        decoration: BoxDecoration(border: leftBorder),
        // Header uses spacing.md vertical padding (matches _buildHeaderCell)
        padding: EdgeInsets.symmetric(
          horizontal: horizontalPadding,
          vertical: spacing.md,
        ),
        // Empty content - just need the space
        child: const SizedBox.shrink(),
      ),
    );
  }

  /// Get effective pinned columns count based on screen size and prop
  int _getEffectivePinnedColumns(BuildContext context) {
    // Explicit 0 disables pinning
    if (widget.pinnedColumns == 0) return 0;

    // Explicit value provided
    if (widget.pinnedColumns != null) return widget.pinnedColumns!;

    // Default: no pinning - full horizontal scroll
    return 0;
  }

  /// Build table with pinned columns (split into frozen left + scrollable middle + actions right)
  Widget _buildPinnedColumnsTable(
    ThemeData theme,
    List<T> data,
    bool hasActions,
    int pinnedCount,
  ) {
    final spacing = context.spacing;

    // Using pre-created controllers from ScrollSyncGroup - sync is automatic

    // Split columns into pinned and scrollable (actions handled separately)
    final pinnedCols = _visibleColumns.take(pinnedCount).toList();
    final scrollableCols = _visibleColumns.skip(pinnedCount).toList();

    // Build pinned section (no actions)
    final pinnedTable = _buildTableSection(
      theme: theme,
      data: data,
      columns: pinnedCols,
      spacing: spacing,
      isPinned: true,
    );

    // Build scrollable section (no actions)
    final scrollableTable = _buildTableSection(
      theme: theme,
      data: data,
      columns: scrollableCols,
      spacing: spacing,
      isPinned: true, // Treat as pinned to exclude actions
    );

    // Build right-pinned actions table (unified table with per-cell borders)
    final actionsTable = hasActions
        ? _buildActionsTable(
            theme: theme,
            data: data,
            spacing: spacing,
            scrollController: _actionsScrollController,
          )
        : null;

    return LayoutBuilder(
      builder: (context, constraints) {
        // Calculate pinned section width (capped at 40% of available width)
        final maxPinnedWidth = constraints.maxWidth * 0.4;
        final colors = TableColors.of(context);

        // Build the left-pinned + scrollable middle layout
        final dataLayout = Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Left pinned section (frozen)
            Container(
              constraints: BoxConstraints(maxWidth: maxPinnedWidth),
              decoration: colors.leftPinnedDecoration,
              child: SingleChildScrollView(
                controller: _pinnedLeftScrollController,
                physics: PlatformUtilities.scrollPhysics,
                child: Padding(
                  padding: EdgeInsets.only(
                    bottom: StyleConstants.scrollbarThickness + 4,
                  ),
                  child: pinnedTable,
                ),
              ),
            ),

            // Scrollable middle section
            Expanded(
              child: Scrollbar(
                controller: _dataHorizontalScrollController,
                thumbVisibility: true,
                thickness: StyleConstants.scrollbarThickness,
                radius: Radius.circular(StyleConstants.scrollbarRadius),
                child: SingleChildScrollView(
                  controller: _dataHorizontalScrollController,
                  scrollDirection: Axis.horizontal,
                  physics: PlatformUtilities.scrollPhysics,
                  child: SingleChildScrollView(
                    controller: _dataScrollController,
                    physics: PlatformUtilities.scrollPhysics,
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

        // If no actions, return simple Row layout
        if (actionsTable == null) {
          return dataLayout;
        }

        // Add actions table (per-cell borders, no column container)
        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Data layout (left-pinned + scrollable middle)
            Expanded(child: dataLayout),

            // Right-pinned actions table
            actionsTable,
          ],
        );
      },
    );
  }

  /// Build a table section (for pinned columns layout)
  /// Data columns only - actions are in a separate right-pinned column
  Widget _buildTableSection({
    required ThemeData theme,
    required List<T> data,
    required List<TableColumn<T>> columns,
    required AppSpacing spacing,
    required bool isPinned,
  }) {
    final colors = TableColors.of(context);
    final hasPointer = _hasPointerCapability(context);

    // Column widths for data columns only
    final columnWidths = <int, TableColumnWidth>{};
    for (var i = 0; i < columns.length; i++) {
      final column = columns[i];
      if (widget.autoSizeColumns) {
        columnWidths[i] = const IntrinsicColumnWidth(flex: 1.0);
      } else {
        final width =
            _columnWidths[column.id] ?? TableConfig.defaultColumnWidth;
        columnWidths[i] = FixedColumnWidth(width);
      }
    }

    // Build header row
    final headerChildren = columns.map((column) {
      final isCurrentSort = _sortColumnId == column.id;
      return _buildHeaderCell(
        child: ColumnHeader(
          label: column.label,
          sortable: column.sortable,
          sortDirection: isCurrentSort ? _sortDirection : SortDirection.none,
          onSort: column.sortable ? () => _handleSort(column.id) : null,
          textAlign: column.alignment,
        ),
        spacing: spacing,
        onTap: column.sortable ? () => _handleSort(column.id) : null,
        columnId: isPinned ? null : column.id,
      );
    }).toList();

    final headerRow = TableRow(
      decoration: colors.headerDecoration,
      children: headerChildren,
    );

    // Build data rows
    final dataRows = data.asMap().entries.map((entry) {
      final index = entry.key;
      final item = entry.value;

      // Get action items for long-press support
      final actionItems = widget.rowActionItems?.call(item) ?? <ActionItem>[];

      // Build data cells for each column
      final cellChildren = columns.map((column) {
        final cellContent = column.cellBuilder(item);

        return _buildDataCell(
          child: cellContent,
          spacing: spacing,
          onTap: widget.onRowTap != null ? () => widget.onRowTap!(item) : null,
          // Touch devices: long-press shows action bottom sheet
          onLongPress: !hasPointer && actionItems.isNotEmpty
              ? () => _showActionBottomSheet(context, actionItems)
              : null,
        );
      }).toList();

      return TableRow(
        decoration: colors.dataRowDecoration(index),
        children: cellChildren,
      );
    }).toList();

    return Table(
      columnWidths: columnWidths,
      defaultVerticalAlignment: TableCellVerticalAlignment.middle,
      border: colors.tableBorder,
      children: [headerRow, ...dataRows],
    );
  }

  /// Build the right-pinned actions table (data rows only, no header)
  /// Header is handled separately by _buildActionsHeaderPlaceholder
  /// Uses per-cell borders for clean visual separation - no column-level container
  Widget _buildActionsTable({
    required ThemeData theme,
    required List<T> data,
    required AppSpacing spacing,
    required ScrollController scrollController,
  }) {
    final colors = TableColors.of(context);
    final actionMode = _getRowActionMode(context);

    // Single column width (intrinsic for tight fit)
    final columnWidths = <int, TableColumnWidth>{
      0: const IntrinsicColumnWidth(),
    };

    // Left border applied to cells for visual separation from data columns
    final leftBorder = Border(
      left: BorderSide(color: colors.headerBorder, width: 1),
    );

    // Build data rows with actions (NO header - header handled separately)
    final dataRows = data.asMap().entries.map((entry) {
      final index = entry.key;
      final item = entry.value;
      final actionItems = widget.rowActionItems?.call(item) ?? <ActionItem>[];

      return TableRow(
        decoration: colors.dataRowDecoration(index),
        children: [
          _buildActionCell(
            child: actionItems.isNotEmpty
                ? ActionMenu(
                    actions: actionItems,
                    mode: actionMode,
                    maxInline: 2,
                    buttonSize: _actionButtonSize(spacing),
                  )
                : const SizedBox.shrink(),
            spacing: spacing,
            actionMode: actionMode,
            leftBorder: leftBorder,
          ),
        ],
      );
    }).toList();

    // Data rows only (header is separate)
    final actionsTable = Table(
      columnWidths: columnWidths,
      defaultVerticalAlignment: TableCellVerticalAlignment.middle,
      children: dataRows,
    );

    // Scrollable, synced with data section
    return SingleChildScrollView(
      controller: scrollController,
      physics: PlatformUtilities.scrollPhysics,
      child: Padding(
        padding: EdgeInsets.only(bottom: StyleConstants.scrollbarThickness + 4),
        child: actionsTable,
      ),
    );
  }

  /// Build an action cell with compact padding for actions column
  /// Uses shared helpers for consistent sizing across all action cell builders
  /// Per-cell leftBorder provides visual separation without column-level container
  Widget _buildActionCell({
    required Widget child,
    required AppSpacing spacing,
    required ActionMenuMode actionMode,
    Border? leftBorder,
  }) {
    // Use shared helpers for consistent sizing
    final verticalPadding = _actionVerticalPadding(spacing);
    final horizontalPadding = _actionHorizontalPadding(spacing, actionMode);

    Widget content = Container(
      // Per-cell border for clean visual separation (no column-level container)
      decoration: leftBorder != null ? BoxDecoration(border: leftBorder) : null,
      constraints: BoxConstraints(
        minHeight: _density.rowHeight,
        minWidth: _actionCellWidth(actionMode, spacing),
      ),
      padding: EdgeInsets.symmetric(
        horizontal: horizontalPadding,
        vertical: verticalPadding,
      ),
      child: Center(child: child),
    );

    return TableCell(
      verticalAlignment: TableCellVerticalAlignment.middle,
      child: content,
    );
  }

  /// Builds the column widths map for visible columns
  /// Shared between header and data table builders to ensure alignment
  Map<int, TableColumnWidth> _buildColumnWidths() {
    final visibleCols = _visibleColumns;
    final columnWidths = <int, TableColumnWidth>{};
    for (var i = 0; i < visibleCols.length; i++) {
      if (widget.autoSizeColumns) {
        columnWidths[i] = const IntrinsicColumnWidth(flex: 1.0);
      } else {
        final column = visibleCols[i];
        final width =
            _columnWidths[column.id] ?? TableConfig.defaultColumnWidth;
        columnWidths[i] = FixedColumnWidth(width);
      }
    }
    return columnWidths;
  }

  /// Builds ONLY the header row as a Table (no data rows)
  /// This is the "top bun" of the burger layout - spans full width, no actions
  Widget _buildHeaderOnlyTable() {
    final spacing = context.spacing;
    final colors = TableColors.of(context);
    final visibleCols = _visibleColumns;
    final columnWidths = _buildColumnWidths();

    // Build header row
    final headerChildren = visibleCols.map((column) {
      final isCurrentSort = _sortColumnId == column.id;
      return _buildHeaderCell(
        child: ColumnHeader(
          label: column.label,
          sortable: column.sortable,
          sortDirection: isCurrentSort ? _sortDirection : SortDirection.none,
          onSort: column.sortable ? () => _handleSort(column.id) : null,
          textAlign: column.alignment,
        ),
        spacing: spacing,
        onTap: column.sortable ? () => _handleSort(column.id) : null,
        columnId: column.id,
      );
    }).toList();

    final headerRow = TableRow(
      decoration: colors.headerDecoration,
      children: headerChildren,
    );

    return Table(
      columnWidths: columnWidths,
      defaultVerticalAlignment: TableCellVerticalAlignment.middle,
      border: colors.tableBorder,
      children: [headerRow],
    );
  }

  /// Builds ONLY the data rows as a Table (no header row)
  /// This is part of the "insides" of the burger layout
  Widget _buildDataRowsOnlyTable(List<T> data) {
    final spacing = context.spacing;
    final colors = TableColors.of(context);
    final visibleCols = _visibleColumns;
    final hasPointer = _hasPointerCapability(context);
    final columnWidths = _buildColumnWidths();

    // Build data rows only (no header)
    final dataRows = data.asMap().entries.map((entry) {
      final index = entry.key;
      final item = entry.value;
      final actionItems = widget.rowActionItems?.call(item) ?? <ActionItem>[];

      final cellChildren = visibleCols.map((column) {
        final cellContent = column.cellBuilder(item);
        return _buildDataCell(
          child: cellContent,
          spacing: spacing,
          onTap: widget.onRowTap != null ? () => widget.onRowTap!(item) : null,
          onLongPress: !hasPointer && actionItems.isNotEmpty
              ? () => _showActionBottomSheet(context, actionItems)
              : null,
        );
      }).toList();

      return TableRow(
        decoration: colors.dataRowDecoration(index),
        children: cellChildren,
      );
    }).toList();

    return Table(
      columnWidths: columnWidths,
      defaultVerticalAlignment: TableCellVerticalAlignment.middle,
      border: colors.tableBorder,
      children: dataRows,
    );
  }

  /// Builds unified data rows WITH actions - each row uses IntrinsicHeight
  /// for perfect height alignment between data table and action cell.
  /// This is the "insides" of the burger layout.
  Widget _buildDataRowsWithActions(List<T> data) {
    final spacing = context.spacing;
    final colors = TableColors.of(context);
    final visibleCols = _visibleColumns;
    final hasPointer = _hasPointerCapability(context);
    final columnWidths = _buildColumnWidths();
    final actionMode = _getRowActionMode(context);

    // Left border for action cells
    final leftBorder = Border(
      left: BorderSide(color: colors.headerBorder, width: 1),
    );

    // Build each row as IntrinsicHeight(Row[DataTable + ActionCell])
    // This guarantees exact height alignment
    final rows = data.asMap().entries.map((entry) {
      final index = entry.key;
      final item = entry.value;
      final actionItems = widget.rowActionItems?.call(item) ?? <ActionItem>[];

      // Build single-row Table for this data row
      final cellChildren = visibleCols.map((column) {
        final cellContent = column.cellBuilder(item);
        return _buildDataCell(
          child: cellContent,
          spacing: spacing,
          onTap: widget.onRowTap != null ? () => widget.onRowTap!(item) : null,
          onLongPress: !hasPointer && actionItems.isNotEmpty
              ? () => _showActionBottomSheet(context, actionItems)
              : null,
        );
      }).toList();

      final dataRowTable = Table(
        columnWidths: columnWidths,
        defaultVerticalAlignment: TableCellVerticalAlignment.middle,
        border: colors.tableBorder,
        children: [
          TableRow(
            decoration: colors.dataRowDecoration(index),
            children: cellChildren,
          ),
        ],
      );

      // Build action cell for this row
      final actionCell = Container(
        decoration: colors.dataRowDecoration(index),
        child: _buildActionCellContent(
          child: actionItems.isNotEmpty
              ? ActionMenu(
                  actions: actionItems,
                  mode: actionMode,
                  maxInline: 2,
                  buttonSize: _actionButtonSize(spacing),
                )
              : const SizedBox.shrink(),
          spacing: spacing,
          actionMode: actionMode,
          leftBorder: leftBorder,
        ),
      );

      // IntrinsicHeight ensures both children have the same height
      // Don't use Expanded - let the Table size naturally (works in unbounded contexts)
      return IntrinsicHeight(
        child: Row(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [dataRowTable, actionCell],
        ),
      );
    }).toList();

    return Column(mainAxisSize: MainAxisSize.min, children: rows);
  }

  /// Builds ONLY the action cells as a Column (no header)
  /// Build action cell content with proper padding (used by unified row builder)
  Widget _buildActionCellContent({
    required Widget child,
    required AppSpacing spacing,
    required ActionMenuMode actionMode,
    Border? leftBorder,
  }) {
    // Use shared helpers for consistent sizing with other action cell builders
    final verticalPadding = _actionVerticalPadding(spacing);
    final horizontalPadding = _actionHorizontalPadding(spacing, actionMode);

    return Container(
      decoration: leftBorder != null ? BoxDecoration(border: leftBorder) : null,
      // Constrain width to match action header and other action cells
      constraints: BoxConstraints(
        minWidth: _actionCellWidth(actionMode, spacing),
        minHeight: _density.rowHeight,
      ),
      padding: EdgeInsets.symmetric(
        horizontal: horizontalPadding,
        vertical: verticalPadding,
      ),
      child: Center(child: child),
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
    VoidCallback? onLongPress,
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

    // Handle tap and long-press interactions
    if (onTap != null || onLongPress != null) {
      content = GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        onLongPress: onLongPress,
        child: content,
      );
    }

    return TableCell(
      verticalAlignment: TableCellVerticalAlignment.middle,
      child: content,
    );
  }
}
