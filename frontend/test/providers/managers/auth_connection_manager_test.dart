/// AuthConnectionManager Unit Tests
///
/// Tests auth lifecycle management, login/logout callbacks, and cleanup.
/// Following TEST_PHILOSOPHY.md behavioral testing patterns.
library;

import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross/providers/auth_provider.dart';
import 'package:tross/providers/managers/auth_connection_manager.dart';

void main() {
  group('AuthConnectionManager', () {
    group('initial state', () {
      test('userRole defaults to customer', () {
        final manager = AuthConnectionManager(onLogin: () {}, onLogout: () {});

        expect(manager.userRole, 'customer');
      });

      test('isAuthenticated defaults to false', () {
        final manager = AuthConnectionManager(onLogin: () {}, onLogout: () {});

        expect(manager.isAuthenticated, false);
      });
    });

    group('connect', () {
      test('subscribes to auth provider', () async {
        final auth = _TestableAuthProvider();
        final manager = AuthConnectionManager(onLogin: () {}, onLogout: () {});

        expect(auth.listenerCount, 0);

        await manager.connect(auth);

        expect(auth.listenerCount, 1);
      });

      test('does not call onLogin when not authenticated', () async {
        final auth = _TestableAuthProvider();
        bool loginCalled = false;
        final manager = AuthConnectionManager(
          onLogin: () => loginCalled = true,
          onLogout: () {},
        );

        await manager.connect(auth);

        expect(loginCalled, false);
      });

      test('calls onLogin when initially authenticated', () async {
        final auth = _TestableAuthProvider()..setAuthenticated(true);
        bool loginCalled = false;
        final manager = AuthConnectionManager(
          onLogin: () => loginCalled = true,
          onLogout: () {},
        );

        await manager.connect(auth);

        expect(loginCalled, true);
      });

      test('awaits async onLogin before returning', () async {
        final auth = _TestableAuthProvider()..setAuthenticated(true);
        final callOrder = <String>[];
        final manager = AuthConnectionManager(
          onLogin: () async {
            await Future.delayed(Duration(milliseconds: 10));
            callOrder.add('login_complete');
          },
          onLogout: () {},
        );

        await manager.connect(auth);
        callOrder.add('connect_returned');

        // onLogin completes BEFORE connect returns
        expect(callOrder, ['login_complete', 'connect_returned']);
      });
    });

    group('auth state changes', () {
      test('calls onLogin when user logs in', () async {
        final auth = _TestableAuthProvider();
        bool loginCalled = false;
        final manager = AuthConnectionManager(
          onLogin: () => loginCalled = true,
          onLogout: () {},
        );
        await manager.connect(auth);
        expect(loginCalled, false);

        auth.setAuthenticated(true);
        await Future.delayed(
          Duration(milliseconds: 10),
        ); // Allow async to complete

        expect(loginCalled, true);
      });

      test('calls onLogout when user logs out', () async {
        final auth = _TestableAuthProvider()..setAuthenticated(true);
        bool logoutCalled = false;
        final manager = AuthConnectionManager(
          onLogin: () {},
          onLogout: () => logoutCalled = true,
        );
        await manager.connect(auth);

        auth.setAuthenticated(false);
        await Future.delayed(
          Duration(milliseconds: 10),
        ); // Allow async to complete

        expect(logoutCalled, true);
      });

      test('does not call onLogin when already authenticated', () async {
        final auth = _TestableAuthProvider()..setAuthenticated(true);
        int loginCount = 0;
        final manager = AuthConnectionManager(
          onLogin: () => loginCount++,
          onLogout: () {},
        );
        await manager.connect(auth);
        expect(loginCount, 1); // Called once on connect

        // Trigger listener without changing auth state
        auth.triggerNotify();
        await Future.delayed(Duration(milliseconds: 10));

        expect(loginCount, 1); // Should not have been called again
      });

      test('does not call onLogout when already logged out', () async {
        final auth = _TestableAuthProvider();
        int logoutCount = 0;
        final manager = AuthConnectionManager(
          onLogin: () {},
          onLogout: () => logoutCount++,
        );
        await manager.connect(auth);

        // Trigger listener without changing auth state
        auth.triggerNotify();
        await Future.delayed(Duration(milliseconds: 10));

        expect(logoutCount, 0);
      });
    });

    group('getters after connect', () {
      test('userRole reflects auth provider role', () async {
        final auth = _TestableAuthProvider()
          ..setAuthenticated(true)
          ..setRole('manager');
        final manager = AuthConnectionManager(onLogin: () {}, onLogout: () {});

        await manager.connect(auth);

        expect(manager.userRole, 'manager');
      });

      test('isAuthenticated reflects auth provider state', () async {
        final auth = _TestableAuthProvider()..setAuthenticated(true);
        final manager = AuthConnectionManager(onLogin: () {}, onLogout: () {});

        await manager.connect(auth);

        expect(manager.isAuthenticated, true);
      });
    });

    group('dispose', () {
      test('removes listener from auth provider', () async {
        final auth = _TestableAuthProvider();
        final manager = AuthConnectionManager(onLogin: () {}, onLogout: () {});
        await manager.connect(auth);
        expect(auth.listenerCount, 1);

        manager.dispose();

        expect(auth.listenerCount, 0);
      });

      test('prevents further callback execution', () async {
        final auth = _TestableAuthProvider();
        bool loginCalled = false;
        final manager = AuthConnectionManager(
          onLogin: () => loginCalled = true,
          onLogout: () {},
        );
        await manager.connect(auth);

        manager.dispose();
        auth.setAuthenticated(true);
        await Future.delayed(Duration(milliseconds: 10));

        // Listener was removed, so login should not be called
        expect(loginCalled, false);
      });
    });

    group('async callback handling', () {
      test('awaits async onLogin callback', () async {
        final auth = _TestableAuthProvider();
        final completer = Completer<void>();
        bool loginComplete = false;
        final manager = AuthConnectionManager(
          onLogin: () async {
            await completer.future;
            loginComplete = true;
          },
          onLogout: () {},
        );
        await manager.connect(auth);

        auth.setAuthenticated(true);
        await Future.delayed(Duration(milliseconds: 10));

        // Login started but not complete
        expect(loginComplete, false);

        completer.complete();
        await Future.delayed(Duration(milliseconds: 10));

        expect(loginComplete, true);
      });

      test('awaits async onLogout callback', () async {
        final auth = _TestableAuthProvider()..setAuthenticated(true);
        final completer = Completer<void>();
        bool logoutComplete = false;
        final manager = AuthConnectionManager(
          onLogin: () {},
          onLogout: () async {
            await completer.future;
            logoutComplete = true;
          },
        );
        await manager.connect(auth);

        auth.setAuthenticated(false);
        await Future.delayed(Duration(milliseconds: 10));

        // Logout started but not complete
        expect(logoutComplete, false);

        completer.complete();
        await Future.delayed(Duration(milliseconds: 10));

        expect(logoutComplete, true);
      });

      test('handles sync callbacks', () async {
        final auth = _TestableAuthProvider();
        bool loginCalled = false;
        // Using sync callback (no async/await)
        final manager = AuthConnectionManager(
          onLogin: () {
            loginCalled = true;
          },
          onLogout: () {},
        );
        await manager.connect(auth);

        auth.setAuthenticated(true);
        await Future.delayed(Duration(milliseconds: 10));

        expect(loginCalled, true);
      });
    });
  });
}

/// Testable auth provider for unit tests
///
/// Provides listenerCount tracking and setAuthenticated/setRole methods
/// for controlling auth state in tests.
class _TestableAuthProvider extends ChangeNotifier implements AuthProvider {
  bool _isAuthenticated = false;
  String _role = 'customer';
  int _listenerCount = 0;

  @override
  bool get isAuthenticated => _isAuthenticated;

  int get listenerCount => _listenerCount;

  void setAuthenticated(bool value) {
    _isAuthenticated = value;
    notifyListeners();
  }

  void setRole(String role) {
    _role = role;
  }

  /// Trigger notifyListeners without changing state (for testing edge cases)
  void triggerNotify() {
    notifyListeners();
  }

  @override
  void addListener(VoidCallback listener) {
    _listenerCount++;
    super.addListener(listener);
  }

  @override
  void removeListener(VoidCallback listener) {
    _listenerCount--;
    super.removeListener(listener);
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
  String? get token => null;
  @override
  String? get provider => null;
  @override
  String get userRole => _role;
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
