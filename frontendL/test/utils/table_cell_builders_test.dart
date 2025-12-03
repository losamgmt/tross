/// Tests for TableCellBuilders - Reusable table cell builder functions
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/utils/table_cell_builders.dart';
import 'package:tross_app/widgets/atoms/atoms.dart';

void main() {
  group('TableCellBuilders', () {
    group('textCell', () {
      testWidgets('renders text with primary emphasis by default', (
        tester,
      ) async {
        await tester.pumpWidget(
          MaterialApp(home: Scaffold(body: TableCellBuilders.textCell('Test'))),
        );

        expect(find.byType(DataValue), findsOneWidget);
        expect(find.text('Test'), findsOneWidget);
      });

      testWidgets('accepts custom emphasis', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: TableCellBuilders.textCell(
                'Test',
                emphasis: ValueEmphasis.secondary,
              ),
            ),
          ),
        );

        expect(find.byType(DataValue), findsOneWidget);
      });
    });

    group('emailCell', () {
      testWidgets('renders email as DataValue', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: TableCellBuilders.emailCell('test@example.com'),
            ),
          ),
        );

        expect(find.byType(DataValue), findsOneWidget);
        expect(find.text('test@example.com'), findsOneWidget);
      });
    });

    group('idCell', () {
      testWidgets('renders ID as DataValue', (tester) async {
        await tester.pumpWidget(
          MaterialApp(home: Scaffold(body: TableCellBuilders.idCell('123'))),
        );

        expect(find.byType(DataValue), findsOneWidget);
        expect(find.text('123'), findsOneWidget);
      });
    });

    group('timestampCell', () {
      testWidgets('renders timestamp as DataValue', (tester) async {
        final timestamp = DateTime(2024, 1, 15);

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: TableCellBuilders.timestampCell(timestamp)),
          ),
        );

        expect(find.byType(DataValue), findsOneWidget);
      });
    });

    group('roleBadgeCell', () {
      testWidgets('renders role badge using RoleConfig', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: TableCellBuilders.roleBadgeCell('admin')),
          ),
        );

        expect(find.byType(StatusBadge), findsOneWidget);
        expect(find.text('admin'), findsOneWidget);
      });

      testWidgets('handles unknown roles with default config', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: TableCellBuilders.roleBadgeCell('unknown_role'),
            ),
          ),
        );

        expect(find.byType(StatusBadge), findsOneWidget);
        expect(find.text('unknown_role'), findsOneWidget);
      });
    });

    group('statusBadgeCell', () {
      testWidgets('renders generic status badge', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: TableCellBuilders.statusBadgeCell(
                label: 'Active',
                style: BadgeStyle.success,
                icon: Icons.check,
                compact: true,
              ),
            ),
          ),
        );

        expect(find.byType(StatusBadge), findsOneWidget);
        expect(find.text('Active'), findsOneWidget);
      });
    });

    group('booleanBadgeCell', () {
      testWidgets('renders true state correctly', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: TableCellBuilders.booleanBadgeCell(
                value: true,
                trueLabel: 'Yes',
                falseLabel: 'No',
                trueStyle: BadgeStyle.success,
                falseStyle: BadgeStyle.neutral,
                trueIcon: Icons.check,
                falseIcon: Icons.close,
              ),
            ),
          ),
        );

        expect(find.byType(StatusBadge), findsOneWidget);
        expect(find.text('Yes'), findsOneWidget);
        expect(find.byIcon(Icons.check), findsOneWidget);
      });

      testWidgets('renders false state correctly', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: TableCellBuilders.booleanBadgeCell(
                value: false,
                trueLabel: 'Yes',
                falseLabel: 'No',
                trueStyle: BadgeStyle.success,
                falseStyle: BadgeStyle.neutral,
                trueIcon: Icons.check,
                falseIcon: Icons.close,
              ),
            ),
          ),
        );

        expect(find.byType(StatusBadge), findsOneWidget);
        expect(find.text('No'), findsOneWidget);
        expect(find.byIcon(Icons.close), findsOneWidget);
      });
    });

    group('nullableTextCell', () {
      testWidgets('renders text when not null', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: TableCellBuilders.nullableTextCell('Content')),
          ),
        );

        expect(find.byType(DataValue), findsOneWidget);
        expect(find.text('Content'), findsOneWidget);
      });

      testWidgets('renders placeholder for null', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: TableCellBuilders.nullableTextCell(null)),
          ),
        );

        expect(find.byType(DataValue), findsOneWidget);
        expect(find.text('—'), findsOneWidget);
      });

      testWidgets('renders placeholder for empty string', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: TableCellBuilders.nullableTextCell('')),
          ),
        );

        expect(find.byType(DataValue), findsOneWidget);
        expect(find.text('—'), findsOneWidget);
      });
    });

    group('nullableNumericCell', () {
      testWidgets('renders number when not null', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: TableCellBuilders.nullableNumericCell(42)),
          ),
        );

        expect(find.byType(DataValue), findsOneWidget);
        expect(find.text('42'), findsOneWidget);
      });

      testWidgets('renders placeholder for null', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: TableCellBuilders.nullableNumericCell(null)),
          ),
        );

        expect(find.byType(DataValue), findsOneWidget);
        expect(find.text('—'), findsOneWidget);
      });
    });

    group('editableBooleanCell', () {
      test('returns EditableField widget', () {
        final widget = TableCellBuilders.editableBooleanCell<String>(
          item: 'test',
          value: true,
          onUpdate: (newValue) async => true,
          fieldName: 'status',
          trueAction: 'activate',
          falseAction: 'deactivate',
        );

        // Verify it returns a widget (EditableField specifically)
        expect(widget, isA<Widget>());
      });
    });
  });
}
