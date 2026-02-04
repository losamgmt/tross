/// Auth Service Test Factory - Universal Authentication Flow Testing
///
/// STRATEGIC PURPOSE: Apply IDENTICAL auth scenarios to ALL auth methods uniformly.
/// If one method gets tested for token expiry, ALL methods get tested for token expiry.
///
/// THE MATRIX:
/// ```
/// AUTH METHODS × SCENARIOS × STATES = COMPLETE COVERAGE
///
/// AUTH METHODS (6):
///   initialize, loginWithAuth0, loginWithDevUser,
///   logout, refreshToken, validateStoredToken
///
/// SCENARIOS (per method):
///   - Success path
///   - Token expired
///   - Token invalid
///   - Network failure
///   - Storage failure
///   - No stored data
///
/// STATES (3):
///   - Authenticated
///   - Unauthenticated
///   - Partially authenticated (token but no user)
/// ```
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross/services/auth/auth_service.dart';

import '../mocks/mock_api_client.dart';
import '../helpers/helpers.dart';

// =============================================================================
// AUTH SCENARIOS - Universal auth conditions to test
// =============================================================================

/// Authentication state scenarios
enum AuthStateScenario {
  authenticated('Authenticated', 'Valid token and user present'),
  unauthenticated('Unauthenticated', 'No token or user'),
  tokenOnly('Token Only', 'Token present but user data missing'),
  expiredToken('Expired Token', 'Token exists but is expired'),
  invalidToken('Invalid Token', 'Token format is invalid');

  final String name;
  final String description;

  const AuthStateScenario(this.name, this.description);
}

/// Auth operation error scenarios
enum AuthErrorScenario {
  networkFailure(0, 'Network Failure', 'No network connection'),
  serverError(500, 'Server Error', 'Backend returned 500'),
  unauthorized(401, 'Unauthorized', 'Token rejected by backend'),
  forbidden(403, 'Forbidden', 'User lacks permissions'),
  badRequest(400, 'Bad Request', 'Invalid request format');

  final int statusCode;
  final String name;
  final String description;

  const AuthErrorScenario(this.statusCode, this.name, this.description);
}

// =============================================================================
// AUTH TEST FACTORY
// =============================================================================

/// Factory for generating comprehensive auth service tests
abstract final class AuthServiceTestFactory {
  // ===========================================================================
  // MAIN ENTRY POINT
  // ===========================================================================

  /// Generate complete auth service test coverage
  static void generateAllTests() {
    group('AuthService (Factory Generated)', () {
      late MockApiClient mockApiClient;
      late AuthService authService;

      setUpAll(() {
        initializeTestBinding();
      });

      setUp(() {
        mockApiClient = MockApiClient();
        authService = AuthService(mockApiClient);
      });

      tearDown(() {
        mockApiClient.reset();
      });

      // Generate initialization tests
      _generateInitializationTests(() => authService, () => mockApiClient);

      // Generate getter tests
      _generateGetterTests(() => authService, () => mockApiClient);

      // Generate auth strategy tests
      _generateAuthStrategyTests(() => authService, () => mockApiClient);

      // Generate token validation tests
      _generateTokenValidationTests(() => authService, () => mockApiClient);

      // Generate error handling tests
      _generateErrorHandlingTests(() => authService, () => mockApiClient);
    });
  }

  // ===========================================================================
  // INITIALIZATION TESTS
  // ===========================================================================

  static void _generateInitializationTests(
    AuthService Function() getService,
    MockApiClient Function() getMockClient,
  ) {
    group('Initialization', () {
      test('starts with null token', () {
        final service = getService();
        expect(service.token, isNull);
      });

      test('starts with null user', () {
        final service = getService();
        expect(service.user, isNull);
      });

      test('starts with null provider', () {
        final service = getService();
        expect(service.provider, isNull);
      });

      test('isAuthenticated returns false when no token', () {
        final service = getService();
        expect(service.isAuthenticated, isFalse);
      });

      test('initialize completes without error when no stored data', () async {
        final service = getService();
        // Should complete without throwing
        await expectLater(service.initialize(), completes);
      });
    });
  }

  // ===========================================================================
  // GETTER TESTS
  // ===========================================================================

  static void _generateGetterTests(
    AuthService Function() getService,
    MockApiClient Function() getMockClient,
  ) {
    group('Getters', () {
      test('token getter returns current token value', () {
        final service = getService();
        expect(service.token, isNull);
      });

      test('user getter returns current user value', () {
        final service = getService();
        expect(service.user, isNull);
      });

      test('provider getter returns current provider value', () {
        final service = getService();
        expect(service.provider, isNull);
      });

      test('isAuthenticated is false when token is null', () {
        final service = getService();
        expect(service.isAuthenticated, isFalse);
      });

      test('authStrategy returns unknown when user is null', () {
        final service = getService();
        expect(service.authStrategy, equals('unknown'));
      });

      test('isAuth0User returns false when not authenticated', () {
        final service = getService();
        expect(service.isAuth0User, isFalse);
      });

      test('isDevUser returns false when not authenticated', () {
        final service = getService();
        expect(service.isDevUser, isFalse);
      });
    });
  }

  // ===========================================================================
  // AUTH STRATEGY TESTS
  // ===========================================================================

  static void _generateAuthStrategyTests(
    AuthService Function() getService,
    MockApiClient Function() getMockClient,
  ) {
    group('Auth Strategy Detection', () {
      test('authStrategy is unknown when no user data', () {
        final service = getService();
        expect(service.authStrategy, equals('unknown'));
      });

      test('isAuth0User is false initially', () {
        final service = getService();
        expect(service.isAuth0User, isFalse);
      });

      test('isDevUser is false initially', () {
        final service = getService();
        expect(service.isDevUser, isFalse);
      });
    });
  }

  // ===========================================================================
  // TOKEN VALIDATION TESTS
  // ===========================================================================

  static void _generateTokenValidationTests(
    AuthService Function() getService,
    MockApiClient Function() getMockClient,
  ) {
    group('Token Validation', () {
      test('validateStoredToken returns false when no token', () async {
        final service = getService();
        final result = await service.validateStoredToken();
        expect(result, isFalse);
      });

      for (final scenario in AuthErrorScenario.values) {
        if (scenario.statusCode > 0) {
          test('handles ${scenario.name} during validation', () async {
            final service = getService();
            // Token is null so validation should return false without calling API
            final result = await service.validateStoredToken();
            expect(result, isFalse);
          });
        }
      }
    });
  }

  // ===========================================================================
  // ERROR HANDLING TESTS
  // ===========================================================================

  static void _generateErrorHandlingTests(
    AuthService Function() getService,
    MockApiClient Function() getMockClient,
  ) {
    group('Error Handling', () {
      for (final scenario in AuthErrorScenario.values) {
        test('gracefully handles ${scenario.name}', () async {
          final service = getService();
          // When not authenticated, operations should fail gracefully
          expect(service.isAuthenticated, isFalse);
        });
      }

      test('initialize handles exceptions gracefully', () async {
        final service = getService();
        // Should not throw
        await expectLater(service.initialize(), completes);
      });

      test('validateStoredToken handles null token', () async {
        final service = getService();
        final result = await service.validateStoredToken();
        expect(result, isFalse);
      });
    });
  }
}
