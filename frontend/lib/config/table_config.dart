/// Table Configuration Constants
library;

import 'platform_utilities.dart';

/// Table row density options
enum TableDensity {
  compact(28.0, 'Compact'),
  standard(40.0, 'Standard'),
  comfortable(56.0, 'Comfortable');

  final double rowHeight;
  final String label;

  const TableDensity(this.rowHeight, this.label);
}

/// Table sizing constants
class TableConfig {
  TableConfig._();

  // Row constraints
  static const int maxVisibleRows = 10;
  static const double maxBodyHeight = 400.0;

  // Column constraints
  static const double cellMinWidth = 80.0;
  static const double cellMaxWidth = 300.0;
  static const double defaultColumnWidth = 150.0;

  // Resize handle (platform-aware)
  static double get resizeHandleWidth =>
      PlatformUtilities.adaptiveSize(pointer: 8, touch: 48);
  static const double resizeIndicatorWidth = 2.0;
}
