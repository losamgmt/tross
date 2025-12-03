/// Table Configuration Constants
///
/// Defines default sizing and behavior for data tables across the app
library;

class TableConfig {
  /// Maximum number of rows to display before enabling internal scrolling
  /// Tables with fewer rows will size to fit content exactly
  static const int maxVisibleRows = 10;

  /// Approximate height per row (header + data row average)
  /// Used for dynamic height calculation
  static const double headerHeight = 56.0;
  static const double rowHeight = 52.0;
  static const double tablePadding = 10.0; // Border + visual spacing

  /// Calculate dynamic table height based on row count
  /// Returns null for tables exceeding maxVisibleRows (use Expanded instead)
  static double? calculateTableHeight(int rowCount) {
    if (rowCount > maxVisibleRows) {
      // Table exceeds max - use fixed height for internal scrolling
      return headerHeight + (rowHeight * maxVisibleRows) + tablePadding;
    }
    // Table fits - size exactly to content
    return headerHeight + (rowHeight * rowCount) + tablePadding;
  }

  /// Minimum table height (header + 1 empty row)
  static double get minTableHeight => headerHeight + rowHeight + tablePadding;
}
