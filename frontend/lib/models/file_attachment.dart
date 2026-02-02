/// FileAttachment - Model for file attachment metadata
///
/// Represents a file attached to an entity.
/// Includes download URL (always present) and expiry timestamp.
library;

import '../utils/helpers/mime_helper.dart';

/// A file attachment metadata record with download URL
class FileAttachment {
  final int id;
  final String entityType;
  final int entityId;
  final String originalFilename;
  final String mimeType;
  final int fileSize;
  final String category;
  final String? description;
  final int? uploadedBy;
  final DateTime createdAt;

  /// Signed download URL (always present)
  final String downloadUrl;

  /// When the download URL expires (always present)
  final DateTime downloadUrlExpiresAt;

  const FileAttachment({
    required this.id,
    required this.entityType,
    required this.entityId,
    required this.originalFilename,
    required this.mimeType,
    required this.fileSize,
    required this.category,
    this.description,
    this.uploadedBy,
    required this.createdAt,
    required this.downloadUrl,
    required this.downloadUrlExpiresAt,
  });

  factory FileAttachment.fromJson(Map<String, dynamic> json) {
    return FileAttachment(
      id: json['id'] as int,
      entityType: json['entity_type'] as String,
      entityId: json['entity_id'] as int,
      originalFilename: json['original_filename'] as String,
      mimeType: json['mime_type'] as String,
      fileSize: json['file_size'] as int,
      category: json['category'] as String? ?? 'attachment',
      description: json['description'] as String?,
      uploadedBy: json['uploaded_by'] as int?,
      createdAt: DateTime.parse(json['created_at'] as String),
      downloadUrl: json['download_url'] as String,
      downloadUrlExpiresAt: DateTime.parse(
        json['download_url_expires_at'] as String,
      ),
    );
  }

  /// Human-readable file size
  String get fileSizeFormatted {
    if (fileSize < 1024) return '$fileSize B';
    if (fileSize < 1024 * 1024) {
      return '${(fileSize / 1024).toStringAsFixed(1)} KB';
    }
    return '${(fileSize / (1024 * 1024)).toStringAsFixed(1)} MB';
  }

  /// Check if this is an image
  bool get isImage => MimeHelper.isImage(mimeType);

  /// Check if this is a PDF
  bool get isPdf => MimeHelper.isPdf(mimeType);

  /// Get file extension from filename
  String get extension => MimeHelper.getExtension(originalFilename);

  /// Check if the download URL is expired or will expire soon (within 5 minutes)
  bool get isDownloadUrlExpired {
    final now = DateTime.now();
    final buffer = const Duration(minutes: 5);
    return downloadUrlExpiresAt.isBefore(now.add(buffer));
  }
}
