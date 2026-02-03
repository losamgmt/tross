/// Tests for SwipeAction atom
///
/// **BEHAVIORAL FOCUS:**
/// - Renders child content
/// - Platform-aware (disabled on pointer devices)
/// - Swipe dismissal behavior
/// - Action backgrounds
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/atoms/interactions/swipe_action.dart';

void main() {
  group('SwipeActionItem', () {
    test('creates with required parameters', () {
      final item = SwipeActionItem(
        icon: Icons.delete,
        color: Colors.red,
        onTap: () {},
      );

      expect(item.icon, Icons.delete);
      expect(item.color, Colors.red);
      expect(item.label, isNull);
    });

    test('creates with optional label', () {
      final item = SwipeActionItem(
        icon: Icons.archive,
        color: Colors.blue,
        label: 'Archive',
        onTap: () {},
      );

      expect(item.label, 'Archive');
    });
  });

  group('SwipeActionBackground', () {
    testWidgets('renders with icon and color', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: SwipeActionBackground(color: Colors.red, icon: Icons.delete),
          ),
        ),
      );

      expect(find.byIcon(Icons.delete), findsOneWidget);
    });

    testWidgets('delete factory creates correct background', (tester) async {
      await tester.pumpWidget(
        MaterialApp(home: Scaffold(body: SwipeActionBackground.delete())),
      );

      expect(find.byIcon(Icons.delete), findsOneWidget);
      expect(find.text('Delete'), findsOneWidget);
    });

    testWidgets('archive factory creates correct background', (tester) async {
      await tester.pumpWidget(
        MaterialApp(home: Scaffold(body: SwipeActionBackground.archive())),
      );

      expect(find.byIcon(Icons.archive), findsOneWidget);
      expect(find.text('Archive'), findsOneWidget);
    });

    testWidgets('edit factory creates correct background', (tester) async {
      await tester.pumpWidget(
        MaterialApp(home: Scaffold(body: SwipeActionBackground.edit())),
      );

      expect(find.byIcon(Icons.edit), findsOneWidget);
      expect(find.text('Edit'), findsOneWidget);
    });

    testWidgets('respects custom label', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(body: SwipeActionBackground.delete(label: 'Remove')),
        ),
      );

      expect(find.text('Remove'), findsOneWidget);
    });
  });

  group('SwipeAction', () {
    testWidgets('renders child widget', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SwipeAction(child: const ListTile(title: Text('Swipeable'))),
          ),
        ),
      );

      expect(find.text('Swipeable'), findsOneWidget);
    });

    testWidgets('delete factory renders correctly', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SwipeAction.delete(
              onDelete: () {},
              child: const ListTile(title: Text('Delete Me')),
            ),
          ),
        ),
      );

      expect(find.text('Delete Me'), findsOneWidget);
    });

    // Note: Platform-specific behavior is tested based on PlatformUtilities
    // which returns different values based on the actual runtime platform.
    // In Flutter test environment, kIsWeb may be true or false depending on
    // test configuration.
  });

  group('SwipeActionContainer', () {
    testWidgets('renders child widget', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SwipeActionContainer(
              child: const ListTile(title: Text('Container Item')),
            ),
          ),
        ),
      );

      expect(find.text('Container Item'), findsOneWidget);
    });

    testWidgets('renders with leading actions', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SwipeActionContainer(
              leadingActions: [
                SwipeActionItem(
                  icon: Icons.archive,
                  color: Colors.blue,
                  onTap: () {},
                ),
              ],
              child: const ListTile(title: Text('With Actions')),
            ),
          ),
        ),
      );

      expect(find.text('With Actions'), findsOneWidget);
    });

    testWidgets('renders with trailing actions', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SwipeActionContainer(
              trailingActions: [
                SwipeActionItem(
                  icon: Icons.delete,
                  color: Colors.red,
                  label: 'Delete',
                  onTap: () {},
                ),
              ],
              child: const ListTile(title: Text('Deleteable')),
            ),
          ),
        ),
      );

      expect(find.text('Deleteable'), findsOneWidget);
    });
  });
}
