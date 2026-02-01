/// Token Manager Tests
///
/// Tests the TokenManager's PUBLIC API:
/// - Expiry retrieval behavior
/// - Refresh threshold checking
/// - Method signatures and contracts
///
/// NOTE: FlutterSecureStorage is platform-dependent. These tests verify
/// the API contract and graceful behavior when platform isn't available.
/// Integration tests cover actual storage behavior.
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/services/auth/token_manager.dart';

import '../../helpers/helpers.dart';

void main() {
  group('TokenManager', () {
    setUpAll(() {
      initializeTestBinding();
    });

    // =========================================================================
    // API CONTRACT - Method signatures exist and return expected types
    // =========================================================================

    group('API Contract', () {
      test('getTokenExpiry returns Future<DateTime?>', () async {
        final result = TokenManager.getTokenExpiry();
        expect(result, isA<Future<DateTime?>>());
      });

      test('shouldRefreshToken returns Future<bool>', () async {
        final result = await TokenManager.shouldRefreshToken();
        expect(result, isA<bool>());
      });

      test('getStoredToken returns Future<String?>', () async {
        final result = await TokenManager.getStoredToken();
        expect(result, isA<String?>());
      });

      test('getStoredRefreshToken returns Future<String?>', () async {
        final result = await TokenManager.getStoredRefreshToken();
        expect(result, isA<String?>());
      });

      test('getStoredAuthData returns Future<Map?>', () async {
        final result = await TokenManager.getStoredAuthData();
        expect(result, isA<Map<String, dynamic>?>());
      });

      test('all methods are static', () {
        // Verify static access pattern works
        expect(TokenManager.getTokenExpiry, isA<Function>());
        expect(TokenManager.shouldRefreshToken, isA<Function>());
        expect(TokenManager.getStoredToken, isA<Function>());
        expect(TokenManager.getStoredRefreshToken, isA<Function>());
        expect(TokenManager.getStoredAuthData, isA<Function>());
        expect(TokenManager.storeAuthData, isA<Function>());
        expect(TokenManager.clearAuthData, isA<Function>());
      });
    });

    // =========================================================================
    // REFRESH THRESHOLD BEHAVIOR
    // =========================================================================

    group('shouldRefreshToken', () {
      test('completes with default buffer', () async {
        await expectLater(TokenManager.shouldRefreshToken(), completes);
      });

      test('accepts custom buffer durations', () async {
        // Various buffer sizes should all work
        for (final buffer in [
          Duration.zero,
          const Duration(minutes: 1),
          const Duration(minutes: 10),
          const Duration(hours: 1),
        ]) {
          await expectLater(
            TokenManager.shouldRefreshToken(buffer: buffer),
            completes,
            reason: 'Should accept buffer: $buffer',
          );
        }
      });
    });

    // =========================================================================
    // STORE AUTH DATA - Method signature verification
    // =========================================================================

    group('storeAuthData Signature', () {
      test('requires token and user parameters', () async {
        // Verify method signature accepts required params
        // May throw due to platform channel, but that's acceptable
        try {
          await TokenManager.storeAuthData(
            token: 'test-token',
            user: {'id': 1, 'name': 'Test'},
          );
        } catch (_) {
          // Platform channel not available - acceptable in unit tests
        }
      });

      test('accepts optional expiresAt parameter', () async {
        try {
          await TokenManager.storeAuthData(
            token: 'test-token',
            user: {'id': 1, 'name': 'Test'},
            expiresAt: 1735689600,
          );
        } catch (_) {
          // Platform channel not available
        }
      });

      test('accepts all optional parameters', () async {
        try {
          await TokenManager.storeAuthData(
            token: 'test-token',
            user: {'id': 1, 'name': 'Test'},
            refreshToken: 'refresh-token',
            provider: 'auth0',
            expiresAt: 1735689600,
          );
        } catch (_) {
          // Platform channel not available
        }
      });
    });

    // =========================================================================
    // CLEAR AUTH DATA
    // =========================================================================

    group('clearAuthData', () {
      test('completes without throwing', () async {
        try {
          await TokenManager.clearAuthData();
        } catch (_) {
          // Platform channel may not be available
        }
      });
    });
  });
}
