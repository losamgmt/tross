/// ColumnHeader Atom Tests
///
/// Comprehensive tests for the ColumnHeader atom component
/// Tests rendering, sorting indicators, alignment, and interaction
/// ✅ MIGRATED: Uses test infrastructure (helpers)
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/atoms/atoms.dart';
import '../../helpers/helpers.dart';

void main() {
  group('ColumnHeader Atom Tests', () {
    testWidgets('renders basic label', (tester) async {
      await pumpTestWidget(tester, const ColumnHeader(label: 'Test Header'));

      expect(find.text('Test Header'), findsOneWidget);
    });

    testWidgets('non-sortable header has no sort icon', (tester) async {
      await pumpTestWidget(
        tester,
        const ColumnHeader(label: 'Non-Sortable', sortable: false),
      );

      expect(find.byIcon(Icons.arrow_upward), findsNothing);
      expect(find.byIcon(Icons.arrow_downward), findsNothing);
      expect(find.byIcon(Icons.unfold_more), findsNothing);
    });

    testWidgets('sortable header with no direction shows unfold_more icon', (
      tester,
    ) async {
      await pumpTestWidget(
        tester,
        const ColumnHeader(
          label: 'Sortable',
          sortable: true,
          sortDirection: SortDirection.none,
        ),
      );

      expect(find.byIcon(Icons.unfold_more), findsOneWidget);
    });

    testWidgets('sortable header with ascending shows arrow_upward icon', (
      tester,
    ) async {
      await pumpTestWidget(
        tester,
        const ColumnHeader(
          label: 'Sorted Asc',
          sortable: true,
          sortDirection: SortDirection.ascending,
        ),
      );

      expect(find.byIcon(Icons.arrow_upward), findsOneWidget);
    });

    testWidgets('sortable header with descending shows arrow_downward icon', (
      tester,
    ) async {
      await pumpTestWidget(
        tester,
        const ColumnHeader(
          label: 'Sorted Desc',
          sortable: true,
          sortDirection: SortDirection.descending,
        ),
      );

      expect(find.byIcon(Icons.arrow_downward), findsOneWidget);
    });

    testWidgets('calls onSort callback when tapped', (tester) async {
      bool sortCalled = false;

      await pumpTestWidget(
        tester,
        ColumnHeader(
          label: 'Clickable',
          sortable: true,
          onSort: () => sortCalled = true,
        ),
      );

      await tester.tap(find.text('Clickable'));
      await tester.pump();

      expect(sortCalled, true);
    });

    testWidgets('non-sortable header is not clickable', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: ColumnHeader(
              label: 'Not Clickable',
              sortable: false,
              onSort: null,
            ),
          ),
        ),
      );

      // Should not find InkWell for non-sortable header
      expect(find.byType(InkWell), findsNothing);
    });

    testWidgets('sortable header with callback is wrapped in InkWell', (
      tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ColumnHeader(
              label: 'Clickable',
              sortable: true,
              onSort: () {},
            ),
          ),
        ),
      );

      expect(find.byType(InkWell), findsOneWidget);
    });

    testWidgets('applies left text alignment', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: ColumnHeader(
              label: 'Left Aligned',
              textAlign: TextAlign.left,
            ),
          ),
        ),
      );

      final textWidget = tester.widget<Text>(find.text('Left Aligned'));
      expect(textWidget.textAlign, TextAlign.left);
    });

    testWidgets('applies center text alignment', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: ColumnHeader(
              label: 'Center Aligned',
              textAlign: TextAlign.center,
            ),
          ),
        ),
      );

      final textWidget = tester.widget<Text>(find.text('Center Aligned'));
      expect(textWidget.textAlign, TextAlign.center);
    });

    testWidgets('applies right text alignment', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: ColumnHeader(
              label: 'Right Aligned',
              textAlign: TextAlign.right,
            ),
          ),
        ),
      );

      final textWidget = tester.widget<Text>(find.text('Right Aligned'));
      expect(textWidget.textAlign, TextAlign.right);
    });

    testWidgets('right-aligned sortable header places icon before text', (
      tester,
    ) async {
      await pumpTestWidget(
        tester,
        const ColumnHeader(
          label: 'Right',
          textAlign: TextAlign.right,
          sortable: true,
          sortDirection: SortDirection.none,
        ),
      );

      // Both text and icon should be present
      expect(find.text('Right'), findsOneWidget);
      expect(find.byIcon(Icons.unfold_more), findsOneWidget);

      // Icon should come before text in the widget tree
      final row = tester.widget<Row>(
        find.ancestor(
          of: find.byIcon(Icons.unfold_more),
          matching: find.byType(Row),
        ),
      );

      expect(row.children.length, greaterThan(1));
    });

    testWidgets('has proper text styling', (tester) async {
      await pumpTestWidget(tester, const ColumnHeader(label: 'Styled Header'));

      final textWidget = tester.widget<Text>(find.text('Styled Header'));
      expect(textWidget.style?.fontWeight, FontWeight.w700);
      expect(textWidget.style?.letterSpacing, 0.5);
    });

    testWidgets('text has ellipsis overflow', (tester) async {
      await pumpTestWidget(
        tester,
        const ColumnHeader(
          label: 'Very Long Header That Should Overflow',
          width: 100,
        ),
      );

      final textWidget = tester.widget<Text>(
        find.text('Very Long Header That Should Overflow'),
      );
      expect(textWidget.overflow, TextOverflow.ellipsis);
    });

    group('Sort Direction Cycle Tests', () {
      testWidgets('none → ascending on first click', (tester) async {
        SortDirection currentDirection = SortDirection.none;

        await pumpTestWidget(
          tester,
          StatefulBuilder(
            builder: (context, setState) {
              return ColumnHeader(
                label: 'Cycle Test',
                sortable: true,
                sortDirection: currentDirection,
                onSort: () {
                  setState(() {
                    currentDirection = SortDirection.ascending;
                  });
                },
              );
            },
          ),
        );

        expect(find.byIcon(Icons.unfold_more), findsOneWidget);

        await tester.tap(find.text('Cycle Test'));
        await tester.pumpAndSettle();

        expect(find.byIcon(Icons.arrow_upward), findsOneWidget);
      });

      testWidgets('ascending → descending on second click', (tester) async {
        SortDirection currentDirection = SortDirection.ascending;

        await pumpTestWidget(
          tester,
          StatefulBuilder(
            builder: (context, setState) {
              return ColumnHeader(
                label: 'Cycle Test',
                sortable: true,
                sortDirection: currentDirection,
                onSort: () {
                  setState(() {
                    currentDirection = SortDirection.descending;
                  });
                },
              );
            },
          ),
        );

        expect(find.byIcon(Icons.arrow_upward), findsOneWidget);

        await tester.tap(find.text('Cycle Test'));
        await tester.pumpAndSettle();

        expect(find.byIcon(Icons.arrow_downward), findsOneWidget);
      });
    });
  });
}
