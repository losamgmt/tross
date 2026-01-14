/// Export Service Stub - Non-web platforms
///
/// Provides a no-op implementation for platforms that don't support web APIs.
/// Real implementation is in export_service_web.dart
library;

// ignore: unused_import
import 'api/api_client.dart';
import 'auth/token_provider.dart';

/// Field metadata for export configuration
class ExportField {
  final String name;
  final String label;

  const ExportField({required this.name, required this.label});

  factory ExportField.fromJson(Map<String, dynamic> json) {
    return ExportField(
      name: json['name'] as String,
      label: json['label'] as String,
    );
  }
}

/// Stub service for non-web platforms
class ExportService {
  // ignore: unused_field
  final ApiClient _apiClient;
  // ignore: unused_field
  final TokenProvider _tokenProvider;

  ExportService(this._apiClient, [TokenProvider? tokenProvider])
    : _tokenProvider = tokenProvider ?? DefaultTokenProvider();

  /// Get available fields for export - returns empty list on non-web
  Future<List<ExportField>> getExportableFields(String entityName) async {
    // Not available on non-web platforms
    return [];
  }

  /// Export to CSV - no-op on non-web platforms
  /// Matches the interface of export_service_web.dart
  Future<bool> exportToCsv({
    required String entityName,
    Map<String, dynamic>? filters,
    List<String>? selectedFields,
  }) async {
    // CSV export requires web APIs - not available on this platform
    throw UnsupportedError('CSV export is only supported on web platform');
  }
}
