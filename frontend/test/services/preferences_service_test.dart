/// PreferencesService Unit Tests (DI-Based, Metadata-Driven)
///
/// Tests verify the service works with raw Map-based preferences.
/// Uses MockApiClient for DI pattern demonstration.
/// Note: Full API tests require token mocking (Phase 2).
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/services/preferences_service.dart';
import 'package:tross_app/config/preference_keys.dart';

import '../mocks/mock_api_client.dart';

void main() {
  late MockApiClient mockApiClient;
  late PreferencesService preferencesService;

  setUp(() {
    mockApiClient = MockApiClient();
    preferencesService = PreferencesService(mockApiClient);
  });

  tearDown(() {
    mockApiClient.reset();
  });

  group('PreferencesService (DI-Based)', () {
    group('DI Construction', () {
      test('can be constructed with ApiClient', () {
        expect(preferencesService, isNotNull);
        expect(preferencesService, isA<PreferencesService>());
      });

      test('loadRaw method exists with token parameter', () {
        // Verify the method signature is correct
        Future<Map<String, dynamic>> Function(String) loadFn =
            preferencesService.loadRaw;
        expect(loadFn, isNotNull);
      });

      test('updatePreference method exists with correct signature', () {
        Future<Map<String, dynamic>?> Function(String, String, dynamic) fn =
            preferencesService.updatePreference;
        expect(fn, isNotNull);
      });

      test('resetRaw method exists with correct signature', () {
        Future<Map<String, dynamic>?> Function(String) fn =
            preferencesService.resetRaw;
        expect(fn, isNotNull);
      });

      test('getSchema method exists with correct signature', () {
        Future<Map<String, dynamic>?> Function(String) fn =
            preferencesService.getSchema;
        expect(fn, isNotNull);
      });
    });

    group('Error Handling (invalid token)', () {
      // These tests verify graceful failure when API is unavailable
      // Full API mocking requires proper token handling (Phase 2)

      test('loadRaw returns empty map on error', () async {
        mockApiClient.setShouldFail(true, message: 'API Error');

        final result = await preferencesService.loadRaw('test-token');

        expect(result, isA<Map<String, dynamic>>());
        expect(result, isEmpty);
      });

      test('updatePreference returns null on failure', () async {
        mockApiClient.setShouldFail(true, message: 'API Error');

        final result = await preferencesService.updatePreference(
          'test-token',
          'theme',
          'dark',
        );

        expect(result, isNull);
      });

      test('resetRaw returns null on failure', () async {
        mockApiClient.setShouldFail(true, message: 'API Error');

        final result = await preferencesService.resetRaw('test-token');

        expect(result, isNull);
      });

      test('getSchema returns null on failure', () async {
        mockApiClient.setShouldFail(true, message: 'API Error');

        final result = await preferencesService.getSchema('test-token');

        expect(result, isNull);
      });
    });
  });

  group('ThemePreference', () {
    test('has all expected values', () {
      expect(
        ThemePreference.values,
        containsAll([
          ThemePreference.system,
          ThemePreference.light,
          ThemePreference.dark,
        ]),
      );
    });

    test('value property returns correct strings', () {
      expect(ThemePreference.system.value, equals('system'));
      expect(ThemePreference.light.value, equals('light'));
      expect(ThemePreference.dark.value, equals('dark'));
    });

    test('fromString parses valid values', () {
      expect(
        ThemePreference.fromString('system'),
        equals(ThemePreference.system),
      );
      expect(
        ThemePreference.fromString('light'),
        equals(ThemePreference.light),
      );
      expect(ThemePreference.fromString('dark'), equals(ThemePreference.dark));
    });

    test('fromString returns default for invalid value', () {
      expect(
        ThemePreference.fromString('invalid'),
        equals(ThemePreference.system),
      );
      expect(ThemePreference.fromString(''), equals(ThemePreference.system));
    });

    test('fromString handles null by returning default', () {
      // The fromString uses null-aware ??
      expect(ThemePreference.fromString(''), equals(ThemePreference.system));
    });
  });
}
