/// Export Service - Platform-aware conditional import
///
/// Uses conditional imports to provide:
/// - Web: Full export functionality with browser download
/// - Non-web: Stub implementation (tests, mobile, desktop)
library;

export 'export_service_stub.dart'
    if (dart.library.js_interop) 'export_service_web.dart';
