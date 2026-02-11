/// AdaptiveShell Template Tests
///
/// Tests for the responsive layout template with drawer/sidebar navigation.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:tross/widgets/templates/templates.dart';
import 'package:tross/providers/auth_provider.dart';
import 'package:tross/core/routing/app_routes.dart';
import '../mocks/mock_services.dart';

/// Wraps a widget with required providers for testing
/// Uses MockAuthProvider.authenticated() to simulate logged-in user
Widget wrapWithProviders(Widget child, {AuthProvider? authProvider}) {
  return MaterialApp(
    home: MultiProvider(
      providers: [
        ChangeNotifierProvider<AuthProvider>(
          create: (_) => authProvider ?? MockAuthProvider.authenticated(),
        ),
      ],
      child: child,
    ),
  );
}

void main() {
  group('NavMenuBuilder', () {
    test('buildSidebarItems returns list with dashboard', () {
      final sidebarItems = NavMenuBuilder.buildSidebarItems();

      expect(sidebarItems.length, greaterThanOrEqualTo(1));
      expect(
        sidebarItems.any((d) => d.id == 'home' || d.id == 'dashboard'),
        isTrue,
      );
    });

    test('buildUserMenuItems returns list with settings', () {
      final userMenuItems = NavMenuBuilder.buildUserMenuItems();

      expect(userMenuItems.length, greaterThanOrEqualTo(1));
      expect(userMenuItems.any((d) => d.id == 'settings'), isTrue);
    });

    test('filterForUser with visibleWhen works correctly', () {
      final items = [
        NavMenuItem(
          id: 'admin',
          label: 'Admin',
          icon: Icons.admin_panel_settings,
          route: '/admin',
          visibleWhen: (user) => user?['role'] == 'admin',
        ),
        const NavMenuItem(
          id: 'home',
          label: 'Home',
          icon: Icons.home,
          route: '/home',
        ),
      ];

      // Non-admin user - should only see home
      final filtered = NavMenuBuilder.filterForUser(items, {'role': 'viewer'});
      expect(filtered.length, 1);
      expect(filtered.first.id, 'home');

      // Admin user - should see both
      final adminFiltered = NavMenuBuilder.filterForUser(items, {
        'role': 'admin',
      });
      expect(adminFiltered.length, 2);
    });

    test('menu item without visibleWhen respects requiresAuth default', () {
      const item = NavMenuItem(
        id: 'home',
        label: 'Home',
        icon: Icons.home,
        route: '/home',
      );

      expect(item.visibleWhen, isNull);
      // Default requiresAuth is true, so null user should return false
      expect(item.isVisibleFor(null), isFalse);
      // Authenticated user should see it
      expect(item.isVisibleFor({'role': 'user'}), isTrue);
    });

    test('menu item with requiresAuth false is visible to all', () {
      const item = NavMenuItem(
        id: 'public',
        label: 'Public',
        icon: Icons.public,
        route: '/public',
        requiresAuth: false,
      );

      expect(item.isVisibleFor(null), isTrue);
      expect(item.isVisibleFor({'role': 'user'}), isTrue);
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

      // Dashboard appears in both sidebar nav item and app bar title
      expect(find.text('Dashboard'), findsWidgets);
    });

    testWidgets('user can access account menu with settings and logout', (
      tester,
    ) async {
      // Use wide screen to ensure popup mode
      tester.view.physicalSize = const Size(1200, 800);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() => tester.view.resetPhysicalSize());

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

      // Find and tap the user menu trigger
      final avatarFinder = find.byType(CircleAvatar);
      expect(avatarFinder, findsOneWidget);
      await tester.tap(avatarFinder);
      await tester.pumpAndSettle();

      // User should be able to access account actions
      expect(find.text('Settings'), findsOneWidget);
      expect(find.text('Logout'), findsOneWidget);
    });

    testWidgets('user can access navigation to dashboard', (tester) async {
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

      // Open navigation (drawer on narrow screens)
      final scaffoldState = tester.state<ScaffoldState>(find.byType(Scaffold));
      scaffoldState.openDrawer();
      await tester.pumpAndSettle();

      // User should see Dashboard as a navigation option
      expect(find.text('Dashboard'), findsOneWidget);
    });

    testWidgets('accepts custom sidebar menu items', (tester) async {
      final customItems = [
        const NavMenuItem(
          id: 'custom',
          label: 'Custom Item',
          icon: Icons.star,
          route: '/custom',
          requiresAuth: false, // Visible without auth for testing
        ),
      ];

      await tester.pumpWidget(
        wrapWithProviders(
          AdaptiveShell(
            currentRoute: '/custom',
            pageTitle: 'Test',
            body: const SizedBox(),
            sidebarMenuItems: customItems,
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Open the drawer
      final scaffoldState = tester.state<ScaffoldState>(find.byType(Scaffold));
      scaffoldState.openDrawer();
      await tester.pumpAndSettle();

      expect(find.text('Custom Item'), findsOneWidget);
    });
  });
}
