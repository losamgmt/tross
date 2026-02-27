/// File Attachment Service - Generic file upload/download for any entity
///
/// SOLE RESPONSIBILITY: Upload, list, get, delete file attachments
///
/// URL PATTERN: /api/:tableName/:id/files[/:fileId]
/// - Uses tableName (plural) from entity metadata for URLs
/// - Uses entityKey (singular) for storage (entity_type column)
///
/// USAGE:
/// ```dart
/// // Get from Provider
/// final fileService = context.read<FileService>();
///
/// // Upload a file to a work order
/// final attachment = await fileService.uploadFile(
///   entityKey: 'work_order',  // singular
///   entityId: 123,
///   bytes: fileBytes,
///   filename: 'photo.jpg',
///   category: 'before_photo', // optional
/// );
///
/// // List files for an entity
/// final files = await fileService.listFiles(
///   entityKey: 'work_order',
///   entityId: 123,
/// );
///
/// // Get single file (with fresh download URL)
/// final file = await fileService.getFile(
///   entityKey: 'work_order',
///   entityId: 123,
///   fileId: 42,
/// );
///
/// // Delete a file
/// await fileService.deleteFile(
///   entityKey: 'work_order',
///   entityId: 123,
///   fileId: 42,
/// );
/// ```
///
/// TESTING:
/// ```dart
/// // Use MockTokenProvider for unit tests
/// final service = FileService(mockApiClient, MockTokenProvider());
/// ```
library;

import 'dart:convert';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import '../config/app_config.dart';
import '../models/file_attachment.dart';
import '../utils/helpers/mime_helper.dart';
import 'api/api_client.dart';
import 'auth/token_provider.dart';
import 'entity_metadata.dart';
import 'error_service.dart';

// =============================================================================
// SERVICE
// =============================================================================

/// File Service - file operations with DI
class FileService {
  /// API client for HTTP requests - injected via constructor
  final ApiClient _apiClient;

  /// Token provider for authentication - injectable for testing
  final TokenProvider _tokenProvider;

  /// Constructor - requires ApiClient injection, optional TokenProvider
  ///
  /// In production, uses DefaultTokenProvider (flutter_secure_storage).
  /// In tests, inject MockTokenProvider for full testability.
  FileService(this._apiClient, [TokenProvider? tokenProvider])
    : _tokenProvider = tokenProvider ?? DefaultTokenProvider();

  /// Get the tableName (plural) from entityKey (singular) via metadata registry
  String _getTableName(String entityKey) {
    final metadata = EntityMetadataRegistry.tryGet(entityKey);
    if (metadata == null) {
      throw Exception('Unknown entity: $entityKey');
    }
    return metadata.tableName;
  }

  /// Build the base path for file operations: /api/:tableName/:id/files
  String _buildFilesPath(String entityKey, int entityId) {
    final tableName = _getTableName(entityKey);
    return '/$tableName/$entityId/files';
  }

  // ===========================================================================
  // UPLOAD
  // ===========================================================================

  /// Upload a file to an entity
  ///
  /// Returns the created FileAttachment metadata (includes download URL).
  /// Uses raw binary upload with headers for metadata.
  ///
  /// NOTE: Uses raw http instead of ApiClient for binary body upload.
  Future<FileAttachment> uploadFile({
    required String entityKey,
    required int entityId,
    required Uint8List bytes,
    required String filename,
    String category = 'attachment',
    String? description,
  }) async {
    final token = await _tokenProvider.getToken();
    if (token == null) {
      throw Exception('Not authenticated');
    }

    final mimeType = MimeHelper.getMimeType(filename);
    final filesPath = _buildFilesPath(entityKey, entityId);
    final url = Uri.parse('${AppConfig.baseUrl}$filesPath');

    // NOTE: Cannot use ApiClient for binary upload - uses raw http
    final response = await http.post(
      url,
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': mimeType,
        'X-Filename': filename,
        'X-Category': category,
        'X-Description': ?description,
      },
      body: bytes,
    );

    return _handleUploadResponse(response, entityKey, entityId);
  }

  FileAttachment _handleUploadResponse(
    http.Response response,
    String entityKey,
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
          context: {'entityKey': entityKey, 'entityId': entityId},
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
  /// Each file includes a download URL (valid for 1 hour).
  Future<List<FileAttachment>> listFiles({
    required String entityKey,
    required int entityId,
    String? category,
  }) async {
    final token = await _tokenProvider.getToken();
    if (token == null) {
      throw Exception('Not authenticated');
    }

    var endpoint = _buildFilesPath(entityKey, entityId);
    if (category != null) {
      endpoint += '?category=${Uri.encodeComponent(category)}';
    }

    final response = await _apiClient.authenticatedRequest(
      'GET',
      endpoint,
      token: token,
    );

    return _handleListResponse(response, entityKey, entityId);
  }

  List<FileAttachment> _handleListResponse(
    http.Response response,
    String entityKey,
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
          context: {'entityKey': entityKey, 'entityId': entityId},
        );
        throw Exception(errorMsg);
    }
  }

  // ===========================================================================
  // GET SINGLE FILE
  // ===========================================================================

  /// Get a single file with fresh download URL
  ///
  /// Use this when a file's download URL may have expired.
  /// Returns the file with a new 1-hour download URL.
  Future<FileAttachment> getFile({
    required String entityKey,
    required int entityId,
    required int fileId,
  }) async {
    final token = await _tokenProvider.getToken();
    if (token == null) {
      throw Exception('Not authenticated');
    }

    final endpoint = '${_buildFilesPath(entityKey, entityId)}/$fileId';

    final response = await _apiClient.authenticatedRequest(
      'GET',
      endpoint,
      token: token,
    );

    return _handleGetFileResponse(response, fileId);
  }

  FileAttachment _handleGetFileResponse(http.Response response, int fileId) {
    switch (response.statusCode) {
      case 200:
        final json = jsonDecode(response.body) as Map<String, dynamic>;
        return FileAttachment.fromJson(json['data'] as Map<String, dynamic>);
      case 401:
        throw Exception('Authentication required');
      case 403:
        throw Exception('Permission denied');
      case 404:
        throw Exception('File not found');
      default:
        final errorMsg = _parseError(response);
        ErrorService.logError(
          '[FileService] Get file failed',
          context: {'fileId': fileId},
        );
        throw Exception(errorMsg);
    }
  }

  // ===========================================================================
  // DELETE
  // ===========================================================================

  /// Delete a file (soft delete)
  Future<void> deleteFile({
    required String entityKey,
    required int entityId,
    required int fileId,
  }) async {
    final token = await _tokenProvider.getToken();
    if (token == null) {
      throw Exception('Not authenticated');
    }

    final endpoint = '${_buildFilesPath(entityKey, entityId)}/$fileId';

    final response = await _apiClient.authenticatedRequest(
      'DELETE',
      endpoint,
      token: token,
    );

    _handleDeleteResponse(response, fileId);
  }

  void _handleDeleteResponse(http.Response response, int fileId) {
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
  String _parseError(http.Response response) {
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
