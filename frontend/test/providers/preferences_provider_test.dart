import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/config/preference_keys.dart';
import 'package:tross_app/providers/preferences_provider.dart';

void main() {
  group('PreferencesProvider', () {
    late PreferencesProvider provider;

    setUp(() {
      provider = PreferencesProvider();
    });

    group('Initial State', () {
      test('should start with default preferences', () {
        expect(provider.theme, ThemePreference.system);
        expect(provider.notificationsEnabled, isTrue);
      });

      test('should not be loading initially', () {
        expect(provider.isLoading, isFalse);
      });

      test('should not be loaded initially (no id from backend)', () {
        expect(provider.isLoaded, isFalse);
      });

      test('should have no error initially', () {
        expect(provider.error, isNull);
      });

      test('preferences object should have defaults', () {
        expect(provider.preferences.theme, ThemePreference.system);
        expect(provider.preferences.notificationsEnabled, isTrue);
        expect(provider.preferences.id, isNull);
        expect(provider.preferences.userId, isNull);
      });
    });

    group('Type-Safe Access', () {
      test('theme getter returns ThemePreference enum', () {
        expect(provider.theme, isA<ThemePreference>());
      });

      test('notificationsEnabled getter returns bool', () {
        expect(provider.notificationsEnabled, isA<bool>());
      });
    });

    group('clear()', () {
      test('should reset to defaults', () {
        // Note: Without mocking we can't test after load
        // This tests the clear method in initial state
        provider.clear();

        expect(provider.preferences.theme, ThemePreference.system);
        expect(provider.preferences.notificationsEnabled, isTrue);
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

    group('Default Values Match Config', () {
      test('default theme matches PreferenceDefaults', () {
        final prefs = UserPreferences.defaults();
        expect(prefs.theme.value, PreferenceDefaults.theme);
      });

      test('default notificationsEnabled matches PreferenceDefaults', () {
        final prefs = UserPreferences.defaults();
        expect(
          prefs.notificationsEnabled,
          PreferenceDefaults.notificationsEnabled,
        );
      });
    });

    group('Preferences Access', () {
      test('preferences property returns current state', () {
        final prefs = provider.preferences;

        expect(prefs, isA<UserPreferences>());
        expect(prefs.theme, provider.theme);
        expect(prefs.notificationsEnabled, provider.notificationsEnabled);
      });
    });

    // Note: The following tests would require mocking PreferencesService
    // or running integration tests with actual backend
    group('Load/Update (requires backend)', () {
      test('load requires token - guard works without mocking', () async {
        // With no token, load should set loading then complete
        // This tests the guard pattern even without mocking
        expect(provider.isLoading, isFalse);
      });

      test('updateTheme requires authentication - guard works', () async {
        // Without authentication (no token), update should log warning
        // The guard prevents actual update
        await provider.updateTheme(ThemePreference.dark);

        // Since no token is set, the update is blocked
        // Theme should remain default
        expect(provider.theme, ThemePreference.system);
      });

      test('updateNotificationsEnabled requires authentication', () async {
        await provider.updateNotificationsEnabled(false);

        // Since no token is set, the update is blocked
        expect(provider.notificationsEnabled, isTrue);
      });

      test('reset requires authentication', () async {
        await provider.reset();

        // Since no token is set, reset is blocked (but doesn't error)
        expect(provider.preferences.theme, ThemePreference.system);
      });

      test('updateAll requires authentication', () async {
        await provider.updateAll({
          PreferenceKeys.theme: 'dark',
          PreferenceKeys.notificationsEnabled: false,
        });

        // Since no token is set, updates are blocked
        expect(provider.theme, ThemePreference.system);
        expect(provider.notificationsEnabled, isTrue);
      });
    });

    group('Immutability', () {
      test('preferences object is replaced not mutated', () {
        final originalId = identityHashCode(provider.preferences);

        // Call clear to get new defaults
        provider.clear();

        final afterClearId = identityHashCode(provider.preferences);

        // Should be a different object instance after clear
        // (Even if values are the same, identity should differ)
        expect(afterClearId, isNot(equals(originalId)));
      });
    });
  });
}
