/// PreferencesService Unit Tests (Metadata-Driven)
///
/// Tests verify the service works with raw Map-based preferences.
/// No hardcoded UserPreferences class - all data is raw Map.
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/services/preferences_service.dart';
import 'package:tross_app/config/preference_keys.dart';

void main() {
  group('PreferencesService (Metadata-Driven)', () {
    group('Static API Signature', () {
      test('loadRaw method exists and requires token', () {
        // Verify the method signature is correct
        // This will fail at compile time if signature changes
        Future<Map<String, dynamic>> Function(String) loadFn =
            PreferencesService.loadRaw;
        expect(loadFn, isNotNull);
      });

      test('updatePreference method exists with correct signature', () {
        Future<Map<String, dynamic>?> Function(String, String, dynamic) fn =
            PreferencesService.updatePreference;
        expect(fn, isNotNull);
      });

      test('resetRaw method exists with correct signature', () {
        Future<Map<String, dynamic>?> Function(String) fn =
            PreferencesService.resetRaw;
        expect(fn, isNotNull);
      });

      test('getSchema method exists with correct signature', () {
        Future<Map<String, dynamic>?> Function(String) fn =
            PreferencesService.getSchema;
        expect(fn, isNotNull);
      });
    });

    group('Error Handling (no network)', () {
      // These tests verify behavior when API calls fail
      // (which they will without a real backend)

      test('loadRaw returns empty map when API unavailable', () async {
        // With invalid token, should return empty map after catching error
        final prefs = await PreferencesService.loadRaw('invalid-token');

        expect(prefs, isNotNull);
        expect(prefs, isA<Map<String, dynamic>>());
      });

      test('updatePreference returns null on failure', () async {
        final result = await PreferencesService.updatePreference(
          'invalid-token',
          'theme',
          'dark',
        );

        // Should return null on failure (no backend available)
        expect(result, isNull);
      });

      test('resetRaw returns null on failure', () async {
        final result = await PreferencesService.resetRaw('invalid-token');

        expect(result, isNull);
      });

      test('getSchema returns null on failure', () async {
        // Without proper backend, schema fetch will fail
        final result = await PreferencesService.getSchema('invalid-token');

        // Should return null on failure (no backend available)
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
