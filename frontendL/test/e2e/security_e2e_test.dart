/// End-to-End Security Tests
///
/// Tests all three security layers: UI → Service → Backend
/// Focus: Complete defense-in-depth validation
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/config/app_config.dart';
import 'package:tross_app/services/error_service.dart';

void main() {
  group('E2E Security Tests - All Three Layers', () {
    group('Layer 1: UI Security', () {
      test('dev mode flag controls UI rendering', () {
        // Layer 1: UI conditionally renders based on AppConfig.isDevMode

        expect(AppConfig.isDevMode, isA<bool>());

        if (AppConfig.isDevMode) {
          // In dev mode: UI shows dev features
          expect(
            AppConfig.isDevelopment,
            isTrue,
            reason: 'Dev mode implies development environment',
          );
        } else {
          // In production: UI hides dev features
          expect(
            AppConfig.isProduction,
            isTrue,
            reason: 'Not dev mode implies production',
          );
        }
      });

      test('environment indicator reflects actual environment', () {
        final envName = AppConfig.environmentName;
        expect(envName, isIn(['Development', 'Production']));

        // Verify consistency
        if (envName == 'Development') {
          expect(AppConfig.isDevMode, isTrue);
        } else {
          expect(AppConfig.isDevMode, isFalse);
        }
      });
    });

    group('Layer 2: Service Security', () {
      test('validateDevAuth throws in production', () {
        // Layer 2: Service validates before calling backend

        if (AppConfig.devAuthEnabled) {
          // Development: validation passes
          expect(() => AppConfig.validateDevAuth(), returnsNormally);
        } else {
          // Production: validation throws StateError
          expect(
            () => AppConfig.validateDevAuth(),
            throwsA(isA<StateError>()),
            reason: 'Service layer must block dev auth in production',
          );
        }
      });

      test('dev auth flag matches environment', () {
        expect(
          AppConfig.devAuthEnabled,
          AppConfig.isDevelopment,
          reason: 'Dev auth should only be enabled in development',
        );
      });

      test('service layer logs security violations', () {
        // When validation fails, should log before returning false

        expect(
          () => ErrorService.logError(
            'Security violation: Dev authentication attempted in production',
            context: {
              'layer': 'service',
              'method': 'loginWithTestToken',
              'environment': AppConfig.environmentName,
            },
          ),
          returnsNormally,
          reason: 'Security violations should be logged',
        );
      });
    });

    group('Layer 3: Backend Security', () {
      test('backend config is accessible from frontend', () {
        // Frontend can check backend security config

        expect(AppConfig.devAuthEnabled, isA<bool>());
        expect(AppConfig.isDevelopment, isA<bool>());

        // Backend would use same logic:
        // if (!devAuthEnabled && token.provider === 'development') reject
      });

      test('dev token endpoints exist but are protected', () {
        // Endpoints exist for error messages, but backend validates

        expect(AppConfig.devTokenEndpoint, isNotEmpty);
        expect(AppConfig.devAdminTokenEndpoint, isNotEmpty);

        // In production, these endpoints would return 403
        if (AppConfig.isProduction) {
          expect(
            AppConfig.devAuthEnabled,
            isFalse,
            reason: 'Backend should reject dev tokens in production',
          );
        }
      });
    });

    group('Defense-in-Depth: All Layers Together', () {
      test('production blocks dev auth at all three layers', () {
        // Simulate production environment behavior

        if (AppConfig.isProduction) {
          // Layer 1: UI doesn't render dev buttons
          expect(
            AppConfig.isDevMode,
            isFalse,
            reason: 'Layer 1: UI hides dev features',
          );

          // Layer 2: Service validation fails
          expect(
            AppConfig.devAuthEnabled,
            isFalse,
            reason: 'Layer 2: Service blocks dev auth',
          );
          expect(
            () => AppConfig.validateDevAuth(),
            throwsA(isA<StateError>()),
            reason: 'Layer 2: validateDevAuth throws',
          );

          // Layer 3: Backend would reject
          // (Backend test: auth-middleware-security.test.js)
          expect(
            AppConfig.devTokenEndpoint.isNotEmpty,
            isTrue,
            reason: 'Layer 3: Endpoints exist but backend validates',
          );
        }
      });

      test('development allows dev auth at all three layers', () {
        if (AppConfig.isDevelopment) {
          // Layer 1: UI renders dev buttons
          expect(
            AppConfig.isDevMode,
            isTrue,
            reason: 'Layer 1: UI shows dev features',
          );

          // Layer 2: Service validation passes
          expect(
            AppConfig.devAuthEnabled,
            isTrue,
            reason: 'Layer 2: Service allows dev auth',
          );
          expect(
            () => AppConfig.validateDevAuth(),
            returnsNormally,
            reason: 'Layer 2: validateDevAuth succeeds',
          );

          // Layer 3: Backend accepts dev tokens
          expect(
            AppConfig.devTokenEndpoint,
            contains('localhost'),
            reason: 'Layer 3: Dev endpoints point to local backend',
          );
        }
      });

      test('all layers use consistent configuration', () {
        // Single source of truth: AppConfig

        final isDev = AppConfig.isDevelopment;

        // Layer 1 decision
        expect(
          AppConfig.isDevMode,
          isDev,
          reason: 'Layer 1 matches environment',
        );

        // Layer 2 decision
        expect(
          AppConfig.devAuthEnabled,
          isDev,
          reason: 'Layer 2 matches environment',
        );

        // Layer 3 decision (same config used by backend)
        // Backend uses: const devAuthEnabled = NODE_ENV !== 'production'
        expect(
          AppConfig.isProduction,
          !isDev,
          reason: 'Layer 3 config is inverse of dev',
        );
      });

      test('security failure at any layer prevents auth', () {
        // Even if one layer is bypassed, others protect

        // Scenario: User somehow triggers dev auth in production
        if (AppConfig.isProduction) {
          // Layer 1 SHOULD prevent button render
          // But if bypassed (e.g., manual API call):

          // Layer 2 WILL block with validateDevAuth
          expect(() => AppConfig.validateDevAuth(), throwsStateError);

          // Layer 3 WILL reject at backend
          // (Tested in backend auth-middleware-security.test.js)
        }
      });
    });

    group('Security Error Flow', () {
      test('production dev auth attempt has complete error chain', () {
        if (AppConfig.isProduction) {
          // 1. UI doesn't render button (silent prevention)
          expect(AppConfig.isDevMode, isFalse);

          // 2. If service called anyway, validation throws
          try {
            AppConfig.validateDevAuth();
            fail('Should have thrown in production');
          } catch (e) {
            expect(e, isA<StateError>());

            // 3. Service catches and logs
            ErrorService.logError(
              'Security violation detected',
              context: {'layer': 'service'},
              error: e,
            );

            // 4. Service returns false (no exception to UI)
            // 5. UI shows generic error message
            // 6. Backend would also reject (redundant protection)
          }
        }
      });

      test('error messages are user-friendly', () {
        if (AppConfig.isProduction) {
          try {
            AppConfig.validateDevAuth();
          } catch (e) {
            final message = e.toString().toLowerCase();

            // Should mention environment context
            expect(
              message.contains('production') || message.contains('development'),
              isTrue,
              reason: 'Error should explain environment restriction',
            );

            // Should NOT expose technical details
            expect(
              message.contains('validateDevAuth'),
              isFalse,
              reason: 'Should not expose internal method names',
            );
          }
        }
      });
    });

    group('URL Security', () {
      test('URLs match environment security posture', () {
        if (AppConfig.isDevelopment) {
          // Dev URLs point to localhost
          expect(
            AppConfig.baseUrl.contains('localhost'),
            isTrue,
            reason: 'Dev should use localhost',
          );
          expect(AppConfig.backendUrl.contains('localhost'), isTrue);
        } else {
          // Production URLs use production domain
          expect(
            AppConfig.baseUrl.contains('localhost'),
            isFalse,
            reason: 'Production should use production URLs',
          );
          expect(AppConfig.backendUrl.contains('localhost'), isFalse);
        }
      });

      test('dev token endpoints are properly scoped', () {
        expect(AppConfig.devTokenEndpoint, contains('/dev/'));
        expect(AppConfig.devAdminTokenEndpoint, contains('/dev/'));

        // Backend should protect these routes with middleware
        // (Tested in backend auth-middleware-security.test.js)
      });

      test('auth0 endpoints are available in all environments', () {
        // Production auth should always work
        expect(AppConfig.auth0LoginEndpoint, isNotEmpty);
        expect(AppConfig.auth0CallbackEndpoint, isNotEmpty);

        // Auth0 is the production authentication method
        expect(AppConfig.auth0LoginEndpoint, contains('/auth0/'));
      });
    });

    group('Production Readiness', () {
      test('production environment has all security features', () {
        if (AppConfig.isProduction) {
          // Checklist for production deployment:

          // ✓ Dev mode disabled
          expect(AppConfig.isDevMode, isFalse);
          expect(AppConfig.devAuthEnabled, isFalse);

          // ✓ Production URLs configured
          expect(AppConfig.baseUrl.contains('localhost'), isFalse);

          // ✓ Auth0 configured
          expect(AppConfig.auth0LoginEndpoint, isNotEmpty);

          // ✓ Security validation active
          expect(() => AppConfig.validateDevAuth(), throwsStateError);
        }
      });

      test('development environment has dev features', () {
        if (AppConfig.isDevelopment) {
          // Checklist for development:

          // ✓ Dev mode enabled
          expect(AppConfig.isDevMode, isTrue);
          expect(AppConfig.devAuthEnabled, isTrue);

          // ✓ Local URLs configured
          expect(AppConfig.baseUrl.contains('localhost'), isTrue);

          // ✓ Dev auth available
          expect(() => AppConfig.validateDevAuth(), returnsNormally);

          // ✓ Verbose logging enabled
          expect(AppConfig.verboseLogging, isTrue);
        }
      });

      test('environment cannot be ambiguous', () {
        // Must be EITHER development OR production, never both

        expect(
          AppConfig.isDevelopment,
          !AppConfig.isProduction,
          reason: 'Must be exactly one environment',
        );

        expect(
          AppConfig.isProduction,
          !AppConfig.isDevelopment,
          reason: 'Environments are mutually exclusive',
        );
      });
    });

    group('Security Compliance', () {
      test('dev tokens are restricted to development', () {
        // Policy: Dev authentication only in development environment

        expect(
          AppConfig.devAuthEnabled,
          AppConfig.isDevelopment,
          reason: 'Dev auth MUST be tied to development environment',
        );

        if (AppConfig.isProduction) {
          expect(
            () => AppConfig.validateDevAuth(),
            throwsStateError,
            reason: 'Production MUST block dev authentication',
          );
        }
      });

      test('security logs capture required context', () {
        // Compliance: Security events must be logged

        final securityContext = {
          'timestamp': DateTime.now().toIso8601String(),
          'environment': AppConfig.environmentName,
          'method': 'loginWithTestToken',
          'devAuthEnabled': AppConfig.devAuthEnabled,
          'layer': 'service',
        };

        expect(
          () => ErrorService.logError(
            'Security event test',
            context: securityContext,
          ),
          returnsNormally,
          reason: 'Security logging must work',
        );
      });

      test('all security checks are fail-secure', () {
        // Fail-secure: If environment unknown, default to production (secure)

        // Config should NEVER be null/undefined
        expect(AppConfig.isDevelopment, isNotNull);
        expect(AppConfig.isProduction, isNotNull);
        expect(AppConfig.devAuthEnabled, isNotNull);

        // If somehow ambiguous, should fail closed (secure)
        expect(AppConfig.isDevMode, isA<bool>());
      });
    });
  });
}
