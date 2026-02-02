/// FileService Unit Tests
///
/// Tests the file attachment service models, URL construction, and API integration.
///
/// STRATEGY:
/// - Test data models (FileAttachment) via fromJson
/// - Test computed properties (fileSizeFormatted, isImage, isPdf, extension, isDownloadUrlExpired)
/// - Test URL construction via metadata registry
/// - Test HTTP request/response handling for all CRUD operations
/// - Test error handling for various status codes
library;

import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:tross_app/models/file_attachment.dart';
import 'package:tross_app/services/file_service.dart';
import '../mocks/mock_api_client.dart';
import '../mocks/mock_token_provider.dart';
import '../factory/entity_registry.dart';

void main() {
  // Initialize metadata registry for all tests
  setUpAll(() async {
    await EntityTestRegistry.ensureInitialized();
  });

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
          'download_url': 'https://r2.example.com/signed-url',
          'download_url_expires_at': '2024-01-15T11:30:00Z',
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
        expect(attachment.downloadUrl, 'https://r2.example.com/signed-url');
        expect(
          attachment.downloadUrlExpiresAt,
          DateTime.utc(2024, 1, 15, 11, 30),
        );
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
          'download_url': 'https://r2.example.com/url',
          'download_url_expires_at': '2024-02-01T13:00:00Z',
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
          'download_url': 'https://r2.example.com/url',
          'download_url_expires_at': '2024-01-01T01:00:00Z',
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
          downloadUrl: 'https://example.com/url',
          downloadUrlExpiresAt: DateTime.now().add(const Duration(hours: 1)),
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
          downloadUrl: 'https://example.com/url',
          downloadUrlExpiresAt: DateTime.now().add(const Duration(hours: 1)),
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
          downloadUrl: 'https://example.com/url',
          downloadUrlExpiresAt: DateTime.now().add(const Duration(hours: 1)),
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
          downloadUrl: 'https://example.com/url',
          downloadUrlExpiresAt: DateTime.now().add(const Duration(hours: 1)),
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

    // =========================================================================
    // isDownloadUrlExpired Tests
    // =========================================================================
    group('isDownloadUrlExpired', () {
      test('returns false when URL is fresh', () {
        final attachment = FileAttachment(
          id: 1,
          entityType: 'test',
          entityId: 1,
          originalFilename: 'test.txt',
          mimeType: 'text/plain',
          fileSize: 100,
          category: 'test',
          createdAt: DateTime.now(),
          downloadUrl: 'https://example.com/url',
          downloadUrlExpiresAt: DateTime.now().add(const Duration(hours: 1)),
        );

        expect(attachment.isDownloadUrlExpired, isFalse);
      });

      test('returns true when URL is expired', () {
        final attachment = FileAttachment(
          id: 1,
          entityType: 'test',
          entityId: 1,
          originalFilename: 'test.txt',
          mimeType: 'text/plain',
          fileSize: 100,
          category: 'test',
          createdAt: DateTime.now(),
          downloadUrl: 'https://example.com/url',
          downloadUrlExpiresAt: DateTime.now().subtract(
            const Duration(hours: 1),
          ),
        );

        expect(attachment.isDownloadUrlExpired, isTrue);
      });

      test('returns true when URL expires within 5 minutes', () {
        final attachment = FileAttachment(
          id: 1,
          entityType: 'test',
          entityId: 1,
          originalFilename: 'test.txt',
          mimeType: 'text/plain',
          fileSize: 100,
          category: 'test',
          createdAt: DateTime.now(),
          downloadUrl: 'https://example.com/url',
          downloadUrlExpiresAt: DateTime.now().add(const Duration(minutes: 3)),
        );

        expect(attachment.isDownloadUrlExpired, isTrue);
      });

      test('returns false when URL expires in more than 5 minutes', () {
        final attachment = FileAttachment(
          id: 1,
          entityType: 'test',
          entityId: 1,
          originalFilename: 'test.txt',
          mimeType: 'text/plain',
          fileSize: 100,
          category: 'test',
          createdAt: DateTime.now(),
          downloadUrl: 'https://example.com/url',
          downloadUrlExpiresAt: DateTime.now().add(const Duration(minutes: 10)),
        );

        expect(attachment.isDownloadUrlExpired, isFalse);
      });
    });
  });

  // ===========================================================================
  // FileService Tests
  // ===========================================================================
  group('FileService', () {
    late MockApiClient mockApiClient;
    late MockTokenProvider mockTokenProvider;
    late FileService service;

    setUp(() {
      mockApiClient = MockApiClient();
      mockTokenProvider = MockTokenProvider('test-token');
      service = FileService(mockApiClient, mockTokenProvider);
    });

    // =========================================================================
    // Authentication Tests
    // =========================================================================
    group('Authentication', () {
      test('listFiles throws when not authenticated', () async {
        final unauthenticatedService = FileService(
          mockApiClient,
          MockTokenProvider.unauthenticated(),
        );

        expect(
          () => unauthenticatedService.listFiles(
            entityKey: 'work_order',
            entityId: 123,
          ),
          throwsA(
            isA<Exception>().having(
              (e) => e.toString(),
              'message',
              contains('Not authenticated'),
            ),
          ),
        );
      });

      test('getFile throws when not authenticated', () async {
        final unauthenticatedService = FileService(
          mockApiClient,
          MockTokenProvider.unauthenticated(),
        );

        expect(
          () => unauthenticatedService.getFile(
            entityKey: 'work_order',
            entityId: 123,
            fileId: 42,
          ),
          throwsA(
            isA<Exception>().having(
              (e) => e.toString(),
              'message',
              contains('Not authenticated'),
            ),
          ),
        );
      });

      test('deleteFile throws when not authenticated', () async {
        final unauthenticatedService = FileService(
          mockApiClient,
          MockTokenProvider.unauthenticated(),
        );

        expect(
          () => unauthenticatedService.deleteFile(
            entityKey: 'work_order',
            entityId: 123,
            fileId: 42,
          ),
          throwsA(
            isA<Exception>().having(
              (e) => e.toString(),
              'message',
              contains('Not authenticated'),
            ),
          ),
        );
      });

      test('uploadFile throws when not authenticated', () async {
        final unauthenticatedService = FileService(
          mockApiClient,
          MockTokenProvider.unauthenticated(),
        );

        expect(
          () => unauthenticatedService.uploadFile(
            entityKey: 'work_order',
            entityId: 123,
            bytes: Uint8List.fromList([1, 2, 3]),
            filename: 'test.txt',
          ),
          throwsA(
            isA<Exception>().having(
              (e) => e.toString(),
              'message',
              contains('Not authenticated'),
            ),
          ),
        );
      });
    });

    // =========================================================================
    // Entity Key to Table Name Mapping (via Metadata Registry)
    // =========================================================================
    group('Entity Key Resolution', () {
      test('throws for unknown entity key', () async {
        expect(
          () =>
              service.listFiles(entityKey: 'nonexistent_entity', entityId: 123),
          throwsA(
            isA<Exception>().having(
              (e) => e.toString(),
              'message',
              contains('Unknown entity'),
            ),
          ),
        );
      });

      test('resolves work_order to work_orders table', () async {
        // Set up mock to capture the endpoint called
        String? capturedEndpoint;
        mockApiClient.mockAuthenticatedRequest((
          method,
          endpoint, {
          token,
          body,
        }) {
          capturedEndpoint = endpoint;
          return http.Response(
            jsonEncode({'success': true, 'data': <Map<String, dynamic>>[]}),
            200,
          );
        });

        await service.listFiles(entityKey: 'work_order', entityId: 123);

        expect(capturedEndpoint, '/work_orders/123/files');
      });

      test('resolves contract to contracts table', () async {
        String? capturedEndpoint;
        mockApiClient.mockAuthenticatedRequest((
          method,
          endpoint, {
          token,
          body,
        }) {
          capturedEndpoint = endpoint;
          return http.Response(
            jsonEncode({'success': true, 'data': <Map<String, dynamic>>[]}),
            200,
          );
        });

        await service.listFiles(entityKey: 'contract', entityId: 456);

        expect(capturedEndpoint, '/contracts/456/files');
      });

      test('resolves inventory to inventory table (uncountable)', () async {
        String? capturedEndpoint;
        mockApiClient.mockAuthenticatedRequest((
          method,
          endpoint, {
          token,
          body,
        }) {
          capturedEndpoint = endpoint;
          return http.Response(
            jsonEncode({'success': true, 'data': <Map<String, dynamic>>[]}),
            200,
          );
        });

        await service.listFiles(entityKey: 'inventory', entityId: 789);

        expect(capturedEndpoint, '/inventory/789/files');
      });

      test('resolves invoice to invoices table', () async {
        String? capturedEndpoint;
        mockApiClient.mockAuthenticatedRequest((
          method,
          endpoint, {
          token,
          body,
        }) {
          capturedEndpoint = endpoint;
          return http.Response(
            jsonEncode({'success': true, 'data': <Map<String, dynamic>>[]}),
            200,
          );
        });

        await service.listFiles(entityKey: 'invoice', entityId: 101);

        expect(capturedEndpoint, '/invoices/101/files');
      });
    });

    // =========================================================================
    // listFiles Tests
    // =========================================================================
    group('listFiles', () {
      test('returns empty list when no files', () async {
        mockApiClient.mockAuthenticatedRequest((
          method,
          endpoint, {
          token,
          body,
        }) {
          return http.Response(
            jsonEncode({'success': true, 'data': <Map<String, dynamic>>[]}),
            200,
          );
        });

        final files = await service.listFiles(
          entityKey: 'work_order',
          entityId: 123,
        );

        expect(files, isEmpty);
      });

      test('parses file list correctly', () async {
        mockApiClient.mockAuthenticatedRequest((
          method,
          endpoint, {
          token,
          body,
        }) {
          return http.Response(
            jsonEncode({
              'success': true,
              'data': [
                {
                  'id': 1,
                  'entity_type': 'work_order',
                  'entity_id': 123,
                  'original_filename': 'photo.jpg',
                  'mime_type': 'image/jpeg',
                  'file_size': 5000,
                  'category': 'before_photo',
                  'description': null,
                  'uploaded_by': 7,
                  'created_at': '2024-01-15T10:00:00Z',
                  'download_url': 'https://r2.example.com/signed1',
                  'download_url_expires_at': '2024-01-15T11:00:00Z',
                },
                {
                  'id': 2,
                  'entity_type': 'work_order',
                  'entity_id': 123,
                  'original_filename': 'receipt.pdf',
                  'mime_type': 'application/pdf',
                  'file_size': 12000,
                  'category': 'receipt',
                  'description': 'Parts receipt',
                  'uploaded_by': 7,
                  'created_at': '2024-01-15T11:00:00Z',
                  'download_url': 'https://r2.example.com/signed2',
                  'download_url_expires_at': '2024-01-15T12:00:00Z',
                },
              ],
            }),
            200,
          );
        });

        final files = await service.listFiles(
          entityKey: 'work_order',
          entityId: 123,
        );

        expect(files.length, 2);
        expect(files[0].originalFilename, 'photo.jpg');
        expect(files[0].isImage, isTrue);
        expect(files[1].originalFilename, 'receipt.pdf');
        expect(files[1].isPdf, isTrue);
      });

      test('includes category filter in query when provided', () async {
        String? capturedEndpoint;
        mockApiClient.mockAuthenticatedRequest((
          method,
          endpoint, {
          token,
          body,
        }) {
          capturedEndpoint = endpoint;
          return http.Response(
            jsonEncode({'success': true, 'data': <Map<String, dynamic>>[]}),
            200,
          );
        });

        await service.listFiles(
          entityKey: 'work_order',
          entityId: 123,
          category: 'before_photo',
        );

        expect(capturedEndpoint, contains('category=before_photo'));
      });

      test('throws on 401 unauthorized', () async {
        mockApiClient.mockAuthenticatedRequest((
          method,
          endpoint, {
          token,
          body,
        }) {
          return http.Response('Unauthorized', 401);
        });

        expect(
          () => service.listFiles(entityKey: 'work_order', entityId: 123),
          throwsA(
            isA<Exception>().having(
              (e) => e.toString(),
              'message',
              contains('Authentication required'),
            ),
          ),
        );
      });

      test('throws on 403 forbidden', () async {
        mockApiClient.mockAuthenticatedRequest((
          method,
          endpoint, {
          token,
          body,
        }) {
          return http.Response('Forbidden', 403);
        });

        expect(
          () => service.listFiles(entityKey: 'work_order', entityId: 123),
          throwsA(
            isA<Exception>().having(
              (e) => e.toString(),
              'message',
              contains('Permission denied'),
            ),
          ),
        );
      });
    });

    // =========================================================================
    // getFile Tests
    // =========================================================================
    group('getFile', () {
      test('returns file with fresh download URL', () async {
        mockApiClient.mockAuthenticatedRequest((
          method,
          endpoint, {
          token,
          body,
        }) {
          expect(endpoint, '/work_orders/123/files/42');
          return http.Response(
            jsonEncode({
              'success': true,
              'data': {
                'id': 42,
                'entity_type': 'work_order',
                'entity_id': 123,
                'original_filename': 'document.pdf',
                'mime_type': 'application/pdf',
                'file_size': 50000,
                'category': 'report',
                'description': 'Final report',
                'uploaded_by': 5,
                'created_at': '2024-01-15T10:00:00Z',
                'download_url': 'https://r2.example.com/fresh-signed-url',
                'download_url_expires_at': '2024-01-15T11:00:00Z',
              },
            }),
            200,
          );
        });

        final file = await service.getFile(
          entityKey: 'work_order',
          entityId: 123,
          fileId: 42,
        );

        expect(file.id, 42);
        expect(file.downloadUrl, 'https://r2.example.com/fresh-signed-url');
      });

      test('throws on 404 not found', () async {
        mockApiClient.mockAuthenticatedRequest((
          method,
          endpoint, {
          token,
          body,
        }) {
          return http.Response(jsonEncode({'error': 'File not found'}), 404);
        });

        expect(
          () => service.getFile(
            entityKey: 'work_order',
            entityId: 123,
            fileId: 999,
          ),
          throwsA(
            isA<Exception>().having(
              (e) => e.toString(),
              'message',
              contains('File not found'),
            ),
          ),
        );
      });
    });

    // =========================================================================
    // deleteFile Tests
    // =========================================================================
    group('deleteFile', () {
      test('completes successfully on 200', () async {
        mockApiClient.mockAuthenticatedRequest((
          method,
          endpoint, {
          token,
          body,
        }) {
          expect(method, 'DELETE');
          expect(endpoint, '/work_orders/123/files/42');
          return http.Response(
            jsonEncode({'success': true, 'message': 'File deleted'}),
            200,
          );
        });

        // Should complete without throwing
        await service.deleteFile(
          entityKey: 'work_order',
          entityId: 123,
          fileId: 42,
        );
      });

      test('throws on 404 not found', () async {
        mockApiClient.mockAuthenticatedRequest((
          method,
          endpoint, {
          token,
          body,
        }) {
          return http.Response(jsonEncode({'error': 'File not found'}), 404);
        });

        expect(
          () => service.deleteFile(
            entityKey: 'work_order',
            entityId: 123,
            fileId: 999,
          ),
          throwsA(
            isA<Exception>().having(
              (e) => e.toString(),
              'message',
              contains('File not found'),
            ),
          ),
        );
      });

      test('throws on 403 forbidden', () async {
        mockApiClient.mockAuthenticatedRequest((
          method,
          endpoint, {
          token,
          body,
        }) {
          return http.Response('Forbidden', 403);
        });

        expect(
          () => service.deleteFile(
            entityKey: 'work_order',
            entityId: 123,
            fileId: 42,
          ),
          throwsA(
            isA<Exception>().having(
              (e) => e.toString(),
              'message',
              contains('Permission denied'),
            ),
          ),
        );
      });

      test('throws on 500 server error with JSON error message', () async {
        mockApiClient.mockAuthenticatedRequest((
          method,
          endpoint, {
          token,
          body,
        }) {
          return http.Response(
            jsonEncode({'error': 'Database connection failed'}),
            500,
          );
        });

        expect(
          () => service.deleteFile(
            entityKey: 'work_order',
            entityId: 123,
            fileId: 42,
          ),
          throwsA(
            isA<Exception>().having(
              (e) => e.toString(),
              'message',
              contains('Database connection failed'),
            ),
          ),
        );
      });

      test('throws on 500 server error with plain text body', () async {
        mockApiClient.mockAuthenticatedRequest((
          method,
          endpoint, {
          token,
          body,
        }) {
          return http.Response('Internal Server Error', 500);
        });

        expect(
          () => service.deleteFile(
            entityKey: 'work_order',
            entityId: 123,
            fileId: 42,
          ),
          throwsA(
            isA<Exception>().having(
              (e) => e.toString(),
              'message',
              contains('Server error (500)'),
            ),
          ),
        );
      });
    });

    // =========================================================================
    // Additional Error Path Tests
    // =========================================================================
    group('Error Handling', () {
      group('getFile error paths', () {
        test('throws on 401 unauthorized', () async {
          mockApiClient.mockAuthenticatedRequest((
            method,
            endpoint, {
            token,
            body,
          }) {
            return http.Response('Unauthorized', 401);
          });

          expect(
            () => service.getFile(
              entityKey: 'work_order',
              entityId: 123,
              fileId: 42,
            ),
            throwsA(
              isA<Exception>().having(
                (e) => e.toString(),
                'message',
                contains('Authentication required'),
              ),
            ),
          );
        });

        test('throws on 403 forbidden', () async {
          mockApiClient.mockAuthenticatedRequest((
            method,
            endpoint, {
            token,
            body,
          }) {
            return http.Response('Forbidden', 403);
          });

          expect(
            () => service.getFile(
              entityKey: 'work_order',
              entityId: 123,
              fileId: 42,
            ),
            throwsA(
              isA<Exception>().having(
                (e) => e.toString(),
                'message',
                contains('Permission denied'),
              ),
            ),
          );
        });

        test('throws on 500 with JSON message field', () async {
          mockApiClient.mockAuthenticatedRequest((
            method,
            endpoint, {
            token,
            body,
          }) {
            return http.Response(
              jsonEncode({'message': 'Storage unavailable'}),
              500,
            );
          });

          expect(
            () => service.getFile(
              entityKey: 'work_order',
              entityId: 123,
              fileId: 42,
            ),
            throwsA(
              isA<Exception>().having(
                (e) => e.toString(),
                'message',
                contains('Storage unavailable'),
              ),
            ),
          );
        });
      });

      group('listFiles error paths', () {
        test('throws on 500 server error', () async {
          mockApiClient.mockAuthenticatedRequest((
            method,
            endpoint, {
            token,
            body,
          }) {
            return http.Response(jsonEncode({'error': 'Query timeout'}), 500);
          });

          expect(
            () => service.listFiles(entityKey: 'work_order', entityId: 123),
            throwsA(
              isA<Exception>().having(
                (e) => e.toString(),
                'message',
                contains('Query timeout'),
              ),
            ),
          );
        });

        test('throws with fallback message on malformed response', () async {
          mockApiClient.mockAuthenticatedRequest((
            method,
            endpoint, {
            token,
            body,
          }) {
            return http.Response('{invalid json', 500);
          });

          expect(
            () => service.listFiles(entityKey: 'work_order', entityId: 123),
            throwsA(
              isA<Exception>().having(
                (e) => e.toString(),
                'message',
                contains('Server error (500)'),
              ),
            ),
          );
        });
      });

      group('_parseError fallback cases', () {
        test('uses error field from JSON response', () async {
          mockApiClient.mockAuthenticatedRequest((
            method,
            endpoint, {
            token,
            body,
          }) {
            return http.Response(
              jsonEncode({'error': 'Custom error message'}),
              422,
            );
          });

          expect(
            () => service.listFiles(entityKey: 'work_order', entityId: 123),
            throwsA(
              isA<Exception>().having(
                (e) => e.toString(),
                'message',
                contains('Custom error message'),
              ),
            ),
          );
        });

        test('uses message field when error is absent', () async {
          mockApiClient.mockAuthenticatedRequest((
            method,
            endpoint, {
            token,
            body,
          }) {
            return http.Response(
              jsonEncode({'message': 'Validation failed'}),
              400,
            );
          });

          expect(
            () => service.listFiles(entityKey: 'work_order', entityId: 123),
            throwsA(
              isA<Exception>().having(
                (e) => e.toString(),
                'message',
                contains('Validation failed'),
              ),
            ),
          );
        });

        test('falls back to Unknown error when no error or message', () async {
          mockApiClient.mockAuthenticatedRequest((
            method,
            endpoint, {
            token,
            body,
          }) {
            return http.Response(jsonEncode({'success': false}), 418);
          });

          expect(
            () => service.listFiles(entityKey: 'work_order', entityId: 123),
            throwsA(
              isA<Exception>().having(
                (e) => e.toString(),
                'message',
                contains('Unknown error'),
              ),
            ),
          );
        });
      });
    });
  });
}
