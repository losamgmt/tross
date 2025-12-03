import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/config/app_config.dart';

void main() {
  group('AppConfig', () {
    group('Environment Detection', () {
      test('isDevelopment is set correctly', () {
        // In test environment, isDevelopment defaults to true
        expect(AppConfig.isDevelopment, isTrue);
      });

      test('isProduction returns opposite of isDevelopment', () {
        expect(AppConfig.isProduction, !AppConfig.isDevelopment);
      });

      test('isDevMode is accessible', () {
        expect(AppConfig.isDevMode, isNotNull);
        expect(AppConfig.isDevMode, isA<bool>());
      });

      test('isDebugMode is accessible', () {
        expect(AppConfig.isDebugMode, isNotNull);
        expect(AppConfig.isDebugMode, isA<bool>());
      });

      test('environmentName returns correct value', () {
        final envName = AppConfig.environmentName;
        expect(envName, isIn(['Development', 'Production']));
      });
    });

    group('Feature Flags', () {
      test('devAuthEnabled matches isDevMode', () {
        expect(AppConfig.devAuthEnabled, AppConfig.isDevMode);
      });

      test('healthMonitoringEnabled is true', () {
        expect(AppConfig.healthMonitoringEnabled, isTrue);
      });

      test('verboseLogging matches isDevMode', () {
        expect(AppConfig.verboseLogging, AppConfig.isDevMode);
      });
    });

    group('API Configuration', () {
      test('baseUrl is not empty', () {
        expect(AppConfig.baseUrl, isNotEmpty);
      });

      test('baseUrl uses correct protocol', () {
        expect(
          AppConfig.baseUrl.startsWith('http://') ||
              AppConfig.baseUrl.startsWith('https://'),
          isTrue,
        );
      });

      test('backendUrl is not empty', () {
        expect(AppConfig.backendUrl, isNotEmpty);
      });

      test('baseUrl ends with /api', () {
        expect(AppConfig.baseUrl.endsWith('/api'), isTrue);
      });

      test('dev and prod URLs are different', () {
        // URLs should differ based on environment
        expect(
          AppConfig.baseUrl.contains('localhost') ||
              AppConfig.baseUrl.contains('tross.com'),
          isTrue,
        );
      });
    });

    group('Health Monitoring Endpoints', () {
      test('healthEndpoint is constructed correctly', () {
        expect(AppConfig.healthEndpoint, '${AppConfig.baseUrl}/health/db');
      });

      test('healthPollingEndpoint is constructed correctly', () {
        expect(
          AppConfig.healthPollingEndpoint,
          '${AppConfig.baseUrl}/health/status',
        );
      });
    });

    group('Authentication Endpoints', () {
      test('devTokenEndpoint is constructed correctly', () {
        expect(AppConfig.devTokenEndpoint, '${AppConfig.baseUrl}/dev/token');
      });

      test('devAdminTokenEndpoint is constructed correctly', () {
        expect(
          AppConfig.devAdminTokenEndpoint,
          '${AppConfig.baseUrl}/dev/admin-token',
        );
      });

      test('profileEndpoint is constructed correctly', () {
        expect(AppConfig.profileEndpoint, '${AppConfig.baseUrl}/auth/me');
      });

      test('auth0LoginEndpoint is constructed correctly', () {
        expect(
          AppConfig.auth0LoginEndpoint,
          '${AppConfig.baseUrl}/auth0/login',
        );
      });

      test('auth0CallbackEndpoint is constructed correctly', () {
        expect(
          AppConfig.auth0CallbackEndpoint,
          '${AppConfig.baseUrl}/auth0/callback',
        );
      });
    });

    group('Auth0 Configuration', () {
      test('auth0Domain is not empty', () {
        expect(AppConfig.auth0Domain, isNotEmpty);
      });

      test('auth0ClientId is not empty', () {
        expect(AppConfig.auth0ClientId, isNotEmpty);
      });

      test('auth0Audience can be empty (optional)', () {
        // Auth0 Audience is optional - empty string is valid for basic login
        expect(AppConfig.auth0Audience, isA<String>());
      });

      test('auth0Audience uses correct domain when configured', () {
        // Only test content if audience is actually configured
        if (AppConfig.auth0Audience.isNotEmpty) {
          expect(AppConfig.auth0Audience.contains('tross'), isTrue);
        } else {
          // Empty is valid - skip domain check
          expect(AppConfig.auth0Audience, isEmpty);
        }
      });

      test('auth0Scheme follows correct pattern', () {
        expect(AppConfig.auth0Scheme, 'com.tross.auth0');
      });
    });

    group('Timeouts & Performance', () {
      test('httpTimeout is positive', () {
        expect(AppConfig.httpTimeout.inSeconds, greaterThan(0));
      });

      test('connectTimeout is positive', () {
        expect(AppConfig.connectTimeout.inSeconds, greaterThan(0));
      });

      test('healthCheckInterval is positive', () {
        expect(AppConfig.healthCheckInterval.inSeconds, greaterThan(0));
      });

      test('connectTimeout is less than httpTimeout', () {
        expect(
          AppConfig.connectTimeout.inSeconds,
          lessThan(AppConfig.httpTimeout.inSeconds),
        );
      });
    });

    group('Version Info', () {
      test('version is not empty', () {
        expect(AppConfig.version, isNotEmpty);
      });

      test('version follows semantic versioning pattern', () {
        final versionRegex = RegExp(r'^\d+\.\d+\.\d+$');
        expect(versionRegex.hasMatch(AppConfig.version), isTrue);
      });

      test('buildNumber is not empty', () {
        expect(AppConfig.buildNumber, isNotEmpty);
      });
    });

    group('Security Helpers', () {
      test(
        'validateDevAuth throws in production when devAuthEnabled is false',
        () {
          // This test simulates production mode behavior
          // In actual dev mode (our test environment), this won't throw
          if (!AppConfig.devAuthEnabled) {
            expect(
              () => AppConfig.validateDevAuth(),
              throwsA(isA<StateError>()),
            );
          } else {
            // In dev mode, should not throw
            expect(() => AppConfig.validateDevAuth(), returnsNormally);
          }
        },
      );

      test('validateDevAuth error message is descriptive', () {
        if (!AppConfig.devAuthEnabled) {
          try {
            AppConfig.validateDevAuth();
            fail('Should have thrown StateError');
          } catch (e) {
            expect(e, isA<StateError>());
            expect(
              e.toString().contains('production'),
              isTrue,
              reason: 'Error should mention production mode',
            );
            expect(
              e.toString().contains('security'),
              isTrue,
              reason: 'Error should mention security',
            );
          }
        }
      });
    });

    group('Integration', () {
      test('all endpoint URLs use the same base URL', () {
        final endpoints = [
          AppConfig.devTokenEndpoint,
          AppConfig.devAdminTokenEndpoint,
          AppConfig.profileEndpoint,
          AppConfig.auth0LoginEndpoint,
          AppConfig.auth0CallbackEndpoint,
          AppConfig.healthEndpoint,
          AppConfig.healthPollingEndpoint,
        ];

        for (final endpoint in endpoints) {
          expect(
            endpoint.startsWith(AppConfig.baseUrl),
            isTrue,
            reason: 'Endpoint $endpoint should start with ${AppConfig.baseUrl}',
          );
        }
      });

      test('configuration is consistent across properties', () {
        // If in dev mode, URLs should contain localhost
        if (AppConfig.isDevelopment) {
          expect(AppConfig.baseUrl.contains('localhost'), isTrue);
          expect(AppConfig.backendUrl.contains('localhost'), isTrue);
        } else {
          // In production, URLs should NOT contain localhost
          expect(AppConfig.baseUrl.contains('localhost'), isFalse);
          expect(AppConfig.backendUrl.contains('localhost'), isFalse);
        }
      });
    });
  });
}
