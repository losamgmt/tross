/// SettingsScreen Tests - Behavior-Focused
///
/// Tests the settings screen's BEHAVIOR and USER-FACING functionality.
/// Unlike HomeScreen which may show placeholder content, SettingsScreen
/// has real functionality that should be tested:
/// - User profile display
/// - Theme preference selection
/// - Notifications toggle
///
/// Tests focus on what USERS can do, not internal widget structure.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:tross_app/screens/settings_screen.dart';
import 'package:tross_app/providers/auth_provider.dart';
import 'package:tross_app/providers/app_provider.dart';
import 'package:tross_app/providers/preferences_provider.dart';
import 'package:tross_app/config/preference_keys.dart';
import '../helpers/helpers.dart';

void main() {
  /// Helper to create SettingsScreen with required providers
  Widget createTestWidget({PreferencesProvider? prefsProvider}) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => AppProvider()),
        ChangeNotifierProvider(
          create: (_) => prefsProvider ?? PreferencesProvider(),
        ),
      ],
      child: const SettingsScreen(),
    );
  }

  group('SettingsScreen', () {
    group('Rendering', () {
      testWidgets('renders without error', (tester) async {
        await pumpTestWidget(tester, createTestWidget());

        expect(find.byType(SettingsScreen), findsOneWidget);
        expect(tester.takeException(), isNull);
      });

      testWidgets('renders within a Scaffold', (tester) async {
        await pumpTestWidget(tester, createTestWidget());

        expect(find.byType(Scaffold), findsWidgets);
      });
    });

    group('Theme Preference', () {
      testWidgets('displays theme selection option', (tester) async {
        await pumpTestWidget(tester, createTestWidget());

        // User should see theme-related UI
        expect(find.text('Theme'), findsWidgets);
      });

      testWidgets('shows current theme value', (tester) async {
        await pumpTestWidget(tester, createTestWidget());

        // Default should show System Default
        expect(find.text('System Default'), findsOneWidget);
      });

      testWidgets('can open theme options', (tester) async {
        await pumpTestWidget(tester, createTestWidget());

        // Find and tap the dropdown
        await tester.tap(find.byType(DropdownButtonFormField<ThemePreference>));
        await tester.pumpAndSettle();

        // All theme options should be visible
        expect(find.text('System Default'), findsWidgets);
        expect(find.text('Light'), findsOneWidget);
        expect(find.text('Dark'), findsOneWidget);
      });
    });

    group('Notifications Preference', () {
      testWidgets('displays notifications toggle', (tester) async {
        await pumpTestWidget(tester, createTestWidget());

        expect(find.text('Notifications'), findsOneWidget);
      });

      testWidgets('shows current notifications state', (tester) async {
        await pumpTestWidget(tester, createTestWidget());

        // Should have a switch that's enabled by default
        final switchFinder = find.byType(Switch);
        expect(switchFinder, findsOneWidget);
        final switchWidget = tester.widget<Switch>(switchFinder);
        expect(switchWidget.value, isTrue);
      });

      testWidgets('toggle is interactive', (tester) async {
        await pumpTestWidget(tester, createTestWidget());

        final switchFinder = find.byType(Switch);
        expect(switchFinder, findsOneWidget);

        // Can tap without error
        await tester.tap(switchFinder);
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
      });
    });

    group('Responsiveness', () {
      testWidgets('renders on small screens without overflow', (tester) async {
        await tester.binding.setSurfaceSize(const Size(320, 568));
        await pumpTestWidget(tester, createTestWidget());

        expect(find.byType(SettingsScreen), findsOneWidget);
        expect(tester.takeException(), isNull);
      });

      testWidgets('renders on large screens without overflow', (tester) async {
        await tester.binding.setSurfaceSize(const Size(1920, 1080));
        await pumpTestWidget(tester, createTestWidget());

        expect(find.byType(SettingsScreen), findsOneWidget);
        expect(tester.takeException(), isNull);
      });
    });

    group('Scrollability', () {
      testWidgets('content is scrollable', (tester) async {
        await pumpTestWidget(tester, createTestWidget());

        expect(find.byType(SingleChildScrollView), findsWidgets);
      });

      testWidgets('can scroll without error', (tester) async {
        await tester.binding.setSurfaceSize(const Size(400, 400));
        await pumpTestWidget(tester, createTestWidget());

        // Should be able to scroll without error
        await tester.drag(
          find.byType(SingleChildScrollView).first,
          const Offset(0, -200),
        );
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
      });
    });
  });
}
