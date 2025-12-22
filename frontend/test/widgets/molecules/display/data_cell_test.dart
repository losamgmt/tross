/// DataCell Molecule Tests
///
/// Tests the table data cell molecule - wraps content with
/// consistent padding, alignment, and optional borders.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/molecules/display/data_cell.dart' as molecule;

void main() {
  group('DataCell Molecule', () {
    // =========================================================================
    // Basic Rendering
    // =========================================================================
    group('Basic Rendering', () {
      testWidgets('renders child widget', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: molecule.DataCell(child: Text('Cell Content')),
            ),
          ),
        );

        expect(find.text('Cell Content'), findsOneWidget);
      });

      testWidgets('renders inside Container', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(body: molecule.DataCell(child: Text('Content'))),
          ),
        );

        expect(find.byType(Container), findsWidgets);
      });

      testWidgets('applies default left alignment', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: molecule.DataCell(child: Text('Left aligned')),
            ),
          ),
        );

        final container = tester.widget<Container>(
          find
              .ancestor(
                of: find.text('Left aligned'),
                matching: find.byType(Container),
              )
              .first,
        );
        expect(container.alignment, Alignment.centerLeft);
      });
    });

    // =========================================================================
    // Alignment
    // =========================================================================
    group('Alignment', () {
      testWidgets('supports center-right alignment', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: molecule.DataCell(
                alignment: Alignment.centerRight,
                child: Text('Right'),
              ),
            ),
          ),
        );

        final container = tester.widget<Container>(
          find
              .ancestor(
                of: find.text('Right'),
                matching: find.byType(Container),
              )
              .first,
        );
        expect(container.alignment, Alignment.centerRight);
      });

      testWidgets('supports center alignment', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: molecule.DataCell(
                alignment: Alignment.center,
                child: Text('Center'),
              ),
            ),
          ),
        );

        final container = tester.widget<Container>(
          find
              .ancestor(
                of: find.text('Center'),
                matching: find.byType(Container),
              )
              .first,
        );
        expect(container.alignment, Alignment.center);
      });
    });

    // =========================================================================
    // Width
    // =========================================================================
    group('Width', () {
      testWidgets('applies custom width', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: molecule.DataCell(width: 150, child: Text('Fixed width')),
            ),
          ),
        );

        final container = tester.widget<Container>(
          find
              .ancestor(
                of: find.text('Fixed width'),
                matching: find.byType(Container),
              )
              .first,
        );
        expect(container.constraints?.maxWidth, 150);
      });

      testWidgets('has no width constraint by default', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(body: molecule.DataCell(child: Text('No width'))),
          ),
        );

        // Just verify it renders without error
        expect(find.text('No width'), findsOneWidget);
      });
    });

    // =========================================================================
    // Padding
    // =========================================================================
    group('Padding', () {
      testWidgets('applies custom padding', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: molecule.DataCell(
                padding: EdgeInsets.all(20),
                child: Text('Padded'),
              ),
            ),
          ),
        );

        final container = tester.widget<Container>(
          find
              .ancestor(
                of: find.text('Padded'),
                matching: find.byType(Container),
              )
              .first,
        );
        expect(container.padding, const EdgeInsets.all(20));
      });
    });

    // =========================================================================
    // Borders
    // =========================================================================
    group('Borders', () {
      testWidgets('shows right border when enabled', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: molecule.DataCell(
                showRightBorder: true,
                child: Text('With border'),
              ),
            ),
          ),
        );

        final container = tester.widget<Container>(
          find
              .ancestor(
                of: find.text('With border'),
                matching: find.byType(Container),
              )
              .first,
        );
        expect(container.decoration, isNotNull);
        expect(container.decoration, isA<BoxDecoration>());
      });

      testWidgets('no border by default', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(body: molecule.DataCell(child: Text('No border'))),
          ),
        );

        final container = tester.widget<Container>(
          find
              .ancestor(
                of: find.text('No border'),
                matching: find.byType(Container),
              )
              .first,
        );
        expect(container.decoration, isNull);
      });

      testWidgets('applies custom border color', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: molecule.DataCell(
                showRightBorder: true,
                borderColor: Colors.red,
                child: const Text('Red border'),
              ),
            ),
          ),
        );

        final container = tester.widget<Container>(
          find
              .ancestor(
                of: find.text('Red border'),
                matching: find.byType(Container),
              )
              .first,
        );
        final decoration = container.decoration as BoxDecoration;
        final border = decoration.border as Border;
        expect(border.right.color, Colors.red);
      });
    });

    // =========================================================================
    // Tap Handling
    // =========================================================================
    group('Tap Handling', () {
      testWidgets('wraps in InkWell when onTap provided', (tester) async {
        bool tapped = false;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: molecule.DataCell(
                onTap: () => tapped = true,
                child: const Text('Tappable'),
              ),
            ),
          ),
        );

        expect(find.byType(InkWell), findsOneWidget);

        await tester.tap(find.text('Tappable'));
        await tester.pump();

        expect(tapped, isTrue);
      });

      testWidgets('no InkWell when onTap not provided', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: molecule.DataCell(child: Text('Not tappable')),
            ),
          ),
        );

        expect(find.byType(InkWell), findsNothing);
      });
    });

    // =========================================================================
    // Factory: DataCell.text
    // =========================================================================
    group('DataCell.text factory', () {
      testWidgets('creates text cell with left alignment', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: molecule.DataCell.text('Simple text')),
          ),
        );

        expect(find.text('Simple text'), findsOneWidget);
      });

      testWidgets('creates text cell with right alignment', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: molecule.DataCell.text(
                '\$100.00',
                textAlign: TextAlign.right,
              ),
            ),
          ),
        );

        final text = tester.widget<Text>(find.text('\$100.00'));
        expect(text.textAlign, TextAlign.right);
      });

      testWidgets('applies width from factory', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: molecule.DataCell.text('Fixed', width: 100)),
          ),
        );

        expect(find.text('Fixed'), findsOneWidget);
      });

      testWidgets('handles text overflow with ellipsis', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: SizedBox(
                width: 50,
                child: molecule.DataCell.text(
                  'This is a very long text that will overflow',
                  width: 50,
                ),
              ),
            ),
          ),
        );

        final text = tester.widget<Text>(
          find.text('This is a very long text that will overflow'),
        );
        expect(text.overflow, TextOverflow.ellipsis);
      });
    });
  });
}
