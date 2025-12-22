/// MimeHelper - MIME type utilities
///
/// ZERO DEPENDENCIES - Pure functions only
/// SRP: MIME type detection and file categorization
library;

/// MIME type detection and file categorization utilities
class MimeHelper {
  MimeHelper._(); // Private constructor - static class only

  /// Map of file extensions to MIME types
  static const Map<String, String> _extensionToMime = {
    // Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    'bmp': 'image/bmp',
    // Documents
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx':
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Text
    'txt': 'text/plain',
    'csv': 'text/csv',
    'html': 'text/html',
    'css': 'text/css',
    'js': 'text/javascript',
    'json': 'application/json',
    'xml': 'application/xml',
    // Archives
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed',
    'tar': 'application/x-tar',
    'gz': 'application/gzip',
    // Audio
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    // Video
    'mp4': 'video/mp4',
    'avi': 'video/x-msvideo',
    'mov': 'video/quicktime',
  };

  /// Get MIME type from filename
  ///
  /// Extracts extension from filename and returns corresponding MIME type.
  /// Returns 'application/octet-stream' for unknown types.
  ///
  /// Examples:
  ///   getMimeType('photo.jpg') => 'image/jpeg'
  ///   getMimeType('document.pdf') => 'application/pdf'
  ///   getMimeType('unknown.xyz') => 'application/octet-stream'
  static String getMimeType(String filename) {
    final extension = getExtension(filename);
    return _extensionToMime[extension] ?? 'application/octet-stream';
  }

  /// Extract lowercase extension from filename
  ///
  /// Examples:
  ///   getExtension('photo.JPG') => 'jpg'
  ///   getExtension('file.tar.gz') => 'gz'
  ///   getExtension('noextension') => ''
  static String getExtension(String filename) {
    final parts = filename.split('.');
    return parts.length > 1 ? parts.last.toLowerCase() : '';
  }

  /// Check if MIME type represents an image
  ///
  /// Examples:
  ///   isImage('image/jpeg') => true
  ///   isImage('application/pdf') => false
  static bool isImage(String mimeType) => mimeType.startsWith('image/');

  /// Check if MIME type represents a PDF
  static bool isPdf(String mimeType) => mimeType == 'application/pdf';

  /// Check if MIME type represents a document (PDF, Word, Excel, etc.)
  static bool isDocument(String mimeType) {
    return isPdf(mimeType) ||
        mimeType.contains('msword') ||
        mimeType.contains('wordprocessingml') ||
        mimeType.contains('spreadsheetml') ||
        mimeType.contains('presentationml');
  }

  /// Check if MIME type represents text
  static bool isText(String mimeType) => mimeType.startsWith('text/');

  /// Check if MIME type represents audio
  static bool isAudio(String mimeType) => mimeType.startsWith('audio/');

  /// Check if MIME type represents video
  static bool isVideo(String mimeType) => mimeType.startsWith('video/');

  /// List of commonly allowed upload extensions
  static const List<String> commonUploadExtensions = [
    'jpg',
    'jpeg',
    'png',
    'gif',
    'webp',
    'pdf',
    'txt',
    'csv',
  ];
}
