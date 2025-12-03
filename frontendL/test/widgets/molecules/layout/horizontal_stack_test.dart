/// HorizontalStack Molecule Tests
///
/// Tests for single-atom Row wrapper molecule.
/// Verifies pure composition with zero logic.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/molecules/molecules.dart';
import '../../../helpers/helpers.dart';

void main() {
  group('HorizontalStack Molecule Tests', () {
    testWidgets('renders children horizontally', (tester) async {
      await pumpTestWidget(
        tester,
        HorizontalStack(
          children: [
            const Text('First'),
            const Text('Second'),
            const Text('Third'),
          ],
        ),
      );

      expect(find.text('First'), findsOneWidget);
      expect(find.text('Second'), findsOneWidget);
      expect(find.text('Third'), findsOneWidget);
      expect(find.byType(Row), findsOneWidget);
    });

    testWidgets('default alignment is start with center cross', (tester) async {
      await pumpTestWidget(
        tester,
        const HorizontalStack(children: [Text('Test')]),
      );

      final row = tester.widget<Row>(find.byType(Row));
      expect(row.mainAxisAlignment, MainAxisAlignment.start);
      expect(row.crossAxisAlignment, CrossAxisAlignment.center);
    });

    testWidgets('centered variant centers children', (tester) async {
      await pumpTestWidget(
        tester,
        const HorizontalStack.centered(children: [Text('Centered')]),
      );

      final row = tester.widget<Row>(find.byType(Row));
      expect(row.crossAxisAlignment, CrossAxisAlignment.center);
      expect(row.mainAxisAlignment, MainAxisAlignment.center);
    });

    testWidgets('start variant aligns to leading edge', (tester) async {
      await pumpTestWidget(
        tester,
        const HorizontalStack.start(children: [Text('Start')]),
      );

      final row = tester.widget<Row>(find.byType(Row));
      expect(row.mainAxisAlignment, MainAxisAlignment.start);
    });

    testWidgets('end variant aligns to trailing edge', (tester) async {
      await pumpTestWidget(
        tester,
        const HorizontalStack.end(children: [Text('End')]),
      );

      final row = tester.widget<Row>(find.byType(Row));
      expect(row.mainAxisAlignment, MainAxisAlignment.end);
    });

    testWidgets('spaceBetween variant spaces children evenly', (tester) async {
      await pumpTestWidget(
        tester,
        const HorizontalStack.spaceBetween(children: [Text('Space')]),
      );

      final row = tester.widget<Row>(find.byType(Row));
      expect(row.mainAxisAlignment, MainAxisAlignment.spaceBetween);
    });

    testWidgets('spaceAround variant adds space around children', (
      tester,
    ) async {
      await pumpTestWidget(
        tester,
        const HorizontalStack.spaceAround(children: [Text('Space')]),
      );

      final row = tester.widget<Row>(find.byType(Row));
      expect(row.mainAxisAlignment, MainAxisAlignment.spaceAround);
    });

    testWidgets('respects custom alignment parameters', (tester) async {
      await pumpTestWidget(
        tester,
        const HorizontalStack(
          crossAxisAlignment: CrossAxisAlignment.end,
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          mainAxisSize: MainAxisSize.min,
          children: [Text('Custom')],
        ),
      );

      final row = tester.widget<Row>(find.byType(Row));
      expect(row.crossAxisAlignment, CrossAxisAlignment.end);
      expect(row.mainAxisAlignment, MainAxisAlignment.spaceEvenly);
      expect(row.mainAxisSize, MainAxisSize.min);
    });

    testWidgets('handles empty children list', (tester) async {
      await pumpTestWidget(tester, const HorizontalStack(children: []));

      expect(find.byType(Row), findsOneWidget);
    });

    testWidgets('is a pure wrapper (no logic)', (tester) async {
      await pumpTestWidget(
        tester,
        const HorizontalStack(children: [Text('Test')]),
      );

      // Should find exactly one Row (the wrapped primitive)
      expect(find.byType(Row), findsOneWidget);

      // Should find the HorizontalStack wrapper
      expect(find.byType(HorizontalStack), findsOneWidget);
    });
  });
}
