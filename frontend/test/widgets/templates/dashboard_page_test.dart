/// DashboardPage Template Tests
///
/// Tests observable BEHAVIOR:
/// - User sees page title and subtitle
/// - User sees card titles and icons
/// - User taps card and callback fires
/// - Empty state displays when no cards
/// - Grid adapts to screen width
///
/// NO implementation details:
/// - ❌ Widget counts (findsNWidgets)
/// - ❌ Container/decoration inspection
/// - ❌ Internal widget hierarchy
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/templates/dashboard_page.dart';

import '../../helpers/behavioral_test_helpers.dart';

void main() {
  group('DashboardPage Template', () {
    // Test cards
    List<DashboardCardConfig> testCards({VoidCallback? onTap}) => [
      DashboardCardConfig(
        title: 'System Health',
        subtitle: 'All systems operational',
        icon: Icons.monitor_heart,
        onTap: onTap,
      ),
      DashboardCardConfig(
        title: 'Users',
        subtitle: '42 active',
        icon: Icons.people,
      ),
      DashboardCardConfig(
        title: 'Settings',
        icon: Icons.settings,
        badge: 'New',
      ),
    ];

    Widget buildPage({
      String title = 'Dashboard',
      String? subtitle,
      List<DashboardCardConfig>? cards,
      List<Widget>? actions,
      String emptyMessage = 'No items to display',
    }) {
      return MaterialApp(
        home: Scaffold(
          body: DashboardPage(
            title: title,
            subtitle: subtitle,
            cards: cards ?? testCards(),
            actions: actions,
            emptyMessage: emptyMessage,
          ),
        ),
      );
    }

    // =========================================================================
    // User Sees Header
    // =========================================================================
    group('User Sees Header', () {
      testWidgets('user sees page title', (tester) async {
        await tester.pumpWidget(buildPage(title: 'Admin Dashboard'));

        assertTextVisible('Admin Dashboard');
      });

      testWidgets('user sees page subtitle when provided', (tester) async {
        await tester.pumpWidget(
          buildPage(title: 'Dashboard', subtitle: 'Overview of system status'),
        );

        assertTextVisible('Dashboard');
        assertTextVisible('Overview of system status');
      });

      testWidgets('user sees header actions', (tester) async {
        await tester.pumpWidget(
          buildPage(
            actions: [
              IconButton(icon: const Icon(Icons.refresh), onPressed: () {}),
            ],
          ),
        );

        assertIconVisible(Icons.refresh);
      });
    });

    // =========================================================================
    // User Sees Cards
    // =========================================================================
    group('User Sees Cards', () {
      testWidgets('user sees all card titles', (tester) async {
        await tester.pumpWidget(buildPage());

        assertTextVisible('System Health');
        assertTextVisible('Users');
        assertTextVisible('Settings');
      });

      testWidgets('user sees card subtitles', (tester) async {
        await tester.pumpWidget(buildPage());

        assertTextVisible('All systems operational');
        assertTextVisible('42 active');
      });

      testWidgets('user sees card icons', (tester) async {
        await tester.pumpWidget(buildPage());

        assertIconVisible(Icons.monitor_heart);
        assertIconVisible(Icons.people);
        assertIconVisible(Icons.settings);
      });

      testWidgets('user sees card badges', (tester) async {
        await tester.pumpWidget(buildPage());

        assertTextVisible('New');
      });

      testWidgets('user sees custom content in cards', (tester) async {
        final cardsWithContent = [
          DashboardCardConfig(
            title: 'Stats',
            content: const Text('Custom Stats Content'),
          ),
        ];

        await tester.pumpWidget(buildPage(cards: cardsWithContent));

        assertTextVisible('Stats');
        assertTextVisible('Custom Stats Content');
      });
    });

    // =========================================================================
    // Card Interactions
    // =========================================================================
    group('Card Interactions', () {
      testWidgets('tapping card fires onTap callback', (tester) async {
        bool tapped = false;
        final cards = testCards(onTap: () => tapped = true);

        await tester.pumpWidget(buildPage(cards: cards));

        // Tap first card
        await tester.tap(find.text('System Health'));
        await tester.pump();

        assertCallbackReceivedValue(tapped, true, 'onTap');
      });

      testWidgets('cards with onTap show arrow indicator', (tester) async {
        final cardsWithTap = [
          DashboardCardConfig(title: 'Tappable', onTap: () {}),
        ];

        await tester.pumpWidget(buildPage(cards: cardsWithTap));

        // Arrow icon should be present for tappable cards
        assertIconVisible(Icons.arrow_forward);
      });
    });

    // =========================================================================
    // Empty State
    // =========================================================================
    group('Empty State', () {
      testWidgets('shows empty message when no cards', (tester) async {
        await tester.pumpWidget(
          buildPage(cards: [], emptyMessage: 'Nothing here yet'),
        );

        assertTextVisible('Nothing here yet');
      });

      testWidgets('shows dashboard icon in empty state', (tester) async {
        await tester.pumpWidget(buildPage(cards: []));

        assertIconVisible(Icons.dashboard_outlined);
      });
    });

    // =========================================================================
    // Highlighted Cards
    // =========================================================================
    group('Highlighted Cards', () {
      testWidgets('highlighted card renders without error', (tester) async {
        final cards = [
          const DashboardCardConfig(title: 'Featured', isHighlighted: true),
        ];

        await tester.pumpWidget(buildPage(cards: cards));

        assertTextVisible('Featured');
      });
    });

    // =========================================================================
    // Responsive Grid
    // =========================================================================
    group('Responsive Grid', () {
      testWidgets('renders on narrow screens', (tester) async {
        tester.view.physicalSize = const Size(400, 800);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(() {
          tester.view.resetPhysicalSize();
          tester.view.resetDevicePixelRatio();
        });

        await tester.pumpWidget(buildPage());

        // All cards still visible
        assertTextVisible('System Health');
        assertTextVisible('Users');
        assertTextVisible('Settings');
      });

      testWidgets('renders on wide screens', (tester) async {
        tester.view.physicalSize = const Size(1200, 800);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(() {
          tester.view.resetPhysicalSize();
          tester.view.resetDevicePixelRatio();
        });

        await tester.pumpWidget(buildPage());

        // All cards still visible
        assertTextVisible('System Health');
        assertTextVisible('Users');
        assertTextVisible('Settings');
      });
    });
  });
}
