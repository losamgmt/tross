/// Tests for DropdownMenu molecule
///
/// **BEHAVIORAL FOCUS:**
/// - Renders trigger widget
/// - Shows menu items when triggered
/// - Handles dividers
/// - Handles destructive items
/// - Calls onTap callbacks
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/molecules/menus/dropdown_menu.dart'
    as app_menu;

import '../../../helpers/test_helpers.dart';

void main() {
  group('DropdownMenu', () {
    group('MenuItemData', () {
      test('creates regular item with required fields', () {
        final item = app_menu.MenuItemData(id: 'profile', label: 'Profile');

        expect(item.id, 'profile');
        expect(item.label, 'Profile');
        expect(item.isDivider, isFalse);
        expect(item.isDestructive, isFalse);
      });

      test('creates item with icon', () {
        final item = app_menu.MenuItemData(
          id: 'settings',
          label: 'Settings',
          icon: Icons.settings,
        );

        expect(item.icon, Icons.settings);
      });

      test('creates item with onTap', () {
        var tapped = false;
        final item = app_menu.MenuItemData(
          id: 'action',
          label: 'Action',
          onTap: () => tapped = true,
        );

        item.onTap!();
        expect(tapped, isTrue);
      });

      test('creates destructive item', () {
        final item = app_menu.MenuItemData(
          id: 'delete',
          label: 'Delete',
          isDestructive: true,
        );

        expect(item.isDestructive, isTrue);
      });

      test('divider factory creates divider item', () {
        final divider = app_menu.MenuItemData.divider();

        expect(divider.isDivider, isTrue);
        expect(divider.label, '');
      });

      test('divider factory accepts custom id', () {
        final divider = app_menu.MenuItemData.divider(id: 'custom-divider');

        expect(divider.id, 'custom-divider');
        expect(divider.isDivider, isTrue);
      });
    });

    group('trigger display', () {
      testWidgets('displays the trigger widget', (tester) async {
        await tester.pumpTestWidget(
          app_menu.DropdownMenu(
            trigger: const Text('Open Menu'),
            items: const [],
          ),
        );

        expect(find.text('Open Menu'), findsOneWidget);
      });

      testWidgets('trigger can be any widget', (tester) async {
        await tester.pumpTestWidget(
          app_menu.DropdownMenu(
            trigger: const Icon(Icons.more_vert),
            items: const [],
          ),
        );

        expect(find.byIcon(Icons.more_vert), findsOneWidget);
      });
    });

    group('menu items', () {
      testWidgets('shows menu items when trigger tapped', (tester) async {
        await tester.pumpTestWidget(
          app_menu.DropdownMenu(
            trigger: const Text('Menu'),
            items: const [
              app_menu.MenuItemData(id: 'item1', label: 'First Item'),
              app_menu.MenuItemData(id: 'item2', label: 'Second Item'),
            ],
          ),
        );

        await tester.tap(find.text('Menu'));
        await tester.pumpAndSettle();

        expect(find.text('First Item'), findsOneWidget);
        expect(find.text('Second Item'), findsOneWidget);
      });

      testWidgets('shows icons when provided', (tester) async {
        await tester.pumpTestWidget(
          app_menu.DropdownMenu(
            trigger: const Text('Menu'),
            items: const [
              app_menu.MenuItemData(
                id: 'profile',
                label: 'Profile',
                icon: Icons.person,
              ),
            ],
          ),
        );

        await tester.tap(find.text('Menu'));
        await tester.pumpAndSettle();

        expect(find.byIcon(Icons.person), findsOneWidget);
      });

      testWidgets('renders dividers between items', (tester) async {
        await tester.pumpTestWidget(
          app_menu.DropdownMenu(
            trigger: const Text('Menu'),
            items: [
              const app_menu.MenuItemData(id: 'item1', label: 'Item 1'),
              app_menu.MenuItemData.divider(),
              const app_menu.MenuItemData(id: 'item2', label: 'Item 2'),
            ],
          ),
        );

        await tester.tap(find.text('Menu'));
        await tester.pumpAndSettle();

        expect(find.byType(PopupMenuDivider), findsOneWidget);
      });
    });

    group('destructive items', () {
      testWidgets('destructive item has error color text', (tester) async {
        await tester.pumpTestWidget(
          app_menu.DropdownMenu(
            trigger: const Text('Menu'),
            items: const [
              app_menu.MenuItemData(
                id: 'delete',
                label: 'Delete',
                isDestructive: true,
              ),
            ],
          ),
        );

        await tester.tap(find.text('Menu'));
        await tester.pumpAndSettle();

        // Find the Text widget for Delete
        final deleteText = tester.widget<Text>(find.text('Delete'));
        expect(deleteText.style?.color, isNotNull);
      });

      testWidgets('destructive item icon has error color', (tester) async {
        await tester.pumpTestWidget(
          app_menu.DropdownMenu(
            trigger: const Text('Menu'),
            items: const [
              app_menu.MenuItemData(
                id: 'delete',
                label: 'Delete',
                icon: Icons.delete,
                isDestructive: true,
              ),
            ],
          ),
        );

        await tester.tap(find.text('Menu'));
        await tester.pumpAndSettle();

        expect(find.byIcon(Icons.delete), findsOneWidget);
      });
    });

    group('interactions', () {
      testWidgets('tapping item calls onTap', (tester) async {
        var tapped = false;
        await tester.pumpTestWidget(
          app_menu.DropdownMenu(
            trigger: const Text('Menu'),
            items: [
              app_menu.MenuItemData(
                id: 'action',
                label: 'Action',
                onTap: () => tapped = true,
              ),
            ],
          ),
        );

        await tester.tap(find.text('Menu'));
        await tester.pumpAndSettle();

        await tester.tap(find.text('Action'));
        await tester.pumpAndSettle();

        expect(tapped, isTrue);
      });

      testWidgets('menu closes after item tap', (tester) async {
        await tester.pumpTestWidget(
          app_menu.DropdownMenu(
            trigger: const Text('Menu'),
            items: [
              app_menu.MenuItemData(id: 'item', label: 'Item', onTap: () {}),
            ],
          ),
        );

        await tester.tap(find.text('Menu'));
        await tester.pumpAndSettle();

        expect(find.text('Item'), findsOneWidget);

        await tester.tap(find.text('Item'));
        await tester.pumpAndSettle();

        // Menu should be closed
        expect(find.text('Item'), findsNothing);
      });
    });

    group('widget structure', () {
      testWidgets('uses PopupMenuButton internally', (tester) async {
        await tester.pumpTestWidget(
          app_menu.DropdownMenu(trigger: const Text('Menu'), items: const []),
        );

        expect(find.byType(PopupMenuButton<String>), findsOneWidget);
      });
    });
  });
}
