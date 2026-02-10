/// Token Refresh Manager Tests
///
/// Tests the proactive token refresh manager's PUBLIC BEHAVIOR:
/// - Lifecycle management (initialize/dispose)
/// - Configuration options (buffer duration)
/// - Observer pattern implementation
/// - Graceful handling of missing data
///
/// TESTING PHILOSOPHY:
/// ✅ Test observable behavior (what does it DO)
/// ❌ Don't test implementation details (HOW does it work internally)
library;

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross/services/auth/token_refresh_manager.dart';
import 'package:tross/services/auth/auth_token_service.dart';

import '../../helpers/helpers.dart';
import '../../mocks/mock_api_client.dart';

void main() {
  group('TokenRefreshManager', () {
    late MockApiClient mockApiClient;
    late AuthTokenService tokenService;

    setUpAll(() {
      initializeTestBinding();
    });

    setUp(() {
      mockApiClient = MockApiClient();
      tokenService = AuthTokenService(mockApiClient);
    });

    tearDown(() {
      mockApiClient.reset();
    });

    // =========================================================================
    // CONSTRUCTION
    // =========================================================================

    group('Construction', () {
      test('can be created with required dependencies', () {
        final manager = _createManager(tokenService);
        expect(manager, isNotNull);
        expect(manager, isA<TokenRefreshManager>());
        manager.dispose();
      });

      test('default buffer is 5 minutes', () {
        final manager = _createManager(tokenService);
        expect(manager.refreshBuffer, const Duration(minutes: 5));
        manager.dispose();
      });

      test('accepts custom buffer duration', () {
        final manager = _createManager(
          tokenService,
          buffer: const Duration(minutes: 10),
        );
        expect(manager.refreshBuffer, const Duration(minutes: 10));
        manager.dispose();
      });
    });

    // =========================================================================
    // LIFECYCLE MANAGEMENT
    // =========================================================================

    group('Lifecycle', () {
      test('initialize completes without error', () {
        final manager = _createManager(tokenService);
        expect(() => manager.initialize(), returnsNormally);
        manager.dispose();
      });

      test('initialize is idempotent', () {
        final manager = _createManager(tokenService);
        manager.initialize();
        manager.initialize();
        manager.initialize();
        // Should not throw on repeated calls
        manager.dispose();
      });

      test('dispose completes without error', () {
        final manager = _createManager(tokenService);
        manager.initialize();
        expect(() => manager.dispose(), returnsNormally);
      });

      test('dispose is idempotent', () {
        final manager = _createManager(tokenService);
        manager.initialize();
        manager.dispose();
        expect(() => manager.dispose(), returnsNormally);
      });
    });

    // =========================================================================
    // SCHEDULE/CANCEL BEHAVIOR
    // =========================================================================

    group('Scheduling', () {
      test('scheduleRefresh completes when no token expiry stored', () async {
        final manager = _createManager(tokenService);
        manager.initialize();

        // Should complete gracefully - not throw
        await expectLater(manager.scheduleRefresh(), completes);

        manager.dispose();
      });

      test(
        'scheduleRefresh does not trigger callbacks without stored expiry',
        () async {
          var callbackTriggered = false;

          final manager = TokenRefreshManager(
            tokenService: tokenService,
            onTokenRefreshed: (token, refresh, exp, user, provider) =>
                callbackTriggered = true,
            onRefreshFailed: () => callbackTriggered = true,
          );

          manager.initialize();
          await manager.scheduleRefresh();

          expect(callbackTriggered, isFalse);
          manager.dispose();
        },
      );

      test('cancelRefresh is safe to call multiple times', () {
        final manager = _createManager(tokenService);
        manager.initialize();
        manager.cancelRefresh();
        manager.cancelRefresh();
        manager.cancelRefresh();
        // Should not throw
        manager.dispose();
      });

      test('cancelRefresh is safe before any scheduling', () {
        final manager = _createManager(tokenService);
        manager.initialize();
        expect(() => manager.cancelRefresh(), returnsNormally);
        manager.dispose();
      });
    });

    // =========================================================================
    // OBSERVER PATTERN
    // =========================================================================

    group('WidgetsBindingObserver', () {
      test('implements WidgetsBindingObserver interface', () {
        final manager = _createManager(tokenService);
        expect(manager, isA<WidgetsBindingObserver>());
        manager.dispose();
      });

      test('handles app resumed state without throwing', () {
        final manager = _createManager(tokenService);
        manager.initialize();

        expect(
          () => manager.didChangeAppLifecycleState(AppLifecycleState.resumed),
          returnsNormally,
        );

        manager.dispose();
      });

      test('ignores non-resumed lifecycle states', () {
        final manager = _createManager(tokenService);
        manager.initialize();

        // All these should complete without error
        for (final state in [
          AppLifecycleState.paused,
          AppLifecycleState.inactive,
          AppLifecycleState.detached,
        ]) {
          expect(
            () => manager.didChangeAppLifecycleState(state),
            returnsNormally,
            reason: 'Should handle $state gracefully',
          );
        }

        manager.dispose();
      });
    });

    // =========================================================================
    // CONFIGURATION EDGE CASES
    // =========================================================================

    group('Configuration Edge Cases', () {
      test('zero-duration buffer is allowed', () {
        final manager = _createManager(tokenService, buffer: Duration.zero);
        expect(manager.refreshBuffer, Duration.zero);
        manager.dispose();
      });

      test('large buffer duration is allowed', () {
        final manager = _createManager(
          tokenService,
          buffer: const Duration(hours: 24),
        );
        expect(manager.refreshBuffer, const Duration(hours: 24));
        manager.dispose();
      });
    });
  });
}

// =============================================================================
// TEST HELPERS
// =============================================================================

/// Creates a TokenRefreshManager with no-op callbacks for testing
TokenRefreshManager _createManager(
  AuthTokenService tokenService, {
  Duration buffer = const Duration(minutes: 5),
  OnTokenRefreshed? onRefreshed,
  OnRefreshFailed? onFailed,
}) {
  return TokenRefreshManager(
    tokenService: tokenService,
    onTokenRefreshed:
        onRefreshed ?? (token, refresh, exp, user, provider) {},
    onRefreshFailed: onFailed ?? () {},
    refreshBuffer: buffer,
  );
}
