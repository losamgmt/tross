/// FlexibleSpace Molecule Tests
///
/// Tests for single-atom Flexible/Expanded wrapper molecule.
/// Verifies pure composition with zero logic.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/molecules/molecules.dart';
import '../../../helpers/helpers.dart';

void main() {
  group('FlexibleSpace Molecule Tests', () {
    testWidgets('renders child in flexible space', (tester) async {
      await pumpTestWidget(
        tester,
        Row(
          children: [FlexibleSpace(child: Container(color: Colors.red))],
        ),
      );

      expect(find.byType(Flexible), findsOneWidget);
      expect(find.byType(Container), findsOneWidget);
    });

    testWidgets('default flex is 1 with loose fit', (tester) async {
      await pumpTestWidget(
        tester,
        Row(children: [FlexibleSpace(child: Container())]),
      );

      final flexible = tester.widget<Flexible>(find.byType(Flexible));
      expect(flexible.flex, 1);
      expect(flexible.fit, FlexFit.loose);
    });

    testWidgets('expanded variant uses tight fit', (tester) async {
      await pumpTestWidget(
        tester,
        Row(children: [FlexibleSpace.expanded(child: Container())]),
      );

      final flexible = tester.widget<Flexible>(find.byType(Flexible));
      expect(flexible.fit, FlexFit.tight);
    });

    testWidgets('tight variant uses tight fit', (tester) async {
      await pumpTestWidget(
        tester,
        Row(children: [FlexibleSpace.tight(child: Container())]),
      );

      final flexible = tester.widget<Flexible>(find.byType(Flexible));
      expect(flexible.fit, FlexFit.tight);
    });

    testWidgets('loose variant uses loose fit', (tester) async {
      await pumpTestWidget(
        tester,
        Row(children: [FlexibleSpace.loose(child: Container())]),
      );

      final flexible = tester.widget<Flexible>(find.byType(Flexible));
      expect(flexible.fit, FlexFit.loose);
    });

    testWidgets('respects custom flex value', (tester) async {
      await pumpTestWidget(
        tester,
        Row(children: [FlexibleSpace(flex: 3, child: Container())]),
      );

      final flexible = tester.widget<Flexible>(find.byType(Flexible));
      expect(flexible.flex, 3);
    });

    testWidgets('is a pure wrapper (no logic)', (tester) async {
      await pumpTestWidget(
        tester,
        Row(children: [FlexibleSpace(child: const Text('Test'))]),
      );

      // Should find exactly one Flexible (the wrapped primitive)
      expect(find.byType(Flexible), findsOneWidget);

      // Should find the FlexibleSpace wrapper
      expect(find.byType(FlexibleSpace), findsOneWidget);
    });
  });
}
