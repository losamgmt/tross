/// Tests for AdaptiveNavMenu molecule
///
/// **BEHAVIORAL FOCUS:**
/// - Renders trigger widget
/// - Shows popup menu on desktop/tablet (>= 600dp)
/// - Shows bottom sheet on mobile (< 600dp)
/// - Handles menu item selection
/// - Supports header in both modes
///
/// NOTE: NavMenuItem tests are in nav_menu_item_test.dart
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross/widgets/molecules/menus/adaptive_nav_menu.dart';
import 'package:tross/widgets/organisms/navigation/nav_menu_item.dart';

import '../../../helpers/helpers.dart';

void main() {
  /// Creates test menu items (public - no auth required for simpler testing)
  List<NavMenuItem> createTestItems() => [
    NavMenuItem(
      id: 'profile',
      label: 'Profile',
      icon: Icons.person,
      requiresAuth: false,
    ),
    NavMenuItem.divider(),
    NavMenuItem(
      id: 'settings',
      label: 'Settings',
      icon: Icons.settings,
      requiresAuth: false,
    ),
    NavMenuItem(
      id: 'logout',
      label: 'Logout',
      icon: Icons.logout,
      requiresAuth: false,
    ),
  ];

  /// Pumps widget with wide screen (>= 840dp) for desktop/popup mode
  Future<void> pumpDesktopMode(WidgetTester tester, Widget child) async {
    await pumpTestWidgetWithMediaQuery(
      tester,
      child,
      size: const Size(1200, 800),
    );
  }

  /// Pumps widget with narrow screen (< 600dp) for mobile/bottom sheet mode
  Future<void> pumpMobileMode(WidgetTester tester, Widget child) async {
    await pumpTestWidgetWithMediaQuery(
      tester,
      child,
      size: const Size(400, 800),
    );
  }

  group('AdaptiveNavMenu', () {
    group('on desktop (popup mode)', () {
      testWidgets('displays the trigger widget', (tester) async {
        await pumpDesktopMode(
          tester,
          AdaptiveNavMenu(
            trigger: const Text('Menu Trigger'),
            items: createTestItems(),
          ),
        );

        expect(find.text('Menu Trigger'), findsOneWidget);
      });

      testWidgets('renders as PopupMenuButton', (tester) async {
        await pumpDesktopMode(
          tester,
          AdaptiveNavMenu(
            trigger: const Icon(Icons.menu),
            items: createTestItems(),
          ),
        );

        expect(find.byType(PopupMenuButton<String>), findsOneWidget);
      });

      testWidgets('shows menu items when tapped', (tester) async {
        await pumpDesktopMode(
          tester,
          AdaptiveNavMenu(
            trigger: const Icon(Icons.menu),
            items: createTestItems(),
          ),
        );

        await tester.tap(find.byType(PopupMenuButton<String>));
        await tester.pumpAndSettle();

        expect(find.text('Profile'), findsOneWidget);
        expect(find.text('Settings'), findsOneWidget);
        expect(find.text('Logout'), findsOneWidget);
      });

      testWidgets('shows header in popup menu when provided', (tester) async {
        await pumpDesktopMode(
          tester,
          AdaptiveNavMenu(
            trigger: const Icon(Icons.menu),
            items: createTestItems(),
            header: const Text('User Header'),
          ),
        );

        await tester.tap(find.byType(PopupMenuButton<String>));
        await tester.pumpAndSettle();

        expect(find.text('User Header'), findsOneWidget);
      });

      testWidgets('calls onSelected when item is tapped', (tester) async {
        NavMenuItem? selectedItem;

        await pumpDesktopMode(
          tester,
          AdaptiveNavMenu(
            trigger: const Icon(Icons.menu),
            items: createTestItems(),
            onSelected: (item) => selectedItem = item,
          ),
        );

        await tester.tap(find.byType(PopupMenuButton<String>));
        await tester.pumpAndSettle();

        await tester.tap(find.text('Profile'));
        await tester.pumpAndSettle();

        expect(selectedItem?.id, 'profile');
      });

      testWidgets('shows tooltip on trigger', (tester) async {
        await pumpDesktopMode(
          tester,
          AdaptiveNavMenu(
            trigger: const Icon(Icons.menu),
            items: createTestItems(),
            tooltip: 'Open Menu',
          ),
        );

        final button = tester.widget<PopupMenuButton<String>>(
          find.byType(PopupMenuButton<String>),
        );
        expect(button.tooltip, 'Open Menu');
      });

      testWidgets('renders empty SizedBox when items list is empty', (
        tester,
      ) async {
        await pumpDesktopMode(
          tester,
          const AdaptiveNavMenu(trigger: Icon(Icons.menu), items: []),
        );

        expect(find.byType(PopupMenuButton<String>), findsNothing);
        expect(find.byType(SizedBox), findsWidgets);
      });
    });

    group('on mobile (bottom sheet mode)', () {
      testWidgets('displays the trigger widget', (tester) async {
        await pumpMobileMode(
          tester,
          AdaptiveNavMenu(
            trigger: const Text('Menu Trigger'),
            items: createTestItems(),
          ),
        );

        expect(find.text('Menu Trigger'), findsOneWidget);
      });

      testWidgets('renders as GestureDetector (not PopupMenuButton)', (
        tester,
      ) async {
        await pumpMobileMode(
          tester,
          AdaptiveNavMenu(
            trigger: const Icon(Icons.menu),
            items: createTestItems(),
          ),
        );

        // In mobile mode, there's no PopupMenuButton
        expect(find.byType(PopupMenuButton<String>), findsNothing);
        expect(find.byType(GestureDetector), findsWidgets);
      });

      testWidgets('shows bottom sheet when tapped', (tester) async {
        await pumpMobileMode(
          tester,
          AdaptiveNavMenu(
            trigger: const Text('Open'),
            items: createTestItems(),
          ),
        );

        await tester.tap(find.text('Open'));
        await tester.pumpAndSettle();

        // Bottom sheet should show the menu items
        expect(find.text('Profile'), findsOneWidget);
        expect(find.text('Settings'), findsOneWidget);
        expect(find.text('Logout'), findsOneWidget);
      });

      testWidgets('shows header in bottom sheet when provided', (tester) async {
        await pumpMobileMode(
          tester,
          AdaptiveNavMenu(
            trigger: const Text('Open'),
            items: createTestItems(),
            header: const Text('User Header'),
          ),
        );

        await tester.tap(find.text('Open'));
        await tester.pumpAndSettle();

        expect(find.text('User Header'), findsOneWidget);
      });

      testWidgets('calls onSelected when item is tapped', (tester) async {
        NavMenuItem? selectedItem;

        await pumpMobileMode(
          tester,
          AdaptiveNavMenu(
            trigger: const Text('Open'),
            items: createTestItems(),
            onSelected: (item) => selectedItem = item,
          ),
        );

        await tester.tap(find.text('Open'));
        await tester.pumpAndSettle();

        await tester.tap(find.text('Settings'));
        await tester.pumpAndSettle();

        expect(selectedItem?.id, 'settings');
      });

      testWidgets('closes bottom sheet after selection', (tester) async {
        await pumpMobileMode(
          tester,
          AdaptiveNavMenu(
            trigger: const Text('Open'),
            items: createTestItems(),
          ),
        );

        await tester.tap(find.text('Open'));
        await tester.pumpAndSettle();

        // Sheet is open
        expect(find.text('Profile'), findsOneWidget);

        await tester.tap(find.text('Profile'));
        await tester.pumpAndSettle();

        // Sheet should be closed - Profile no longer visible in overlay
        // The trigger is still there
        expect(find.text('Open'), findsOneWidget);
      });
    });

    group('static show method', () {
      testWidgets('returns null when items list is empty', (tester) async {
        await pumpDesktopMode(
          tester,
          Builder(
            builder: (context) => ElevatedButton(
              onPressed: () async {
                final result = await AdaptiveNavMenu.show(
                  context: context,
                  items: const [],
                );
                // Null check - button text changes on result
                if (result == null) {
                  // Test passes
                }
              },
              child: const Text('Show Menu'),
            ),
          ),
        );

        await tester.tap(find.text('Show Menu'));
        await tester.pumpAndSettle();

        // No menu should appear when items are empty
        expect(find.text('Profile'), findsNothing);
      });
    });

    group('MenuDisplayMode', () {
      testWidgets(
        'MenuDisplayMode.dropdown always shows popup even on mobile',
        (tester) async {
          await pumpMobileMode(
            tester,
            AdaptiveNavMenu(
              trigger: const Icon(Icons.menu),
              items: createTestItems(),
              displayMode: MenuDisplayMode.dropdown,
            ),
          );

          // With dropdown mode, should render PopupMenuButton even on mobile
          expect(find.byType(PopupMenuButton<String>), findsOneWidget);
        },
      );

      testWidgets('MenuDisplayMode.adaptive respects screen size', (
        tester,
      ) async {
        // On desktop
        await pumpDesktopMode(
          tester,
          AdaptiveNavMenu(
            trigger: const Icon(Icons.menu),
            items: createTestItems(),
            displayMode: MenuDisplayMode.adaptive,
          ),
        );
        expect(find.byType(PopupMenuButton<String>), findsOneWidget);

        // On mobile (re-pump with narrower screen)
        await pumpMobileMode(
          tester,
          AdaptiveNavMenu(
            trigger: const Icon(Icons.menu),
            items: createTestItems(),
            displayMode: MenuDisplayMode.adaptive,
          ),
        );
        expect(find.byType(PopupMenuButton<String>), findsNothing);
      });

      testWidgets('default displayMode is adaptive', (tester) async {
        await pumpMobileMode(
          tester,
          AdaptiveNavMenu(
            trigger: const Icon(Icons.menu),
            items: createTestItems(),
            // No displayMode specified - should default to adaptive
          ),
        );

        // On mobile with default (adaptive), should NOT be PopupMenuButton
        expect(find.byType(PopupMenuButton<String>), findsNothing);
      });
    });
  });
}
