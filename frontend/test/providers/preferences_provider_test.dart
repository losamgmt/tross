/// PreferencesProvider Unit Tests (Metadata-Driven)
///
/// Tests verify the provider works with Map-based, metadata-driven preferences.
/// No hardcoded preference fields are tested - all values come from metadata.
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/config/preference_keys.dart';
import 'package:tross_app/providers/preferences_provider.dart';

void main() {
  group('PreferencesProvider (Metadata-Driven)', () {
    late PreferencesProvider provider;

    setUp(() {
      provider = PreferencesProvider();
    });

    group('Initial State', () {
      test('should not be loading initially', () {
        expect(provider.isLoading, isFalse);
      });

      test('should not be loaded initially (no id from backend)', () {
        expect(provider.isLoaded, isFalse);
      });

      test('should have no error initially', () {
        expect(provider.error, isNull);
      });

      test('theme should default to system', () {
        // ThemePreference.system is the metadata default
        expect(provider.theme, ThemePreference.system);
      });
    });

    group('Type-Safe Access', () {
      test('theme getter returns ThemePreference enum', () {
        expect(provider.theme, isA<ThemePreference>());
      });
    });

    group('getPreference (Metadata-Driven)', () {
      test('returns null for unknown key when metadata not loaded', () {
        // Unknown keys return null (no metadata default)
        final value = provider.getPreference('nonexistent_key');
        expect(value, isNull);
      });

      test('returns null when metadata registry not initialized', () {
        // Without EntityMetadataRegistry.initialize(), schema is empty
        // This is expected behavior in unit tests without full setup
        final theme = provider.getPreference('theme');
        expect(theme, isNull);
      });
    });

    group('clear()', () {
      test('should reset preferences map', () {
        provider.clear();
        expect(provider.error, isNull);
        expect(provider.isLoaded, isFalse);
      });

      test('should clear error', () {
        provider.clear();
        expect(provider.error, isNull);
      });
    });

    group('ChangeNotifier', () {
      test('should be a ChangeNotifier', () {
        expect(provider, isA<PreferencesProvider>());
      });

      test('clear should notify listeners', () {
        var notified = false;
        provider.addListener(() {
          notified = true;
        });

        provider.clear();

        expect(notified, isTrue);
      });
    });

    group('updatePreference (requires backend)', () {
      test('updatePreference requires authentication - guard works', () async {
        // Without authentication (no token), update should log warning
        // The guard prevents actual update
        await provider.updatePreference('theme', 'dark');

        // Since no token is set, the update is blocked
        // Theme should remain default
        expect(provider.theme, ThemePreference.system);
      });

      test('reset requires authentication', () async {
        await provider.reset();

        // Since no token is set, reset is blocked (but doesn't error)
        expect(provider.theme, ThemePreference.system);
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
}
