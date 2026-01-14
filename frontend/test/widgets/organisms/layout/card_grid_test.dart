/// CardGrid Widget Tests
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/organisms/layout/card_grid.dart';

void main() {
  group('CardGrid', () {
    testWidgets('renders children', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CardGrid(
              children: [
                const Card(child: Text('Card 1')),
                const Card(child: Text('Card 2')),
              ],
            ),
          ),
        ),
      );

      expect(find.text('Card 1'), findsOneWidget);
      expect(find.text('Card 2'), findsOneWidget);
    });

    testWidgets('renders with empty children list', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(body: CardGrid(children: [])),
        ),
      );

      expect(find.byType(CardGrid), findsOneWidget);
    });

    testWidgets('renders with custom min/max card width', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CardGrid(
              minCardWidth: 200,
              maxCardWidth: 350,
              children: [const Card(child: Text('Wide Card'))],
            ),
          ),
        ),
      );

      expect(find.byType(CardGrid), findsOneWidget);
    });

    testWidgets('renders with custom alignment', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CardGrid(
              alignment: WrapAlignment.center,
              runAlignment: WrapAlignment.center,
              children: [const Card(child: Text('Centered'))],
            ),
          ),
        ),
      );

      expect(find.byType(Wrap), findsOneWidget);
    });

    testWidgets('renders with custom spacing', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CardGrid(
              spacing: 24,
              runSpacing: 16,
              children: [
                const Card(child: Text('A')),
                const Card(child: Text('B')),
              ],
            ),
          ),
        ),
      );

      expect(find.byType(CardGrid), findsOneWidget);
    });

    testWidgets('renders multiple cards in grid', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SizedBox(
              width: 600,
              child: CardGrid(
                children: List.generate(4, (i) => Card(child: Text('Card $i'))),
              ),
            ),
          ),
        ),
      );

      expect(find.byType(Card), findsNWidgets(4));
    });

    testWidgets('uses LayoutBuilder for responsive sizing', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CardGrid(children: [const Card(child: Text('Test'))]),
          ),
        ),
      );

      expect(find.byType(LayoutBuilder), findsOneWidget);
    });
  });
}
