// Web-specific browser utilities
import 'dart:js_interop';
import 'package:web/web.dart' as web;

class BrowserUtils {
  /// Replace browser history state (removes query parameters from URL)
  static void replaceHistoryState(String url) {
    web.window.history.replaceState(null, '', url);
  }

  /// Prevent browser back/forward from breaking SPA state
  /// This intercepts browser navigation and handles it within Flutter's router
  static void setupNavigationGuard() {
    // Listen to browser back/forward button
    web.window.onpopstate = (web.Event event) {
      // Prevent default browser navigation behavior
      // Flutter's router will handle navigation instead
      event.preventDefault();
    }.toJS;

    // Add a history entry to prevent accidental back navigation
    // This creates a "buffer" that catches the first back button press
    web.window.history.pushState(null, '', web.window.location.href);
  }

  /// Disable browser context menu (right-click) - optional for production
  static void disableContextMenu() {
    web.window.oncontextmenu = (web.Event event) {
      event.preventDefault();
      return false.toJS;
    }.toJS;
  }

  /// Prevent accidental refresh with unsaved changes
  static void setupRefreshWarning({bool enabled = true}) {
    if (enabled) {
      web.window.onbeforeunload = (web.Event event) {
        // Modern browsers ignore custom messages, but this still shows a warning
        event.preventDefault();
        return ''.toJS;
      }.toJS;
    } else {
      // Remove the warning
      web.window.onbeforeunload = null;
    }
  }

  /// Reload the current page (for error recovery)
  static void reloadPage() {
    web.window.location.reload();
  }
}
