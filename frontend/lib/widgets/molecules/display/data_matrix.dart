/// DataMatrix - Row×Column grid for structured data display
///
/// **SOLE RESPONSIBILITY:** Compose cells in a row×column matrix layout.
/// Delegates ALL cell rendering to atoms or custom cellBuilder.
///
/// **PURE COMPOSITION:** Composes FieldDisplay atoms for default cells,
/// coordinates layout only - implements ZERO display logic itself.
///
/// Used for:
/// - Permission matrices (roles × resources)
/// - Validation rules display
/// - Entity field configuration
/// - Any data that has row headers, column headers, and cell values
///
/// Modes:
/// - Readonly: Composes FieldDisplay atoms
/// - Editable: Renders editable controls
///
/// USAGE:
/// ```dart
/// DataMatrix(
///   columnHeaders: ['Create', 'Read', 'Update', 'Delete'],
///   rows: [
///     DataMatrixRow(header: 'Admin', cells: [true, true, true, true]),
///     DataMatrixRow(header: 'Manager', cells: [true, true, true, false]),
///   ],
/// )
/// ```
library;

import 'package:flutter/material.dart';
import '../../../config/app_colors.dart';
import '../../../config/app_spacing.dart';
import '../../atoms/display/field_display.dart';

/// Row data for DataMatrix
class DataMatrixRow {
  /// Row header label
  final String header;

  /// Cell values (must match column count)
  final List<dynamic> cells;

  /// Optional tooltip for the row header
  final String? tooltip;

  /// Whether this row is highlighted
  final bool isHighlighted;

  const DataMatrixRow({
    required this.header,
    required this.cells,
    this.tooltip,
    this.isHighlighted = false,
  });
}

/// Callback for cell changes in editable mode
typedef CellChangeCallback = void Function(
  int rowIndex,
  int colIndex,
  dynamic newValue,
);

/// DataMatrix - Grid display with row and column headers
class DataMatrix extends StatelessWidget {
  /// Column header labels
  final List<String> columnHeaders;

  /// Row data including header and cell values
  final List<DataMatrixRow> rows;

  /// Custom cell builder - receives (context, value, rowIndex, colIndex)
  /// If null, defaults to Text(value.toString())
  final Widget Function(BuildContext, dynamic, int, int)? cellBuilder;

  /// Width of the row header column
  final double rowHeaderWidth;

  /// Width of each data cell
  final double cellWidth;

  /// Height of each row
  final double rowHeight;

  /// Whether the matrix is editable
  final bool isEditable;

  /// Callback when a cell value changes (only used if isEditable)
  final CellChangeCallback? onCellChanged;

  /// Whether to show alternating row colors
  final bool showStriping;

  /// Whether to show grid lines
  final bool showGridLines;

  const DataMatrix({
    super.key,
    required this.columnHeaders,
    required this.rows,
    this.cellBuilder,
    this.rowHeaderWidth = 140,
    this.cellWidth = 80,
    this.rowHeight = 48,
    this.isEditable = false,
    this.onCellChanged,
    this.showStriping = true,
    this.showGridLines = true,
  });

  @override
  Widget build(BuildContext context) {
    if (rows.isEmpty || columnHeaders.isEmpty) {
      return const SizedBox.shrink();
    }

    final theme = Theme.of(context);

    return LayoutBuilder(
      builder: (context, constraints) {
        // Calculate total width needed
        final totalWidth = rowHeaderWidth + (columnHeaders.length * cellWidth);
        final needsScroll = totalWidth > constraints.maxWidth;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header row
            _buildHeaderRow(context, theme, needsScroll),
            
            // Data rows
            if (needsScroll)
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: _buildDataRows(context, theme),
              )
            else
              _buildDataRows(context, theme),
          ],
        );
      },
    );
  }

  Widget _buildHeaderRow(BuildContext context, ThemeData theme, bool needsScroll) {
    final headerStyle = theme.textTheme.labelMedium?.copyWith(
      fontWeight: FontWeight.w600,
      color: theme.colorScheme.onSurfaceVariant,
    );

    final header = Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        border: showGridLines
            ? Border(
                bottom: BorderSide(
                  color: theme.colorScheme.outlineVariant,
                ),
              )
            : null,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Empty cell for row header column
          _buildCell(
            context,
            theme,
            width: rowHeaderWidth,
            child: const SizedBox.shrink(),
            isHeader: true,
          ),
          // Column headers
          for (final header in columnHeaders)
            _buildCell(
              context,
              theme,
              width: cellWidth,
              child: Text(
                header,
                style: headerStyle,
                textAlign: TextAlign.center,
                overflow: TextOverflow.ellipsis,
              ),
              isHeader: true,
            ),
        ],
      ),
    );

    return needsScroll
        ? SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: header,
          )
        : header;
  }

  Widget _buildDataRows(BuildContext context, ThemeData theme) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (int rowIndex = 0; rowIndex < rows.length; rowIndex++)
          _buildDataRow(context, theme, rowIndex, rows[rowIndex]),
      ],
    );
  }

  Widget _buildDataRow(
    BuildContext context,
    ThemeData theme,
    int rowIndex,
    DataMatrixRow row,
  ) {
    final rowHeaderStyle = theme.textTheme.bodyMedium?.copyWith(
      fontWeight: row.isHighlighted ? FontWeight.w600 : FontWeight.w500,
    );

    final stripColor = showStriping && rowIndex.isOdd
        ? theme.colorScheme.surfaceContainerLow
        : null;

    final rowWidget = Container(
      decoration: BoxDecoration(
        color: row.isHighlighted
            ? AppColors.brandPrimary.withValues(alpha: 0.08)
            : stripColor,
        border: showGridLines
            ? Border(
                bottom: BorderSide(
                  color: theme.colorScheme.outlineVariant.withValues(alpha: 0.5),
                ),
              )
            : null,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Row header
          _buildCell(
            context,
            theme,
            width: rowHeaderWidth,
            child: row.tooltip != null
                ? Tooltip(
                    message: row.tooltip!,
                    child: Text(
                      row.header,
                      style: rowHeaderStyle,
                      overflow: TextOverflow.ellipsis,
                    ),
                  )
                : Text(
                    row.header,
                    style: rowHeaderStyle,
                    overflow: TextOverflow.ellipsis,
                  ),
            isHeader: true,
          ),
          // Data cells
          for (int colIndex = 0; colIndex < row.cells.length; colIndex++)
            _buildDataCell(context, theme, rowIndex, colIndex, row.cells[colIndex]),
        ],
      ),
    );

    return rowWidget;
  }

  Widget _buildDataCell(
    BuildContext context,
    ThemeData theme,
    int rowIndex,
    int colIndex,
    dynamic value,
  ) {
    Widget content;

    if (cellBuilder != null) {
      content = cellBuilder!(context, value, rowIndex, colIndex);
    } else if (value is bool) {
      content = _buildBooleanCell(context, value, rowIndex, colIndex);
    } else {
      // Compose FieldDisplay atom for text values
      content = FieldDisplay(
        value: value,
        type: DisplayType.text,
        emptyText: '',
      );
    }

    return _buildCell(
      context,
      theme,
      width: cellWidth,
      child: content,
      isHeader: false,
    );
  }

  Widget _buildBooleanCell(
    BuildContext context,
    bool value,
    int rowIndex,
    int colIndex,
  ) {
    if (isEditable && onCellChanged != null) {
      return Checkbox(
        value: value,
        onChanged: (newValue) {
          onCellChanged!(rowIndex, colIndex, newValue ?? false);
        },
        visualDensity: VisualDensity.compact,
      );
    }

    // Compose FieldDisplay atom for boolean display
    return FieldDisplay(
      value: value,
      type: DisplayType.boolean,
      showBooleanIcon: true,
    );
  }

  Widget _buildCell(
    BuildContext context,
    ThemeData theme, {
    required double width,
    required Widget child,
    required bool isHeader,
  }) {
    final spacing = context.spacing;
    return Container(
      width: width,
      height: rowHeight,
      alignment: Alignment.center,
      padding: EdgeInsets.symmetric(horizontal: spacing.sm),
      decoration: showGridLines
          ? BoxDecoration(
              border: Border(
                right: BorderSide(
                  color: theme.colorScheme.outlineVariant.withValues(alpha: 0.5),
                ),
              ),
            )
          : null,
      child: child,
    );
  }
}
