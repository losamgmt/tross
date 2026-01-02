/// DataMatrix Molecule Tests
///
/// Tests observable BEHAVIOR:
/// - User sees column and row headers
/// - User sees cell values (text, boolean icons)
/// - User can interact with editable cells
/// - Callback fires when cells change
///
/// NO implementation details:
/// - ❌ Widget counts (findsNWidgets)
/// - ❌ Container/decoration inspection
/// - ❌ Internal widget hierarchy
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/molecules/display/data_matrix.dart';

import '../../../helpers/behavioral_test_helpers.dart';
import '../../../helpers/test_helpers.dart';

void main() {
  group('DataMatrix Molecule', () {
    // =========================================================================
    // User Sees Headers
    // =========================================================================
    group('User Sees Headers', () {
      testWidgets('user sees all column headers', (tester) async {
        await tester.pumpTestWidget(
          DataMatrix(
            columnHeaders: const ['Create', 'Read', 'Update', 'Delete'],
            rows: const [
              DataMatrixRow(header: 'Admin', cells: [true, true, true, true]),
            ],
          ),
        );

        assertTextVisible('Create');
        assertTextVisible('Read');
        assertTextVisible('Update');
        assertTextVisible('Delete');
      });

      testWidgets('user sees all row headers', (tester) async {
        await tester.pumpTestWidget(
          DataMatrix(
            columnHeaders: const ['Col1', 'Col2'],
            rows: const [
              DataMatrixRow(header: 'Row 1', cells: ['A', 'B']),
              DataMatrixRow(header: 'Row 2', cells: ['C', 'D']),
              DataMatrixRow(header: 'Row 3', cells: ['E', 'F']),
            ],
          ),
        );

        assertTextVisible('Row 1');
        assertTextVisible('Row 2');
        assertTextVisible('Row 3');
      });

      testWidgets('empty matrix renders without error', (tester) async {
        await tester.pumpTestWidget(
          const DataMatrix(columnHeaders: ['Col1', 'Col2'], rows: []),
        );

        expect(find.byType(DataMatrix), findsOneWidget);
      });

      testWidgets('matrix with no columns renders without error', (
        tester,
      ) async {
        await tester.pumpTestWidget(
          DataMatrix(
            columnHeaders: const [],
            rows: const [DataMatrixRow(header: 'Row', cells: [])],
          ),
        );

        expect(find.byType(DataMatrix), findsOneWidget);
      });
    });

    // =========================================================================
    // User Sees Cell Values
    // =========================================================================
    group('User Sees Cell Values', () {
      testWidgets('user sees text cell values', (tester) async {
        await tester.pumpTestWidget(
          DataMatrix(
            columnHeaders: const ['A', 'B'],
            rows: const [
              DataMatrixRow(header: 'Row', cells: ['Value 1', 'Value 2']),
            ],
          ),
        );

        assertTextVisible('Value 1');
        assertTextVisible('Value 2');
      });

      testWidgets('user sees boolean true as check icon', (tester) async {
        await tester.pumpTestWidget(
          DataMatrix(
            columnHeaders: const ['Enabled'],
            rows: const [
              DataMatrixRow(header: 'Feature', cells: [true]),
            ],
          ),
        );

        assertIconVisible(Icons.check_circle);
      });

      testWidgets('user sees boolean false as cancel icon', (tester) async {
        await tester.pumpTestWidget(
          DataMatrix(
            columnHeaders: const ['Disabled'],
            rows: const [
              DataMatrixRow(header: 'Feature', cells: [false]),
            ],
          ),
        );

        assertIconVisible(Icons.cancel);
      });

      testWidgets('custom cellBuilder output is visible', (tester) async {
        await tester.pumpTestWidget(
          DataMatrix(
            columnHeaders: const ['Status'],
            rows: const [
              DataMatrixRow(header: 'Item', cells: ['active']),
            ],
            cellBuilder: (context, value, rowIndex, colIndex) {
              return Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: value == 'active' ? Colors.green : Colors.red,
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(value.toString().toUpperCase()),
              );
            },
          ),
        );

        assertTextVisible('ACTIVE');
      });
    });

    // =========================================================================
    // Editable Mode Behavior
    // =========================================================================
    group('Editable Mode Behavior', () {
      testWidgets('editable mode shows checkbox for boolean cells', (
        tester,
      ) async {
        await tester.pumpTestWidget(
          DataMatrix(
            columnHeaders: const ['Permission'],
            rows: const [
              DataMatrixRow(header: 'Admin', cells: [true]),
            ],
            isEditable: true,
            onCellChanged: (row, col, value) {},
          ),
        );

        expect(find.byType(Checkbox), findsWidgets);
      });

      testWidgets('tapping checkbox fires onCellChanged callback', (
        tester,
      ) async {
        int? changedRow;
        int? changedCol;
        dynamic changedValue;

        await tester.pumpTestWidget(
          DataMatrix(
            columnHeaders: const ['Permission'],
            rows: const [
              DataMatrixRow(header: 'Admin', cells: [true]),
            ],
            isEditable: true,
            onCellChanged: (row, col, value) {
              changedRow = row;
              changedCol = col;
              changedValue = value;
            },
          ),
        );

        await tester.tap(find.byType(Checkbox).first);
        await tester.pump();

        assertCallbackReceivedValue(changedRow, 0, 'onCellChanged row');
        assertCallbackReceivedValue(changedCol, 0, 'onCellChanged col');
        assertCallbackReceivedValue(changedValue, false, 'onCellChanged value');
      });
    });

    // =========================================================================
    // Visual Options
    // =========================================================================
    group('Visual Options', () {
      testWidgets('striping renders without error', (tester) async {
        await tester.pumpTestWidget(
          DataMatrix(
            columnHeaders: const ['Col'],
            rows: const [
              DataMatrixRow(header: 'Row 1', cells: ['A']),
              DataMatrixRow(header: 'Row 2', cells: ['B']),
              DataMatrixRow(header: 'Row 3', cells: ['C']),
            ],
            showStriping: true,
          ),
        );

        assertTextVisible('Row 1');
        assertTextVisible('Row 2');
        assertTextVisible('Row 3');
      });

      testWidgets('grid lines option renders without error', (tester) async {
        await tester.pumpTestWidget(
          DataMatrix(
            columnHeaders: const ['Col'],
            rows: const [
              DataMatrixRow(header: 'Row', cells: ['Value']),
            ],
            showGridLines: true,
          ),
        );

        assertTextVisible('Row');
        assertTextVisible('Value');
      });

      testWidgets('highlighted rows render without error', (tester) async {
        await tester.pumpTestWidget(
          DataMatrix(
            columnHeaders: const ['Col'],
            rows: const [
              DataMatrixRow(header: 'Normal', cells: ['A']),
              DataMatrixRow(
                header: 'Highlighted',
                cells: ['B'],
                isHighlighted: true,
              ),
            ],
          ),
        );

        assertTextVisible('Normal');
        assertTextVisible('Highlighted');
      });

      testWidgets('row tooltips are present', (tester) async {
        await tester.pumpTestWidget(
          DataMatrix(
            columnHeaders: const ['Col'],
            rows: const [
              DataMatrixRow(
                header: 'Row',
                cells: ['Value'],
                tooltip: 'Row tooltip',
              ),
            ],
          ),
        );

        expect(find.byType(Tooltip), findsWidgets);
      });
    });

    // =========================================================================
    // Sizing Options
    // =========================================================================
    group('Sizing Options', () {
      testWidgets('custom rowHeaderWidth renders correctly', (tester) async {
        await tester.pumpTestWidget(
          DataMatrix(
            columnHeaders: const ['Col'],
            rows: const [
              DataMatrixRow(header: 'Row', cells: ['Value']),
            ],
            rowHeaderWidth: 200,
          ),
        );

        assertTextVisible('Row');
      });

      testWidgets('custom cellWidth renders correctly', (tester) async {
        await tester.pumpTestWidget(
          DataMatrix(
            columnHeaders: const ['Col'],
            rows: const [
              DataMatrixRow(header: 'Row', cells: ['Value']),
            ],
            cellWidth: 100,
          ),
        );

        assertTextVisible('Value');
      });

      testWidgets('custom rowHeight renders correctly', (tester) async {
        await tester.pumpTestWidget(
          DataMatrix(
            columnHeaders: const ['Col'],
            rows: const [
              DataMatrixRow(header: 'Row', cells: ['Value']),
            ],
            rowHeight: 60,
          ),
        );

        assertTextVisible('Row');
      });
    });

    // =========================================================================
    // Horizontal Scroll
    // =========================================================================
    group('Horizontal Scroll', () {
      testWidgets('scrolls horizontally when content exceeds width', (
        tester,
      ) async {
        await tester.pumpTestWidget(
          SizedBox(
            width: 300,
            child: DataMatrix(
              columnHeaders: const ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
              rows: const [
                DataMatrixRow(header: 'Row', cells: [1, 2, 3, 4, 5, 6, 7, 8]),
              ],
              cellWidth: 80,
            ),
          ),
        );

        // Scroll view exists for horizontal overflow
        expect(find.byType(SingleChildScrollView), findsWidgets);
      });
    });

    // =========================================================================
    // DataMatrixRow Model
    // =========================================================================
    group('DataMatrixRow Model', () {
      test('creates row with required fields', () {
        const row = DataMatrixRow(header: 'Test', cells: ['A', 'B', 'C']);

        expect(row.header, 'Test');
        expect(row.cells, ['A', 'B', 'C']);
        expect(row.tooltip, isNull);
        expect(row.isHighlighted, isFalse);
      });

      test('creates row with optional fields', () {
        const row = DataMatrixRow(
          header: 'Test',
          cells: [1, 2, 3],
          tooltip: 'Tooltip text',
          isHighlighted: true,
        );

        expect(row.tooltip, 'Tooltip text');
        expect(row.isHighlighted, isTrue);
      });
    });
  });
}
