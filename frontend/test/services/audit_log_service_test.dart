/// AuditLogService Unit Tests
///
/// Tests the audit log service using DI with MockApiClient + MockTokenProvider.
/// Full API testability enabled by TokenProvider abstraction.
///
/// ARCHITECTURE:
/// - MockApiClient: Mocks HTTP responses
/// - MockTokenProvider: Provides mock token (no flutter_secure_storage)
/// - Service constructed with both mocks = fully testable
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/models/audit_log_entry.dart';
import 'package:tross_app/services/audit_log_service.dart';

import '../mocks/mock_api_client.dart';
import '../mocks/mock_token_provider.dart';

void main() {
  late MockApiClient mockApiClient;
  late MockTokenProvider mockTokenProvider;
  late AuditLogService auditLogService;

  setUp(() {
    mockApiClient = MockApiClient();
    mockTokenProvider = MockTokenProvider();
    auditLogService = AuditLogService(mockApiClient, mockTokenProvider);
  });

  tearDown(() {
    mockApiClient.reset();
  });

  group('AuditLogService', () {
    group('DI Construction', () {
      test('can be constructed with ApiClient and TokenProvider', () {
        expect(auditLogService, isNotNull);
        expect(auditLogService, isA<AuditLogService>());
      });

      test('getAllLogs method exists with correct signature', () {
        Future<AuditLogResult> Function({String? filter, int limit, int offset})
        fn = auditLogService.getAllLogs;
        expect(fn, isNotNull);
      });

      test('getResourceHistory method exists with correct signature', () {
        Future<List<AuditLogEntry>> Function({
          required String resourceType,
          required int resourceId,
          int limit,
        })
        fn = auditLogService.getResourceHistory;
        expect(fn, isNotNull);
      });

      test('getUserHistory method exists with correct signature', () {
        Future<List<AuditLogEntry>> Function({required int userId, int limit})
        fn = auditLogService.getUserHistory;
        expect(fn, isNotNull);
      });
    });

    group('AuditLogResult', () {
      test('can be constructed with required fields', () {
        const result = AuditLogResult(
          logs: [],
          total: 100,
          limit: 50,
          offset: 0,
        );

        expect(result.logs, isEmpty);
        expect(result.total, equals(100));
        expect(result.limit, equals(50));
        expect(result.offset, equals(0));
      });
    });

    group('Error Handling (no token)', () {
      test('getAllLogs throws when not authenticated', () async {
        final unauthService = AuditLogService(
          mockApiClient,
          MockTokenProvider.unauthenticated(),
        );
        expect(() => unauthService.getAllLogs(), throwsA(isA<Exception>()));
      });

      test('getResourceHistory throws when not authenticated', () async {
        final unauthService = AuditLogService(
          mockApiClient,
          MockTokenProvider.unauthenticated(),
        );
        expect(
          () => unauthService.getResourceHistory(
            resourceType: 'work_order',
            resourceId: 1,
          ),
          throwsA(isA<Exception>()),
        );
      });

      test('getUserHistory throws when not authenticated', () async {
        final unauthService = AuditLogService(
          mockApiClient,
          MockTokenProvider.unauthenticated(),
        );
        expect(
          () => unauthService.getUserHistory(userId: 1),
          throwsA(isA<Exception>()),
        );
      });
    });

    group('API Integration (with MockTokenProvider)', () {
      test('getAllLogs calls correct endpoint', () async {
        // Mock the authenticatedRequest response
        mockApiClient.mockResponse('/audit/all?limit=100&offset=0', {
          'success': true,
          'data': [
            {
              'id': 1,
              'action': 'create',
              'resource_type': 'work_order',
              'resource_id': 42,
              'user_id': 1,
              'user_name': 'Admin',
              'created_at': '2024-01-01T12:00:00Z',
              'details': {'title': 'New Work Order'},
            },
          ],
          'meta': {
            'pagination': {'total': 1, 'limit': 100, 'offset': 0},
          },
        });

        final result = await auditLogService.getAllLogs();

        expect(result.logs.length, equals(1));
        expect(result.total, equals(1));
        expect(
          mockApiClient.wasCalled('GET /audit/all?limit=100&offset=0'),
          isTrue,
        );
      });

      test('getAllLogs respects filter parameter', () async {
        mockApiClient.mockResponse(
          '/audit/all?limit=100&offset=0&filter=data',
          {
            'success': true,
            'data': [],
            'meta': {
              'pagination': {'total': 0, 'limit': 100, 'offset': 0},
            },
          },
        );

        final result = await auditLogService.getAllLogs(filter: 'data');

        expect(result.logs, isEmpty);
        expect(
          mockApiClient.wasCalled(
            'GET /audit/all?limit=100&offset=0&filter=data',
          ),
          isTrue,
        );
      });

      test('getAllLogs respects pagination parameters', () async {
        mockApiClient.mockResponse('/audit/all?limit=50&offset=100', {
          'success': true,
          'data': [],
          'meta': {
            'pagination': {'total': 200, 'limit': 50, 'offset': 100},
          },
        });

        final result = await auditLogService.getAllLogs(limit: 50, offset: 100);

        expect(result.limit, equals(50));
        expect(result.offset, equals(100));
      });

      test('getResourceHistory calls correct endpoint', () async {
        mockApiClient.mockResponse('/audit/work_order/42?limit=50', {
          'success': true,
          'data': [
            {
              'id': 1,
              'action': 'update',
              'resource_type': 'work_order',
              'resource_id': 42,
              'user_id': 1,
              'user_name': 'Technician',
              'created_at': '2024-01-02T10:00:00Z',
              'details': {'status': 'in_progress'},
            },
          ],
        });

        final result = await auditLogService.getResourceHistory(
          resourceType: 'work_order',
          resourceId: 42,
        );

        expect(result.length, equals(1));
        expect(result[0].action, equals('update'));
        expect(
          mockApiClient.wasCalled('GET /audit/work_order/42?limit=50'),
          isTrue,
        );
      });

      test('getUserHistory calls correct endpoint', () async {
        mockApiClient.mockResponse('/audit/user/5?limit=50', {
          'success': true,
          'data': [
            {
              'id': 10,
              'action': 'login',
              'resource_type': 'auth',
              'resource_id': null,
              'user_id': 5,
              'user_name': 'User',
              'created_at': '2024-01-03T08:00:00Z',
              'details': {},
            },
          ],
        });

        final result = await auditLogService.getUserHistory(userId: 5);

        expect(result.length, equals(1));
        expect(result[0].action, equals('login'));
        expect(mockApiClient.wasCalled('GET /audit/user/5?limit=50'), isTrue);
      });

      test('getUserHistory respects limit parameter', () async {
        mockApiClient.mockResponse('/audit/user/5?limit=25', {
          'success': true,
          'data': [],
        });

        await auditLogService.getUserHistory(userId: 5, limit: 25);

        expect(mockApiClient.wasCalled('GET /audit/user/5?limit=25'), isTrue);
      });
    });
  });
}
