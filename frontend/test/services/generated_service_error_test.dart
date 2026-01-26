/// Service Error Path Tests - Factory Generated
///
/// Uses ServiceTestFactory to generate standardized error path tests
/// for all API services that follow the ApiClient + TokenProvider pattern.
///
/// COVERAGE STRATEGY: Instead of writing individual tests per service,
/// define contracts and let the factory generate comprehensive tests.
///
/// SERVICES COVERED:
/// - StatsService: count, countGrouped, sum endpoints (factory)
/// - AuditLogService: getAllLogs, getResourceHistory (manual - throws on 403)
/// - FileService: listFiles, getDownloadUrl, deleteFile (factory)
/// - ExportService: getExportableFields (factory)
/// - GenericEntityService: getAll, getById, create, update, delete (manual)
/// - PreferencesService: load, update, updateField (generic entity pattern)
///
/// Each service gets tests for:
/// - Authentication (no token)
/// - 403 Forbidden handling
/// - 500 Server Error handling
/// - Success paths
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/services/stats_service.dart';
import 'package:tross_app/services/audit_log_service.dart';
import 'package:tross_app/services/file_service.dart';
import 'package:tross_app/services/export_service.dart';
import 'package:tross_app/services/generic_entity_service.dart';
import 'package:tross_app/services/preferences_service.dart';

import '../factory/service_test_factory.dart';
import '../mocks/mock_api_client.dart';
import '../mocks/mock_token_provider.dart';
import '../helpers/helpers.dart';

void main() {
  setUpAll(() {
    initializeTestBinding();
  });

  // ===========================================================================
  // STATS SERVICE - count, countGrouped, sum
  // ===========================================================================
  ServiceTestFactory.generateErrorPathTests<StatsService>(
    serviceName: 'StatsService',
    createService: (api, token) => StatsService(api, token),
    endpoints: [
      // count endpoint - returns 0 on 403
      EndpointTest(
        contract: EndpointContract.count('/stats/work_order'),
        invoke: (service) => service.count('work_order'),
      ),
      // countGrouped endpoint - returns [] on 403
      EndpointTest(
        contract: EndpointContract.list(
          '/stats/work_order/grouped/status',
          description: 'countGrouped work_order by status',
        ),
        invoke: (service) => service.countGrouped('work_order', 'status'),
      ),
      // sum endpoint - returns 0.0 on 403
      EndpointTest(
        contract: EndpointContract.sum('/stats/invoice/sum/total'),
        invoke: (service) => service.sum('invoice', 'total'),
      ),
    ],
  );

  // ===========================================================================
  // AUDIT LOG SERVICE - getAllLogs, getResourceHistory
  // ===========================================================================
  group('AuditLogService Error Paths', () {
    late MockApiClient mockApiClient;
    late MockTokenProvider mockTokenProvider;
    late AuditLogService service;

    setUpAll(() {
      initializeTestBinding();
    });

    setUp(() {
      mockApiClient = MockApiClient();
      mockTokenProvider = MockTokenProvider('test-token');
      service = AuditLogService(mockApiClient, mockTokenProvider);
    });

    tearDown(() {
      mockApiClient.reset();
    });

    group('Authentication', () {
      test('getAllLogs throws when not authenticated', () async {
        final unauthProvider = MockTokenProvider.unauthenticated();
        final unauthService = AuditLogService(mockApiClient, unauthProvider);

        expect(
          () => unauthService.getAllLogs(),
          throwsA(
            isA<Exception>().having(
              (e) => e.toString(),
              'message',
              anyOf(
                contains('No authentication'),
                contains('Not authenticated'),
              ),
            ),
          ),
        );
      });

      test('getResourceHistory throws when not authenticated', () async {
        final unauthProvider = MockTokenProvider.unauthenticated();
        final unauthService = AuditLogService(mockApiClient, unauthProvider);

        expect(
          () => unauthService.getResourceHistory(
            resourceType: 'work_order',
            resourceId: 123,
          ),
          throwsA(
            isA<Exception>().having(
              (e) => e.toString(),
              'message',
              anyOf(
                contains('No authentication'),
                contains('Not authenticated'),
              ),
            ),
          ),
        );
      });
    });

    group('403 Forbidden', () {
      test('getAllLogs throws on 403', () async {
        mockApiClient.mockStatusCode('/audit/all', 403, {'error': 'Forbidden'});

        expect(
          () => service.getAllLogs(),
          throwsA(
            isA<Exception>().having(
              (e) => e.toString(),
              'message',
              contains('permission'),
            ),
          ),
        );
      });

      test('getResourceHistory throws on 403', () async {
        mockApiClient.mockStatusCode('/audit/work_order/123', 403, {
          'error': 'Forbidden',
        });

        expect(
          () => service.getResourceHistory(
            resourceType: 'work_order',
            resourceId: 123,
          ),
          throwsA(
            isA<Exception>().having(
              (e) => e.toString(),
              'message',
              anyOf(contains('permission'), contains('403')),
            ),
          ),
        );
      });
    });

    group('500 Server Error', () {
      test('getAllLogs throws on 500', () async {
        mockApiClient.mockStatusCode('/audit/all', 500, {
          'error': 'Internal Server Error',
        });

        expect(() => service.getAllLogs(), throwsA(isA<Exception>()));
      });

      test('getResourceHistory throws on 500', () async {
        mockApiClient.mockStatusCode('/audit/work_order/123', 500, {
          'error': 'Internal Server Error',
        });

        expect(
          () => service.getResourceHistory(
            resourceType: 'work_order',
            resourceId: 123,
          ),
          throwsA(isA<Exception>()),
        );
      });
    });

    group('Success Paths', () {
      test('getAllLogs succeeds with valid response', () async {
        mockApiClient.mockResponse('/audit/all', {
          'success': true,
          'data': [],
          'meta': {
            'pagination': {'total': 0, 'limit': 100, 'offset': 0},
          },
        });

        final result = await service.getAllLogs();
        expect(result.logs, isEmpty);
        expect(result.total, equals(0));
      });

      test('getResourceHistory succeeds with valid response', () async {
        mockApiClient.mockResponse('/audit/work_order/123', {
          'success': true,
          'data': [],
          'meta': {
            'pagination': {'total': 0, 'limit': 100, 'offset': 0},
          },
        });

        final result = await service.getResourceHistory(
          resourceType: 'work_order',
          resourceId: 123,
        );
        expect(result, isEmpty);
      });
    });
  });

  // ===========================================================================
  // FILE SERVICE - listFiles, getDownloadUrl, deleteFile
  // Uses ApiClient + TokenProvider pattern
  // ===========================================================================
  ServiceTestFactory.generateErrorPathTests<FileService>(
    serviceName: 'FileService',
    createService: (api, token) => FileService(api, token),
    endpoints: [
      // listFiles - throws on 403
      EndpointTest(
        contract: EndpointContract.fetch(
          '/files/work_order/123',
          description: 'listFiles for work_order/123',
          successResponse: {'success': true, 'data': []},
        ),
        invoke: (service) =>
            service.listFiles(entityType: 'work_order', entityId: 123),
      ),
      // getDownloadUrl - throws on 403/404
      EndpointTest(
        contract: EndpointContract.fetch(
          '/files/42/download',
          description: 'getDownloadUrl for file 42',
          successResponse: {
            'success': true,
            'data': {
              'download_url': 'https://example.com/download',
              'expires_in': 3600,
              'filename': 'test.pdf',
              'mime_type': 'application/pdf',
            },
          },
        ),
        invoke: (service) => service.getDownloadUrl(fileId: 42),
      ),
      // deleteFile - returns void, test separately for proper handling
    ],
  );

  // FileService deleteFile needs special handling (void return)
  group('FileService deleteFile', () {
    late MockApiClient mockApiClient;
    late MockTokenProvider mockTokenProvider;
    late FileService service;

    setUpAll(() {
      initializeTestBinding();
    });

    setUp(() {
      mockApiClient = MockApiClient();
      mockTokenProvider = MockTokenProvider('test-token');
      service = FileService(mockApiClient, mockTokenProvider);
    });

    tearDown(() {
      mockApiClient.reset();
    });

    test('throws when not authenticated', () async {
      final unauthProvider = MockTokenProvider.unauthenticated();
      final unauthService = FileService(mockApiClient, unauthProvider);

      expect(
        () => unauthService.deleteFile(fileId: 42),
        throwsA(isA<Exception>()),
      );
    });

    test('throws on 403', () async {
      mockApiClient.mockStatusCode('/files/42', 403, {'error': 'Forbidden'});

      expect(() => service.deleteFile(fileId: 42), throwsA(isA<Exception>()));
    });

    test('throws on 404', () async {
      mockApiClient.mockStatusCode('/files/42', 404, {'error': 'Not Found'});

      expect(() => service.deleteFile(fileId: 42), throwsA(isA<Exception>()));
    });

    test('succeeds on 200', () async {
      mockApiClient.mockResponse('/files/42', {'success': true});

      await expectLater(service.deleteFile(fileId: 42), completes);
    });
  });

  // ===========================================================================
  // EXPORT SERVICE - Manual tests (stub returns [] on non-web)
  // NOTE: Real export_service_web.dart has different behavior but can't be
  // tested in unit tests due to dart:html dependency
  // ===========================================================================
  group('ExportService (Stub Platform)', () {
    late MockApiClient mockApiClient;
    late MockTokenProvider mockTokenProvider;
    late ExportService service;

    setUpAll(() {
      initializeTestBinding();
    });

    setUp(() {
      mockApiClient = MockApiClient();
      mockTokenProvider = MockTokenProvider('test-token');
      service = ExportService(mockApiClient, mockTokenProvider);
    });

    tearDown(() {
      mockApiClient.reset();
    });

    test('constructs with mocks', () {
      expect(service, isA<ExportService>());
    });

    // NOTE: Stub implementation returns [] regardless of auth/errors
    // This is correct behavior for non-web platforms
    test('getExportableFields returns empty list on stub', () async {
      final result = await service.getExportableFields('work_order');
      expect(result, isEmpty);
    });

    test('exportToCsv throws UnsupportedError on stub', () async {
      expect(
        () => service.exportToCsv(entityName: 'work_order'),
        throwsA(isA<UnsupportedError>()),
      );
    });
  });

  // ===========================================================================
  // GENERIC ENTITY SERVICE - getAll, getById, create, update, delete
  // Pattern: ApiClient only (no TokenProvider, token managed internally)
  // ===========================================================================
  group('GenericEntityService Error Paths', () {
    late MockApiClient mockApiClient;
    late GenericEntityService service;

    setUpAll(() {
      initializeTestBinding();
    });

    setUp(() {
      mockApiClient = MockApiClient();
      service = GenericEntityService(mockApiClient);
    });

    tearDown(() {
      mockApiClient.reset();
    });

    group('getAll', () {
      test('succeeds with valid response', () async {
        mockApiClient.mockEntityList('customer', [
          {'id': 1, 'name': 'Test'},
        ]);

        final result = await service.getAll('customer');
        expect(result.data, hasLength(1));
        expect(result.count, equals(1));
      });

      test('rethrows errors from ApiClient', () async {
        mockApiClient.setShouldFail(true);

        expect(() => service.getAll('customer'), throwsA(isA<Exception>()));
      });
    });

    group('getById', () {
      test('succeeds with valid response', () async {
        mockApiClient.mockEntity('customer', 1, {'id': 1, 'name': 'Test'});

        final result = await service.getById('customer', 1);
        expect(result['id'], equals(1));
      });

      test('rethrows errors from ApiClient', () async {
        mockApiClient.setShouldFail(true);

        expect(() => service.getById('customer', 1), throwsA(isA<Exception>()));
      });
    });

    group('create', () {
      test('succeeds with valid response', () async {
        mockApiClient.mockCreate('customer', {
          'success': true,
          'data': {'id': 99, 'name': 'New'},
        });

        final result = await service.create('customer', {'name': 'New'});
        // MockApiClient returns the wrapper, service extracts data
        expect(result, isNotNull);
      });

      test('rethrows errors from ApiClient', () async {
        mockApiClient.setShouldFail(true);

        expect(
          () => service.create('customer', {'name': 'New'}),
          throwsA(isA<Exception>()),
        );
      });
    });

    group('update', () {
      test('succeeds with valid response', () async {
        mockApiClient.mockUpdate('customer', 1, {
          'success': true,
          'data': {'id': 1, 'name': 'Updated'},
        });

        final result = await service.update('customer', 1, {'name': 'Updated'});
        // MockApiClient returns the wrapper, service extracts data
        expect(result, isNotNull);
      });

      test('rethrows errors from ApiClient', () async {
        mockApiClient.setShouldFail(true);

        expect(
          () => service.update('customer', 1, {'name': 'Updated'}),
          throwsA(isA<Exception>()),
        );
      });
    });

    group('delete', () {
      test('succeeds silently', () async {
        // delete returns void, just verify no throw
        await expectLater(service.delete('customer', 1), completes);
      });

      test('rethrows errors from ApiClient', () async {
        mockApiClient.setShouldFail(true);

        expect(() => service.delete('customer', 1), throwsA(isA<Exception>()));
      });
    });
  });

  // ===========================================================================
  // PREFERENCES SERVICE - load, update, updateField (Generic Entity Pattern)
  // Pattern: ApiClient only, token and userId passed as parameters
  // ===========================================================================
  group('PreferencesService Error Paths', () {
    late MockApiClient mockApiClient;
    late PreferencesService service;
    const testToken = 'test-token';
    const testUserId = 123;

    setUpAll(() {
      initializeTestBinding();
    });

    setUp(() {
      mockApiClient = MockApiClient();
      service = PreferencesService(mockApiClient);
    });

    tearDown(() {
      mockApiClient.reset();
    });

    group('load', () {
      test('returns preferences on success', () async {
        mockApiClient.mockResponse('/preferences/$testUserId', {
          'success': true,
          'data': {
            'id': testUserId,
            'theme': 'dark',
            'density': 'comfortable',
            'created_at': '2026-01-01T00:00:00Z',
            'updated_at': '2026-01-01T00:00:00Z',
          },
        });

        final result = await service.load(testToken, testUserId);
        expect(result['theme'], equals('dark'));
        expect(result['density'], equals('comfortable'));
        // System fields should be excluded
        expect(result.containsKey('id'), isFalse);
        expect(result.containsKey('created_at'), isFalse);
      });

      test('returns empty map on error (graceful)', () async {
        mockApiClient.mockStatusCode('/preferences/$testUserId', 500, {
          'error': 'Server Error',
        });

        final result = await service.load(testToken, testUserId);
        expect(result, isEmpty);
      });

      test('returns empty map on 404 (no preferences yet)', () async {
        mockApiClient.mockStatusCode('/preferences/$testUserId', 404, {
          'error': 'Not Found',
        });

        final result = await service.load(testToken, testUserId);
        expect(result, isEmpty);
      });
    });

    group('update', () {
      test('returns updated preferences on success', () async {
        mockApiClient.mockResponse('/preferences/$testUserId', {
          'success': true,
          'data': {'id': testUserId, 'theme': 'light', 'density': 'compact'},
        });

        final result = await service.update(testToken, testUserId, {
          'theme': 'light',
          'density': 'compact',
        });
        expect(result, isNotNull);
        expect(result!['theme'], equals('light'));
        expect(result['density'], equals('compact'));
      });

      test('returns null on error (graceful)', () async {
        mockApiClient.mockStatusCode('/preferences/$testUserId', 500, {
          'error': 'Server Error',
        });

        final result = await service.update(testToken, testUserId, {
          'theme': 'light',
        });
        expect(result, isNull);
      });
    });

    group('updateField', () {
      test('returns updated preferences on success', () async {
        mockApiClient.mockResponse('/preferences/$testUserId', {
          'success': true,
          'data': {'id': testUserId, 'theme': 'dark'},
        });

        final result = await service.updateField(
          testToken,
          testUserId,
          'theme',
          'dark',
        );
        expect(result, isNotNull);
        expect(result!['theme'], equals('dark'));
      });

      test('returns null on error (graceful)', () async {
        mockApiClient.mockStatusCode('/preferences/$testUserId', 500, {
          'error': 'Server Error',
        });

        final result = await service.updateField(
          testToken,
          testUserId,
          'theme',
          'dark',
        );
        expect(result, isNull);
      });
    });
  });

  // ===========================================================================
  // ADDITIONAL PATTERN-BASED TESTS
  // ===========================================================================

  group('Service Construction (All Services)', () {
    late MockApiClient mockApiClient;

    setUp(() {
      mockApiClient = MockApiClient();
    });

    tearDown(() {
      mockApiClient.reset();
    });

    test('StatsService constructs with mocks', () {
      final service = StatsService(mockApiClient, MockTokenProvider('test'));
      expect(service, isA<StatsService>());
    });

    test('AuditLogService constructs with mocks', () {
      final service = AuditLogService(mockApiClient, MockTokenProvider('test'));
      expect(service, isA<AuditLogService>());
    });

    test('FileService constructs with mocks', () {
      final service = FileService(mockApiClient, MockTokenProvider('test'));
      expect(service, isA<FileService>());
    });

    test('ExportService constructs with mocks', () {
      final service = ExportService(mockApiClient, MockTokenProvider('test'));
      expect(service, isA<ExportService>());
    });

    test('GenericEntityService constructs with mock', () {
      final service = GenericEntityService(mockApiClient);
      expect(service, isA<GenericEntityService>());
    });

    test('PreferencesService constructs with mock', () {
      final service = PreferencesService(mockApiClient);
      expect(service, isA<PreferencesService>());
    });
  });

  // ===========================================================================
  // NULL/EMPTY RESPONSE HANDLING
  // ===========================================================================

  group('Null Data Handling (All Services)', () {
    late MockApiClient mockApiClient;
    late MockTokenProvider mockTokenProvider;

    setUp(() {
      mockApiClient = MockApiClient();
      mockTokenProvider = MockTokenProvider('test-token');
    });

    tearDown(() {
      mockApiClient.reset();
    });

    test('StatsService.count handles null data', () async {
      mockApiClient.mockResponse('/stats/work_order', {
        'success': true,
        'data': null,
      });

      final service = StatsService(mockApiClient, mockTokenProvider);
      final result = await service.count('work_order');
      expect(result, equals(0));
    });

    test('StatsService.countGrouped handles null data', () async {
      mockApiClient.mockResponse('/stats/work_order/grouped/status', {
        'success': true,
        'data': null,
      });

      final service = StatsService(mockApiClient, mockTokenProvider);
      final result = await service.countGrouped('work_order', 'status');
      expect(result, isEmpty);
    });

    test('StatsService.sum handles null data', () async {
      mockApiClient.mockResponse('/stats/invoice/sum/total', {
        'success': true,
        'data': null,
      });

      final service = StatsService(mockApiClient, mockTokenProvider);
      final result = await service.sum('invoice', 'total');
      expect(result, equals(0.0));
    });
  });
}
