/// API Services - Barrel Export
///
/// Exports the API client interface and implementations.
///
/// Usage:
/// ```dart
/// import 'package:tross_app/services/api/api.dart';
///
/// // In production (via Provider)
/// final api = context.read<ApiClient>();
/// ```
library;

export 'api_client.dart';
export 'http_api_client.dart';
