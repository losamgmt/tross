/// FileService Unit Tests
///
/// Tests the file attachment service models and pure functions.
///
/// STRATEGY:
/// - Test data models (FileAttachment, FileDownloadInfo) via fromJson
/// - Test computed properties (fileSizeFormatted, isImage, isPdf, extension)
/// - HTTP calls are NOT tested here (use integration tests)
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/models/file_attachment.dart';

void main() {
  group('FileAttachment', () {
    // =========================================================================
    // fromJson() Tests
    // =========================================================================
    group('fromJson()', () {
      test('parses all required fields correctly', () {
        final json = {
          'id': 42,
          'entity_type': 'work_order',
          'entity_id': 123,
          'original_filename': 'photo.jpg',
          'mime_type': 'image/jpeg',
          'file_size': 12345,
          'category': 'before_photo',
          'description': 'Before work started',
          'uploaded_by': 7,
          'created_at': '2024-01-15T10:30:00Z',
        };

        final attachment = FileAttachment.fromJson(json);

        expect(attachment.id, 42);
        expect(attachment.entityType, 'work_order');
        expect(attachment.entityId, 123);
        expect(attachment.originalFilename, 'photo.jpg');
        expect(attachment.mimeType, 'image/jpeg');
        expect(attachment.fileSize, 12345);
        expect(attachment.category, 'before_photo');
        expect(attachment.description, 'Before work started');
        expect(attachment.uploadedBy, 7);
        expect(attachment.createdAt, DateTime.utc(2024, 1, 15, 10, 30));
      });

      test('handles null description', () {
        final json = {
          'id': 1,
          'entity_type': 'customer',
          'entity_id': 456,
          'original_filename': 'doc.pdf',
          'mime_type': 'application/pdf',
          'file_size': 5000,
          'category': 'contract',
          'description': null,
          'uploaded_by': null,
          'created_at': '2024-02-01T12:00:00Z',
        };

        final attachment = FileAttachment.fromJson(json);

        expect(attachment.description, isNull);
        expect(attachment.uploadedBy, isNull);
      });

      test('defaults category to "attachment" when null', () {
        final json = {
          'id': 1,
          'entity_type': 'work_order',
          'entity_id': 1,
          'original_filename': 'file.txt',
          'mime_type': 'text/plain',
          'file_size': 100,
          'category': null,
          'created_at': '2024-01-01T00:00:00Z',
        };

        final attachment = FileAttachment.fromJson(json);

        expect(attachment.category, 'attachment');
      });
    });

    // =========================================================================
    // fileSizeFormatted Tests
    // =========================================================================
    group('fileSizeFormatted', () {
      FileAttachment createWithSize(int size) {
        return FileAttachment(
          id: 1,
          entityType: 'test',
          entityId: 1,
          originalFilename: 'test.txt',
          mimeType: 'text/plain',
          fileSize: size,
          category: 'test',
          createdAt: DateTime.now(),
        );
      }

      test('formats bytes correctly', () {
        expect(createWithSize(500).fileSizeFormatted, '500 B');
        expect(createWithSize(1023).fileSizeFormatted, '1023 B');
      });

      test('formats kilobytes correctly', () {
        expect(createWithSize(1024).fileSizeFormatted, '1.0 KB');
        expect(createWithSize(1536).fileSizeFormatted, '1.5 KB');
        expect(createWithSize(10240).fileSizeFormatted, '10.0 KB');
      });

      test('formats megabytes correctly', () {
        expect(createWithSize(1048576).fileSizeFormatted, '1.0 MB');
        expect(createWithSize(1572864).fileSizeFormatted, '1.5 MB');
        expect(createWithSize(10485760).fileSizeFormatted, '10.0 MB');
      });
    });

    // =========================================================================
    // isImage Tests
    // =========================================================================
    group('isImage', () {
      FileAttachment createWithMime(String mimeType) {
        return FileAttachment(
          id: 1,
          entityType: 'test',
          entityId: 1,
          originalFilename: 'test',
          mimeType: mimeType,
          fileSize: 100,
          category: 'test',
          createdAt: DateTime.now(),
        );
      }

      test('returns true for image types', () {
        expect(createWithMime('image/jpeg').isImage, isTrue);
        expect(createWithMime('image/png').isImage, isTrue);
        expect(createWithMime('image/gif').isImage, isTrue);
        expect(createWithMime('image/webp').isImage, isTrue);
      });

      test('returns false for non-image types', () {
        expect(createWithMime('application/pdf').isImage, isFalse);
        expect(createWithMime('text/plain').isImage, isFalse);
      });
    });

    // =========================================================================
    // isPdf Tests
    // =========================================================================
    group('isPdf', () {
      FileAttachment createWithMime(String mimeType) {
        return FileAttachment(
          id: 1,
          entityType: 'test',
          entityId: 1,
          originalFilename: 'test',
          mimeType: mimeType,
          fileSize: 100,
          category: 'test',
          createdAt: DateTime.now(),
        );
      }

      test('returns true for PDF', () {
        expect(createWithMime('application/pdf').isPdf, isTrue);
      });

      test('returns false for non-PDF types', () {
        expect(createWithMime('image/jpeg').isPdf, isFalse);
        expect(createWithMime('text/plain').isPdf, isFalse);
      });
    });

    // =========================================================================
    // extension Tests
    // =========================================================================
    group('extension', () {
      FileAttachment createWithFilename(String filename) {
        return FileAttachment(
          id: 1,
          entityType: 'test',
          entityId: 1,
          originalFilename: filename,
          mimeType: 'text/plain',
          fileSize: 100,
          category: 'test',
          createdAt: DateTime.now(),
        );
      }

      test('extracts extension correctly', () {
        expect(createWithFilename('photo.jpg').extension, 'jpg');
        expect(createWithFilename('document.pdf').extension, 'pdf');
        expect(createWithFilename('archive.tar.gz').extension, 'gz');
      });

      test('handles uppercase extensions', () {
        expect(createWithFilename('PHOTO.JPG').extension, 'jpg');
      });

      test('returns empty for no extension', () {
        expect(createWithFilename('noextension').extension, '');
      });
    });
  });

  // ===========================================================================
  // FileDownloadInfo Tests
  // ===========================================================================
  group('FileDownloadInfo', () {
    group('fromJson()', () {
      test('parses all fields correctly', () {
        final json = {
          'download_url': 'https://example.com/file?token=xyz',
          'filename': 'report.pdf',
          'mime_type': 'application/pdf',
          'expires_in': 3600,
        };

        final info = FileDownloadInfo.fromJson(json);

        expect(info.downloadUrl, 'https://example.com/file?token=xyz');
        expect(info.filename, 'report.pdf');
        expect(info.mimeType, 'application/pdf');
        expect(info.expiresIn, 3600);
      });
    });
  });
}
