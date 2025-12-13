/// HomeScreen Tests
///
/// Tests the main dashboard/home screen.
/// Currently displays under construction - tests verify structure and behavior.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:tross_app/screens/home_screen.dart';
import 'package:tross_app/widgets/organisms/under_construction_display.dart';
import 'package:tross_app/widgets/organisms/app_header.dart';
import 'package:tross_app/providers/auth_provider.dart';
import 'package:tross_app/providers/app_provider.dart';
import '../helpers/helpers.dart';

void main() {
  /// Helper to create HomeScreen with required providers
  Widget createTestWidget() {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => AppProvider()),
      ],
      child: const HomeScreen(),
    );
  }

  group('HomeScreen', () {
    group('Widget Structure', () {
      testWidgets('renders in a Scaffold', (tester) async {
        await pumpTestWidget(tester, createTestWidget());

        expect(find.byType(Scaffold), findsWidgets);
      });

      testWidgets('displays AppHeader with Dashboard title', (tester) async {
        await pumpTestWidget(tester, createTestWidget());

        expect(find.byType(AppHeader), findsOneWidget);
        expect(find.text('Dashboard'), findsWidgets);
      });

      testWidgets('displays UnderConstructionDisplay organism', (tester) async {
        await pumpTestWidget(tester, createTestWidget());

        expect(find.byType(UnderConstructionDisplay), findsOneWidget);
      });
    });

    group('Content Display', () {
      testWidgets('shows "Dashboard Coming Soon!" title', (tester) async {
        await pumpTestWidget(tester, createTestWidget());

        expect(find.text('Dashboard Coming Soon!'), findsOneWidget);
      });

      testWidgets('shows informative message about upcoming features', (
        tester,
      ) async {
        await pumpTestWidget(tester, createTestWidget());

        expect(find.textContaining('amazing dashboard'), findsOneWidget);
        expect(find.textContaining('analytics'), findsOneWidget);
      });

      testWidgets('shows dashboard icon', (tester) async {
        await pumpTestWidget(tester, createTestWidget());

        expect(find.byIcon(Icons.dashboard), findsWidgets);
      });

      testWidgets('shows progress indicator', (tester) async {
        await pumpTestWidget(tester, createTestWidget());

        expect(find.byType(LinearProgressIndicator), findsOneWidget);
      });
    });

    group('Responsiveness', () {
      testWidgets('adapts to small screen sizes', (tester) async {
        await tester.binding.setSurfaceSize(const Size(320, 568)); // iPhone SE
        await pumpTestWidget(tester, createTestWidget());

        expect(find.byType(HomeScreen), findsOneWidget);
        expect(find.text('Dashboard Coming Soon!'), findsOneWidget);
      });

      testWidgets('adapts to large screen sizes', (tester) async {
        await tester.binding.setSurfaceSize(const Size(1920, 1080)); // Desktop
        await pumpTestWidget(tester, createTestWidget());

        expect(find.byType(HomeScreen), findsOneWidget);
        expect(find.text('Dashboard Coming Soon!'), findsOneWidget);
      });
    });

    group('Accessibility', () {
      testWidgets('content is scrollable for small viewports', (tester) async {
        await tester.binding.setSurfaceSize(const Size(320, 300)); // Very small
        await pumpTestWidget(tester, createTestWidget());

        // SingleChildScrollView should be present
        expect(find.byType(SingleChildScrollView), findsWidgets);
      });
    });
  });
}
