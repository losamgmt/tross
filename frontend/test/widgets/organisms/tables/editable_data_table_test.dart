import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross/widgets/organisms/tables/editable_data_table.dart';
import 'package:tross/widgets/molecules/display/inline_edit_cell.dart';

/// Test data model
class _TestItem {
  final String id;
  final String name;
  final String email;

  const _TestItem({required this.id, required this.name, required this.email});
}

void main() {
  group('EditableDataTable', () {
    // Test data
    final testItems = [
      const _TestItem(id: '1', name: 'Alice', email: 'alice@test.com'),
      const _TestItem(id: '2', name: 'Bob', email: 'bob@test.com'),
      const _TestItem(id: '3', name: 'Charlie', email: 'charlie@test.com'),
    ];

    final testColumns = [
      EditableColumn<_TestItem>(
        id: 'name',
        label: 'Name',
        getValue: (item) => item.name,
      ),
      EditableColumn<_TestItem>(
        id: 'email',
        label: 'Email',
        getValue: (item) => item.email,
      ),
    ];

    Widget buildTestWidget({
      List<_TestItem>? data,
      List<EditableColumn<_TestItem>>? columns,
      CellPosition? editingCell,
      void Function(int, String, _TestItem)? onEditStart,
      void Function(int, String, _TestItem, String)? onEditEnd,
      VoidCallback? onEditCancel,
      Widget Function(_TestItem, String, String)? editWidgetBuilder,
      InlineEditTrigger editTrigger = InlineEditTrigger.doubleTap,
      bool showEditHints = true,
    }) {
      return MaterialApp(
        home: Scaffold(
          body: SizedBox(
            width: 800,
            height: 600,
            child: EditableDataTable<_TestItem>(
              columns: columns ?? testColumns,
              data: data ?? testItems,
              editingCell: editingCell,
              onEditStart: onEditStart,
              onEditEnd: onEditEnd,
              onEditCancel: onEditCancel,
              editWidgetBuilder: editWidgetBuilder,
              editTrigger: editTrigger,
              showEditHints: showEditHints,
            ),
          ),
        ),
      );
    }

    group('composition', () {
      testWidgets('renders table with data', (tester) async {
        await tester.pumpWidget(buildTestWidget());
        await tester.pumpAndSettle();

        // Verify data is displayed
        expect(find.text('Alice'), findsOneWidget);
        expect(find.text('Bob'), findsOneWidget);
        expect(find.text('Charlie'), findsOneWidget);
      });

      testWidgets('renders column headers', (tester) async {
        await tester.pumpWidget(buildTestWidget());
        await tester.pumpAndSettle();

        expect(find.text('Name'), findsOneWidget);
        expect(find.text('Email'), findsOneWidget);
      });
    });

    group('edit mode', () {
      testWidgets('displays InlineEditCell for editable columns', (
        tester,
      ) async {
        await tester.pumpWidget(
          buildTestWidget(
            editWidgetBuilder: (item, columnId, value) =>
                TextField(controller: TextEditingController(text: value)),
          ),
        );
        await tester.pumpAndSettle();

        // Verify edit hint icons are shown (edit icon from InlineEditCell)
        expect(find.byIcon(Icons.edit), findsWidgets);
      });

      testWidgets('hides edit hints when showEditHints is false', (
        tester,
      ) async {
        await tester.pumpWidget(
          buildTestWidget(
            showEditHints: false,
            editWidgetBuilder: (item, columnId, value) =>
                TextField(controller: TextEditingController(text: value)),
          ),
        );
        await tester.pumpAndSettle();

        // Edit icons should not be visible
        expect(find.byIcon(Icons.edit), findsNothing);
      });

      testWidgets('shows edit widget when cell is editing', (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            editingCell: const CellPosition(0, 'name'),
            editWidgetBuilder: (item, columnId, value) => TextField(
              key: const Key('edit-field'),
              controller: TextEditingController(text: value),
            ),
          ),
        );
        await tester.pumpAndSettle();

        expect(find.byKey(const Key('edit-field')), findsOneWidget);
      });

      testWidgets('calls onEditStart on double tap', (tester) async {
        int? tappedRow;
        String? tappedColumn;
        _TestItem? tappedItem;

        await tester.pumpWidget(
          buildTestWidget(
            onEditStart: (row, col, item) {
              tappedRow = row;
              tappedColumn = col;
              tappedItem = item;
            },
            editWidgetBuilder: (item, columnId, value) =>
                TextField(controller: TextEditingController(text: value)),
          ),
        );
        await tester.pumpAndSettle();

        // Find Alice text and double tap
        final aliceFinder = find.text('Alice');
        await tester.tap(aliceFinder);
        await tester.pump(const Duration(milliseconds: 50));
        await tester.tap(aliceFinder);
        await tester.pumpAndSettle();

        expect(tappedRow, 0);
        expect(tappedColumn, 'name');
        expect(tappedItem?.name, 'Alice');
      });

      testWidgets('calls onEditStart on single tap when trigger is singleTap', (
        tester,
      ) async {
        int? tappedRow;

        await tester.pumpWidget(
          buildTestWidget(
            editTrigger: InlineEditTrigger.singleTap,
            onEditStart: (row, col, item) {
              tappedRow = row;
            },
            editWidgetBuilder: (item, columnId, value) =>
                TextField(controller: TextEditingController(text: value)),
          ),
        );
        await tester.pumpAndSettle();

        await tester.tap(find.text('Bob'));
        await tester.pumpAndSettle();

        expect(tappedRow, 1);
      });
    });

    group('column configuration', () {
      testWidgets('respects column editable flag', (tester) async {
        final mixedColumns = [
          EditableColumn<_TestItem>(
            id: 'name',
            label: 'Name',
            getValue: (item) => item.name,
            editable: true,
          ),
          EditableColumn<_TestItem>(
            id: 'id',
            label: 'ID',
            getValue: (item) => item.id,
            editable: false, // Not editable
          ),
        ];

        await tester.pumpWidget(
          buildTestWidget(
            columns: mixedColumns,
            editWidgetBuilder: (item, columnId, value) =>
                TextField(controller: TextEditingController(text: value)),
          ),
        );
        await tester.pumpAndSettle();

        // ID column should not show edit hint
        // Name column should show edit hint
        // We can verify by checking the total edit icons
        // Since only Name is editable, we expect 3 edit icons (one per row)
        expect(find.byIcon(Icons.edit), findsNWidgets(3));
      });

      testWidgets('uses custom displayBuilder when provided', (tester) async {
        final customColumns = [
          EditableColumn<_TestItem>(
            id: 'name',
            label: 'Name',
            getValue: (item) => item.name,
            displayBuilder: (item) => Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.person, key: Key('person-icon'), size: 16),
                const SizedBox(width: 4),
                Flexible(
                  child: Text(item.name, overflow: TextOverflow.ellipsis),
                ),
              ],
            ),
          ),
        ];

        await tester.pumpWidget(
          buildTestWidget(
            columns: customColumns,
            editWidgetBuilder: (item, columnId, value) =>
                TextField(controller: TextEditingController(text: value)),
          ),
        );
        await tester.pumpAndSettle();

        // Custom display builder should render person icons
        expect(find.byKey(const Key('person-icon')), findsNWidgets(3));
      });
    });

    group('CellPosition', () {
      test('equals compares rowIndex and columnId', () {
        const pos1 = CellPosition(0, 'name');
        const pos2 = CellPosition(0, 'name');
        const pos3 = CellPosition(1, 'name');
        const pos4 = CellPosition(0, 'email');

        expect(pos1, equals(pos2));
        expect(pos1, isNot(equals(pos3)));
        expect(pos1, isNot(equals(pos4)));
      });

      test('hashCode is consistent with equals', () {
        const pos1 = CellPosition(0, 'name');
        const pos2 = CellPosition(0, 'name');

        expect(pos1.hashCode, equals(pos2.hashCode));
      });
    });

    group('EditableColumn', () {
      test('has correct default values', () {
        final column = EditableColumn<_TestItem>(
          id: 'test',
          label: 'Test',
          getValue: (item) => item.name,
        );

        expect(column.width, isNull);
        expect(column.sortable, false);
        expect(column.alignment, TextAlign.left);
        expect(column.editable, true);
        expect(column.displayBuilder, isNull);
      });
    });
  });
}
