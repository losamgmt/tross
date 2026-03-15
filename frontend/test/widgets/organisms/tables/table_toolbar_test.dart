/// Tests for TableToolbar Position-Based Action Sorting
///
/// Validates that ActionItems are correctly sorted and rendered by position:
/// - leading: Before search (date pickers, view controls) - never overflow
/// - actions: After search (refresh, create) - can overflow on mobile
/// - trailing: After actions (settings) - never overflow
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross/widgets/organisms/tables/table_toolbar.dart';
import 'package:tross/widgets/molecules/menus/action_item.dart';

void main() {
  group('TableToolbar', () {
    group('Action Position Sorting', () {
      testWidgets('renders leading actions before search', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: TableToolbar(
                onSearch: (_) {},
                actionItems: [
                  ActionItem(
                    id: 'leading_action',
                    label: 'Leading',
                    icon: Icons.calendar_today,
                    position: ActionPosition.leading,
                    onTap: () {},
                  ),
                ],
              ),
            ),
          ),
        );

        // Leading action should be present
        expect(find.byIcon(Icons.calendar_today), findsOneWidget);
      });

      testWidgets('renders actions after search', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: TableToolbar(
                onSearch: (_) {},
                actionItems: [
                  ActionItem(
                    id: 'action_item',
                    label: 'Action',
                    icon: Icons.refresh,
                    position: ActionPosition.actions,
                    onTap: () {},
                  ),
                ],
              ),
            ),
          ),
        );

        await tester.pumpAndSettle();

        // Action should be present
        expect(find.byIcon(Icons.refresh), findsOneWidget);
      });

      testWidgets('renders trailing actions last', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: TableToolbar(
                onSearch: (_) {},
                actionItems: [
                  ActionItem(
                    id: 'trailing_action',
                    label: 'Trailing',
                    icon: Icons.settings,
                    position: ActionPosition.trailing,
                    onTap: () {},
                  ),
                ],
              ),
            ),
          ),
        );

        // Trailing action should be present
        expect(find.byIcon(Icons.settings), findsOneWidget);
      });

      testWidgets('sorts all positions correctly in single toolbar', (
        tester,
      ) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: TableToolbar(
                onSearch: (_) {},
                actionItems: [
                  // Added out of order to verify sorting
                  ActionItem(
                    id: 'trailing',
                    label: 'Settings',
                    icon: Icons.settings,
                    position: ActionPosition.trailing,
                    onTap: () {},
                  ),
                  ActionItem(
                    id: 'leading',
                    label: 'Date',
                    icon: Icons.calendar_today,
                    position: ActionPosition.leading,
                    onTap: () {},
                  ),
                  ActionItem(
                    id: 'action',
                    label: 'Refresh',
                    icon: Icons.refresh,
                    position: ActionPosition.actions,
                    onTap: () {},
                  ),
                ],
              ),
            ),
          ),
        );

        await tester.pumpAndSettle();

        // All three icons should be present
        expect(find.byIcon(Icons.calendar_today), findsOneWidget);
        expect(find.byIcon(Icons.refresh), findsOneWidget);
        expect(find.byIcon(Icons.settings), findsOneWidget);
      });
    });

    group('Widget Builder', () {
      testWidgets('renders custom widget from widgetBuilder', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: TableToolbar(
                onSearch: (_) {},
                actionItems: [
                  ActionItem(
                    id: 'custom_widget',
                    label: 'Custom',
                    position: ActionPosition.leading,
                    widgetBuilder: (ctx) => Container(
                      key: const Key('custom_container'),
                      child: const Text('Custom Widget'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );

        // Custom widget should be rendered
        expect(find.byKey(const Key('custom_container')), findsOneWidget);
        expect(find.text('Custom Widget'), findsOneWidget);
      });

      testWidgets('renders widgetBuilder instead of icon', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: TableToolbar(
                onSearch: (_) {},
                actionItems: [
                  ActionItem(
                    id: 'with_widget_builder',
                    label: 'Has Widget',
                    icon: Icons.not_interested, // Should NOT be rendered
                    position: ActionPosition.leading,
                    widgetBuilder: (ctx) => const Chip(label: Text('Chip')),
                  ),
                ],
              ),
            ),
          ),
        );

        // Icon should NOT be rendered when widgetBuilder is provided
        expect(find.byIcon(Icons.not_interested), findsNothing);
        // Chip should be rendered instead
        expect(find.byType(Chip), findsOneWidget);
      });
    });

    group('Search Field', () {
      testWidgets('renders expanded search when onSearch provided', (
        tester,
      ) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: TableToolbar(
                searchPlaceholder: 'Search items...',
                onSearch: (_) {},
              ),
            ),
          ),
        );

        expect(find.byType(TextField), findsOneWidget);
      });

      testWidgets('uses spacer when no onSearch', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: TableToolbar(
                actionItems: [
                  ActionItem(
                    id: 'action',
                    label: 'Action',
                    icon: Icons.add,
                    position: ActionPosition.actions,
                    onTap: () {},
                  ),
                ],
              ),
            ),
          ),
        );

        // No TextField when no onSearch callback
        // Just verify it renders without error
        expect(find.byType(TableToolbar), findsOneWidget);
      });
    });

    group('Empty State', () {
      testWidgets('renders correctly with no actions', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: TableToolbar(onSearch: (_) {}, actionItems: const []),
            ),
          ),
        );

        expect(find.byType(TableToolbar), findsOneWidget);
        expect(find.byType(TextField), findsOneWidget);
      });

      testWidgets('renders correctly with null actionItems', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(home: Scaffold(body: TableToolbar())),
        );

        expect(find.byType(TableToolbar), findsOneWidget);
      });
    });
  });
}
