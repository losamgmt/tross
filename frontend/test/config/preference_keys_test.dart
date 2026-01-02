/// ThemePreference Unit Tests
///
/// Tests only the ThemePreference enum, which is the only typed element
/// remaining in preference_keys.dart. All other preference handling is
/// now metadata-driven via EntityMetadataRegistry.preferenceSchema.
library;

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

      test('handles null by returning system default', () {
        // ThemePreference.fromString uses ?? to handle null
        expect(ThemePreference.fromString(''), ThemePreference.system);
      });
    });

    test('enum name matches value for serialization', () {
      // Ensure each enum's name matches its value for consistent serialization
      for (final theme in ThemePreference.values) {
        expect(theme.value, theme.name);
      }
    });
  });
}
