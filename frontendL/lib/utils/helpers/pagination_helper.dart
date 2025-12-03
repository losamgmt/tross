/// PaginationHelper - Pure calculation functions for pagination
///
/// SINGLE RESPONSIBILITY: Calculate pagination values
/// NO rendering, NO state management - just pure math!
///
/// Used by organisms to compute pagination data before passing to molecules
library;

class PaginationHelper {
  /// Calculate start item number for current page
  ///
  /// Example: page 2, 10 items per page = item 11 (start)
  static int calculateStartItem(int currentPage, int itemsPerPage) {
    return (currentPage - 1) * itemsPerPage + 1;
  }

  /// Calculate end item number for current page
  ///
  /// Example: page 2, 10 items per page, 25 total = item 20 (end)
  /// Clamps to total items to avoid showing "item 30 of 25"
  static int calculateEndItem(
    int currentPage,
    int itemsPerPage,
    int totalItems,
  ) {
    final rawEnd = currentPage * itemsPerPage;
    return rawEnd > totalItems ? totalItems : rawEnd;
  }

  /// Calculate total pages needed
  ///
  /// Example: 25 items, 10 per page = 3 pages
  static int calculateTotalPages(int totalItems, int itemsPerPage) {
    if (itemsPerPage <= 0) return 0;
    return (totalItems / itemsPerPage).ceil();
  }

  /// Check if previous page button should be enabled
  static bool canGoPrevious(int currentPage) {
    return currentPage > 1;
  }

  /// Check if next page button should be enabled
  static bool canGoNext(int currentPage, int totalPages) {
    return currentPage < totalPages;
  }

  /// Get page range for display (e.g., "1-10 of 100")
  static String getPageRangeText(
    int currentPage,
    int itemsPerPage,
    int totalItems,
  ) {
    if (totalItems == 0) return '0 of 0';

    final start = calculateStartItem(currentPage, itemsPerPage);
    final end = calculateEndItem(currentPage, itemsPerPage, totalItems);
    return '$start-$end of $totalItems';
  }
}
