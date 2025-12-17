/// TabbedContainer Organism Tests
///
/// Tests for the generic tabbed layout component.
/// Follows behavioral testing patterns - verifies user-facing behavior.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/organisms/layout/tabbed_container.dart';
import '../../../helpers/helpers.dart';

void main() {
  group('TabbedContainer', () {
    group('basic rendering', () {
      testWidgets('renders all tab labels', (tester) async {
        await tester.pumpTestWidget(
          TabbedContainer(
            tabs: [
              TabConfig(label: 'Tab One', content: const Text('Content 1')),
              TabConfig(label: 'Tab Two', content: const Text('Content 2')),
              TabConfig(label: 'Tab Three', content: const Text('Content 3')),
            ],
          ),
        );

        expect(find.text('Tab One'), findsOneWidget);
        expect(find.text('Tab Two'), findsOneWidget);
        expect(find.text('Tab Three'), findsOneWidget);
      });

      testWidgets('renders icons when provided', (tester) async {
        await tester.pumpTestWidget(
          TabbedContainer(
            tabs: [
              TabConfig(
                label: 'Profile',
                icon: Icons.person,
                content: const Text('Profile content'),
              ),
              TabConfig(
                label: 'Settings',
                icon: Icons.settings,
                content: const Text('Settings content'),
              ),
            ],
          ),
        );

        expect(find.byIcon(Icons.person), findsOneWidget);
        expect(find.byIcon(Icons.settings), findsOneWidget);
      });

      testWidgets('shows first tab content by default', (tester) async {
        await tester.pumpTestWidget(
          TabbedContainer(
            tabs: [
              TabConfig(label: 'First', content: const Text('First content')),
              TabConfig(label: 'Second', content: const Text('Second content')),
            ],
          ),
        );

        expect(find.text('First content'), findsOneWidget);
        // Second tab content should exist but not be visible initially
      });

      testWidgets('respects initialIndex parameter', (tester) async {
        await tester.pumpTestWidget(
          TabbedContainer(
            initialIndex: 1,
            tabs: [
              TabConfig(label: 'First', content: const Text('First content')),
              TabConfig(label: 'Second', content: const Text('Second content')),
            ],
          ),
        );

        // Both contents exist in TabBarView, but second should be visible
        expect(find.text('Second content'), findsOneWidget);
      });
    });

    group('tab switching', () {
      testWidgets('switches content when tab is tapped', (tester) async {
        await tester.pumpTestWidget(
          TabbedContainer(
            tabs: [
              TabConfig(label: 'Tab A', content: const Text('Content A')),
              TabConfig(label: 'Tab B', content: const Text('Content B')),
            ],
          ),
        );

        // Initially shows Tab A content
        expect(find.text('Content A'), findsOneWidget);

        // Tap Tab B
        await tester.tap(find.text('Tab B'));
        await tester.pumpAndSettle();

        // Now shows Tab B content
        expect(find.text('Content B'), findsOneWidget);
      });

      testWidgets('calls onTabChanged callback', (tester) async {
        int? changedIndex;

        await tester.pumpTestWidget(
          TabbedContainer(
            onTabChanged: (index) => changedIndex = index,
            tabs: [
              TabConfig(label: 'First', content: const Text('First')),
              TabConfig(label: 'Second', content: const Text('Second')),
            ],
          ),
        );

        await tester.tap(find.text('Second'));
        await tester.pumpAndSettle();

        expect(changedIndex, equals(1));
      });
    });

    group('tab position', () {
      testWidgets('renders tabs at top by default', (tester) async {
        await tester.pumpTestWidget(
          TabbedContainer(
            tabs: [TabConfig(label: 'Test', content: const Text('Content'))],
          ),
        );

        // TabBar should exist
        expect(find.byType(TabBar), findsOneWidget);
        expect(find.byType(TabBarView), findsOneWidget);
      });

      testWidgets('renders tabs at bottom when specified', (tester) async {
        await tester.pumpTestWidget(
          TabbedContainer(
            tabPosition: TabPosition.bottom,
            tabs: [TabConfig(label: 'Test', content: const Text('Content'))],
          ),
        );

        // Should still have TabBar and TabBarView
        expect(find.byType(TabBar), findsOneWidget);
        expect(find.byType(TabBarView), findsOneWidget);
      });
    });

    group('scrollable tabs', () {
      testWidgets('renders scrollable tabs when isScrollable is true', (
        tester,
      ) async {
        await tester.pumpTestWidget(
          TabbedContainer(
            isScrollable: true,
            tabs: List.generate(
              10,
              (i) => TabConfig(label: 'Tab $i', content: Text('Content $i')),
            ),
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
          TabbedContainer(
            tabs: [
              TabConfig(
                label: 'Help',
                tooltip: 'Get help here',
                content: const Text('Help content'),
              ),
            ],
          ),
        );

        // Tooltip widget should exist
        expect(find.byType(Tooltip), findsOneWidget);
      });
    });
  });
}
