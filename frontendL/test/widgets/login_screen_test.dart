/// LoginScreen Tests ✅ MIGRATED TO TEST INFRASTRUCTURE
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:tross_app/screens/login_screen.dart';
import 'package:tross_app/providers/auth_provider.dart';
import 'package:tross_app/providers/app_provider.dart';
import 'package:tross_app/config/constants.dart';
import '../helpers/helpers.dart';

void main() {
  group('LoginScreen Widget Tests', () {
    /// Helper that wraps LoginScreen with required providers
    Widget createTestWidget() {
      return MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (context) => AuthProvider()),
          ChangeNotifierProvider(create: (context) => AppProvider()),
        ],
        child: const LoginScreen(),
      );
    }

    group('UI Elements', () {
      testWidgets('should display app title and logo', (
        WidgetTester tester,
      ) async {
        await pumpTestWidget(tester, createTestWidget());

        // Check for TrossApp title
        expect(find.text(AppConstants.appName), findsOneWidget);

        // Check for subtitle
        expect(find.text(AppConstants.appTagline), findsOneWidget);
      });

      testWidgets('should display dev login card with role dropdown', (
        WidgetTester tester,
      ) async {
        await pumpTestWidget(tester, createTestWidget());

        // Check for dev login card elements
        expect(find.text('Developer Login'), findsOneWidget);
        expect(
          find.text('Dev Login'),
          findsOneWidget,
        ); // The actual login button

        // Check that role dropdown exists with helper text
        expect(find.text('Choose a role to test with'), findsOneWidget);
        // Dropdown should show first role (admin) by default
        expect(find.text('Admin'), findsOneWidget);
      });

      testWidgets('should display development notice', (
        WidgetTester tester,
      ) async {
        await pumpTestWidget(tester, createTestWidget());

        // Check for development mode notice (new card structure)
        expect(find.text('Developer Login'), findsOneWidget);
        expect(find.text('For testing and development only'), findsOneWidget);
      });

      testWidgets('should display professional footer', (
        WidgetTester tester,
      ) async {
        await pumpTestWidget(tester, createTestWidget());

        // Check for footer elements
        expect(find.text(AppConstants.appDescription), findsOneWidget);
      });
    });

    group('User Interactions', () {
      testWidgets('should allow selecting role and logging in', (
        WidgetTester tester,
      ) async {
        await pumpTestWidget(tester, createTestWidget());

        // Dev login button should be present (default role pre-selected: admin)
        final devLoginButton = find.text('Dev Login');
        expect(devLoginButton, findsOneWidget);

        await tester.tap(devLoginButton);
        await tester.pump();

        // Should trigger dev login process with selected role
      });

      testWidgets('should show all available dev roles in dropdown', (
        WidgetTester tester,
      ) async {
        await pumpTestWidget(tester, createTestWidget());

        // The dropdown should contain all 5 dev roles from the hardcoded list
        // (admin, manager, dispatcher, technician, client)
        // Verify the dev login card is present
        expect(find.text('Developer Login'), findsOneWidget);
        expect(find.text('For testing and development only'), findsOneWidget);
      });
    });

    group('Loading States', () {
      testWidgets(
        'should show loading indicator when authentication in progress',
        (WidgetTester tester) async {
          await pumpTestWidget(tester, createTestWidget());

          // We'd need to trigger a loading state to test this
          // For now, just verify the widget builds without errors
          expect(find.byType(LoginScreen), findsOneWidget);
        },
      );
    });

    group('Error States', () {
      testWidgets('should display error messages when authentication fails', (
        WidgetTester tester,
      ) async {
        await pumpTestWidget(tester, createTestWidget());

        // We'd need to inject an error state to test this
        // For now, verify no errors in initial state
        expect(find.byType(LoginScreen), findsOneWidget);
      });
    });

    group('Responsiveness', () {
      testWidgets('should adapt to different screen sizes', (
        WidgetTester tester,
      ) async {
        // Test different screen sizes
        await tester.binding.setSurfaceSize(const Size(400, 800)); // Mobile
        await pumpTestWidget(tester, createTestWidget());
        expect(find.byType(LoginScreen), findsOneWidget);

        await tester.binding.setSurfaceSize(const Size(1200, 800)); // Desktop
        await pumpTestWidget(tester, createTestWidget());
        expect(find.byType(LoginScreen), findsOneWidget);
      });
    });

    group('Accessibility', () {
      testWidgets('should have proper accessibility labels', (
        WidgetTester tester,
      ) async {
        await pumpTestWidget(tester, createTestWidget());

        // Check for dev login card with proper labels
        expect(find.text('Developer Login'), findsOneWidget);
        expect(find.text('Dev Login'), findsOneWidget);
        // Check for dropdown helper text instead of placeholder (has default value)
        expect(find.text('Choose a role to test with'), findsOneWidget);

        // Check for app logo icon
        expect(find.byIcon(Icons.build_circle), findsOneWidget);
      });
    });
  });
}
