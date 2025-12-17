import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/config/preference_keys.dart';

void main() {
  group('ThemePreference', () {
    test('has expected values', () {
      expect(ThemePreference.values, hasLength(3));
      expect(ThemePreference.values, contains(ThemePreference.system));
      expect(ThemePreference.values, contains(ThemePreference.light));
      expect(ThemePreference.values, contains(ThemePreference.dark));
    });

    test('value property returns correct strings', () {
      expect(ThemePreference.system.value, 'system');
      expect(ThemePreference.light.value, 'light');
      expect(ThemePreference.dark.value, 'dark');
    });

    group('fromString', () {
      test('parses valid values', () {
        expect(ThemePreference.fromString('system'), ThemePreference.system);
        expect(ThemePreference.fromString('light'), ThemePreference.light);
        expect(ThemePreference.fromString('dark'), ThemePreference.dark);
      });

      test('returns system for invalid values', () {
        expect(ThemePreference.fromString('invalid'), ThemePreference.system);
        expect(ThemePreference.fromString(''), ThemePreference.system);
        expect(ThemePreference.fromString('DARK'), ThemePreference.system);
      });
    });
  });

  group('PreferenceKeys', () {
    test('theme key is correct', () {
      expect(PreferenceKeys.theme, 'theme');
    });

    test('notificationsEnabled key is correct', () {
      expect(PreferenceKeys.notificationsEnabled, 'notificationsEnabled');
    });

    test('all contains all keys', () {
      expect(PreferenceKeys.all, contains(PreferenceKeys.theme));
      expect(PreferenceKeys.all, contains(PreferenceKeys.notificationsEnabled));
      expect(PreferenceKeys.all, hasLength(2));
    });

    group('isValid', () {
      test('returns true for valid keys', () {
        expect(PreferenceKeys.isValid('theme'), isTrue);
        expect(PreferenceKeys.isValid('notificationsEnabled'), isTrue);
      });

      test('returns false for invalid keys', () {
        expect(PreferenceKeys.isValid('invalid'), isFalse);
        expect(PreferenceKeys.isValid(''), isFalse);
        expect(PreferenceKeys.isValid('Theme'), isFalse); // Case sensitive
      });
    });
  });

  group('PreferenceDefaults', () {
    test('theme default is system', () {
      expect(PreferenceDefaults.theme, 'system');
    });

    test('notificationsEnabled default is true', () {
      expect(PreferenceDefaults.notificationsEnabled, isTrue);
    });

    test('all returns complete defaults map', () {
      final defaults = PreferenceDefaults.all;
      expect(defaults, hasLength(2));
      expect(defaults[PreferenceKeys.theme], 'system');
      expect(defaults[PreferenceKeys.notificationsEnabled], isTrue);
    });
  });

  group('PreferenceSchema', () {
    test('theme schema has correct structure', () {
      final schema = PreferenceSchema.theme;
      expect(schema['type'], 'enum');
      expect(schema['values'], ['system', 'light', 'dark']);
      expect(schema['default'], 'system');
      expect(schema['description'], isNotEmpty);
    });

    test('notificationsEnabled schema has correct structure', () {
      final schema = PreferenceSchema.notificationsEnabled;
      expect(schema['type'], 'boolean');
      expect(schema['default'], isTrue);
      expect(schema['description'], isNotEmpty);
    });

    group('getSchema', () {
      test('returns schema for valid keys', () {
        expect(PreferenceSchema.getSchema('theme'), isNotNull);
        expect(PreferenceSchema.getSchema('notificationsEnabled'), isNotNull);
      });

      test('returns null for invalid keys', () {
        expect(PreferenceSchema.getSchema('invalid'), isNull);
        expect(PreferenceSchema.getSchema(''), isNull);
      });
    });
  });

  group('UserPreferences', () {
    group('fromJson', () {
      test('parses complete response', () {
        final json = {
          'id': 1,
          'user_id': 42,
          'preferences': {'theme': 'dark', 'notificationsEnabled': false},
          'created_at': '2024-01-01T00:00:00Z',
          'updated_at': '2024-01-02T00:00:00Z',
        };

        final prefs = UserPreferences.fromJson(json);

        expect(prefs.id, 1);
        expect(prefs.userId, 42);
        expect(prefs.theme, ThemePreference.dark);
        expect(prefs.notificationsEnabled, isFalse);
        expect(prefs.createdAt, isNotNull);
        expect(prefs.updatedAt, isNotNull);
      });

      test('handles missing preferences', () {
        final json = {'id': 1, 'user_id': 42};

        final prefs = UserPreferences.fromJson(json);

        expect(prefs.theme, ThemePreference.system); // Default
        expect(prefs.notificationsEnabled, isTrue); // Default
      });

      test('handles empty preferences', () {
        final json = {
          'id': 1,
          'user_id': 42,
          'preferences': <String, dynamic>{},
        };

        final prefs = UserPreferences.fromJson(json);

        expect(prefs.theme, ThemePreference.system);
        expect(prefs.notificationsEnabled, isTrue);
      });

      test('handles invalid theme value', () {
        final json = {
          'id': 1,
          'user_id': 42,
          'preferences': {'theme': 'invalid'},
        };

        final prefs = UserPreferences.fromJson(json);

        expect(prefs.theme, ThemePreference.system); // Falls back to default
      });
    });

    group('defaults', () {
      test('creates preferences with default values', () {
        final prefs = UserPreferences.defaults();

        expect(prefs.id, isNull);
        expect(prefs.userId, isNull);
        expect(prefs.theme, ThemePreference.system);
        expect(prefs.notificationsEnabled, isTrue);
        expect(prefs.createdAt, isNull);
        expect(prefs.updatedAt, isNull);
      });
    });

    group('toJson', () {
      test('converts to correct format', () {
        final prefs = UserPreferences(
          id: 1,
          userId: 42,
          theme: ThemePreference.dark,
          notificationsEnabled: false,
        );

        final json = prefs.toJson();

        expect(json['theme'], 'dark');
        expect(json['notificationsEnabled'], isFalse);
      });
    });

    group('copyWith', () {
      test('creates copy with updated theme', () {
        final original = UserPreferences(
          id: 1,
          userId: 42,
          theme: ThemePreference.system,
          notificationsEnabled: true,
        );

        final copy = original.copyWith(theme: ThemePreference.dark);

        expect(copy.id, 1);
        expect(copy.userId, 42);
        expect(copy.theme, ThemePreference.dark);
        expect(copy.notificationsEnabled, isTrue);
        expect(original.theme, ThemePreference.system); // Original unchanged
      });

      test('creates copy with updated notifications', () {
        final original = UserPreferences(
          id: 1,
          userId: 42,
          theme: ThemePreference.system,
          notificationsEnabled: true,
        );

        final copy = original.copyWith(notificationsEnabled: false);

        expect(copy.notificationsEnabled, isFalse);
        expect(original.notificationsEnabled, isTrue); // Original unchanged
      });

      test('creates copy with multiple updates', () {
        final original = UserPreferences.defaults();

        final copy = original.copyWith(
          id: 5,
          userId: 100,
          theme: ThemePreference.light,
          notificationsEnabled: false,
        );

        expect(copy.id, 5);
        expect(copy.userId, 100);
        expect(copy.theme, ThemePreference.light);
        expect(copy.notificationsEnabled, isFalse);
      });
    });

    group('equality', () {
      test('equal preferences are equal', () {
        final prefs1 = UserPreferences(
          id: 1,
          userId: 42,
          theme: ThemePreference.dark,
          notificationsEnabled: true,
        );
        final prefs2 = UserPreferences(
          id: 1,
          userId: 42,
          theme: ThemePreference.dark,
          notificationsEnabled: true,
        );

        expect(prefs1, equals(prefs2));
        expect(prefs1.hashCode, equals(prefs2.hashCode));
      });

      test('different preferences are not equal', () {
        final prefs1 = UserPreferences(
          id: 1,
          userId: 42,
          theme: ThemePreference.dark,
          notificationsEnabled: true,
        );
        final prefs2 = UserPreferences(
          id: 1,
          userId: 42,
          theme: ThemePreference.light, // Different
          notificationsEnabled: true,
        );

        expect(prefs1, isNot(equals(prefs2)));
      });
    });

    test('toString returns useful representation', () {
      final prefs = UserPreferences(
        theme: ThemePreference.dark,
        notificationsEnabled: false,
      );

      final str = prefs.toString();

      expect(str, contains('dark'));
      expect(str, contains('false'));
    });
  });
}
