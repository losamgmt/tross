// Stub for non-web platforms (VM, iOS, Android, etc.)
// Provides browser origin getter that only works on web

/// Get the current browser origin
/// Returns empty string on non-web platforms (fallback handled by caller)
String getBrowserOrigin() {
  // Not in browser context on non-web platforms
  return '';
}
