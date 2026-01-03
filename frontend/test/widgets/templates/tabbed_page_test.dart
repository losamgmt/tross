/// TabbedPage Template Tests
///
/// Tests observable BEHAVIOR:
/// - User sees tab labels and icons
/// - User sees current tab highlighted
/// - User taps tab and navigates to URL
/// - Content displays for current tab
///
/// NO implementation details:
/// - ❌ Widget counts (findsNWidgets)
/// - ❌ Container/decoration inspection
/// - ❌ Internal widget hierarchy
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:tross_app/widgets/templates/tabbed_page.dart';

import '../../helpers/behavioral_test_helpers.dart';

void main() {
  group('TabbedPage Template', () {
    // Test tabs
    const testTabs = [
      TabDefinition(id: 'health', label: 'Health', icon: Icons.monitor_heart),
      TabDefinition(id: 'roles', label: 'Roles', icon: Icons.people),
      TabDefinition(id: 'settings', label: 'Settings', icon: Icons.settings),
    ];

    Widget buildPage({
      String currentTabId = 'health',
      List<TabDefinition>? tabs,
      String? title,
      Axis tabAxis = Axis.horizontal,
    }) {
      return MaterialApp.router(
        routerConfig: GoRouter(
          initialLocation: '/admin/system?tab=$currentTabId',
          routes: [
            GoRoute(
              path: '/admin/system',
              builder: (context, state) {
                final tabId = state.uri.queryParameters['tab'] ?? 'health';
                return Scaffold(
                  body: TabbedPage(
                    currentTabId: tabId,
                    tabs: tabs ?? testTabs,
                    baseRoute: '/admin/system',
                    title: title,
                    tabAxis: tabAxis,
                    contentBuilder: (id) =>
                        Center(child: Text('Content for $id')),
                  ),
                );
              },
            ),
          ],
        ),
      );
    }

    // Simple wrapper without go_router for basic tests
    Widget buildSimplePage({
      String currentTabId = 'health',
      List<TabDefinition>? tabs,
      String? title,
      Axis tabAxis = Axis.horizontal,
    }) {
      return MaterialApp(
        home: Scaffold(
          body: TabbedPage(
            currentTabId: currentTabId,
            tabs: tabs ?? testTabs,
            baseRoute: '/admin/system',
            title: title,
            tabAxis: tabAxis,
            contentBuilder: (id) => Center(child: Text('Content for $id')),
          ),
        ),
      );
    }

    // =========================================================================
    // User Sees Tabs
    // =========================================================================
    group('User Sees Tabs', () {
      testWidgets('user sees all tab labels', (tester) async {
        await tester.pumpWidget(buildSimplePage());

        assertTextVisible('Health');
        assertTextVisible('Roles');
        assertTextVisible('Settings');
      });

      testWidgets('user sees tab icons', (tester) async {
        await tester.pumpWidget(buildSimplePage());

        assertIconVisible(Icons.monitor_heart);
        assertIconVisible(Icons.people);
        assertIconVisible(Icons.settings);
      });

      testWidgets('user sees optional title', (tester) async {
        await tester.pumpWidget(buildSimplePage(title: 'System Configuration'));

        assertTextVisible('System Configuration');
      });

      testWidgets('empty tabs renders without error', (tester) async {
        await tester.pumpWidget(buildSimplePage(tabs: []));

        expect(find.byType(TabbedPage), findsOneWidget);
      });
    });

    // =========================================================================
    // User Sees Content
    // =========================================================================
    group('User Sees Content', () {
      testWidgets('user sees content for current tab', (tester) async {
        await tester.pumpWidget(buildSimplePage(currentTabId: 'health'));

        assertTextVisible('Content for health');
      });

      testWidgets('content changes when tab ID changes', (tester) async {
        await tester.pumpWidget(buildSimplePage(currentTabId: 'roles'));

        assertTextVisible('Content for roles');
      });

      testWidgets('unknown tab ID still renders content', (tester) async {
        await tester.pumpWidget(buildSimplePage(currentTabId: 'unknown'));

        // Should render with the unknown ID
        assertTextVisible('Content for unknown');
      });
    });

    // =========================================================================
    // Tab Navigation
    // =========================================================================
    group('Tab Navigation', () {
      testWidgets('tapping tab navigates to new route', (tester) async {
        await tester.pumpWidget(buildPage(currentTabId: 'health'));
        await tester.pumpAndSettle();

        // Verify starting content
        assertTextVisible('Content for health');

        // Tap Roles tab
        await tester.tap(find.text('Roles'));
        await tester.pumpAndSettle();

        // Content should change (via router)
        assertTextVisible('Content for roles');
      });

      testWidgets('disabled tab does not navigate', (tester) async {
        final tabsWithDisabled = [
          const TabDefinition(id: 'a', label: 'Tab A'),
          const TabDefinition(id: 'b', label: 'Tab B', enabled: false),
        ];

        await tester.pumpWidget(
          buildSimplePage(currentTabId: 'a', tabs: tabsWithDisabled),
        );

        // Content for tab A
        assertTextVisible('Content for a');

        // Try tap disabled tab (should do nothing in simple mode)
        await tester.tap(find.text('Tab B'));
        await tester.pump();

        // Still on tab A
        assertTextVisible('Content for a');
      });
    });

    // =========================================================================
    // Vertical Tab Layout
    // =========================================================================
    group('Vertical Tab Layout', () {
      testWidgets('vertical tabs display correctly', (tester) async {
        await tester.pumpWidget(buildSimplePage(tabAxis: Axis.vertical));

        // All tabs visible
        assertTextVisible('Health');
        assertTextVisible('Roles');
        assertTextVisible('Settings');

        // Content visible
        assertTextVisible('Content for health');
      });
    });

    // =========================================================================
    // Tooltips
    // =========================================================================
    group('Tooltips', () {
      testWidgets('tab with tooltip shows tooltip widget', (tester) async {
        final tabsWithTooltip = [
          const TabDefinition(
            id: 'help',
            label: 'Help',
            tooltip: 'Get help here',
          ),
        ];

        await tester.pumpWidget(buildSimplePage(tabs: tabsWithTooltip));

        expect(find.byType(Tooltip), findsWidgets);
      });
    });
  });
}
