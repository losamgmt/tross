/// Tests for AppHeader organism
///
/// **BEHAVIORAL FOCUS:**
/// - Renders page title correctly
/// - Shows user avatar in menu trigger
/// - Prop-driven user data display
/// - Menu items configurable and filter by visibility
/// - Logo navigation works
/// - Menu item selection routes correctly
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross/widgets/organisms/navigation/app_header.dart';
import 'package:tross/widgets/organisms/navigation/nav_menu_item.dart';
import 'package:tross/widgets/molecules/display/initials_avatar.dart';
import 'package:tross/widgets/atoms/buttons/app_button.dart';

import '../../../helpers/helpers.dart';

void main() {
  /// Default mock user for tests - ensures menu items are visible
  const defaultTestUser = <String, dynamic>{
    'id': 'test-user-id',
    'email': 'test@test.com',
    'role': 'user',
  };

  /// Creates an AppHeader with required props
  Widget createTestWidget({
    String pageTitle = 'Test Page',
    String userName = 'Test User',
    String userEmail = 'test@test.com',
    String userRole = 'user',
    Map<String, dynamic>? user = defaultTestUser,
    List<NavMenuItem>? menuItems,
    VoidCallback? onLogoPressed,
    void Function(String route)? onNavigate,
    Future<void> Function()? onLogout,
  }) {
    return AppHeader(
      pageTitle: pageTitle,
      userName: userName,
      userEmail: userEmail,
      userRole: userRole,
      user: user,
      menuItems: menuItems,
      onLogoPressed: onLogoPressed,
      onNavigate: onNavigate,
      onLogout: onLogout,
    );
  }

  /// Helper to pump with wide screen (ensures popup menu mode)
  Future<void> pumpWideScreen(WidgetTester tester, Widget child) async {
    await pumpTestWidgetWithMediaQuery(
      tester,
      child,
      size: const Size(1200, 800), // Wide screen triggers popup mode
    );
  }

  group('AppHeader', () {
    group('basic rendering', () {
      testWidgets('renders as an AppBar', (tester) async {
        await pumpWideScreen(tester, createTestWidget());

        expect(find.byType(AppBar), findsOneWidget);
      });

      testWidgets('displays the page title', (tester) async {
        await pumpWideScreen(tester, createTestWidget(pageTitle: 'Dashboard'));

        expect(find.text('Dashboard'), findsOneWidget);
      });

      testWidgets('shows logo button in leading position', (tester) async {
        await pumpWideScreen(tester, createTestWidget());

        expect(find.byType(AppButton), findsOneWidget);
        expect(find.text('Tross'), findsOneWidget);
      });

      testWidgets('shows home icon on logo button', (tester) async {
        await pumpWideScreen(tester, createTestWidget());

        expect(find.byIcon(Icons.home), findsOneWidget);
      });

      testWidgets('shows user avatar in actions', (tester) async {
        await pumpWideScreen(
          tester,
          createTestWidget(userName: 'John Doe', userEmail: 'john@test.com'),
        );

        expect(find.byType(InitialsAvatar), findsOneWidget);
      });

      testWidgets('centers the title', (tester) async {
        await pumpWideScreen(tester, createTestWidget());

        final appBar = tester.widget<AppBar>(find.byType(AppBar));
        expect(appBar.centerTitle, isTrue);
      });
    });

    group('prop-driven user data', () {
      testWidgets('displays provided userName', (tester) async {
        await pumpWideScreen(
          tester,
          createTestWidget(userName: 'Jane Smith', userEmail: 'jane@test.com'),
        );

        // Open the menu to see user info
        await tester.tap(find.byType(PopupMenuButton<String>));
        await tester.pumpAndSettle();

        expect(find.text('Jane Smith'), findsOneWidget);
      });

      testWidgets('displays provided userEmail', (tester) async {
        await pumpWideScreen(
          tester,
          createTestWidget(userName: 'User', userEmail: 'custom@email.com'),
        );

        // Open the menu
        await tester.tap(find.byType(PopupMenuButton<String>));
        await tester.pumpAndSettle();

        expect(find.text('custom@email.com'), findsOneWidget);
      });

      testWidgets('displays provided userRole (uppercased)', (tester) async {
        await pumpWideScreen(
          tester,
          createTestWidget(
            userName: 'Admin User',
            userEmail: 'admin@test.com',
            userRole: 'Administrator',
          ),
        );

        // Open the menu
        await tester.tap(find.byType(PopupMenuButton<String>));
        await tester.pumpAndSettle();

        // Role is uppercased in display
        expect(find.text('ADMINISTRATOR'), findsOneWidget);
      });
    });

    group('logo button behavior', () {
      testWidgets('calls onLogoPressed when logo tapped', (tester) async {
        var logoPressedCount = 0;
        await pumpWideScreen(
          tester,
          createTestWidget(onLogoPressed: () => logoPressedCount++),
        );

        await tester.tap(find.byType(AppButton));
        await tester.pumpAndSettle();

        expect(logoPressedCount, 1);
      });

      testWidgets('logo button has Home tooltip', (tester) async {
        await pumpWideScreen(tester, createTestWidget());

        final button = tester.widget<AppButton>(find.byType(AppButton));
        expect(button.tooltip, 'Home');
      });
    });

    group('menu items', () {
      testWidgets('shows PopupMenuButton for user menu', (tester) async {
        await pumpWideScreen(tester, createTestWidget());

        expect(find.byType(PopupMenuButton<String>), findsOneWidget);
      });

      testWidgets('menu button has User Menu tooltip', (tester) async {
        await pumpWideScreen(tester, createTestWidget());

        final menuButton = tester.widget<PopupMenuButton<String>>(
          find.byType(PopupMenuButton<String>),
        );
        expect(menuButton.tooltip, 'User Menu');
      });

      testWidgets('shows Settings in menu', (tester) async {
        await pumpWideScreen(
          tester,
          createTestWidget(userName: 'User', userEmail: 'test@test.com'),
        );

        // Open the menu
        await tester.tap(find.byType(PopupMenuButton<String>));
        await tester.pumpAndSettle();

        expect(find.text('Settings'), findsOneWidget);
      });

      testWidgets('shows Logout in menu', (tester) async {
        await pumpWideScreen(
          tester,
          createTestWidget(userName: 'User', userEmail: 'test@test.com'),
        );

        // Open the menu
        await tester.tap(find.byType(PopupMenuButton<String>));
        await tester.pumpAndSettle();

        expect(find.text('Logout'), findsOneWidget);
      });

      testWidgets('shows settings icon', (tester) async {
        await pumpWideScreen(
          tester,
          createTestWidget(userName: 'User', userEmail: 'test@test.com'),
        );

        // Open the menu
        await tester.tap(find.byType(PopupMenuButton<String>));
        await tester.pumpAndSettle();

        expect(find.byIcon(Icons.settings), findsOneWidget);
      });

      testWidgets('shows logout icon', (tester) async {
        await pumpWideScreen(
          tester,
          createTestWidget(userName: 'User', userEmail: 'test@test.com'),
        );

        // Open the menu
        await tester.tap(find.byType(PopupMenuButton<String>));
        await tester.pumpAndSettle();

        expect(find.byIcon(Icons.logout), findsOneWidget);
      });
    });

    group('custom menu items', () {
      testWidgets('renders custom menu items', (tester) async {
        final customItems = [
          NavMenuItem(id: 'custom', label: 'Custom Action', icon: Icons.star),
          AppHeaderMenuItems.logout,
        ];

        await pumpWideScreen(
          tester,
          createTestWidget(
            userName: 'User',
            userEmail: 'test@test.com',
            menuItems: customItems,
          ),
        );

        // Open the menu
        await tester.tap(find.byType(PopupMenuButton<String>));
        await tester.pumpAndSettle();

        expect(find.text('Custom Action'), findsOneWidget);
        expect(find.byIcon(Icons.star), findsOneWidget);
      });

      testWidgets('hides menu items based on visibility function', (
        tester,
      ) async {
        final conditionalItems = [
          NavMenuItem(
            id: 'visible',
            label: 'Visible Item',
            icon: Icons.check,
            visibleWhen: (_) => true,
          ),
          NavMenuItem(
            id: 'hidden',
            label: 'Hidden Item',
            icon: Icons.close,
            visibleWhen: (_) => false,
          ),
          AppHeaderMenuItems.logout,
        ];

        await pumpWideScreen(
          tester,
          createTestWidget(
            userName: 'User',
            userEmail: 'test@test.com',
            menuItems: conditionalItems,
          ),
        );

        // Open the menu
        await tester.tap(find.byType(PopupMenuButton<String>));
        await tester.pumpAndSettle();

        expect(find.text('Visible Item'), findsOneWidget);
        expect(find.text('Hidden Item'), findsNothing);
      });
    });

    group('preferred size', () {
      testWidgets('implements PreferredSizeWidget', (tester) async {
        await pumpWideScreen(tester, createTestWidget());

        final appHeader = tester.widget<AppHeader>(find.byType(AppHeader));
        expect(appHeader, isA<PreferredSizeWidget>());
      });

      testWidgets('has toolbar height as preferred size', (tester) async {
        await pumpWideScreen(tester, createTestWidget());

        final appHeader = tester.widget<AppHeader>(find.byType(AppHeader));
        expect(appHeader.preferredSize.height, kToolbarHeight);
      });
    });

    group('AppHeaderMenuItems', () {
      test('settings has correct configuration', () {
        expect(AppHeaderMenuItems.settings.id, 'settings');
        expect(AppHeaderMenuItems.settings.label, 'Settings');
        expect(AppHeaderMenuItems.settings.icon, Icons.settings);
        expect(AppHeaderMenuItems.settings.route, '/settings');
      });

      test('logout has correct configuration', () {
        expect(AppHeaderMenuItems.logout.id, 'logout');
        expect(AppHeaderMenuItems.logout.label, 'Logout');
        expect(AppHeaderMenuItems.logout.icon, Icons.logout);
      });

      test('admin has visibility condition', () {
        expect(AppHeaderMenuItems.admin.id, 'admin');
        expect(AppHeaderMenuItems.admin.label, 'Admin Dashboard');
        expect(AppHeaderMenuItems.admin.visibleWhen, isNotNull);
      });

      test('defaultItems contains settings, admin, divider, and logout', () {
        final items = AppHeaderMenuItems.defaultItems;
        // 4 items: settings, admin, divider, logout
        expect(items.length, 4);
        expect(
          items.where((i) => !i.isDivider).map((i) => i.id),
          containsAll(['settings', 'admin', 'logout']),
        );
      });
    });
  });
}
