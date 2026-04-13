/// Table Configuration - BEHAVIORAL constants only
///
/// This file contains DATA and BEHAVIOR configuration for tables.
/// ALL VISUAL styling (sizing, spacing, borders, opacity) comes from:
/// - AppSizes (context.sizes.*)
/// - AppSpacing (context.spacing.*)
/// - AppBorders (AppBorders.*)
/// - AppOpacity (AppOpacity.*)
///
/// SRP: This file defines WHAT tables do, not HOW they look.
library;

import 'app_sizes.dart';

/// Table row density options
///
/// Maps density names to standard AppSizes button heights:
/// - compact → buttonHeightCompact (28dp)
/// - standard → buttonHeightMedium (40dp)
/// - comfortable → buttonHeightXLarge (56dp)
enum TableDensity {
  compact('Compact'),
  standard('Standard'),
  comfortable('Comfortable');

  final String label;

  const TableDensity(this.label);

  /// Get the row height from AppSizes based on density
  /// Uses the context-aware responsive sizing system
  double getRowHeight(AppSizes sizes) => switch (this) {
    TableDensity.compact => sizes.buttonHeightCompact,
    TableDensity.standard => sizes.buttonHeightMedium,
    TableDensity.comfortable => sizes.buttonHeightXLarge,
  };
}

/// Table behavioral constants
///
/// These define DATA constraints and BEHAVIOR, not visual styling.
class TableConfig {
  TableConfig._();

  // ============================================================================
  // DATA CONSTRAINTS - How much data to show
  // ============================================================================

  /// Maximum visible rows before scrolling
  static const int maxVisibleRows = 10;

  /// Default items per page for pagination
  static const int defaultPageSize = 25;

  /// Available page size options
  static const List<int> pageSizeOptions = [10, 25, 50, 100];

  // ============================================================================
  // COLUMN CONSTRAINTS - Column behavior
  // ============================================================================

  /// Minimum column width (prevents squishing)
  static const double cellMinWidth = 80.0;

  /// Maximum column width (prevents sprawl)
  static const double cellMaxWidth = 300.0;

  /// Default column width
  static const double defaultColumnWidth = 150.0;

  // ============================================================================
  // ACTION BEHAVIOR - How actions work
  // ============================================================================

  /// Maximum inline actions in hybrid mode before overflow
  static const int maxInlineActions = 2;

  /// Icon size ratio relative to button size (0.6 = 60%)
  static const double iconSizeRatio = 0.6;

  /// Overflow icon size ratio (smaller, 0.5 = 50%)
  static const double overflowIconSizeRatio = 0.5;
}
