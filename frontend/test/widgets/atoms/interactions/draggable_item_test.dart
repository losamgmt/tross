/// DraggableItem Widget Tests
///
/// Tests generic draggable wrapper behavior.
/// Following TEST_PHILOSOPHY.md behavioral testing patterns.
///
/// NOTE: Flutter drag-and-drop testing is limited. We test:
/// - Widget renders correctly
/// - Type safety with generics
/// - Platform detection defaults
/// Actual drag gestures are better tested via integration tests.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross/widgets/atoms/interactions/draggable_item.dart';

void main() {
  group('DraggableItem', () {
    testWidgets('renders child widget', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: DraggableItem<int>(
              data: 42,
              child: Text('Draggable Content'),
            ),
          ),
        ),
      );

      expect(find.text('Draggable Content'), findsOneWidget);
    });

    testWidgets('creates Draggable widget on desktop', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          // Force desktop platform for test
          theme: ThemeData(platform: TargetPlatform.macOS),
          home: const Scaffold(
            body: DraggableItem<int>(data: 42, child: Text('Drag Me')),
          ),
        ),
      );

      // Should find a Draggable, not LongPressDraggable
      expect(find.byType(Draggable<int>), findsOneWidget);
      expect(find.byType(LongPressDraggable<int>), findsNothing);
    });

    testWidgets('creates LongPressDraggable on mobile', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          // Force mobile platform for test
          theme: ThemeData(platform: TargetPlatform.iOS),
          home: const Scaffold(
            body: DraggableItem<int>(data: 42, child: Text('Drag Me')),
          ),
        ),
      );

      // Should find a LongPressDraggable
      expect(find.byType(LongPressDraggable<int>), findsOneWidget);
      expect(find.byType(Draggable<int>), findsNothing);
    });

    testWidgets('respects requireLongPress override', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          // Desktop platform but force long-press
          theme: ThemeData(platform: TargetPlatform.macOS),
          home: const Scaffold(
            body: DraggableItem<int>(
              data: 42,
              requireLongPress: true,
              child: Text('Drag Me'),
            ),
          ),
        ),
      );

      // Should use LongPressDraggable even on desktop
      expect(find.byType(LongPressDraggable<int>), findsOneWidget);
    });

    testWidgets('adds semantics label when provided', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: DraggableItem<int>(
              data: 42,
              semanticLabel: 'Drag work order',
              child: Text('Work Order'),
            ),
          ),
        ),
      );

      // Find the Semantics widget with the label
      final semantics = tester.getSemantics(find.text('Work Order'));
      expect(semantics.label, contains('Drag work order'));
    });

    testWidgets('works with generic types', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          // Force desktop to get Draggable instead of LongPressDraggable
          theme: ThemeData(platform: TargetPlatform.macOS),
          home: Scaffold(
            body: Column(
              children: [
                const DraggableItem<String>(
                  data: 'hello',
                  child: Text('String Data'),
                ),
                DraggableItem<Map<String, int>>(
                  data: const {'count': 5},
                  child: const Text('Map Data'),
                ),
              ],
            ),
          ),
        ),
      );

      expect(find.text('String Data'), findsOneWidget);
      expect(find.text('Map Data'), findsOneWidget);
      expect(find.byType(Draggable<String>), findsOneWidget);
      expect(find.byType(Draggable<Map<String, int>>), findsOneWidget);
    });

    testWidgets('applies axis constraint', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: ThemeData(platform: TargetPlatform.macOS),
          home: const Scaffold(
            body: DraggableItem<int>(
              data: 1,
              axis: Axis.horizontal,
              child: Text('Horizontal Only'),
            ),
          ),
        ),
      );

      final draggable = tester.widget<Draggable<int>>(
        find.byType(Draggable<int>),
      );
      expect(draggable.axis, equals(Axis.horizontal));
    });
  });
}
