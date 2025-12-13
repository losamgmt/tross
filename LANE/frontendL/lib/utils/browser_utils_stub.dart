// Stub for non-web platforms (VM, iOS, Android, etc.)
// Provides browser utility functions that only work on web

class BrowserUtils {
  /// Replace browser history state (web only)
  static void replaceHistoryState(String url) {
    // No-op on non-web platforms
  }

  /// Setup navigation guard (web only)
  static void setupNavigationGuard() {
    // No-op on non-web platforms
  }

  /// Disable context menu (web only)
  static void disableContextMenu() {
    // No-op on non-web platforms
  }

  /// Setup refresh warning (web only)
  static void setupRefreshWarning({bool enabled = true}) {
    // No-op on non-web platforms
  }

  /// Reload the current page (web only)
  static void reloadPage() {
    // No-op on non-web platforms - cannot reload native apps
  }
}
