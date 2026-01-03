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
import 'package:tross_app/widgets/organisms/navigation/app_header.dart';
import 'package:tross_app/widgets/molecules/display/initials_avatar.dart';
import 'package:tross_app/widgets/atoms/buttons/app_button.dart';

import '../../../helpers/helpers.dart';

void main() {
  /// Creates an AppHeader with required props
  Widget createTestWidget({
    String pageTitle = 'Test Page',
    String userName = 'Test User',
    String userEmail = 'test@test.com',
    String userRole = 'user',
    Map<String, dynamic>? user,
    List<AppHeaderMenuItem>? menuItems,
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

  group('AppHeader', () {
    group('basic rendering', () {
      testWidgets('renders as an AppBar', (tester) async {
        await pumpTestWidget(tester, createTestWidget());

        expect(find.byType(AppBar), findsOneWidget);
      });

      testWidgets('displays the page title', (tester) async {
        await pumpTestWidget(tester, createTestWidget(pageTitle: 'Dashboard'));

        expect(find.text('Dashboard'), findsOneWidget);
      });

      testWidgets('shows logo button in leading position', (tester) async {
        await pumpTestWidget(tester, createTestWidget());

        expect(find.byType(AppButton), findsOneWidget);
        expect(find.text('Tross'), findsOneWidget);
      });

      testWidgets('shows home icon on logo button', (tester) async {
        await pumpTestWidget(tester, createTestWidget());

        expect(find.byIcon(Icons.home), findsOneWidget);
      });

      testWidgets('shows user avatar in actions', (tester) async {
        await pumpTestWidget(
          tester,
          createTestWidget(userName: 'John Doe', userEmail: 'john@test.com'),
        );

        expect(find.byType(InitialsAvatar), findsOneWidget);
      });

      testWidgets('centers the title', (tester) async {
        await pumpTestWidget(tester, createTestWidget());

        final appBar = tester.widget<AppBar>(find.byType(AppBar));
        expect(appBar.centerTitle, isTrue);
      });
    });

    group('prop-driven user data', () {
      testWidgets('displays provided userName', (tester) async {
        await pumpTestWidget(
          tester,
          createTestWidget(userName: 'Jane Smith', userEmail: 'jane@test.com'),
        );

        // Open the menu to see user info
        await tester.tap(find.byType(PopupMenuButton<String>));
        await tester.pumpAndSettle();

        expect(find.text('Jane Smith'), findsOneWidget);
      });

      testWidgets('displays provided userEmail', (tester) async {
        await pumpTestWidget(
          tester,
          createTestWidget(userName: 'User', userEmail: 'custom@email.com'),
        );

        // Open the menu
        await tester.tap(find.byType(PopupMenuButton<String>));
        await tester.pumpAndSettle();

        expect(find.text('custom@email.com'), findsOneWidget);
      });

      testWidgets('displays provided userRole (uppercased)', (tester) async {
        await pumpTestWidget(
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
        await pumpTestWidget(
          tester,
          createTestWidget(onLogoPressed: () => logoPressedCount++),
        );

        await tester.tap(find.byType(AppButton));
        await tester.pumpAndSettle();

        expect(logoPressedCount, 1);
      });

      testWidgets('logo button has Home tooltip', (tester) async {
        await pumpTestWidget(tester, createTestWidget());

        final button = tester.widget<AppButton>(find.byType(AppButton));
        expect(button.tooltip, 'Home');
      });
    });

    group('menu items', () {
      testWidgets('shows PopupMenuButton for user menu', (tester) async {
        await pumpTestWidget(tester, createTestWidget());

        expect(find.byType(PopupMenuButton<String>), findsOneWidget);
      });

      testWidgets('menu button has User Menu tooltip', (tester) async {
        await pumpTestWidget(tester, createTestWidget());

        final menuButton = tester.widget<PopupMenuButton<String>>(
          find.byType(PopupMenuButton<String>),
        );
        expect(menuButton.tooltip, 'User Menu');
      });

      testWidgets('shows Settings in menu', (tester) async {
        await pumpTestWidget(
          tester,
          createTestWidget(userName: 'User', userEmail: 'test@test.com'),
        );

        // Open the menu
        await tester.tap(find.byType(PopupMenuButton<String>));
        await tester.pumpAndSettle();

        expect(find.text('Settings'), findsOneWidget);
      });

      testWidgets('shows Logout in menu', (tester) async {
        await pumpTestWidget(
          tester,
          createTestWidget(userName: 'User', userEmail: 'test@test.com'),
        );

        // Open the menu
        await tester.tap(find.byType(PopupMenuButton<String>));
        await tester.pumpAndSettle();

        expect(find.text('Logout'), findsOneWidget);
      });

      testWidgets('shows settings icon', (tester) async {
        await pumpTestWidget(
          tester,
          createTestWidget(userName: 'User', userEmail: 'test@test.com'),
        );

        // Open the menu
        await tester.tap(find.byType(PopupMenuButton<String>));
        await tester.pumpAndSettle();

        expect(find.byIcon(Icons.settings), findsOneWidget);
      });

      testWidgets('shows logout icon', (tester) async {
        await pumpTestWidget(
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
          const AppHeaderMenuItem(
            id: 'custom',
            label: 'Custom Action',
            icon: Icons.star,
          ),
          AppHeaderMenuItem.logout,
        ];

        await pumpTestWidget(
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
          AppHeaderMenuItem(
            id: 'visible',
            label: 'Visible Item',
            icon: Icons.check,
            visibleWhen: (_) => true,
          ),
          AppHeaderMenuItem(
            id: 'hidden',
            label: 'Hidden Item',
            icon: Icons.close,
            visibleWhen: (_) => false,
          ),
          AppHeaderMenuItem.logout,
        ];

        await pumpTestWidget(
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
        await pumpTestWidget(tester, createTestWidget());

        final appHeader = tester.widget<AppHeader>(find.byType(AppHeader));
        expect(appHeader, isA<PreferredSizeWidget>());
      });

      testWidgets('has toolbar height as preferred size', (tester) async {
        await pumpTestWidget(tester, createTestWidget());

        final appHeader = tester.widget<AppHeader>(find.byType(AppHeader));
        expect(appHeader.preferredSize.height, kToolbarHeight);
      });
    });

    group('AppHeaderMenuItem', () {
      test('settings has correct configuration', () {
        expect(AppHeaderMenuItem.settings.id, 'settings');
        expect(AppHeaderMenuItem.settings.label, 'Settings');
        expect(AppHeaderMenuItem.settings.icon, Icons.settings);
        expect(AppHeaderMenuItem.settings.route, '/settings');
      });

      test('logout has correct configuration', () {
        expect(AppHeaderMenuItem.logout.id, 'logout');
        expect(AppHeaderMenuItem.logout.label, 'Logout');
        expect(AppHeaderMenuItem.logout.icon, Icons.logout);
      });

      test('admin has visibility condition', () {
        expect(AppHeaderMenuItem.admin.id, 'admin');
        expect(AppHeaderMenuItem.admin.label, 'Admin Dashboard');
        expect(AppHeaderMenuItem.admin.visibleWhen, isNotNull);
      });

      test('defaultItems contains settings, admin, and logout', () {
        final items = AppHeaderMenuItem.defaultItems;
        expect(items.length, 3);
        expect(
          items.map((i) => i.id),
          containsAll(['settings', 'admin', 'logout']),
        );
      });
    });
  });
}
