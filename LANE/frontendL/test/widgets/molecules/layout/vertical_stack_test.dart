/// VerticalStack Molecule Tests
///
/// Tests for single-atom Column wrapper molecule.
/// Verifies pure composition with zero logic.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/molecules/molecules.dart';
import '../../../helpers/helpers.dart';

void main() {
  group('VerticalStack Molecule Tests', () {
    testWidgets('renders children vertically', (tester) async {
      await pumpTestWidget(
        tester,
        VerticalStack(
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
      expect(find.byType(Column), findsOneWidget);
    });

    testWidgets('default alignment is start', (tester) async {
      await pumpTestWidget(
        tester,
        const VerticalStack(children: [Text('Test')]),
      );

      final column = tester.widget<Column>(find.byType(Column));
      expect(column.crossAxisAlignment, CrossAxisAlignment.start);
      expect(column.mainAxisAlignment, MainAxisAlignment.start);
    });

    testWidgets('centered variant centers children', (tester) async {
      await pumpTestWidget(
        tester,
        const VerticalStack.centered(children: [Text('Centered')]),
      );

      final column = tester.widget<Column>(find.byType(Column));
      expect(column.crossAxisAlignment, CrossAxisAlignment.center);
      expect(column.mainAxisAlignment, MainAxisAlignment.center);
    });

    testWidgets('start variant aligns to leading edge', (tester) async {
      await pumpTestWidget(
        tester,
        const VerticalStack.start(children: [Text('Start')]),
      );

      final column = tester.widget<Column>(find.byType(Column));
      expect(column.crossAxisAlignment, CrossAxisAlignment.start);
    });

    testWidgets('end variant aligns to trailing edge', (tester) async {
      await pumpTestWidget(
        tester,
        const VerticalStack.end(children: [Text('End')]),
      );

      final column = tester.widget<Column>(find.byType(Column));
      expect(column.crossAxisAlignment, CrossAxisAlignment.end);
    });

    testWidgets('stretch variant stretches children', (tester) async {
      await pumpTestWidget(
        tester,
        const VerticalStack.stretch(children: [Text('Stretched')]),
      );

      final column = tester.widget<Column>(find.byType(Column));
      expect(column.crossAxisAlignment, CrossAxisAlignment.stretch);
    });

    testWidgets('respects custom alignment parameters', (tester) async {
      await pumpTestWidget(
        tester,
        const VerticalStack(
          crossAxisAlignment: CrossAxisAlignment.end,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          mainAxisSize: MainAxisSize.min,
          children: [Text('Custom')],
        ),
      );

      final column = tester.widget<Column>(find.byType(Column));
      expect(column.crossAxisAlignment, CrossAxisAlignment.end);
      expect(column.mainAxisAlignment, MainAxisAlignment.spaceBetween);
      expect(column.mainAxisSize, MainAxisSize.min);
    });

    testWidgets('handles empty children list', (tester) async {
      await pumpTestWidget(tester, const VerticalStack(children: []));

      expect(find.byType(Column), findsOneWidget);
    });

    testWidgets('is a pure wrapper (no logic)', (tester) async {
      // Verify it's just wrapping Column with semantic API
      await pumpTestWidget(
        tester,
        const VerticalStack(children: [Text('Test')]),
      );

      // Should find exactly one Column (the wrapped primitive)
      expect(find.byType(Column), findsOneWidget);

      // Should find the VerticalStack wrapper
      expect(find.byType(VerticalStack), findsOneWidget);
    });
  });
}
