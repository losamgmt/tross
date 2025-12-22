/// Tests for PageToolbar Molecule
///
/// Verifies:
/// - Basic rendering with leading/center/trailing
/// - Compact mode
/// - Border visibility
/// - Custom styling
/// - PageToolbarDivider
/// - PageToolbarGroup
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/molecules/layout/page_toolbar.dart';

void main() {
  group('PageToolbar', () {
    group('basic rendering', () {
      testWidgets('renders leading widget', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(body: PageToolbar(leading: Text('Leading'))),
          ),
        );

        expect(find.text('Leading'), findsOneWidget);
      });

      testWidgets('renders center widget', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(body: PageToolbar(center: Text('Center'))),
          ),
        );

        expect(find.text('Center'), findsOneWidget);
      });

      testWidgets('renders trailing widget', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(body: PageToolbar(trailing: Text('Trailing'))),
          ),
        );

        expect(find.text('Trailing'), findsOneWidget);
      });

      testWidgets('renders all sections together', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: PageToolbar(
                leading: Text('Leading'),
                center: Text('Center'),
                trailing: Text('Trailing'),
              ),
            ),
          ),
        );

        expect(find.text('Leading'), findsOneWidget);
        expect(find.text('Center'), findsOneWidget);
        expect(find.text('Trailing'), findsOneWidget);
      });
    });

    group('layout', () {
      testWidgets('leading is on the left', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: PageToolbar(leading: Text('Left'), trailing: Text('Right')),
            ),
          ),
        );

        final leftRect = tester.getRect(find.text('Left'));
        final rightRect = tester.getRect(find.text('Right'));

        expect(leftRect.left, lessThan(rightRect.left));
      });

      testWidgets('trailing is on the right', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: PageToolbar(leading: Text('Left'), trailing: Text('Right')),
            ),
          ),
        );

        final leftRect = tester.getRect(find.text('Left'));
        final rightRect = tester.getRect(find.text('Right'));

        expect(rightRect.right, greaterThan(leftRect.right));
      });

      testWidgets('center is between leading and trailing', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: PageToolbar(
                leading: Text('Left'),
                center: Text('Middle'),
                trailing: Text('Right'),
              ),
            ),
          ),
        );

        final leftRect = tester.getRect(find.text('Left'));
        final centerRect = tester.getRect(find.text('Middle'));
        final rightRect = tester.getRect(find.text('Right'));

        expect(centerRect.left, greaterThan(leftRect.right));
        expect(centerRect.right, lessThan(rightRect.left));
      });
    });

    group('compact mode', () {
      testWidgets('compact has smaller min height', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: Column(
                children: [
                  PageToolbar(key: Key('normal'), leading: Text('Normal')),
                  PageToolbar(
                    key: Key('compact'),
                    compact: true,
                    leading: Text('Compact'),
                  ),
                ],
              ),
            ),
          ),
        );

        final normalToolbar = tester.getSize(find.byKey(const Key('normal')));
        final compactToolbar = tester.getSize(find.byKey(const Key('compact')));

        expect(compactToolbar.height, lessThan(normalToolbar.height));
      });
    });

    group('border', () {
      testWidgets('shows bottom border when showBorder is true', (
        tester,
      ) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: PageToolbar(showBorder: true, leading: Text('With Border')),
            ),
          ),
        );

        final container = tester.widget<Container>(
          find.descendant(
            of: find.byType(PageToolbar),
            matching: find.byType(Container),
          ),
        );

        final decoration = container.decoration as BoxDecoration?;
        expect(decoration?.border, isNotNull);
      });

      testWidgets('applies custom border color', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: PageToolbar(
                showBorder: true,
                borderColor: Colors.red,
                leading: Text('Red Border'),
              ),
            ),
          ),
        );

        final container = tester.widget<Container>(
          find.descendant(
            of: find.byType(PageToolbar),
            matching: find.byType(Container),
          ),
        );

        final decoration = container.decoration as BoxDecoration?;
        final border = decoration?.border as Border?;
        expect(border?.bottom.color, equals(Colors.red));
      });
    });

    group('styling', () {
      testWidgets('applies background color', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: PageToolbar(
                backgroundColor: Colors.blue,
                leading: Text('Blue BG'),
              ),
            ),
          ),
        );

        final container = tester.widget<Container>(
          find.descendant(
            of: find.byType(PageToolbar),
            matching: find.byType(Container),
          ),
        );

        final decoration = container.decoration as BoxDecoration?;
        expect(decoration?.color, equals(Colors.blue));
      });

      testWidgets('applies custom padding', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: PageToolbar(
                padding: EdgeInsets.all(32),
                leading: Text('Custom Padding'),
              ),
            ),
          ),
        );

        final container = tester.widget<Container>(
          find.descendant(
            of: find.byType(PageToolbar),
            matching: find.byType(Container),
          ),
        );

        expect(container.padding, equals(const EdgeInsets.all(32)));
      });
    });
  });

  group('PageToolbarDivider', () {
    testWidgets('renders as vertical line', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: PageToolbar(
              center: Row(
                children: [Text('Left'), PageToolbarDivider(), Text('Right')],
              ),
            ),
          ),
        ),
      );

      expect(find.byType(PageToolbarDivider), findsOneWidget);
    });

    testWidgets('applies custom color', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(body: PageToolbarDivider(color: Colors.red)),
        ),
      );

      final container = tester.widget<Container>(find.byType(Container));
      expect(container.color, equals(Colors.red));
    });
  });

  group('PageToolbarGroup', () {
    testWidgets('renders children in a row', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: PageToolbarGroup(
              children: [Icon(Icons.add), Icon(Icons.edit), Icon(Icons.delete)],
            ),
          ),
        ),
      );

      expect(find.byIcon(Icons.add), findsOneWidget);
      expect(find.byIcon(Icons.edit), findsOneWidget);
      expect(find.byIcon(Icons.delete), findsOneWidget);
    });

    testWidgets('children are arranged horizontally', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: PageToolbarGroup(children: [Text('First'), Text('Second')]),
          ),
        ),
      );

      final firstRect = tester.getRect(find.text('First'));
      final secondRect = tester.getRect(find.text('Second'));

      expect(secondRect.left, greaterThan(firstRect.right));
    });
  });
}
