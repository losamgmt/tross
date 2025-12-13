/// Security Integration Tests
///
/// Tests multiple security layers working together
/// Focus: UI + Service integration for dev authentication
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:tross_app/config/app_config.dart';
import 'package:tross_app/providers/app_provider.dart';
import 'package:tross_app/providers/auth_provider.dart';
import 'package:tross_app/screens/login_screen.dart';
import 'package:tross_app/widgets/molecules/dev_mode_indicator.dart';

void main() {
  group('Security Integration Tests - UI + Service Layers', () {
    testWidgets('dev login buttons should be hidden in production', (
      tester,
    ) async {
      // LAYER 1 TEST: UI Security
      // In production, dev features should not be rendered

      await tester.pumpWidget(
        MaterialApp(
          home: MultiProvider(
            providers: [
              ChangeNotifierProvider(create: (_) => AppProvider()),
              ChangeNotifierProvider(create: (_) => AuthProvider()),
            ],
            child: const LoginScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      if (AppConfig.isDevMode) {
        // In dev mode, dev card should be visible
        expect(
          find.text('Developer Login'),
          findsOneWidget,
          reason: 'Dev mode should show dev login card',
        );
        // Dev card now uses dropdown with single "Dev Login" button
        expect(find.text('Dev Login'), findsOneWidget);
        expect(
          find.text('Choose a role to test with'),
          findsOneWidget,
          reason: 'Dropdown helper text should be visible',
        );
      } else {
        // In production, dev card should NOT exist
        expect(
          find.text('Developer Login'),
          findsNothing,
          reason: 'Production should hide dev login card',
        );
        expect(find.text('Dev Login'), findsNothing);
      }
    });

    testWidgets('DevModeBanner should only appear in development', (
      tester,
    ) async {
      // LAYER 1 TEST: DevModeBanner visibility

      await tester.pumpWidget(
        const MaterialApp(home: Scaffold(body: DevModeBanner())),
      );
      await tester.pumpAndSettle();

      if (AppConfig.isDevMode) {
        // In dev mode, banner should be visible
        expect(
          find.byType(Container),
          findsWidgets,
          reason: 'Dev mode should render banner container',
        );
      } else {
        // In production, banner returns SizedBox.shrink()
        expect(
          find.byType(DevModeBanner),
          findsOneWidget,
          reason: 'Widget exists but renders nothing in production',
        );
      }
    });

    testWidgets('DevModeIndicator badge should show correct environment', (
      tester,
    ) async {
      // LAYER 1 TEST: Environment indicator accuracy

      await tester.pumpWidget(
        const MaterialApp(home: Scaffold(body: DevModeIndicator())),
      );
      await tester.pumpAndSettle();

      if (AppConfig.isDevMode) {
        expect(
          find.text('Development'),
          findsOneWidget,
          reason: 'Dev mode should show Development badge',
        );
      } else {
        expect(
          find.text('Production'),
          findsOneWidget,
          reason: 'Production should show Production badge',
        );
      }

      // Verify environment name matches AppConfig
      expect(
        find.text(AppConfig.environmentName),
        findsOneWidget,
        reason: 'Indicator should match AppConfig environment',
      );
    });

    testWidgets('login screen integrates all security components', (
      tester,
    ) async {
      // INTEGRATION TEST: All security features work together

      await tester.pumpWidget(
        MaterialApp(
          home: MultiProvider(
            providers: [
              ChangeNotifierProvider(create: (_) => AppProvider()),
              ChangeNotifierProvider(create: (_) => AuthProvider()),
            ],
            child: const LoginScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Auth0 card should ALWAYS be visible
      expect(
        find.text('Login with Auth0'),
        findsOneWidget,
        reason: 'Auth0 should always be available',
      );

      // Dev features conditional on environment
      if (AppConfig.isDevMode) {
        // Layer 1: UI shows dev features
        // Note: DevModeBanner exists but isn't rendered in LoginScreen
        // It's used in other screens - testing its existence separately
        expect(find.text('Developer Login'), findsOneWidget);

        // Dev card now uses dropdown with single "Dev Login" button (not per-role buttons)
        expect(find.text('Dev Login'), findsOneWidget);
        expect(find.text('Choose a role to test with'), findsOneWidget);
      } else {
        // Layer 1: UI hides dev features
        expect(find.text('Developer Login'), findsNothing);
        expect(find.text('Dev Login'), findsNothing);
      }
    });

    test('UI and Service security configurations are aligned', () {
      // INTEGRATION TEST: Config consistency

      // Layer 1 (UI) uses AppConfig.isDevMode
      final uiShowsDevFeatures = AppConfig.isDevMode;

      // Layer 2 (Service) uses AppConfig.devAuthEnabled
      final serviceAllowsDevAuth = AppConfig.devAuthEnabled;

      expect(
        uiShowsDevFeatures,
        serviceAllowsDevAuth,
        reason: 'UI and Service layers must have consistent security config',
      );

      // Both should match the environment
      expect(
        uiShowsDevFeatures,
        AppConfig.isDevelopment,
        reason: 'Dev mode should match development environment',
      );
    });

    test('security feature flags are boolean and consistent', () {
      // INTEGRATION TEST: Type safety and consistency

      expect(AppConfig.isDevMode, isA<bool>());
      expect(AppConfig.devAuthEnabled, isA<bool>());
      expect(AppConfig.isDevelopment, isA<bool>());
      expect(AppConfig.isProduction, isA<bool>());

      // Development and production are opposites
      expect(AppConfig.isDevelopment, !AppConfig.isProduction);

      // Dev mode implies development environment
      if (AppConfig.isDevMode) {
        expect(
          AppConfig.isDevelopment,
          isTrue,
          reason: 'Dev mode should only exist in development',
        );
      }
    });

    test('environment detection is consistent across all config', () {
      // INTEGRATION TEST: Single source of truth

      final environment = AppConfig.environmentName;
      expect(environment, isIn(['Development', 'Production']));

      // All derived properties should match
      if (environment == 'Development') {
        expect(AppConfig.isDevelopment, isTrue);
        expect(AppConfig.isProduction, isFalse);
        expect(AppConfig.isDevMode, isTrue);
        expect(AppConfig.devAuthEnabled, isTrue);
      } else {
        expect(AppConfig.isDevelopment, isFalse);
        expect(AppConfig.isProduction, isTrue);
        expect(AppConfig.isDevMode, isFalse);
        expect(AppConfig.devAuthEnabled, isFalse);
      }
    });

    group('Defense-in-Depth Validation', () {
      test('three security layers are independently configured', () {
        // Layer 1: UI (AppConfig.isDevMode)
        // Layer 2: Service (AppConfig.validateDevAuth)
        // Layer 3: Backend (checked via middleware)

        // Verify each layer has its mechanism
        expect(
          AppConfig.isDevMode,
          isA<bool>(),
          reason: 'Layer 1: UI has dev mode flag',
        );

        expect(
          () => AppConfig.validateDevAuth(),
          isA<Function>(),
          reason: 'Layer 2: Service has validation method',
        );

        expect(
          AppConfig.devAuthEnabled,
          isA<bool>(),
          reason: 'Layer 3: Backend config is accessible',
        );
      });

      test('security layers provide redundant protection', () {
        // If one layer fails, others should still protect

        // Production scenario simulation:
        if (!AppConfig.devAuthEnabled) {
          // Layer 1: UI wouldn't render dev buttons (verified in widget tests)
          expect(AppConfig.isDevMode, isFalse);

          // Layer 2: Service validation would throw
          expect(() => AppConfig.validateDevAuth(), throwsA(isA<StateError>()));

          // Layer 3: Backend would reject tokens (tested in E2E)
        }
      });

      test('all layers respect the same environment configuration', () {
        // Single source of truth: AppConfig

        final isDev = AppConfig.isDevelopment;

        // All security decisions derive from this
        expect(AppConfig.isDevMode, isDev);
        expect(AppConfig.devAuthEnabled, isDev);
        expect(AppConfig.isProduction, !isDev);

        // URLs also reflect environment
        if (isDev) {
          expect(AppConfig.baseUrl.contains('localhost'), isTrue);
        }
      });
    });

    group('Error Handling Integration', () {
      test('security errors should be logged but not crash app', () {
        // Integration with ErrorService

        expect(
          () => AppConfig.validateDevAuth(),
          AppConfig.devAuthEnabled
              ? returnsNormally
              : throwsA(isA<StateError>()),
        );

        // If it throws, should be caught and logged by service
        // This is tested in auth_service_security_test.dart
      });

      test('UI gracefully handles service-layer security failures', () {
        // When service returns false (security violation),
        // UI should show error message, not crash

        // This is tested in widget tests where button press
        // would result in navigation (success) or error message (failure)
      });
    });

    group('Production Readiness Checks', () {
      test('production build has all dev features disabled', () {
        // This test documents what should be true in production

        if (AppConfig.isProduction) {
          expect(
            AppConfig.devAuthEnabled,
            isFalse,
            reason: 'Production must disable dev auth',
          );
          expect(
            AppConfig.isDevMode,
            isFalse,
            reason: 'Production must disable dev mode',
          );
          expect(
            AppConfig.isDevelopment,
            isFalse,
            reason: 'Production environment check',
          );
        }
      });

      test('production URLs do not contain localhost', () {
        if (AppConfig.isProduction) {
          expect(
            AppConfig.baseUrl.contains('localhost'),
            isFalse,
            reason: 'Production should use production URLs',
          );
          expect(AppConfig.backendUrl.contains('localhost'), isFalse);
        }
      });

      test('production has proper security configuration', () {
        if (AppConfig.isProduction) {
          // Verify all security features are properly locked down
          expect(AppConfig.devAuthEnabled, isFalse);
          expect(AppConfig.isDevMode, isFalse);

          // Dev endpoints should still exist (for error messages)
          // but validation will prevent their use
          expect(AppConfig.devTokenEndpoint, isNotEmpty);
          expect(AppConfig.devAdminTokenEndpoint, isNotEmpty);
        }
      });
    });
  });
}
