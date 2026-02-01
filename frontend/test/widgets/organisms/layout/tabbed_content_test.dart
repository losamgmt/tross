/// TabbedContent Organism Tests
///
/// Tests for the unified tabbed layout component.
/// Supports two modes:
/// - Local state (syncWithUrl: false) - internal TabController
/// - URL-synced (syncWithUrl: true) - go_router navigation
///
/// Tests observable BEHAVIOR:
/// - User sees tab labels and icons
/// - User sees current tab highlighted
/// - User taps tab and content changes
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
import 'package:tross_app/widgets/organisms/layout/tabbed_content.dart';
import '../../../helpers/helpers.dart';

void main() {
  group('TabbedContent', () {
    // Shared test tab configurations
    const testTabs = [
      TabConfig(id: 'health', label: 'Health', icon: Icons.monitor_heart),
      TabConfig(id: 'roles', label: 'Roles', icon: Icons.people),
      TabConfig(id: 'settings', label: 'Settings', icon: Icons.settings),
    ];

    // =========================================================================
    // LOCAL STATE MODE (syncWithUrl: false)
    // =========================================================================
    group('Local State Mode', () {
      group('basic rendering', () {
        testWidgets('renders all tab labels', (tester) async {
          await tester.pumpTestWidget(
            TabbedContent(
              tabs: testTabs,
              contentBuilder: (id) => Text('Content for $id'),
            ),
          );

          expect(find.text('Health'), findsOneWidget);
          expect(find.text('Roles'), findsOneWidget);
          expect(find.text('Settings'), findsOneWidget);
        });

        testWidgets('renders icons when provided', (tester) async {
          await tester.pumpTestWidget(
            TabbedContent(
              tabs: testTabs,
              contentBuilder: (id) => Text('Content for $id'),
            ),
          );

          expect(find.byIcon(Icons.monitor_heart), findsOneWidget);
          expect(find.byIcon(Icons.people), findsOneWidget);
          expect(find.byIcon(Icons.settings), findsOneWidget);
        });

        testWidgets('shows first tab content by default', (tester) async {
          await tester.pumpTestWidget(
            TabbedContent(
              tabs: testTabs,
              contentBuilder: (id) => Text('Content for $id'),
            ),
          );

          expect(find.text('Content for health'), findsOneWidget);
        });

        testWidgets('respects initialIndex parameter', (tester) async {
          await tester.pumpTestWidget(
            TabbedContent(
              tabs: testTabs,
              initialIndex: 1,
              contentBuilder: (id) => Text('Content for $id'),
            ),
          );

          expect(find.text('Content for roles'), findsOneWidget);
        });

        testWidgets('empty tabs renders without error', (tester) async {
          await tester.pumpTestWidget(
            TabbedContent(
              tabs: const [],
              contentBuilder: (id) => Text('Content for $id'),
            ),
          );

          expect(find.byType(TabbedContent), findsOneWidget);
        });
      });

      group('tab switching', () {
        testWidgets('switches content when tab is tapped', (tester) async {
          await tester.pumpTestWidget(
            TabbedContent(
              tabs: testTabs,
              contentBuilder: (id) => Text('Content for $id'),
            ),
          );

          // Initially shows first tab content
          expect(find.text('Content for health'), findsOneWidget);

          // Tap Roles tab
          await tester.tap(find.text('Roles'));
          await tester.pumpAndSettle();

          // Now shows Roles content
          expect(find.text('Content for roles'), findsOneWidget);
        });

        testWidgets('calls onTabChanged callback', (tester) async {
          int? changedIndex;

          await tester.pumpTestWidget(
            TabbedContent(
              tabs: testTabs,
              onTabChanged: (index) => changedIndex = index,
              contentBuilder: (id) => Text('Content for $id'),
            ),
          );

          await tester.tap(find.text('Roles'));
          await tester.pumpAndSettle();

          expect(changedIndex, equals(1));
        });
      });

      group('tab position', () {
        testWidgets('renders tabs at top by default', (tester) async {
          await tester.pumpTestWidget(
            TabbedContent(
              tabs: testTabs,
              contentBuilder: (id) => Text('Content for $id'),
            ),
          );

          expect(find.byType(TabBar), findsOneWidget);
          expect(find.byType(TabBarView), findsOneWidget);
        });

        testWidgets('renders tabs at bottom when specified', (tester) async {
          await tester.pumpTestWidget(
            TabbedContent(
              tabs: testTabs,
              tabPosition: TabPosition.bottom,
              contentBuilder: (id) => Text('Content for $id'),
            ),
          );

          expect(find.byType(TabBar), findsOneWidget);
          expect(find.byType(TabBarView), findsOneWidget);
        });
      });

      group('scrollable tabs', () {
        testWidgets('renders scrollable tabs when isScrollable is true', (
          tester,
        ) async {
          await tester.pumpTestWidget(
            TabbedContent(
              isScrollable: true,
              tabs: List.generate(
                10,
                (i) => TabConfig(id: 'tab$i', label: 'Tab $i'),
              ),
              contentBuilder: (id) => Text('Content for $id'),
            ),
          );

          // All tabs should render
          expect(find.text('Tab 0'), findsOneWidget);
          expect(find.text('Tab 9'), findsOneWidget);
        });
      });

      group('tooltip support', () {
        testWidgets('shows tooltip on tab when provided', (tester) async {
          await tester.pumpTestWidget(
            TabbedContent(
              tabs: const [
                TabConfig(id: 'help', label: 'Help', tooltip: 'Get help here'),
              ],
              contentBuilder: (id) => Text('Content for $id'),
            ),
          );

          // Tooltip widget should exist
          expect(find.byType(Tooltip), findsOneWidget);
        });
      });

      group('optional title', () {
        testWidgets('renders title when provided', (tester) async {
          await tester.pumpTestWidget(
            TabbedContent(
              title: 'System Configuration',
              tabs: testTabs,
              contentBuilder: (id) => Text('Content for $id'),
            ),
          );

          assertTextVisible('System Configuration');
        });
      });
    });

    // =========================================================================
    // URL-SYNCED MODE (syncWithUrl: true)
    // =========================================================================
    group('URL-Synced Mode', () {
      Widget buildUrlSyncedPage({
        String currentTabId = 'health',
        List<TabConfig>? tabs,
        String? title,
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
                    body: TabbedContent(
                      syncWithUrl: true,
                      currentTabId: tabId,
                      baseRoute: '/admin/system',
                      tabs: tabs ?? testTabs,
                      title: title,
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
      Widget buildSimpleUrlPage({
        String currentTabId = 'health',
        List<TabConfig>? tabs,
        String? title,
      }) {
        return MaterialApp(
          home: Scaffold(
            body: TabbedContent(
              syncWithUrl: true,
              currentTabId: currentTabId,
              baseRoute: '/admin/system',
              tabs: tabs ?? testTabs,
              title: title,
              contentBuilder: (id) => Center(child: Text('Content for $id')),
            ),
          ),
        );
      }

      group('User Sees Tabs', () {
        testWidgets('user sees all tab labels', (tester) async {
          await tester.pumpWidget(buildSimpleUrlPage());

          assertTextVisible('Health');
          assertTextVisible('Roles');
          assertTextVisible('Settings');
        });

        testWidgets('user sees tab icons', (tester) async {
          await tester.pumpWidget(buildSimpleUrlPage());

          assertIconVisible(Icons.monitor_heart);
          assertIconVisible(Icons.people);
          assertIconVisible(Icons.settings);
        });

        testWidgets('user sees optional title', (tester) async {
          await tester.pumpWidget(
            buildSimpleUrlPage(title: 'System Configuration'),
          );

          assertTextVisible('System Configuration');
        });

        testWidgets('empty tabs renders without error', (tester) async {
          await tester.pumpWidget(buildSimpleUrlPage(tabs: []));

          expect(find.byType(TabbedContent), findsOneWidget);
        });
      });

      group('User Sees Content', () {
        testWidgets('user sees content for current tab', (tester) async {
          await tester.pumpWidget(buildSimpleUrlPage(currentTabId: 'health'));

          assertTextVisible('Content for health');
        });

        testWidgets('content changes when tab ID changes', (tester) async {
          await tester.pumpWidget(buildSimpleUrlPage(currentTabId: 'roles'));

          assertTextVisible('Content for roles');
        });

        testWidgets('unknown tab ID still renders content', (tester) async {
          await tester.pumpWidget(buildSimpleUrlPage(currentTabId: 'unknown'));

          // Should render with the unknown ID
          assertTextVisible('Content for unknown');
        });
      });

      group('Tab Navigation', () {
        testWidgets('tapping tab navigates to new route', (tester) async {
          await tester.pumpWidget(buildUrlSyncedPage(currentTabId: 'health'));
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
            const TabConfig(id: 'a', label: 'Tab A'),
            const TabConfig(id: 'b', label: 'Tab B', enabled: false),
          ];

          await tester.pumpWidget(
            buildSimpleUrlPage(currentTabId: 'a', tabs: tabsWithDisabled),
          );

          // Content for tab A
          assertTextVisible('Content for a');

          // Try tap disabled tab (should do nothing)
          await tester.tap(find.text('Tab B'));
          await tester.pump();

          // Still on tab A
          assertTextVisible('Content for a');
        });
      });

      group('Tooltips', () {
        testWidgets('tab with tooltip shows tooltip widget', (tester) async {
          final tabsWithTooltip = [
            const TabConfig(
              id: 'help',
              label: 'Help',
              tooltip: 'Get help here',
            ),
          ];

          await tester.pumpWidget(buildSimpleUrlPage(tabs: tabsWithTooltip));

          expect(find.byType(Tooltip), findsWidgets);
        });
      });
    });

    // =========================================================================
    // VERTICAL TAB LAYOUT (both modes)
    // =========================================================================
    group('Vertical Tab Layout', () {
      testWidgets('vertical tabs display correctly in local mode', (
        tester,
      ) async {
        await tester.pumpTestWidget(
          TabbedContent(
            tabs: testTabs,
            tabPosition: TabPosition.left,
            contentBuilder: (id) => Text('Content for $id'),
          ),
        );

        // All tabs visible
        assertTextVisible('Health');
        assertTextVisible('Roles');
        assertTextVisible('Settings');

        // Content visible
        assertTextVisible('Content for health');
      });

      testWidgets('vertical tabs display correctly in URL mode', (
        tester,
      ) async {
        await tester.pumpTestWidget(
          TabbedContent(
            syncWithUrl: true,
            currentTabId: 'health',
            baseRoute: '/admin/system',
            tabs: testTabs,
            tabPosition: TabPosition.left,
            contentBuilder: (id) => Text('Content for $id'),
          ),
        );

        // All tabs visible
        assertTextVisible('Health');
        assertTextVisible('Roles');
        assertTextVisible('Settings');

        // Content visible
        assertTextVisible('Content for health');
      });

      testWidgets('can switch tabs in vertical mode', (tester) async {
        await tester.pumpTestWidget(
          TabbedContent(
            tabs: testTabs,
            tabPosition: TabPosition.left,
            contentBuilder: (id) => Text('Content for $id'),
          ),
        );

        // Initially shows first tab
        assertTextVisible('Content for health');

        // Tap Roles tab
        await tester.tap(find.text('Roles'));
        await tester.pumpAndSettle();

        // Now shows Roles content
        assertTextVisible('Content for roles');
      });
    });
  });
}
