/// TableColors - Centralized color definitions for data tables
///
/// Single source of truth for all table-related colors and visual styling.
/// Uses semantic naming (borderColor, headerBackground) rather than
/// implementation details (grey200, alpha 0.1).
///
/// All colors are derived from the current theme for proper light/dark support.
///
/// Usage:
/// ```dart
/// final colors = TableColors.of(context);
/// Container(
///   decoration: BoxDecoration(
///     border: Border(bottom: BorderSide(color: colors.rowBorder)),
///   ),
/// )
/// ```
library;

import 'package:flutter/material.dart';

/// Table color definitions derived from theme
class TableColors {
  final ThemeData _theme;

  const TableColors._(this._theme);

  /// Get table colors for the current context
  factory TableColors.of(BuildContext context) {
    return TableColors._(Theme.of(context));
  }

  // ============================================================================
  // BORDERS
  // ============================================================================

  /// Border between data rows (subtle)
  Color get rowBorder => _theme.colorScheme.outline.withValues(alpha: 0.1);

  /// Border below header row (more prominent)
  Color get headerBorder => _theme.colorScheme.outline.withValues(alpha: 0.2);

  /// Vertical border between columns
  Color get columnBorder => _theme.colorScheme.outline.withValues(alpha: 0.1);

  /// Border for pinned section separators
  Color get pinnedBorder => _theme.colorScheme.outline.withValues(alpha: 0.3);

  /// Border width for rows
  double get rowBorderWidth => 1.0;

  /// Border width for header
  double get headerBorderWidth => 2.0;

  /// Border width for pinned separators
  double get pinnedBorderWidth => 2.0;

  // ============================================================================
  // BACKGROUNDS
  // ============================================================================

  /// Header row background
  Color get headerBackground =>
      _theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5);

  /// Even row background (subtle zebra striping)
  Color get evenRowBackground =>
      _theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.05);

  /// Odd row background (transparent)
  Color? get oddRowBackground => null;

  /// Get background for row at index
  Color? rowBackground(int index) {
    return index.isEven ? evenRowBackground : oddRowBackground;
  }

  // ============================================================================
  // SHADOWS
  // ============================================================================

  /// Shadow for pinned sections
  BoxShadow get pinnedShadow => BoxShadow(
    color: _theme.colorScheme.shadow.withValues(alpha: 0.1),
    blurRadius: 4,
    offset: const Offset(2, 0),
  );

  /// Shadow offset for right-pinned sections (reversed)
  BoxShadow get pinnedShadowRight => BoxShadow(
    color: _theme.colorScheme.shadow.withValues(alpha: 0.1),
    blurRadius: 4,
    offset: const Offset(-2, 0),
  );

  // ============================================================================
  // DECORATIONS (Convenience methods)
  // ============================================================================

  /// Decoration for header row
  BoxDecoration get headerDecoration => BoxDecoration(
    color: headerBackground,
    border: Border(
      bottom: BorderSide(color: headerBorder, width: headerBorderWidth),
    ),
  );

  /// Decoration for data row at index
  BoxDecoration dataRowDecoration(int index) => BoxDecoration(
    color: rowBackground(index),
    border: Border(
      bottom: BorderSide(color: rowBorder, width: rowBorderWidth),
    ),
  );

  /// Decoration for left-pinned section border
  BoxDecoration get leftPinnedDecoration => BoxDecoration(
    border: Border(
      right: BorderSide(color: pinnedBorder, width: pinnedBorderWidth),
    ),
    boxShadow: [pinnedShadow],
  );

  /// Decoration for right-pinned section border
  BoxDecoration get rightPinnedDecoration => BoxDecoration(
    border: Border(
      left: BorderSide(color: pinnedBorder, width: pinnedBorderWidth),
    ),
    boxShadow: [pinnedShadowRight],
  );

  /// Table border definition
  TableBorder get tableBorder => TableBorder(
    verticalInside: BorderSide(color: columnBorder, width: rowBorderWidth),
  );
}
