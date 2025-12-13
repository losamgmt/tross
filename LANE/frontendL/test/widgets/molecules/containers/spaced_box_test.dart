/// SpacedBox Molecule Tests
///
/// Tests for single-atom SizedBox wrapper molecule.
/// Verifies pure composition with zero logic.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/molecules/molecules.dart';
import '../../../helpers/helpers.dart';

void main() {
  group('SpacedBox Molecule Tests', () {
    testWidgets('renders with specified dimensions', (tester) async {
      await pumpTestWidget(
        tester,
        const SpacedBox(width: 100, height: 50, child: Text('Sized')),
      );

      final sizedBox = tester.widget<SizedBox>(find.byType(SizedBox));
      expect(sizedBox.width, 100);
      expect(sizedBox.height, 50);
      expect(find.text('Sized'), findsOneWidget);
    });

    testWidgets('square variant creates equal dimensions', (tester) async {
      await pumpTestWidget(
        tester,
        const SpacedBox.square(size: 75, child: Text('Square')),
      );

      final sizedBox = tester.widget<SizedBox>(find.byType(SizedBox));
      expect(sizedBox.width, 75);
      expect(sizedBox.height, 75);
    });

    testWidgets('vertical variant creates height spacer', (tester) async {
      await pumpTestWidget(tester, const SpacedBox.vertical(height: 20));

      final sizedBox = tester.widget<SizedBox>(find.byType(SizedBox));
      expect(sizedBox.height, 20);
      expect(sizedBox.width, null);
      expect(sizedBox.child, null);
    });

    testWidgets('horizontal variant creates width spacer', (tester) async {
      await pumpTestWidget(tester, const SpacedBox.horizontal(width: 30));

      final sizedBox = tester.widget<SizedBox>(find.byType(SizedBox));
      expect(sizedBox.width, 30);
      expect(sizedBox.height, null);
      expect(sizedBox.child, null);
    });

    testWidgets('expand variant fills available space', (tester) async {
      await pumpTestWidget(
        tester,
        const SpacedBox.expand(child: Text('Expanded')),
      );

      final sizedBox = tester.widget<SizedBox>(find.byType(SizedBox));
      expect(sizedBox.width, double.infinity);
      expect(sizedBox.height, double.infinity);
    });

    testWidgets('shrink variant has zero size', (tester) async {
      await pumpTestWidget(
        tester,
        const SpacedBox.shrink(child: Text('Shrunk')),
      );

      final sizedBox = tester.widget<SizedBox>(find.byType(SizedBox));
      expect(sizedBox.width, 0.0);
      expect(sizedBox.height, 0.0);
    });

    testWidgets('can be used without child as spacer', (tester) async {
      await pumpTestWidget(tester, const SpacedBox(width: 10, height: 10));

      final sizedBox = tester.widget<SizedBox>(find.byType(SizedBox));
      expect(sizedBox.child, null);
    });

    testWidgets('is a pure wrapper (no logic)', (tester) async {
      await pumpTestWidget(
        tester,
        const SpacedBox(width: 50, height: 50, child: Text('Test')),
      );

      // Should find exactly one SizedBox (the wrapped primitive)
      expect(find.byType(SizedBox), findsOneWidget);

      // Should find the SpacedBox wrapper
      expect(find.byType(SpacedBox), findsOneWidget);
    });
  });
}
