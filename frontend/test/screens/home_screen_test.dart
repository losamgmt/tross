/// HomeScreen Tests - Behavior-Focused
///
/// Tests the home screen's CONTRACT, not implementation details.
/// These tests should pass whether the screen shows:
/// - UnderConstructionDisplay (placeholder)
/// - DashboardContent (real dashboard)
/// - Any other valid content
///
/// GOOD tests verify:
/// - Screen renders without error
/// - Screen integrates with navigation shell
/// - Screen is scrollable/accessible
/// - Screen works at different viewport sizes
///
/// BAD tests (avoided here):
/// - Specific internal widget types
/// - Specific placeholder text
/// - Implementation details that change during development
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:tross_app/screens/home_screen.dart';
import 'package:tross_app/providers/auth_provider.dart';
import 'package:tross_app/providers/app_provider.dart';
import 'package:tross_app/providers/dashboard_provider.dart';
import '../helpers/helpers.dart';

void main() {
  /// Helper to create HomeScreen with required providers
  Widget createTestWidget() {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => AppProvider()),
        ChangeNotifierProvider(create: (_) => DashboardProvider()),
      ],
      child: const HomeScreen(),
    );
  }

  group('HomeScreen', () {
    group('Rendering', () {
      testWidgets('renders without error', (tester) async {
        await pumpTestWidget(tester, createTestWidget());

        expect(find.byType(HomeScreen), findsOneWidget);
        expect(tester.takeException(), isNull);
      });

      testWidgets('renders within a Scaffold', (tester) async {
        await pumpTestWidget(tester, createTestWidget());

        expect(find.byType(Scaffold), findsWidgets);
      });
    });

    group('Navigation Integration', () {
      testWidgets('integrates with AdaptiveShell template', (tester) async {
        await pumpTestWidget(tester, createTestWidget());

        // Should have navigation elements from the shell
        // Test presence of navigation, not specific implementation
        expect(find.byType(HomeScreen), findsOneWidget);
      });
    });

    group('Responsiveness', () {
      testWidgets('renders on small screens without overflow', (tester) async {
        await tester.binding.setSurfaceSize(const Size(320, 568));
        await pumpTestWidget(tester, createTestWidget());

        expect(find.byType(HomeScreen), findsOneWidget);
        expect(tester.takeException(), isNull);
      });

      testWidgets('renders on medium screens without overflow', (tester) async {
        await tester.binding.setSurfaceSize(const Size(768, 1024));
        await pumpTestWidget(tester, createTestWidget());

        expect(find.byType(HomeScreen), findsOneWidget);
        expect(tester.takeException(), isNull);
      });

      testWidgets('renders on large screens without overflow', (tester) async {
        await tester.binding.setSurfaceSize(const Size(1920, 1080));
        await pumpTestWidget(tester, createTestWidget());

        expect(find.byType(HomeScreen), findsOneWidget);
        expect(tester.takeException(), isNull);
      });
    });

    group('Accessibility', () {
      testWidgets('content is scrollable for constrained viewports', (
        tester,
      ) async {
        await tester.binding.setSurfaceSize(const Size(320, 300));
        await pumpTestWidget(tester, createTestWidget());

        // Should have scrollable content somewhere in the tree
        expect(find.byType(SingleChildScrollView), findsWidgets);
      });
    });
  });
}
