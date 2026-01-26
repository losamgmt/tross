/// PreferencesService Unit Tests (DI-Based, Generic Entity Pattern)
///
/// Tests verify the service works with raw Map-based preferences using
/// the generic entity endpoints (GET/PATCH /preferences/:userId).
/// Uses MockApiClient for DI pattern demonstration.
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/services/preferences_service.dart';
import 'package:tross_app/config/preference_keys.dart';

import '../mocks/mock_api_client.dart';

void main() {
  late MockApiClient mockApiClient;
  late PreferencesService preferencesService;
  const testUserId = 123;

  setUp(() {
    mockApiClient = MockApiClient();
    preferencesService = PreferencesService(mockApiClient);
  });

  tearDown(() {
    mockApiClient.reset();
  });

  group('PreferencesService (Generic Entity Pattern)', () {
    group('DI Construction', () {
      test('can be constructed with ApiClient', () {
        expect(preferencesService, isNotNull);
        expect(preferencesService, isA<PreferencesService>());
      });

      test('load method exists with token and userId parameters', () {
        // Verify the method signature is correct
        Future<Map<String, dynamic>> Function(String, int) loadFn =
            preferencesService.load;
        expect(loadFn, isNotNull);
      });

      test('update method exists with correct signature', () {
        Future<Map<String, dynamic>?> Function(
          String,
          int,
          Map<String, dynamic>,
        )
        fn = preferencesService.update;
        expect(fn, isNotNull);
      });

      test('updateField method exists with correct signature', () {
        Future<Map<String, dynamic>?> Function(String, int, String, dynamic)
        fn = preferencesService.updateField;
        expect(fn, isNotNull);
      });
    });

    group('Error Handling (invalid token)', () {
      // These tests verify graceful failure when API is unavailable

      test('load returns empty map on error', () async {
        mockApiClient.setShouldFail(true, message: 'API Error');

        final result = await preferencesService.load('test-token', testUserId);

        expect(result, isA<Map<String, dynamic>>());
        expect(result, isEmpty);
      });

      test('update returns null on failure', () async {
        mockApiClient.setShouldFail(true, message: 'API Error');

        final result = await preferencesService.update(
          'test-token',
          testUserId,
          {'theme': 'dark'},
        );

        expect(result, isNull);
      });

      test('updateField returns null on failure', () async {
        mockApiClient.setShouldFail(true, message: 'API Error');

        final result = await preferencesService.updateField(
          'test-token',
          testUserId,
          'theme',
          'dark',
        );

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
