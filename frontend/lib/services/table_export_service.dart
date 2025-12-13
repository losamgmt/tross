/// TableExportService - Export table data to CSV/JSON
///
/// SINGLE RESPONSIBILITY: Convert entity data to exportable formats
///
/// Supports:
/// - CSV export
/// - JSON export
/// - Metadata-driven column selection
/// - Custom formatters
///
/// Usage:
/// ```dart
/// final csv = TableExportService.toCsv(
///   entityName: 'user',
///   data: users,
///   columns: ['email', 'first_name', 'last_name', 'status'],
/// );
///
/// // Download on web
/// TableExportService.downloadCsv('users.csv', csv);
/// ```
library;

import 'dart:convert';
import '../services/entity_metadata.dart';

/// Export format options
enum ExportFormat { csv, json }

/// Table export service
class TableExportService {
  TableExportService._();

  /// Convert entity data to CSV string
  ///
  /// [entityName] - Entity type for metadata lookup
  /// [data] - List of entity maps to export
  /// [columns] - Columns to include (null = all)
  /// [includeHeader] - Whether to include header row
  /// [formatters] - Custom value formatters by field name
  static String toCsv({
    required String entityName,
    required List<Map<String, dynamic>> data,
    List<String>? columns,
    bool includeHeader = true,
    Map<String, String Function(dynamic)>? formatters,
  }) {
    if (data.isEmpty) return '';

    final metadata = EntityMetadataRegistry.get(entityName);
    final cols = columns ?? _getDefaultColumns(metadata);
    final buffer = StringBuffer();

    // Header row
    if (includeHeader) {
      buffer.writeln(cols.map(_fieldToHeader).join(','));
    }

    // Data rows
    for (final row in data) {
      final values = cols.map((col) {
        final value = row[col];
        final formatter = formatters?[col];
        return _formatCsvValue(value, formatter);
      });
      buffer.writeln(values.join(','));
    }

    return buffer.toString();
  }

  /// Convert entity data to JSON string
  ///
  /// [data] - List of entity maps to export
  /// [columns] - Columns to include (null = all)
  /// [prettyPrint] - Whether to format with indentation
  static String toJson({
    required List<Map<String, dynamic>> data,
    List<String>? columns,
    bool prettyPrint = true,
  }) {
    final exportData = columns != null
        ? data
              .map(
                (row) => Map.fromEntries(
                  columns
                      .where((c) => row.containsKey(c))
                      .map((c) => MapEntry(c, row[c])),
                ),
              )
              .toList()
        : data;

    if (prettyPrint) {
      return const JsonEncoder.withIndent('  ').convert(exportData);
    }
    return jsonEncode(exportData);
  }

  /// Generate export filename
  static String generateFilename(
    String entityName,
    ExportFormat format, {
    bool includeTimestamp = true,
  }) {
    final metadata = EntityMetadataRegistry.get(entityName);
    final baseName = metadata.displayNamePlural.toLowerCase().replaceAll(
      ' ',
      '_',
    );
    final extension = format == ExportFormat.csv ? 'csv' : 'json';

    if (includeTimestamp) {
      final timestamp = DateTime.now().toIso8601String().split('T')[0];
      return '${baseName}_$timestamp.$extension';
    }
    return '$baseName.$extension';
  }

  /// Get default columns for export (all non-system fields)
  static List<String> _getDefaultColumns(EntityMetadata metadata) {
    return metadata.fields.keys
        .where((f) => f != 'created_at' && f != 'updated_at')
        .toList();
  }

  /// Convert field name to header label
  static String _fieldToHeader(String fieldName) {
    final label = fieldName
        .split('_')
        .map((w) => w.isEmpty ? '' : '${w[0].toUpperCase()}${w.substring(1)}')
        .join(' ');
    // Escape if contains comma
    return label.contains(',') ? '"$label"' : label;
  }

  /// Format a value for CSV output
  static String _formatCsvValue(
    dynamic value,
    String Function(dynamic)? formatter,
  ) {
    if (value == null) return '';

    String stringValue;
    if (formatter != null) {
      stringValue = formatter(value);
    } else if (value is DateTime) {
      stringValue = value.toIso8601String();
    } else if (value is bool) {
      stringValue = value ? 'Yes' : 'No';
    } else if (value is Map || value is List) {
      stringValue = jsonEncode(value);
    } else {
      stringValue = value.toString();
    }

    // Escape special characters
    if (stringValue.contains(',') ||
        stringValue.contains('"') ||
        stringValue.contains('\n')) {
      stringValue = '"${stringValue.replaceAll('"', '""')}"';
    }

    return stringValue;
  }

  /// Create a data URI for downloading (works on web)
  static String createDataUri(String content, String mimeType) {
    final bytes = utf8.encode(content);
    final base64Content = base64Encode(bytes);
    return 'data:$mimeType;base64,$base64Content';
  }

  /// Get MIME type for format
  static String getMimeType(ExportFormat format) {
    return switch (format) {
      ExportFormat.csv => 'text/csv',
      ExportFormat.json => 'application/json',
    };
  }
}
