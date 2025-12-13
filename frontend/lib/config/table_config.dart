/// Table Configuration Constants
///
/// Defines sizing constraints and behavior for data tables.
/// All sizing uses constraints (min/max) rather than fixed values.
/// Actual widths are determined by content via IntrinsicColumnWidth.
library;

class TableConfig {
  // ============================================================
  // ROW CONSTRAINTS
  // ============================================================

  /// Maximum visible rows before vertical scrolling kicks in
  static const int maxVisibleRows = 10;

  /// Maximum height for scrollable body area
  static const double maxBodyHeight = 400.0;

  // ============================================================
  // COLUMN CELL CONSTRAINTS
  // ============================================================

  /// Minimum width for any data cell (prevents squishing)
  static const double cellMinWidth = 80.0;

  /// Maximum width for any data cell (forces text wrap)
  static const double cellMaxWidth = 300.0;

  /// Default column width (used as starting point for resizable columns)
  static const double defaultColumnWidth = 150.0;

  /// Fixed width for actions column (buttons need consistent space)
  static const double actionsColumnWidth = 120.0;

  // ============================================================
  // RESIZE HANDLE
  // ============================================================

  /// Width of the resize drag handle area
  static const double resizeHandleWidth = 8.0;

  /// Visual indicator width (the line users see)
  static const double resizeIndicatorWidth = 2.0;

  // ============================================================
  // PRIVATE - No external access to implementation details
  // ============================================================

  TableConfig._(); // Prevent instantiation
}
