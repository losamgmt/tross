/// PaddedContainer Molecule Tests
///
/// Tests for single-atom Padding wrapper molecule.
/// Verifies pure composition with zero logic.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/molecules/molecules.dart';
import '../../../helpers/helpers.dart';

void main() {
  group('PaddedContainer Molecule Tests', () {
    testWidgets('renders child with padding', (tester) async {
      await pumpTestWidget(
        tester,
        const PaddedContainer(
          padding: EdgeInsets.all(16.0),
          child: Text('Padded Content'),
        ),
      );

      expect(find.byType(Padding), findsOneWidget);
      expect(find.text('Padded Content'), findsOneWidget);
    });

    testWidgets('all variant applies uniform padding', (tester) async {
      await pumpTestWidget(
        tester,
        PaddedContainer.all(value: 20.0, child: const Text('All Padded')),
      );

      final padding = tester.widget<Padding>(find.byType(Padding));
      expect(padding.padding, const EdgeInsets.all(20.0));
    });

    testWidgets('symmetric variant applies vertical/horizontal padding', (
      tester,
    ) async {
      await pumpTestWidget(
        tester,
        PaddedContainer.symmetric(
          vertical: 12.0,
          horizontal: 24.0,
          child: const Text('Symmetric'),
        ),
      );

      final padding = tester.widget<Padding>(find.byType(Padding));
      expect(
        padding.padding,
        const EdgeInsets.symmetric(vertical: 12.0, horizontal: 24.0),
      );
    });

    testWidgets('only variant applies individual side padding', (tester) async {
      await pumpTestWidget(
        tester,
        PaddedContainer.only(
          left: 8.0,
          top: 12.0,
          right: 16.0,
          bottom: 20.0,
          child: const Text('Individual'),
        ),
      );

      final padding = tester.widget<Padding>(find.byType(Padding));
      expect(
        padding.padding,
        const EdgeInsets.only(left: 8.0, top: 12.0, right: 16.0, bottom: 20.0),
      );
    });

    testWidgets('respects custom padding', (tester) async {
      const customPadding = EdgeInsets.fromLTRB(5, 10, 15, 20);

      await pumpTestWidget(
        tester,
        const PaddedContainer(padding: customPadding, child: Text('Custom')),
      );

      final padding = tester.widget<Padding>(find.byType(Padding));
      expect(padding.padding, customPadding);
    });

    testWidgets('is a pure wrapper (no logic)', (tester) async {
      await pumpTestWidget(
        tester,
        PaddedContainer.all(value: 10.0, child: const Text('Test')),
      );

      // Should find exactly one Padding (the wrapped primitive)
      expect(find.byType(Padding), findsOneWidget);

      // Should find the PaddedContainer wrapper
      expect(find.byType(PaddedContainer), findsOneWidget);
    });
  });
}
