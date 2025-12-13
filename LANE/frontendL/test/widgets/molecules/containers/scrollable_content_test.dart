/// ScrollableContent Molecule Tests
///
/// Tests for single-atom SingleChildScrollView wrapper molecule.
/// Verifies pure composition with zero logic.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/molecules/molecules.dart';
import '../../../helpers/helpers.dart';

void main() {
  group('ScrollableContent Molecule Tests', () {
    testWidgets('renders scrollable content', (tester) async {
      await pumpTestWidget(
        tester,
        ScrollableContent(
          child: Column(
            children: List.generate(50, (index) => Text('Item $index')),
          ),
        ),
      );

      expect(find.byType(SingleChildScrollView), findsOneWidget);
      expect(find.text('Item 0'), findsOneWidget);
    });

    testWidgets('default is vertical scrolling', (tester) async {
      await pumpTestWidget(
        tester,
        const ScrollableContent(child: Text('Content')),
      );

      final scroll = tester.widget<SingleChildScrollView>(
        find.byType(SingleChildScrollView),
      );
      expect(scroll.scrollDirection, Axis.vertical);
    });

    testWidgets('vertical variant scrolls vertically', (tester) async {
      await pumpTestWidget(
        tester,
        const ScrollableContent.vertical(child: Text('Vertical')),
      );

      final scroll = tester.widget<SingleChildScrollView>(
        find.byType(SingleChildScrollView),
      );
      expect(scroll.scrollDirection, Axis.vertical);
    });

    testWidgets('horizontal variant scrolls horizontally', (tester) async {
      await pumpTestWidget(
        tester,
        const ScrollableContent.horizontal(child: Text('Horizontal')),
      );

      final scroll = tester.widget<SingleChildScrollView>(
        find.byType(SingleChildScrollView),
      );
      expect(scroll.scrollDirection, Axis.horizontal);
    });

    testWidgets('respects padding parameter', (tester) async {
      const testPadding = EdgeInsets.all(16.0);

      await pumpTestWidget(
        tester,
        const ScrollableContent(padding: testPadding, child: Text('Padded')),
      );

      final scroll = tester.widget<SingleChildScrollView>(
        find.byType(SingleChildScrollView),
      );
      expect(scroll.padding, testPadding);
    });

    testWidgets('respects custom parameters', (tester) async {
      final controller = ScrollController();

      await pumpTestWidget(
        tester,
        ScrollableContent(
          controller: controller,
          reverse: true,
          primary: false, // MUST be false when controller is provided
          physics: const NeverScrollableScrollPhysics(),
          child: const Text('Custom'),
        ),
      );

      final scroll = tester.widget<SingleChildScrollView>(
        find.byType(SingleChildScrollView),
      );
      expect(scroll.controller, controller);
      expect(scroll.reverse, true);
      expect(scroll.physics, isA<NeverScrollableScrollPhysics>());
    });

    testWidgets('is a pure wrapper (no logic)', (tester) async {
      await pumpTestWidget(
        tester,
        const ScrollableContent(child: Text('Test')),
      );

      // Should find the ScrollableContent wrapper
      expect(find.byType(ScrollableContent), findsOneWidget);

      // Should find SingleChildScrollView within ScrollableContent (the wrapped primitive)
      expect(
        find.descendant(
          of: find.byType(ScrollableContent),
          matching: find.byType(SingleChildScrollView),
        ),
        findsOneWidget,
      );
    });
  });
}
