/// DropZone Widget Tests
///
/// Tests generic drop target behavior.
/// Following TEST_PHILOSOPHY.md behavioral testing patterns.
///
/// NOTE: Flutter drag-and-drop testing has limitations. We test:
/// - Widget renders correctly
/// - Type safety with generics
/// - Builder patterns and configuration
/// Actual drag gestures are better tested via integration tests.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross/widgets/atoms/interactions/drop_zone.dart';

void main() {
  group('DropZone', () {
    testWidgets('renders child via builder', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DropZone<int>(
              onDrop: (_) {},
              builder: (_, isHovering) => const Text('Drop Zone'),
            ),
          ),
        ),
      );

      expect(find.text('Drop Zone'), findsOneWidget);
    });

    testWidgets('renders static child when provided', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DropZone<int>(
              onDrop: (_) {},
              child: const Text('Static Child'),
            ),
          ),
        ),
      );

      expect(find.text('Static Child'), findsOneWidget);
    });

    testWidgets('builder receives initial hover state as false', (
      tester,
    ) async {
      bool? lastHoverState;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DropZone<int>(
              onDrop: (_) {},
              builder: (_, isHovering) {
                lastHoverState = isHovering;
                return const Text('Drop Zone');
              },
            ),
          ),
        ),
      );

      // Initially not hovering
      expect(lastHoverState, isFalse);
    });

    testWidgets('detailed builder receives empty candidate lists initially', (
      tester,
    ) async {
      List<int?>? lastCandidates;
      List<dynamic>? lastRejected;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DropZone<int>.detailed(
              onDrop: (_) {},
              builder: (_, candidates, rejected) {
                lastCandidates = candidates;
                lastRejected = rejected;
                return const Text('Detailed Zone');
              },
            ),
          ),
        ),
      );

      // Initially empty
      expect(lastCandidates, isEmpty);
      expect(lastRejected, isEmpty);
    });

    testWidgets('wraps content in DragTarget widget', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DropZone<int>(
              onDrop: (_) {},
              builder: (_, isHovering) => const Text('Zone'),
            ),
          ),
        ),
      );

      expect(find.byType(DragTarget<int>), findsOneWidget);
    });

    testWidgets('works with generic types', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Column(
              children: [
                DropZone<String>(
                  onDrop: (_) {},
                  builder: (_, isHovering) => const Text('String Zone'),
                ),
                DropZone<Map<String, int>>(
                  onDrop: (_) {},
                  builder: (_, isHovering) => const Text('Map Zone'),
                ),
              ],
            ),
          ),
        ),
      );

      expect(find.text('String Zone'), findsOneWidget);
      expect(find.text('Map Zone'), findsOneWidget);
      expect(find.byType(DragTarget<String>), findsOneWidget);
      expect(find.byType(DragTarget<Map<String, int>>), findsOneWidget);
    });

    testWidgets('falls back to empty SizedBox when no builder or child', (
      tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(body: DropZone<int>(onDrop: (_) {})),
        ),
      );

      // Should render an empty SizedBox.shrink()
      expect(find.byType(SizedBox), findsOneWidget);
    });
  });
}
