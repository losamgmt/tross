/// LayerStack Molecule Tests
///
/// Tests for single-atom Stack wrapper molecule.
/// Verifies pure composition with zero logic.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/molecules/molecules.dart';
import '../../../helpers/helpers.dart';

void main() {
  group('LayerStack Molecule Tests', () {
    testWidgets('renders children in layers', (tester) async {
      await pumpTestWidget(
        tester,
        LayerStack(
          children: [
            Container(color: Colors.red, width: 100, height: 100),
            Container(color: Colors.blue, width: 50, height: 50),
          ],
        ),
      );

      // Find our LayerStack widget specifically
      expect(find.byType(LayerStack), findsOneWidget);
      expect(find.byType(Container), findsNWidgets(2));
    });

    testWidgets('default alignment is topStart', (tester) async {
      await pumpTestWidget(
        tester,
        LayerStack(children: [SizedBox(width: 10, height: 10)]),
      );

      final stack = tester.widget<Stack>(
        find
            .descendant(
              of: find.byType(LayerStack),
              matching: find.byType(Stack),
            )
            .first,
      );
      expect(stack.alignment, AlignmentDirectional.topStart);
      expect(stack.fit, StackFit.loose);
    });

    testWidgets('centered variant centers children', (tester) async {
      await pumpTestWidget(
        tester,
        LayerStack.centered(children: [SizedBox(width: 10, height: 10)]),
      );

      final stack = tester.widget<Stack>(
        find
            .descendant(
              of: find.byType(LayerStack),
              matching: find.byType(Stack),
            )
            .first,
      );
      expect(stack.alignment, Alignment.center);
    });

    testWidgets('fill variant expands children', (tester) async {
      await pumpTestWidget(
        tester,
        LayerStack.fill(children: [SizedBox(width: 10, height: 10)]),
      );

      final stack = tester.widget<Stack>(
        find
            .descendant(
              of: find.byType(LayerStack),
              matching: find.byType(Stack),
            )
            .first,
      );
      expect(stack.fit, StackFit.expand);
    });

    testWidgets('respects custom parameters', (tester) async {
      await pumpTestWidget(
        tester,
        LayerStack(
          alignment: Alignment.bottomRight,
          fit: StackFit.expand,
          clipBehavior: Clip.none,
          children: [SizedBox(width: 10, height: 10)],
        ),
      );

      final stack = tester.widget<Stack>(
        find
            .descendant(
              of: find.byType(LayerStack),
              matching: find.byType(Stack),
            )
            .first,
      );
      expect(stack.alignment, Alignment.bottomRight);
      expect(stack.fit, StackFit.expand);
      expect(stack.clipBehavior, Clip.none);
    });

    testWidgets('handles empty children list', (tester) async {
      await pumpTestWidget(tester, const LayerStack(children: []));

      expect(find.byType(LayerStack), findsOneWidget);
    });

    testWidgets('is a pure wrapper (no logic)', (tester) async {
      await pumpTestWidget(
        tester,
        LayerStack(children: [SizedBox(width: 10, height: 10)]),
      );

      // Should find the LayerStack wrapper
      expect(find.byType(LayerStack), findsOneWidget);

      // Should find Stack within LayerStack (the wrapped primitive)
      expect(
        find.descendant(
          of: find.byType(LayerStack),
          matching: find.byType(Stack),
        ),
        findsOneWidget,
      );
    });
  });
}
