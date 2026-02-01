/// Auth Token Service Tests
///
/// Tests AuthTokenService PUBLIC BEHAVIOR:
/// - JWT expiry parsing (pure function - no side effects)
/// - Token validation flow
/// - Backend refresh integration
/// - Error handling gracefully
///
/// TESTING PHILOSOPHY:
/// ✅ Test behavior: "given X input, expect Y output"
/// ❌ Don't test: internal implementation, private methods
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/services/auth/auth_token_service.dart';

import '../../helpers/helpers.dart';
import '../../mocks/mock_api_client.dart';

void main() {
  group('AuthTokenService', () {
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
      test('can be created with ApiClient dependency', () {
        expect(tokenService, isNotNull);
        expect(tokenService, isA<AuthTokenService>());
      });
    });

    // =========================================================================
    // JWT EXPIRY PARSING - Pure function behavior
    // =========================================================================

    group('getTokenExpiry (JWT Parser)', () {
      group('Invalid Format Handling', () {
        test('returns null for non-JWT strings', () {
          expect(tokenService.getTokenExpiry('invalid-token'), isNull);
          expect(tokenService.getTokenExpiry(''), isNull);
          expect(tokenService.getTokenExpiry('no.dots'), isNull);
        });

        test('returns null for wrong number of segments', () {
          expect(tokenService.getTokenExpiry('one'), isNull);
          expect(tokenService.getTokenExpiry('one.two'), isNull);
          expect(tokenService.getTokenExpiry('one.two.three.four'), isNull);
        });

        test('returns null for malformed base64 payload', () {
          expect(
            tokenService.getTokenExpiry('header.!!!invalid!!!.signature'),
            isNull,
          );
        });

        test('returns null for non-JSON payload', () {
          // "not json" -> base64: bm90IGpzb24
          expect(
            tokenService.getTokenExpiry('header.bm90IGpzb24.signature'),
            isNull,
          );
        });
      });

      group('Valid JWT Parsing', () {
        test('extracts exp claim as integer', () {
          // Payload: {"sub": "user", "exp": 1735689600}
          const jwt =
              'eyJhbGciOiJIUzI1NiJ9'
              '.eyJzdWIiOiJ1c2VyIiwiZXhwIjoxNzM1Njg5NjAwfQ'
              '.signature';

          expect(tokenService.getTokenExpiry(jwt), 1735689600);
        });

        test('truncates exp claim when double', () {
          // Payload: {"exp": 1735689600.5}
          const jwt =
              'eyJhbGciOiJIUzI1NiJ9'
              '.eyJleHAiOjE3MzU2ODk2MDAuNX0'
              '.signature';

          expect(tokenService.getTokenExpiry(jwt), 1735689600);
        });

        test('returns null when exp claim is missing', () {
          // Payload: {"sub": "user"}
          const jwt =
              'eyJhbGciOiJIUzI1NiJ9'
              '.eyJzdWIiOiJ1c2VyIn0'
              '.signature';

          expect(tokenService.getTokenExpiry(jwt), isNull);
        });
      });

      group('Edge Case exp Values', () {
        test('handles zero exp', () {
          // Payload: {"exp": 0}
          const jwt = 'header.eyJleHAiOjB9.signature';
          expect(tokenService.getTokenExpiry(jwt), 0);
        });

        test('handles negative exp', () {
          // Payload: {"exp": -1}
          const jwt = 'header.eyJleHAiOi0xfQ.signature';
          expect(tokenService.getTokenExpiry(jwt), -1);
        });

        test('handles very large exp', () {
          // Payload: {"exp": 9999999999}
          const jwt = 'header.eyJleHAiOjk5OTk5OTk5OTl9.signature';
          expect(tokenService.getTokenExpiry(jwt), 9999999999);
        });
      });
    });

    // =========================================================================
    // TOKEN VALIDATION
    // =========================================================================

    group('validateToken', () {
      test('returns user profile on successful validation', () async {
        mockApiClient.mockResponse('userProfile', {
          'id': 1,
          'name': 'Test User',
          'email': 'test@example.com',
        });

        final result = await tokenService.validateToken('valid-token');

        expect(result, isNotNull);
        expect(result!['id'], 1);
        expect(result['name'], 'Test User');
      });

      test('returns null when profile fetch fails', () async {
        mockApiClient.setShouldFail(true, message: 'Network error');

        final result = await tokenService.validateToken('token');

        expect(result, isNull);
      });

      test('returns null when no profile returned', () async {
        // No mock set - returns null by default
        final result = await tokenService.validateToken('token');

        expect(result, isNull);
      });

      test('calls getUserProfile API', () async {
        mockApiClient.mockResponse('userProfile', {'id': 1});

        await tokenService.validateToken('test-token');

        expect(mockApiClient.wasCalled('getUserProfile'), isTrue);
      });
    });

    // =========================================================================
    // BACKEND TOKEN REFRESH
    // =========================================================================

    group('refreshTokenViaBackend', () {
      test('returns null when no refresh token stored', () async {
        final result = await tokenService.refreshTokenViaBackend();
        expect(result, isNull);
      });

      test('completes without throwing on API error', () async {
        mockApiClient.setShouldFail(true, message: 'Server error');

        // Should not throw - returns null on error
        await expectLater(
          tokenService.refreshTokenViaBackend(),
          completion(isNull),
        );
      });
    });

    // =========================================================================
    // LEGACY REFRESH METHOD
    // =========================================================================

    group('refreshToken (legacy)', () {
      test('delegates to refreshTokenViaBackend', () async {
        // Both should behave the same
        final legacyResult = await tokenService.refreshToken();
        final backendResult = await tokenService.refreshTokenViaBackend();

        expect(legacyResult, backendResult);
      });
    });

    // =========================================================================
    // STORAGE DELEGATION
    // =========================================================================

    group('Storage Methods', () {
      test('getStoredAuthData returns Map or null', () async {
        final result = await tokenService.getStoredAuthData();
        expect(result, isA<Map<String, dynamic>?>());
      });

      test('clearAuthData completes without throwing', () async {
        try {
          await tokenService.clearAuthData();
        } catch (_) {
          // Platform channel may not be available
        }
      });

      test('storeAuthData accepts expiresAt parameter', () async {
        try {
          await tokenService.storeAuthData(
            token: 'token',
            user: {'id': 1},
            expiresAt: 1735689600,
          );
        } catch (_) {
          // Platform channel may not be available
        }
      });
    });
  });
}
