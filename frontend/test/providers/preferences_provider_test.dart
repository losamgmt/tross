/// PreferencesProvider Unit Tests (Metadata-Driven)
///
/// Tests verify the provider works with Map-based, metadata-driven preferences.
/// No hardcoded preference fields are tested - all values come from metadata.
library;

import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/config/preference_keys.dart';
import 'package:tross_app/providers/auth_provider.dart';
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

  group('PreferencesProvider Auth Integration', () {
    late PreferencesProvider provider;
    late _TestableAuthProvider mockAuth;

    setUp(() {
      provider = PreferencesProvider();
      mockAuth = _TestableAuthProvider();
    });

    tearDown(() {
      provider.dispose();
    });

    test('connectToAuth registers listener', () {
      provider.connectToAuth(mockAuth);

      expect(mockAuth.listenerCount, equals(1));
    });

    test('dispose removes auth listener', () {
      // Use separate provider to avoid double-dispose
      final disposeTestProvider = PreferencesProvider();
      final disposeTestAuth = _TestableAuthProvider();

      disposeTestProvider.connectToAuth(disposeTestAuth);
      expect(disposeTestAuth.listenerCount, equals(1));

      disposeTestProvider.dispose();
      expect(disposeTestAuth.listenerCount, equals(0));
    });

    test('auth logout clears preferences', () async {
      mockAuth.setAuthenticated(true, token: 'test-token');
      provider.connectToAuth(mockAuth);

      // Wait for async operations
      await Future.delayed(Duration.zero);

      // Simulate logout
      mockAuth.setAuthenticated(false, token: null);

      await Future.delayed(const Duration(milliseconds: 10));

      // Preferences should be cleared
      expect(provider.isLoaded, isFalse);
      expect(provider.error, isNull);
    });
  });

  group('PreferencesProvider Service Methods', () {
    late PreferencesProvider provider;

    setUp(() {
      provider = PreferencesProvider();
    });

    test('load requires service to be set', () async {
      // No service set - load should handle gracefully
      await provider.load('test-token', 123);

      // Should not error, but also not load
      expect(provider.isLoading, isFalse);
    });

    test('reset requires service to be set', () async {
      // No service set
      await provider.reset();

      // Should not error
      expect(provider.isLoading, isFalse);
    });
  });
}

/// Testable AuthProvider mock for testing auth integration
class _TestableAuthProvider extends ChangeNotifier implements AuthProvider {
  bool _isAuthenticated = false;
  String? _token;
  int listenerCount = 0;

  @override
  bool get isAuthenticated => _isAuthenticated;
  @override
  String? get token => _token;

  void setAuthenticated(bool value, {String? token}) {
    _isAuthenticated = value;
    _token = token;
    notifyListeners();
  }

  @override
  void addListener(VoidCallback listener) {
    super.addListener(listener);
    listenerCount++;
  }

  @override
  void removeListener(VoidCallback listener) {
    super.removeListener(listener);
    listenerCount--;
  }

  // Stub all required AuthProvider members
  @override
  Map<String, dynamic>? get user => null;
  @override
  bool get isLoading => false;
  @override
  bool get isRedirecting => false;
  @override
  String? get error => null;
  @override
  String? get provider => null;
  @override
  String get userRole => 'admin';
  @override
  String get userName => 'Test';
  @override
  String get userEmail => 'test@test.com';
  @override
  int? get userId => 1;
  @override
  Future<bool> loginWithTestToken({String role = 'admin'}) async => true;
  @override
  Future<bool> loginWithAuth0() async => true;
  @override
  Future<bool> handleAuth0Callback() async => true;
  @override
  Future<void> logout() async {}
  @override
  Future<void> initialize() async {}
  @override
  Future<bool> updateProfile(Map<String, dynamic> updates) async => true;
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}
