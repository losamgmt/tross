// Web-specific browser origin getter
import 'package:web/web.dart' as web;

/// Get the current browser origin (e.g., https://preview-abc.vercel.app)
/// Returns the window.location.origin on web platforms
String getBrowserOrigin() {
  try {
    return web.window.location.origin;
  } catch (_) {
    // Fallback if not in browser context
    return '';
  }
}
