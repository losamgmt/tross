/// Export Service - Handles CSV exports from the backend
///
/// Provides methods to:
/// - Get available exportable fields for an entity
/// - Download CSV exports with current filters applied
///
/// Uses the backend export API which:
/// - Respects RLS/permissions (only exports data user can see)
/// - Returns full query results (not paginated)
/// - Excludes sensitive fields automatically
library;

import 'dart:convert';
import 'dart:js_interop';
import 'dart:typed_data';
import 'package:web/web.dart' as web;
import 'package:http/http.dart' as http;
import '../config/app_config.dart';
import 'api_client.dart';
import 'auth/token_manager.dart';
import 'error_service.dart';

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

/// Service for exporting entity data as CSV
class ExportService {
  ExportService._(); // Private constructor - static class only

  /// Get list of exportable fields for an entity
  ///
  /// Returns field metadata that can be used to let users
  /// select which fields to include in the export
  static Future<List<ExportField>> getExportableFields(
    String entityName,
  ) async {
    try {
      final token = await TokenManager.getStoredToken();
      if (token == null) {
        throw Exception('Not authenticated');
      }

      final response = await ApiClient.authenticatedRequest(
        'GET',
        '/export/$entityName/fields',
        token: token,
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final fieldsList = data['data']['fields'] as List;
        return fieldsList
            .map((f) => ExportField.fromJson(f as Map<String, dynamic>))
            .toList();
      } else {
        final error = json.decode(response.body);
        throw Exception(error['message'] ?? 'Failed to get exportable fields');
      }
    } catch (e) {
      ErrorService.logError(
        'Failed to get exportable fields',
        error: e,
        context: {'entity': entityName},
      );
      rethrow;
    }
  }

  /// Export entity data as CSV and trigger download
  ///
  /// [entityName] - The entity to export (e.g., 'workOrders', 'users')
  /// [filters] - Optional filter parameters to apply (same as list query)
  /// [selectedFields] - Optional list of field names to include
  ///
  /// Returns true if download was initiated successfully
  ///
  /// NOTE: Uses raw http instead of ApiClient for:
  /// - Custom Accept header (text/csv)
  /// - Extended 2-minute timeout for large exports
  /// - Access to bodyBytes for binary download
  static Future<bool> exportToCsv({
    required String entityName,
    Map<String, dynamic>? filters,
    List<String>? selectedFields,
  }) async {
    try {
      final token = await TokenManager.getStoredToken();
      if (token == null) {
        throw Exception('Not authenticated');
      }

      // Build query parameters
      final queryParams = <String, String>{};

      if (filters != null) {
        for (final entry in filters.entries) {
          if (entry.value != null) {
            queryParams[entry.key] = entry.value.toString();
          }
        }
      }

      if (selectedFields != null && selectedFields.isNotEmpty) {
        queryParams['fields'] = selectedFields.join(',');
      }

      final uri = Uri.parse(
        '${AppConfig.baseUrl}/export/$entityName',
      ).replace(queryParameters: queryParams.isNotEmpty ? queryParams : null);

      final response = await http
          .get(
            uri,
            headers: {'Authorization': 'Bearer $token', 'Accept': 'text/csv'},
          )
          .timeout(
            const Duration(minutes: 2),
          ); // Longer timeout for large exports

      if (response.statusCode == 200) {
        // Get filename from Content-Disposition header or generate default
        final contentDisposition = response.headers['content-disposition'];
        String filename =
            _extractFilename(contentDisposition) ??
            '${entityName}_export_${DateTime.now().toIso8601String().split('T')[0]}.csv';

        // Trigger browser download
        _downloadFile(response.bodyBytes, filename, 'text/csv');

        ErrorService.logInfo(
          'CSV export completed',
          context: {'entity': entityName, 'filename': filename},
        );

        return true;
      } else {
        // Try to parse error message
        String errorMessage = 'Export failed';
        try {
          final error = json.decode(response.body);
          errorMessage = error['message'] ?? errorMessage;
        } catch (_) {
          errorMessage = 'Export failed with status ${response.statusCode}';
        }
        throw Exception(errorMessage);
      }
    } catch (e) {
      ErrorService.logError(
        'CSV export failed',
        error: e,
        context: {'entity': entityName},
      );
      rethrow;
    }
  }

  /// Extract filename from Content-Disposition header
  static String? _extractFilename(String? contentDisposition) {
    if (contentDisposition == null) return null;

    // Parse: attachment; filename="workOrders_export.csv"
    final filenameMatch = RegExp(
      r'filename="?([^";\s]+)"?',
    ).firstMatch(contentDisposition);
    return filenameMatch?.group(1);
  }

  /// Trigger browser file download using modern web APIs
  static void _downloadFile(List<int> bytes, String filename, String mimeType) {
    // Create a blob from the bytes - convert to Uint8List for proper JSUint8Array conversion
    final uint8List = Uint8List.fromList(bytes);
    final blob = web.Blob(
      [uint8List.toJS].toJS,
      web.BlobPropertyBag(type: mimeType),
    );

    // Create object URL
    final url = web.URL.createObjectURL(blob);

    // Create anchor element and trigger download
    final anchor = web.document.createElement('a') as web.HTMLAnchorElement;
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = 'none';

    web.document.body?.appendChild(anchor);
    anchor.click();
    web.document.body?.removeChild(anchor);

    // Clean up object URL
    web.URL.revokeObjectURL(url);
  }
}
