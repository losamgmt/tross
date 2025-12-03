/// App Tests ✅ MIGRATED TO TEST INFRASTRUCTURE
///
/// **IMPORTANT:** These are SMOKE TESTS only - they verify the app
/// boots without crashing. Full integration tests are in e2e/.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';

import 'package:tross_app/screens/login_screen.dart';
import 'package:tross_app/providers/auth_provider.dart';
import 'package:tross_app/providers/app_provider.dart';
import 'package:tross_app/config/constants.dart';
import 'helpers/helpers.dart';

void main() {
  testWidgets('App structure can be rendered (smoke test)', (
    WidgetTester tester,
  ) async {
    // Smoke test: Just verify the app widget structure renders
    // Uses isolated providers (no network calls)
    await pumpTestWidget(
      tester,
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => AuthProvider()),
          ChangeNotifierProvider(create: (_) => AppProvider()),
        ],
        child: const MaterialApp(home: LoginScreen()),
      ),
    );

    await tester.pump();

    // Verify app renders without crashing
    expect(find.text(AppConstants.appName), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('App shows login screen initially (smoke test)', (
    WidgetTester tester,
  ) async {
    // Smoke test: Verify initial screen is login
    await pumpTestWidget(
      tester,
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => AuthProvider()),
          ChangeNotifierProvider(create: (_) => AppProvider()),
        ],
        child: const MaterialApp(home: LoginScreen()),
      ),
    );

    await tester.pump();

    // Should show login screen elements
    expect(find.text(AppConstants.appName), findsOneWidget);
    expect(find.text(AppConstants.appTagline), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
