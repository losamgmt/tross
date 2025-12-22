/// MimeHelper Unit Tests
///
/// Tests the MIME type detection and file categorization utilities.
/// These are pure functions with no dependencies - easy to test.
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/utils/helpers/mime_helper.dart';

void main() {
  group('MimeHelper', () {
    // =========================================================================
    // getMimeType() Tests
    // =========================================================================
    group('getMimeType()', () {
      test('returns correct MIME for jpg', () {
        expect(MimeHelper.getMimeType('photo.jpg'), 'image/jpeg');
      });

      test('returns correct MIME for jpeg', () {
        expect(MimeHelper.getMimeType('photo.jpeg'), 'image/jpeg');
      });

      test('returns correct MIME for png', () {
        expect(MimeHelper.getMimeType('image.png'), 'image/png');
      });

      test('returns correct MIME for gif', () {
        expect(MimeHelper.getMimeType('animation.gif'), 'image/gif');
      });

      test('returns correct MIME for webp', () {
        expect(MimeHelper.getMimeType('modern.webp'), 'image/webp');
      });

      test('returns correct MIME for pdf', () {
        expect(MimeHelper.getMimeType('document.pdf'), 'application/pdf');
      });

      test('returns correct MIME for txt', () {
        expect(MimeHelper.getMimeType('notes.txt'), 'text/plain');
      });

      test('returns correct MIME for csv', () {
        expect(MimeHelper.getMimeType('data.csv'), 'text/csv');
      });

      test('handles uppercase extensions', () {
        expect(MimeHelper.getMimeType('PHOTO.JPG'), 'image/jpeg');
        expect(MimeHelper.getMimeType('Document.PDF'), 'application/pdf');
      });

      test('returns octet-stream for unknown extension', () {
        expect(MimeHelper.getMimeType('file.xyz'), 'application/octet-stream');
      });

      test('returns octet-stream for no extension', () {
        expect(
          MimeHelper.getMimeType('noextension'),
          'application/octet-stream',
        );
      });
    });

    // =========================================================================
    // getExtension() Tests
    // =========================================================================
    group('getExtension()', () {
      test('extracts lowercase extension', () {
        expect(MimeHelper.getExtension('photo.jpg'), 'jpg');
      });

      test('converts extension to lowercase', () {
        expect(MimeHelper.getExtension('Photo.JPG'), 'jpg');
        expect(MimeHelper.getExtension('FILE.PDF'), 'pdf');
      });

      test('handles multiple dots (gets last part)', () {
        expect(MimeHelper.getExtension('file.tar.gz'), 'gz');
        expect(MimeHelper.getExtension('report.2024.pdf'), 'pdf');
      });

      test('returns empty string for no extension', () {
        expect(MimeHelper.getExtension('noextension'), '');
      });

      test('handles dot at start (hidden files)', () {
        expect(MimeHelper.getExtension('.gitignore'), 'gitignore');
      });
    });

    // =========================================================================
    // isImage() Tests
    // =========================================================================
    group('isImage()', () {
      test('returns true for image/jpeg', () {
        expect(MimeHelper.isImage('image/jpeg'), isTrue);
      });

      test('returns true for image/png', () {
        expect(MimeHelper.isImage('image/png'), isTrue);
      });

      test('returns true for image/gif', () {
        expect(MimeHelper.isImage('image/gif'), isTrue);
      });

      test('returns true for image/webp', () {
        expect(MimeHelper.isImage('image/webp'), isTrue);
      });

      test('returns false for application/pdf', () {
        expect(MimeHelper.isImage('application/pdf'), isFalse);
      });

      test('returns false for text/plain', () {
        expect(MimeHelper.isImage('text/plain'), isFalse);
      });
    });

    // =========================================================================
    // isPdf() Tests
    // =========================================================================
    group('isPdf()', () {
      test('returns true for application/pdf', () {
        expect(MimeHelper.isPdf('application/pdf'), isTrue);
      });

      test('returns false for image types', () {
        expect(MimeHelper.isPdf('image/jpeg'), isFalse);
      });

      test('returns false for text/plain', () {
        expect(MimeHelper.isPdf('text/plain'), isFalse);
      });
    });

    // =========================================================================
    // isDocument() Tests
    // =========================================================================
    group('isDocument()', () {
      test('returns true for PDF', () {
        expect(MimeHelper.isDocument('application/pdf'), isTrue);
      });

      test('returns true for Word doc', () {
        expect(MimeHelper.isDocument('application/msword'), isTrue);
      });

      test('returns true for Word docx', () {
        expect(
          MimeHelper.isDocument(
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          ),
          isTrue,
        );
      });

      test('returns true for Excel xlsx', () {
        expect(
          MimeHelper.isDocument(
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          ),
          isTrue,
        );
      });

      test('returns true for PowerPoint pptx', () {
        expect(
          MimeHelper.isDocument(
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          ),
          isTrue,
        );
      });

      test('returns false for images', () {
        expect(MimeHelper.isDocument('image/jpeg'), isFalse);
      });

      test('returns false for text', () {
        expect(MimeHelper.isDocument('text/plain'), isFalse);
      });
    });

    // =========================================================================
    // isText() Tests
    // =========================================================================
    group('isText()', () {
      test('returns true for text/plain', () {
        expect(MimeHelper.isText('text/plain'), isTrue);
      });

      test('returns true for text/csv', () {
        expect(MimeHelper.isText('text/csv'), isTrue);
      });

      test('returns true for text/html', () {
        expect(MimeHelper.isText('text/html'), isTrue);
      });

      test('returns false for application types', () {
        expect(MimeHelper.isText('application/pdf'), isFalse);
      });

      test('returns false for image types', () {
        expect(MimeHelper.isText('image/jpeg'), isFalse);
      });
    });
  });
}
