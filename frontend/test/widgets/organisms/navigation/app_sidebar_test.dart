/// Tests for AppSidebar organism
///
/// **BEHAVIORAL FOCUS:**
/// - Renders navigation items
/// - Highlights active route
/// - Handles collapse/expand
/// - Shows/hides based on permissions
/// - Handles item taps
/// - Displays header/footer
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/organisms/navigation/app_sidebar.dart';
import 'package:tross_app/widgets/organisms/navigation/nav_menu_item.dart';

import '../../../helpers/test_helpers.dart';

void main() {
  group('AppSidebar', () {
    group('basic rendering', () {
      testWidgets('renders sidebar container', (tester) async {
        await tester.pumpTestWidget(const AppSidebar(items: []));

        expect(find.byType(AppSidebar), findsOneWidget);
      });

      testWidgets('uses expanded width by default', (tester) async {
        await tester.pumpTestWidget(
          const AppSidebar(items: [], expandedWidth: 250),
        );

        final container = tester.widget<Container>(
          find.byType(Container).first,
        );
        expect(container.constraints?.maxWidth, 250);
      });

      testWidgets('uses collapsed width when collapsed', (tester) async {
        await tester.pumpTestWidget(
          const AppSidebar(items: [], collapsed: true, collapsedWidth: 72),
        );

        await tester.pumpAndSettle();

        final container = tester.widget<Container>(
          find.byType(Container).first,
        );
        expect(container.constraints?.maxWidth, 72);
      });
    });

    group('menu items', () {
      testWidgets('displays menu item labels', (tester) async {
        await tester.pumpTestWidget(
          const AppSidebar(
            items: [
              NavMenuItem(
                id: 'home',
                label: 'Home',
                icon: Icons.home,
                requiresAuth: false,
              ),
              NavMenuItem(
                id: 'settings',
                label: 'Settings',
                icon: Icons.settings,
                requiresAuth: false,
              ),
            ],
          ),
        );

        expect(find.text('Home'), findsOneWidget);
        expect(find.text('Settings'), findsOneWidget);
      });

      testWidgets('displays menu item icons', (tester) async {
        await tester.pumpTestWidget(
          const AppSidebar(
            items: [
              NavMenuItem(
                id: 'home',
                label: 'Home',
                icon: Icons.home,
                requiresAuth: false,
              ),
            ],
          ),
        );

        expect(find.byIcon(Icons.home), findsOneWidget);
      });

      testWidgets('hides labels when collapsed', (tester) async {
        await tester.pumpTestWidget(
          const AppSidebar(
            items: [
              NavMenuItem(
                id: 'home',
                label: 'Home',
                icon: Icons.home,
                requiresAuth: false,
              ),
            ],
            collapsed: true,
          ),
        );

        await tester.pumpAndSettle();

        // Icon should still be visible
        expect(find.byIcon(Icons.home), findsOneWidget);
        // Label should be hidden
        expect(find.text('Home'), findsNothing);
      });
    });

    group('dividers and sections', () {
      testWidgets('renders divider items', (tester) async {
        await tester.pumpTestWidget(
          AppSidebar(
            items: [
              const NavMenuItem(
                id: 'item1',
                label: 'Item 1',
                requiresAuth: false,
              ),
              NavMenuItem.divider(),
              const NavMenuItem(
                id: 'item2',
                label: 'Item 2',
                requiresAuth: false,
              ),
            ],
            user: const {'id': '1', 'role': 'user'},
          ),
        );

        expect(find.byType(Divider), findsWidgets);
      });

      testWidgets('renders section headers', (tester) async {
        await tester.pumpTestWidget(
          AppSidebar(
            items: [
              NavMenuItem.section(id: 'admin', label: 'Administration'),
              const NavMenuItem(
                id: 'users',
                label: 'Users',
                requiresAuth: false,
              ),
            ],
            user: const {'id': '1', 'role': 'user'},
          ),
        );

        expect(find.text('ADMINISTRATION'), findsOneWidget);
      });

      testWidgets('section headers hidden in collapsed mode', (tester) async {
        await tester.pumpTestWidget(
          AppSidebar(
            items: [NavMenuItem.section(id: 'admin', label: 'Administration')],
            collapsed: true,
            user: const {'id': '1', 'role': 'user'},
          ),
        );

        await tester.pumpAndSettle();

        // Section text should not appear (shows divider instead)
        expect(find.text('ADMINISTRATION'), findsNothing);
      });
    });

    group('active route highlighting', () {
      testWidgets('highlights active menu item', (tester) async {
        await tester.pumpTestWidget(
          const AppSidebar(
            items: [
              NavMenuItem(
                id: 'home',
                label: 'Home',
                route: '/',
                requiresAuth: false,
              ),
              NavMenuItem(
                id: 'settings',
                label: 'Settings',
                route: '/settings',
                requiresAuth: false,
              ),
            ],
            currentRoute: '/settings',
          ),
        );

        // The Settings item should have primary color styling
        // We can verify by checking text style
        final settingsText = tester.widget<Text>(find.text('Settings'));
        expect(settingsText.style?.fontWeight, FontWeight.w600);
      });

      testWidgets('non-active items have normal weight', (tester) async {
        await tester.pumpTestWidget(
          const AppSidebar(
            items: [
              NavMenuItem(
                id: 'home',
                label: 'Home',
                route: '/',
                requiresAuth: false,
              ),
              NavMenuItem(
                id: 'settings',
                label: 'Settings',
                route: '/settings',
                requiresAuth: false,
              ),
            ],
            currentRoute: '/settings',
          ),
        );

        final homeText = tester.widget<Text>(find.text('Home'));
        expect(homeText.style?.fontWeight, isNot(FontWeight.w600));
      });
    });

    group('collapse toggle', () {
      testWidgets('shows expand icon when collapsed', (tester) async {
        await tester.pumpTestWidget(
          const AppSidebar(items: [], collapsed: true),
        );

        await tester.pumpAndSettle();

        expect(find.byIcon(Icons.chevron_right), findsOneWidget);
      });

      testWidgets('shows collapse icon when expanded', (tester) async {
        await tester.pumpTestWidget(
          const AppSidebar(items: [], collapsed: false),
        );

        expect(find.byIcon(Icons.chevron_left), findsOneWidget);
      });

      testWidgets('calls onToggleCollapse when toggle tapped', (tester) async {
        var toggled = false;
        await tester.pumpTestWidget(
          AppSidebar(items: const [], onToggleCollapse: () => toggled = true),
        );

        await tester.tap(find.byIcon(Icons.chevron_left));
        await tester.pumpAndSettle();

        expect(toggled, isTrue);
      });

      testWidgets('has correct tooltip for expand', (tester) async {
        await tester.pumpTestWidget(
          const AppSidebar(items: [], collapsed: true),
        );

        await tester.pumpAndSettle();

        final iconButton = tester.widget<IconButton>(find.byType(IconButton));
        expect(iconButton.tooltip, 'Expand sidebar');
      });

      testWidgets('has correct tooltip for collapse', (tester) async {
        await tester.pumpTestWidget(
          const AppSidebar(items: [], collapsed: false),
        );

        final iconButton = tester.widget<IconButton>(find.byType(IconButton));
        expect(iconButton.tooltip, 'Collapse sidebar');
      });
    });

    group('permission-based visibility', () {
      testWidgets('hides items when user is null and requiresAuth', (
        tester,
      ) async {
        await tester.pumpTestWidget(
          const AppSidebar(
            items: [
              NavMenuItem(id: 'public', label: 'Public', requiresAuth: false),
              NavMenuItem(id: 'private', label: 'Private', requiresAuth: true),
            ],
            user: null,
          ),
        );

        expect(find.text('Public'), findsOneWidget);
        expect(find.text('Private'), findsNothing);
      });

      testWidgets('shows auth items when user is authenticated', (
        tester,
      ) async {
        await tester.pumpTestWidget(
          const AppSidebar(
            items: [
              NavMenuItem(id: 'private', label: 'Private', requiresAuth: true),
            ],
            user: {'id': '123', 'role': 'user'},
          ),
        );

        expect(find.text('Private'), findsOneWidget);
      });

      testWidgets('hides admin items from non-admin users', (tester) async {
        await tester.pumpTestWidget(
          const AppSidebar(
            items: [
              NavMenuItem(
                id: 'admin',
                label: 'Admin Panel',
                requiresAdmin: true,
              ),
            ],
            user: {'id': '123', 'role': 'user'},
          ),
        );

        expect(find.text('Admin Panel'), findsNothing);
      });

      testWidgets('shows admin items to admin users', (tester) async {
        await tester.pumpTestWidget(
          const AppSidebar(
            items: [
              NavMenuItem(
                id: 'admin',
                label: 'Admin Panel',
                requiresAdmin: true,
              ),
            ],
            user: {'id': '123', 'role': 'admin'},
          ),
        );

        expect(find.text('Admin Panel'), findsOneWidget);
      });

      testWidgets('respects custom visibleWhen function', (tester) async {
        await tester.pumpTestWidget(
          AppSidebar(
            items: [
              NavMenuItem(
                id: 'custom',
                label: 'Custom Visibility',
                visibleWhen: (user) => user?['plan'] == 'premium',
              ),
            ],
            user: const {'plan': 'free'},
          ),
        );

        expect(find.text('Custom Visibility'), findsNothing);
      });

      testWidgets('shows item when visibleWhen returns true', (tester) async {
        await tester.pumpTestWidget(
          AppSidebar(
            items: [
              NavMenuItem(
                id: 'custom',
                label: 'Custom Visibility',
                visibleWhen: (user) => user?['plan'] == 'premium',
              ),
            ],
            user: const {'plan': 'premium'},
          ),
        );

        expect(find.text('Custom Visibility'), findsOneWidget);
      });
    });

    group('item tap handling', () {
      testWidgets('calls onItemTap when item tapped', (tester) async {
        NavMenuItem? tappedItem;
        await tester.pumpTestWidget(
          AppSidebar(
            items: const [
              NavMenuItem(
                id: 'home',
                label: 'Home',
                route: '/',
                requiresAuth: false,
              ),
            ],
            onItemTap: (item) => tappedItem = item,
          ),
        );

        await tester.tap(find.text('Home'));
        await tester.pumpAndSettle();

        expect(tappedItem?.id, 'home');
      });

      testWidgets('calls item onTap when provided', (tester) async {
        var itemTapped = false;
        await tester.pumpTestWidget(
          AppSidebar(
            items: [
              NavMenuItem(
                id: 'action',
                label: 'Action',
                requiresAuth: false,
                onTap: (context) => itemTapped = true,
              ),
            ],
          ),
        );

        await tester.tap(find.text('Action'));
        await tester.pumpAndSettle();

        expect(itemTapped, isTrue);
      });
    });

    group('badge display', () {
      testWidgets('shows badge count when provided', (tester) async {
        await tester.pumpTestWidget(
          const AppSidebar(
            items: [
              NavMenuItem(
                id: 'notifications',
                label: 'Notifications',
                badgeCount: 5,
                requiresAuth: false,
              ),
            ],
          ),
        );

        expect(find.text('5'), findsOneWidget);
      });

      testWidgets('shows 99+ for counts over 99', (tester) async {
        await tester.pumpTestWidget(
          const AppSidebar(
            items: [
              NavMenuItem(
                id: 'notifications',
                label: 'Notifications',
                badgeCount: 150,
                requiresAuth: false,
              ),
            ],
          ),
        );

        expect(find.text('99+'), findsOneWidget);
      });

      testWidgets('does not show badge for zero count', (tester) async {
        await tester.pumpTestWidget(
          const AppSidebar(
            items: [
              NavMenuItem(
                id: 'notifications',
                label: 'Notifications',
                badgeCount: 0,
                requiresAuth: false,
              ),
            ],
          ),
        );

        expect(find.text('0'), findsNothing);
      });
    });

    group('header and footer', () {
      testWidgets('displays header widget when provided', (tester) async {
        await tester.pumpTestWidget(
          const AppSidebar(items: [], header: Text('App Logo')),
        );

        expect(find.text('App Logo'), findsOneWidget);
      });

      testWidgets('displays footer widget when provided', (tester) async {
        await tester.pumpTestWidget(
          const AppSidebar(items: [], footer: Text('User Profile')),
        );

        expect(find.text('User Profile'), findsOneWidget);
      });

      testWidgets('displays both header and footer', (tester) async {
        await tester.pumpTestWidget(
          const AppSidebar(
            items: [],
            header: Text('Header'),
            footer: Text('Footer'),
          ),
        );

        expect(find.text('Header'), findsOneWidget);
        expect(find.text('Footer'), findsOneWidget);
      });
    });

    group('nested items', () {
      testWidgets('shows chevron for items with children', (tester) async {
        await tester.pumpTestWidget(
          const AppSidebar(
            items: [
              NavMenuItem(
                id: 'parent',
                label: 'Parent',
                requiresAuth: false,
                children: [NavMenuItem(id: 'child', label: 'Child')],
              ),
            ],
          ),
        );

        // Parent with children should show chevron_right
        expect(find.byIcon(Icons.chevron_right), findsWidgets);
      });

      testWidgets('does not show chevron for items without children', (
        tester,
      ) async {
        await tester.pumpTestWidget(
          const AppSidebar(
            items: [
              NavMenuItem(
                id: 'single',
                label: 'Single Item',
                requiresAuth: false,
              ),
            ],
          ),
        );

        // Only the collapse toggle chevron should be visible
        // (chevron_left for collapse, not chevron_right for children)
        expect(find.byIcon(Icons.chevron_left), findsOneWidget);
      });
    });

    group('animation', () {
      testWidgets('collapse toggle updates state', (tester) async {
        var collapsed = false;
        await tester.pumpTestWidget(
          StatefulBuilder(
            builder: (context, setState) {
              return AppSidebar(
                items: const [],
                collapsed: collapsed,
                expandedWidth: 250,
                collapsedWidth: 72,
                onToggleCollapse: () => setState(() => collapsed = !collapsed),
              );
            },
          ),
        );

        // Verify starts expanded
        expect(find.byIcon(Icons.chevron_left), findsOneWidget);

        // Tap collapse and settle
        await tester.tap(find.byIcon(Icons.chevron_left));
        await tester.pumpAndSettle();

        // After animation, should show expand icon
        expect(find.byIcon(Icons.chevron_right), findsOneWidget);
      });
    });
  });

  group('NavMenuItem', () {
    group('factory constructors', () {
      test('divider creates divider item', () {
        final divider = NavMenuItem.divider();

        expect(divider.isDivider, isTrue);
        expect(divider.label, '');
      });

      test('divider accepts custom id', () {
        final divider = NavMenuItem.divider(id: 'custom-divider');

        expect(divider.id, 'custom-divider');
      });

      test('section creates section header', () {
        final section = NavMenuItem.section(id: 'admin', label: 'Admin');

        expect(section.isSectionHeader, isTrue);
        expect(section.label, 'Admin');
      });

      test('section can have icon', () {
        final section = NavMenuItem.section(
          id: 'admin',
          label: 'Admin',
          icon: Icons.admin_panel_settings,
        );

        expect(section.icon, Icons.admin_panel_settings);
      });
    });

    group('isVisibleFor', () {
      test('returns false for requiresAuth when user null', () {
        const item = NavMenuItem(id: 'test', label: 'Test', requiresAuth: true);

        expect(item.isVisibleFor(null), isFalse);
      });

      test('returns true for requiresAuth when user present', () {
        const item = NavMenuItem(id: 'test', label: 'Test', requiresAuth: true);

        expect(item.isVisibleFor({'id': '123'}), isTrue);
      });

      test('returns false for requiresAdmin when not admin', () {
        const item = NavMenuItem(
          id: 'test',
          label: 'Test',
          requiresAdmin: true,
        );

        expect(item.isVisibleFor({'id': '123', 'role': 'user'}), isFalse);
      });

      test('returns true for requiresAdmin when admin', () {
        const item = NavMenuItem(
          id: 'test',
          label: 'Test',
          requiresAdmin: true,
        );

        expect(item.isVisibleFor({'id': '123', 'role': 'admin'}), isTrue);
      });

      test('custom visibleWhen overrides defaults', () {
        final item = NavMenuItem(
          id: 'test',
          label: 'Test',
          requiresAuth: true,
          visibleWhen: (user) => true, // Always visible
        );

        // Even with null user, custom function returns true
        expect(item.isVisibleFor(null), isTrue);
      });

      test('returns true when no requirements', () {
        const item = NavMenuItem(
          id: 'test',
          label: 'Test',
          requiresAuth: false,
        );

        expect(item.isVisibleFor(null), isTrue);
      });
    });
  });
}
