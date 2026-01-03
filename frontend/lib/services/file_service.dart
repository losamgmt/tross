/// File Attachment Service - Generic file upload/download for any entity
///
/// SOLE RESPONSIBILITY: Upload, list, download, delete file attachments
///
/// GENERIC PATTERN: Same as audit_log_service - entity_type + entity_id
///
/// USAGE:
/// ```dart
/// // Upload a file to a work order
/// final attachment = await FileService.uploadFile(
///   entityType: 'work_order',
///   entityId: 123,
///   bytes: fileBytes,
///   filename: 'photo.jpg',
///   category: 'before_photo', // optional
/// );
///
/// // List files for an entity
/// final files = await FileService.listFiles(
///   entityType: 'work_order',
///   entityId: 123,
/// );
///
/// // Get download URL
/// final info = await FileService.getDownloadUrl(fileId: 42);
///
/// // Delete a file
/// await FileService.deleteFile(fileId: 42);
/// ```
library;

import 'dart:convert';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import '../config/app_config.dart';
import '../models/file_attachment.dart';
import '../utils/helpers/mime_helper.dart';
import 'api_client.dart';
import 'auth/token_manager.dart';
import 'error_service.dart';

// =============================================================================
// SERVICE
// =============================================================================

/// File Service - static methods for file operations
class FileService {
  FileService._(); // Private constructor - static class only

  static const String _basePath = '/files';

  // ===========================================================================
  // UPLOAD
  // ===========================================================================

  /// Upload a file to an entity
  ///
  /// Returns the created FileAttachment metadata.
  /// Uses raw binary upload with headers for metadata.
  ///
  /// NOTE: Uses raw http instead of ApiClient for binary body upload.
  static Future<FileAttachment> uploadFile({
    required String entityType,
    required int entityId,
    required Uint8List bytes,
    required String filename,
    String category = 'attachment',
    String? description,
  }) async {
    final token = await TokenManager.getStoredToken();
    if (token == null) {
      throw Exception('Not authenticated');
    }

    final mimeType = MimeHelper.getMimeType(filename);
    final url = Uri.parse(
      '${AppConfig.baseUrl}$_basePath/$entityType/$entityId',
    );

    // NOTE: Cannot use ApiClient for binary upload - uses raw http
    final response = await http.post(
      url,
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': mimeType,
        'X-Filename': filename,
        'X-Category': category,
        if (description != null) 'X-Description': description,
      },
      body: bytes,
    );

    return _handleUploadResponse(response, entityType, entityId);
  }

  static FileAttachment _handleUploadResponse(
    http.Response response,
    String entityType,
    int entityId,
  ) {
    switch (response.statusCode) {
      case 201:
        final json = jsonDecode(response.body) as Map<String, dynamic>;
        return FileAttachment.fromJson(json['data'] as Map<String, dynamic>);
      case 401:
        throw Exception('Authentication required');
      case 403:
        throw Exception('Permission denied');
      case 413:
        throw Exception('File too large');
      default:
        final errorMsg = _parseError(response);
        ErrorService.logError(
          '[FileService] Upload failed',
          context: {'entityType': entityType, 'entityId': entityId},
        );
        throw Exception(errorMsg);
    }
  }

  // ===========================================================================
  // LIST
  // ===========================================================================

  /// List files attached to an entity
  ///
  /// Optionally filter by category.
  static Future<List<FileAttachment>> listFiles({
    required String entityType,
    required int entityId,
    String? category,
  }) async {
    final token = await TokenManager.getStoredToken();
    if (token == null) {
      throw Exception('Not authenticated');
    }

    var endpoint = '$_basePath/$entityType/$entityId';
    if (category != null) {
      endpoint += '?category=${Uri.encodeComponent(category)}';
    }

    final response = await ApiClient.authenticatedRequest(
      'GET',
      endpoint,
      token: token,
    );

    return _handleListResponse(response, entityType, entityId);
  }

  static List<FileAttachment> _handleListResponse(
    http.Response response,
    String entityType,
    int entityId,
  ) {
    switch (response.statusCode) {
      case 200:
        final json = jsonDecode(response.body) as Map<String, dynamic>;
        final data = json['data'] as List<dynamic>;
        return data
            .map(
              (item) => FileAttachment.fromJson(item as Map<String, dynamic>),
            )
            .toList();
      case 401:
        throw Exception('Authentication required');
      case 403:
        throw Exception('Permission denied');
      default:
        final errorMsg = _parseError(response);
        ErrorService.logError(
          '[FileService] List failed',
          context: {'entityType': entityType, 'entityId': entityId},
        );
        throw Exception(errorMsg);
    }
  }

  // ===========================================================================
  // DOWNLOAD
  // ===========================================================================

  /// Get a signed download URL for a file
  ///
  /// URL is valid for 1 hour.
  static Future<FileDownloadInfo> getDownloadUrl({required int fileId}) async {
    final token = await TokenManager.getStoredToken();
    if (token == null) {
      throw Exception('Not authenticated');
    }

    final response = await ApiClient.authenticatedRequest(
      'GET',
      '$_basePath/$fileId/download',
      token: token,
    );

    return _handleDownloadResponse(response, fileId);
  }

  static FileDownloadInfo _handleDownloadResponse(
    http.Response response,
    int fileId,
  ) {
    switch (response.statusCode) {
      case 200:
        final json = jsonDecode(response.body) as Map<String, dynamic>;
        return FileDownloadInfo.fromJson(json['data'] as Map<String, dynamic>);
      case 401:
        throw Exception('Authentication required');
      case 403:
        throw Exception('Permission denied');
      case 404:
        throw Exception('File not found');
      default:
        final errorMsg = _parseError(response);
        ErrorService.logError(
          '[FileService] Download URL failed',
          context: {'fileId': fileId},
        );
        throw Exception(errorMsg);
    }
  }

  // ===========================================================================
  // DELETE
  // ===========================================================================

  /// Delete a file (soft delete)
  static Future<void> deleteFile({required int fileId}) async {
    final token = await TokenManager.getStoredToken();
    if (token == null) {
      throw Exception('Not authenticated');
    }

    final response = await ApiClient.authenticatedRequest(
      'DELETE',
      '$_basePath/$fileId',
      token: token,
    );

    _handleDeleteResponse(response, fileId);
  }

  static void _handleDeleteResponse(http.Response response, int fileId) {
    switch (response.statusCode) {
      case 200:
        return;
      case 401:
        throw Exception('Authentication required');
      case 403:
        throw Exception('Permission denied');
      case 404:
        throw Exception('File not found');
      default:
        final errorMsg = _parseError(response);
        ErrorService.logError(
          '[FileService] Delete failed',
          context: {'fileId': fileId},
        );
        throw Exception(errorMsg);
    }
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  /// Parse error message from response
  static String _parseError(http.Response response) {
    try {
      final json = jsonDecode(response.body) as Map<String, dynamic>;
      return json['error'] as String? ??
          json['message'] as String? ??
          'Unknown error';
    } catch (_) {
      return 'Server error (${response.statusCode})';
    }
  }
}
