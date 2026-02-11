/// AppDataTable - Generic table organism using Flutter's native Table widget
///
/// A clean, composable table component following atomic design principles
/// Uses Flutter's native Table widget for optimal column sizing and rendering
/// Type-safe, sortable, filterable, with loading/error/empty states
///
/// Key Features:
/// - Native Table widget for responsive column widths (IntrinsicColumnWidth)
/// - Platform-adaptive row actions:
///   - Desktop/Web (pointer): Hover reveals actions with gradient fade
///   - Mobile (touch): Long-press shows action bottom sheet
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

import 'package:flutter/foundation.dart' show defaultTargetPlatform, kIsWeb;
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

  /// Currently hovered row index (for action overlay)
  int? _hoveredRowIndex;

  /// Action items for the currently hovered row (cached for overlay)
  List<ActionItem>? _hoveredRowActions;

  /// LayerLink for connecting hovered row to action overlay
  final LayerLink _hoveredRowLink = LayerLink();

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
  /// Pointer devices: hover reveals action overlay
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
    final spacing = context.spacing;
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
    final scrollContent = Scrollbar(
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

    // Wrap in Stack with viewport-anchored action overlay for pointer devices
    // The CompositedTransformFollower positions the overlay relative to the hovered row
    // but renders it outside the scroll views so it stays anchored to viewport edge
    final hasPointer = _hasPointerCapability(context);
    if (!hasPointer ||
        _hoveredRowActions == null ||
        _hoveredRowActions!.isEmpty) {
      return scrollContent;
    }

    // Get row background color for the hovered row
    final hoveredIndex = _hoveredRowIndex ?? 0;
    final isEvenRow = hoveredIndex % 2 == 0;
    final rowColor = isEvenRow
        ? theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.05)
        : theme.colorScheme.surface;

    return Stack(
      children: [
        scrollContent,
        // Action overlay positioned at viewport right edge, following hovered row vertically
        Positioned(
          right: StyleConstants.scrollbarThickness + 4, // Account for scrollbar
          top: 0,
          bottom: 0,
          child: IgnorePointer(
            ignoring: false,
            child: CompositedTransformFollower(
              link: _hoveredRowLink,
              targetAnchor: Alignment.centerRight,
              followerAnchor: Alignment.centerLeft,
              showWhenUnlinked: false,
              child: _buildRowActionOverlay(
                _hoveredRowActions!,
                rowColor,
                spacing,
              ),
            ),
          ),
        ),
      ],
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
    // Split columns into pinned and scrollable (no special actions handling)
    final allCols = _visibleColumns.cast<dynamic>();

    final pinnedCols = allCols.take(pinnedCount).toList();
    final scrollableCols = allCols.skip(pinnedCount).toList();

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

    final content = LayoutBuilder(
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

    // Wrap in Stack with viewport-anchored action overlay for pointer devices
    final hasPointer = _hasPointerCapability(context);
    if (!hasPointer ||
        _hoveredRowActions == null ||
        _hoveredRowActions!.isEmpty) {
      return content;
    }

    // Get row background color for the hovered row
    final hoveredIndex = _hoveredRowIndex ?? 0;
    final isEvenRow = hoveredIndex % 2 == 0;
    final rowColor = isEvenRow
        ? theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.05)
        : theme.colorScheme.surface;

    return Stack(
      children: [
        content,
        // Action overlay positioned at viewport right edge, following hovered row vertically
        Positioned(
          right: StyleConstants.scrollbarThickness + 4,
          top: 0,
          bottom: 0,
          child: IgnorePointer(
            ignoring: false,
            child: CompositedTransformFollower(
              link: _hoveredRowLink,
              targetAnchor: Alignment.centerRight,
              followerAnchor: Alignment.centerLeft,
              showWhenUnlinked: false,
              child: _buildRowActionOverlay(
                _hoveredRowActions!,
                rowColor,
                spacing,
              ),
            ),
          ),
        ),
      ],
    );
  }

  /// Build a table section (for pinned columns layout)
  /// Actions overlay appears in scrollable section only (not pinned)
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

    // Column widths (no special actions column)
    final columnWidths = <int, TableColumnWidth>{};
    for (var i = 0; i < columns.length; i++) {
      final col = columns[i];
      if (widget.autoSizeColumns) {
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
        final column = col as TableColumn<T>;
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
      }).toList(),
    );

    // Build data rows with hover/touch detection for scrollable section
    // Touch devices: long-press to show actions; Pointer devices: hover reveals actions
    final hasPointer = _hasPointerCapability(context);
    final dataRows = data.asMap().entries.map((entry) {
      final index = entry.key;
      final item = entry.value;
      final isEvenRow = index % 2 == 0;
      final isHovered = _hoveredRowIndex == index;
      final rowColor = isEvenRow
          ? theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.05)
          : theme.colorScheme.surface;

      // Only show actions in scrollable (non-pinned) section
      final actionItems = !isPinned
          ? (widget.rowActionItems?.call(item) ?? [])
          : <ActionItem>[];

      return TableRow(
        decoration: BoxDecoration(
          color: isHovered && !isPinned
              ? theme.colorScheme.primaryContainer.withValues(alpha: 0.1)
              : (isEvenRow
                    ? theme.colorScheme.surfaceContainerHighest.withValues(
                        alpha: 0.05,
                      )
                    : null),
          border: Border(bottom: BorderSide(color: borderColor, width: 1)),
        ),
        children: columns.asMap().entries.map((colEntry) {
          final colIndex = colEntry.key;
          final column = colEntry.value as TableColumn<T>;
          final isFirstColumn = colIndex == 0;

          Widget cellContent = column.cellBuilder(item);

          // Pointer devices: first cell of hovered row gets CompositedTransformTarget
          // (in scrollable section only) for viewport-anchored action overlay
          if (!isPinned &&
              hasPointer &&
              isFirstColumn &&
              actionItems.isNotEmpty &&
              isHovered) {
            cellContent = CompositedTransformTarget(
              link: _hoveredRowLink,
              child: cellContent,
            );
          }

          return _buildDataCell(
            child: cellContent,
            spacing: spacing,
            onTap: widget.onRowTap != null
                ? () => widget.onRowTap!(item)
                : null,
            onHover: !isPinned && hasPointer
                ? () => setState(() {
                    _hoveredRowIndex = index;
                    _hoveredRowActions = actionItems;
                  })
                : null,
            // Touch devices: long-press shows action bottom sheet (scrollable section only)
            onLongPress: !isPinned && !hasPointer && actionItems.isNotEmpty
                ? () => _showActionBottomSheet(context, actionItems)
                : null,
          );
        }).toList(),
      );
    }).toList();

    final table = Table(
      columnWidths: columnWidths,
      defaultVerticalAlignment: TableCellVerticalAlignment.middle,
      border: TableBorder(
        verticalInside: BorderSide(color: borderColor, width: 1),
      ),
      children: [headerRow, ...dataRows],
    );

    // Wrap scrollable section in MouseRegion to clear hover on exit
    if (!isPinned) {
      return MouseRegion(
        onExit: (_) => setState(() {
          _hoveredRowIndex = null;
          _hoveredRowActions = null;
        }),
        child: table,
      );
    }

    return table;
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

    // Column widths: data columns are resizable or auto-sized
    // No dedicated actions column - actions overlay on hover
    final columnWidths = <int, TableColumnWidth>{};
    for (var i = 0; i < visibleCols.length; i++) {
      if (widget.autoSizeColumns) {
        // Auto-size: columns size to content but stretch to fill container
        columnWidths[i] = const IntrinsicColumnWidth(flex: 1.0);
      } else {
        final column = visibleCols[i];
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
      children: visibleCols.map((column) {
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
      }).toList(),
    );

    // Build data rows with hover detection for action overlay
    // Touch devices: long-press to show actions; Pointer devices: hover reveals actions
    final hasPointer = _hasPointerCapability(context);
    final dataRows = data.asMap().entries.map((entry) {
      final index = entry.key;
      final item = entry.value;
      final isEvenRow = index % 2 == 0;
      final isHovered = _hoveredRowIndex == index;
      final rowColor = isEvenRow
          ? theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.05)
          : theme.colorScheme.surface;
      final actionItems = includeActions
          ? (widget.rowActionItems?.call(item) ?? [])
          : <ActionItem>[];

      return TableRow(
        decoration: BoxDecoration(
          color: isHovered
              ? theme.colorScheme.primaryContainer.withValues(alpha: 0.1)
              : (isEvenRow
                    ? theme.colorScheme.surfaceContainerHighest.withValues(
                        alpha: 0.05,
                      )
                    : null),
          border: Border(bottom: BorderSide(color: borderColor, width: 1)),
        ),
        children: visibleCols.asMap().entries.map((colEntry) {
          final colIndex = colEntry.key;
          final column = colEntry.value;
          final isFirstColumn = colIndex == 0;

          Widget cellContent = column.cellBuilder(item);

          // Pointer devices: first cell of hovered row gets CompositedTransformTarget
          // This allows the action overlay to follow the row's position
          if (hasPointer &&
              isFirstColumn &&
              isHovered &&
              actionItems.isNotEmpty) {
            cellContent = CompositedTransformTarget(
              link: _hoveredRowLink,
              child: cellContent,
            );
          }

          return _buildDataCell(
            child: cellContent,
            spacing: spacing,
            onTap: widget.onRowTap != null
                ? () => widget.onRowTap!(item)
                : null,
            onHover: hasPointer
                ? () => setState(() {
                    _hoveredRowIndex = index;
                    _hoveredRowActions = actionItems;
                  })
                : null,
            // Touch devices: long-press shows action bottom sheet
            onLongPress: !hasPointer && actionItems.isNotEmpty
                ? () => _showActionBottomSheet(context, actionItems)
                : null,
          );
        }).toList(),
      );
    }).toList();

    // Single unified table - header and data rows together for perfect column alignment
    final unifiedTable = MouseRegion(
      onExit: (_) => setState(() {
        _hoveredRowIndex = null;
        _hoveredRowActions = null;
      }),
      child: Table(
        columnWidths: columnWidths,
        defaultVerticalAlignment: TableCellVerticalAlignment.middle,
        border: TableBorder(
          verticalInside: BorderSide(color: borderColor, width: 1),
        ),
        children: [headerRow, ...dataRows],
      ),
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

  /// Build the row action overlay for pointer devices (hover-reveal)
  /// Shows gradient fade with inline/hybrid actions
  Widget _buildRowActionOverlay(
    List<ActionItem> actions,
    Color backgroundColor,
    AppSpacing spacing,
  ) {
    return MouseRegion(
      // Keep hover active when moving to actions
      onEnter: (_) {},
      child: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.centerLeft,
            end: Alignment.centerRight,
            colors: [
              backgroundColor.withValues(alpha: 0.0),
              backgroundColor.withValues(alpha: 0.9),
              backgroundColor,
            ],
            stops: const [0.0, 0.3, 0.5],
          ),
        ),
        padding: EdgeInsets.only(left: spacing.xl, right: spacing.sm),
        child: Center(
          child: ActionMenu(
            actions: actions,
            mode: actions.length <= 3
                ? ActionMenuMode.inline
                : ActionMenuMode.hybrid,
            maxInline: 3,
          ),
        ),
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
    VoidCallback? onHover,
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

    // Wrap in MouseRegion for hover detection (pointer devices)
    if (onHover != null) {
      content = MouseRegion(onEnter: (_) => onHover(), child: content);
    }

    return TableCell(
      verticalAlignment: TableCellVerticalAlignment.middle,
      child: content,
    );
  }
}
