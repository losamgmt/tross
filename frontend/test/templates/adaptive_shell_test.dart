/// AdaptiveShell Template Tests
///
/// Tests for the clean top-bar layout template with dropdown navigation.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:tross_app/widgets/templates/templates.dart';
import 'package:tross_app/providers/auth_provider.dart';
import 'package:tross_app/core/routing/app_routes.dart';

/// Wraps a widget with required providers for testing
Widget wrapWithProviders(Widget child) {
  return MaterialApp(
    home: MultiProvider(
      providers: [
        ChangeNotifierProvider<AuthProvider>(create: (_) => AuthProvider()),
      ],
      child: child,
    ),
  );
}

void main() {
  group('NavMenuItem', () {
    test('defaults contains expected menu items', () {
      final defaults = NavMenuItem.defaults;

      expect(defaults.length, greaterThanOrEqualTo(3));
      expect(defaults.any((d) => d.id == 'home'), isTrue);
      expect(defaults.any((d) => d.id == 'settings'), isTrue);
      expect(defaults.any((d) => d.id == 'admin'), isTrue);
    });

    test('visibleWhen filter works correctly', () {
      final adminItem = NavMenuItem(
        id: 'admin',
        label: 'Admin',
        icon: Icons.admin_panel_settings,
        route: '/admin',
        visibleWhen: (user) => user?['role'] == 'admin',
      );

      // Non-admin user
      expect(adminItem.visibleWhen!({'role': 'viewer'}), isFalse);

      // Admin user
      expect(adminItem.visibleWhen!({'role': 'admin'}), isTrue);

      // Null user
      expect(adminItem.visibleWhen!(null), isFalse);
    });

    test('menu item without visibleWhen is always visible', () {
      const item = NavMenuItem(
        id: 'home',
        label: 'Home',
        icon: Icons.home,
        route: '/home',
      );

      expect(item.visibleWhen, isNull);
    });
  });

  group('AdaptiveShell', () {
    testWidgets('renders body content', (tester) async {
      await tester.pumpWidget(
        wrapWithProviders(
          const AdaptiveShell(
            currentRoute: AppRoutes.home,
            pageTitle: 'Test Page',
            body: Text('Test Body Content'),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Test Body Content'), findsOneWidget);
    });

    testWidgets('renders page title in app bar', (tester) async {
      await tester.pumpWidget(
        wrapWithProviders(
          const AdaptiveShell(
            currentRoute: AppRoutes.home,
            pageTitle: 'Dashboard',
            body: SizedBox(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Dashboard'), findsOneWidget);
    });

    testWidgets('renders app name in logo area', (tester) async {
      await tester.pumpWidget(
        wrapWithProviders(
          const AdaptiveShell(
            currentRoute: AppRoutes.home,
            pageTitle: 'Test',
            body: SizedBox(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // App name should appear in the leading area
      expect(find.text('Tross'), findsOneWidget);
    });

    testWidgets('renders user menu button', (tester) async {
      await tester.pumpWidget(
        wrapWithProviders(
          const AdaptiveShell(
            currentRoute: AppRoutes.home,
            pageTitle: 'Test',
            body: SizedBox(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // User menu should show a CircleAvatar
      expect(find.byType(CircleAvatar), findsOneWidget);
    });

    testWidgets('hides app bar when showAppBar is false', (tester) async {
      await tester.pumpWidget(
        wrapWithProviders(
          const AdaptiveShell(
            currentRoute: AppRoutes.home,
            pageTitle: 'Test',
            body: Text('Body Only'),
            showAppBar: false,
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.byType(AppBar), findsNothing);
      expect(find.text('Body Only'), findsOneWidget);
    });

    testWidgets('user menu opens on tap', (tester) async {
      await tester.pumpWidget(
        wrapWithProviders(
          const AdaptiveShell(
            currentRoute: AppRoutes.home,
            pageTitle: 'Test',
            body: SizedBox(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Tap the user menu button
      await tester.tap(find.byType(PopupMenuButton<String>));
      await tester.pumpAndSettle();

      // Menu items should appear
      expect(find.text('Dashboard'), findsWidgets);
      expect(find.text('Settings'), findsOneWidget);
      expect(find.text('Logout'), findsOneWidget);
    });

    testWidgets('accepts custom menu items', (tester) async {
      final customItems = [
        const NavMenuItem(
          id: 'custom',
          label: 'Custom Item',
          icon: Icons.star,
          route: '/custom',
        ),
      ];

      await tester.pumpWidget(
        wrapWithProviders(
          AdaptiveShell(
            currentRoute: '/custom',
            pageTitle: 'Test',
            body: const SizedBox(),
            menuItems: customItems,
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Open menu
      await tester.tap(find.byType(PopupMenuButton<String>));
      await tester.pumpAndSettle();

      expect(find.text('Custom Item'), findsOneWidget);
    });
  });
}
