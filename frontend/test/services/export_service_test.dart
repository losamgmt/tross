/// ExportService Unit Tests
///
/// Tests the export service models and DI patterns.
///
/// STRATEGY:
/// - Test ExportField model via fromJson
/// - Test service DI construction
/// - Test stub behavior (non-web platform)
///
/// NOTE: The actual export implementation is web-only (uses dart:js_interop).
/// Unit tests run on the VM, so they test the stub implementation.
/// Web-specific behavior is tested via integration tests.
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/services/export_service.dart';
import '../mocks/mock_api_client.dart';
import '../mocks/mock_token_provider.dart';

void main() {
  group('ExportField', () {
    group('fromJson()', () {
      test('parses all fields correctly', () {
        final json = {'name': 'created_at', 'label': 'Created At'};

        final field = ExportField.fromJson(json);

        expect(field.name, 'created_at');
        expect(field.label, 'Created At');
      });

      test('parses field with special characters in label', () {
        final json = {
          'name': 'customer_email',
          'label': 'Customer Email (Primary)',
        };

        final field = ExportField.fromJson(json);

        expect(field.name, 'customer_email');
        expect(field.label, 'Customer Email (Primary)');
      });
    });

    test('constructor creates field correctly', () {
      const field = ExportField(name: 'status', label: 'Status');

      expect(field.name, 'status');
      expect(field.label, 'Status');
    });
  });

  group('ExportService', () {
    late MockApiClient mockApiClient;
    late MockTokenProvider mockTokenProvider;
    late ExportService exportService;

    setUp(() {
      mockApiClient = MockApiClient();
      mockTokenProvider = MockTokenProvider('test-token');
      exportService = ExportService(mockApiClient, mockTokenProvider);
    });

    group('Dependency Injection', () {
      test('constructs with ApiClient and TokenProvider', () {
        final service = ExportService(mockApiClient, mockTokenProvider);
        expect(service, isNotNull);
      });

      test('defaults to DefaultTokenProvider when not provided', () {
        // This will use DefaultTokenProvider internally
        // Just verify it constructs without error
        final service = ExportService(mockApiClient);
        expect(service, isNotNull);
      });
    });

    // =========================================================================
    // Stub Implementation Tests (VM/non-web platform)
    // =========================================================================
    group('Stub Behavior (non-web platform)', () {
      test('getExportableFields returns empty list', () async {
        // Stub implementation returns empty list on non-web platforms
        final fields = await exportService.getExportableFields('work_order');
        expect(fields, isEmpty);
      });

      test('exportToCsv throws UnsupportedError', () async {
        // Stub implementation throws UnsupportedError on non-web platforms
        expect(
          () => exportService.exportToCsv(entityName: 'work_order'),
          throwsA(isA<UnsupportedError>()),
        );
      });

      test('exportToCsv error message mentions web platform', () async {
        // Verify the error message is descriptive
        expect(
          () => exportService.exportToCsv(entityName: 'customer'),
          throwsA(
            isA<UnsupportedError>().having(
              (e) => e.message,
              'message',
              contains('web platform'),
            ),
          ),
        );
      });
    });

    // =========================================================================
    // TokenProvider Integration Tests
    // =========================================================================
    group('TokenProvider Integration', () {
      test('service accepts authenticated token provider', () {
        final authenticatedProvider = MockTokenProvider('valid-token');
        final service = ExportService(mockApiClient, authenticatedProvider);
        expect(service, isNotNull);
      });

      test('service accepts unauthenticated token provider', () {
        final unauthenticatedProvider = MockTokenProvider.unauthenticated();
        final service = ExportService(mockApiClient, unauthenticatedProvider);
        expect(service, isNotNull);
      });

      test('token provider state can be changed', () async {
        final tokenProvider = MockTokenProvider.unauthenticated();
        final service = ExportService(mockApiClient, tokenProvider);

        // Start unauthenticated
        expect(await tokenProvider.hasToken(), isFalse);

        // Set token
        tokenProvider.setToken('new-token');
        expect(await tokenProvider.hasToken(), isTrue);

        // Clear token
        tokenProvider.clearToken();
        expect(await tokenProvider.hasToken(), isFalse);

        // Service should still work (stub doesn't check auth)
        expect(service, isNotNull);
      });
    });
  });
}
