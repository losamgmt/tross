/// PreferencesService Unit Tests
///
/// Tests the API-based preferences service.
/// Since PreferencesService makes HTTP calls, these tests verify
/// the static method signatures and error handling patterns.
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/services/preferences_service.dart';
import 'package:tross_app/config/preference_keys.dart';

void main() {
  group('PreferencesService', () {
    group('Static API Signature', () {
      test('load method exists and requires token', () {
        // Verify the method signature is correct
        // This will fail at compile time if signature changes
        Future<UserPreferences> Function(String) loadFn =
            PreferencesService.load;
        expect(loadFn, isNotNull);
      });

      test('updatePreferences method exists with correct signature', () {
        Future<UserPreferences?> Function(String, Map<String, dynamic>) fn =
            PreferencesService.updatePreferences;
        expect(fn, isNotNull);
      });

      test('updateTheme method exists with correct signature', () {
        Future<UserPreferences?> Function(String, ThemePreference) fn =
            PreferencesService.updateTheme;
        expect(fn, isNotNull);
      });

      test(
        'updateNotificationsEnabled method exists with correct signature',
        () {
          Future<UserPreferences?> Function(String, bool) fn =
              PreferencesService.updateNotificationsEnabled;
          expect(fn, isNotNull);
        },
      );

      test('reset method exists with correct signature', () {
        Future<UserPreferences?> Function(String) fn = PreferencesService.reset;
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

      test('load returns defaults when API unavailable', () async {
        // With invalid token, should return defaults after catching error
        final prefs = await PreferencesService.load('invalid-token');

        expect(prefs, isNotNull);
        expect(prefs.theme, equals(ThemePreference.system));
        expect(prefs.notificationsEnabled, isTrue);
      });

      test('updateTheme returns null on failure', () async {
        final result = await PreferencesService.updateTheme(
          'invalid-token',
          ThemePreference.dark,
        );

        // Should return null on failure (no backend available)
        expect(result, isNull);
      });

      test('updateNotificationsEnabled returns null on failure', () async {
        final result = await PreferencesService.updateNotificationsEnabled(
          'invalid-token',
          false,
        );

        expect(result, isNull);
      });

      test('reset returns null on failure', () async {
        final result = await PreferencesService.reset('invalid-token');

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

  group('UserPreferences', () {
    group('Factory constructors', () {
      test('defaults() creates instance with default values', () {
        final prefs = UserPreferences.defaults();

        expect(prefs.id, isNull);
        expect(prefs.theme, equals(ThemePreference.system));
        expect(prefs.notificationsEnabled, isTrue);
      });

      test('fromJson parses valid JSON', () {
        final json = {
          'id': 42,
          'preferences': {'theme': 'dark', 'notificationsEnabled': false},
        };

        final prefs = UserPreferences.fromJson(json);

        expect(prefs.id, equals(42));
        expect(prefs.theme, equals(ThemePreference.dark));
        expect(prefs.notificationsEnabled, isFalse);
      });

      test('fromJson handles missing optional fields', () {
        final json = <String, dynamic>{};

        final prefs = UserPreferences.fromJson(json);

        expect(prefs.id, isNull);
        expect(prefs.theme, equals(ThemePreference.system));
        expect(prefs.notificationsEnabled, isTrue);
      });

      test('fromJson handles unknown theme value', () {
        final json = {
          'preferences': {'theme': 'unknown_theme_value'},
        };

        final prefs = UserPreferences.fromJson(json);

        // Should fall back to default
        expect(prefs.theme, equals(ThemePreference.system));
      });
    });

    group('toJson', () {
      test('serializes all fields correctly', () {
        final prefs = UserPreferences(
          id: 123,
          theme: ThemePreference.light,
          notificationsEnabled: false,
        );

        final json = prefs.toJson();

        expect(json['theme'], equals('light'));
        expect(json['notificationsEnabled'], isFalse);
      });

      test('defaults serialize correctly', () {
        final prefs = UserPreferences.defaults();
        final json = prefs.toJson();

        expect(json['theme'], equals('system'));
        expect(json['notificationsEnabled'], isTrue);
      });
    });

    group('copyWith', () {
      test('creates new instance with updated theme', () {
        final original = UserPreferences.defaults();
        final updated = original.copyWith(theme: ThemePreference.dark);

        expect(original.theme, equals(ThemePreference.system));
        expect(updated.theme, equals(ThemePreference.dark));
        expect(
          updated.notificationsEnabled,
          equals(original.notificationsEnabled),
        );
      });

      test('creates new instance with updated notifications', () {
        final original = UserPreferences.defaults();
        final updated = original.copyWith(notificationsEnabled: false);

        expect(original.notificationsEnabled, isTrue);
        expect(updated.notificationsEnabled, isFalse);
        expect(updated.theme, equals(original.theme));
      });

      test('preserves id through copyWith', () {
        final original = UserPreferences(
          id: 42,
          theme: ThemePreference.system,
          notificationsEnabled: true,
        );
        final updated = original.copyWith(theme: ThemePreference.light);

        expect(updated.id, equals(42));
      });
    });

    group('Equality', () {
      test('instances with same values are equal', () {
        final a = UserPreferences(
          id: 1,
          theme: ThemePreference.dark,
          notificationsEnabled: true,
        );
        final b = UserPreferences(
          id: 1,
          theme: ThemePreference.dark,
          notificationsEnabled: true,
        );

        expect(a, equals(b));
        expect(a.hashCode, equals(b.hashCode));
      });

      test('instances with different values are not equal', () {
        final a = UserPreferences.defaults();
        final b = a.copyWith(theme: ThemePreference.dark);

        expect(a, isNot(equals(b)));
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
  });

  group('PreferenceKeys', () {
    test('theme key is defined', () {
      expect(PreferenceKeys.theme, equals('theme'));
    });

    test('notificationsEnabled key is defined', () {
      expect(
        PreferenceKeys.notificationsEnabled,
        equals('notificationsEnabled'),
      );
    });

    test('all contains all preference keys', () {
      expect(PreferenceKeys.all, contains(PreferenceKeys.theme));
      expect(PreferenceKeys.all, contains(PreferenceKeys.notificationsEnabled));
    });

    test('isValid validates keys correctly', () {
      expect(PreferenceKeys.isValid('theme'), isTrue);
      expect(PreferenceKeys.isValid('notificationsEnabled'), isTrue);
      expect(PreferenceKeys.isValid('invalidKey'), isFalse);
    });
  });

  group('PreferenceDefaults', () {
    test('theme default is system string', () {
      expect(PreferenceDefaults.theme, equals('system'));
    });

    test('notificationsEnabled default is true', () {
      expect(PreferenceDefaults.notificationsEnabled, isTrue);
    });
  });
}
