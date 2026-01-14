/// ActionGrid Widget Tests
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/organisms/layout/action_grid.dart';

void main() {
  group('ActionGrid', () {
    testWidgets('renders children', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ActionGrid(
              children: [
                ElevatedButton(onPressed: () {}, child: const Text('Button 1')),
                ElevatedButton(onPressed: () {}, child: const Text('Button 2')),
              ],
            ),
          ),
        ),
      );

      expect(find.text('Button 1'), findsOneWidget);
      expect(find.text('Button 2'), findsOneWidget);
    });

    testWidgets('renders with empty children list', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(body: ActionGrid(children: [])),
        ),
      );

      expect(find.byType(ActionGrid), findsOneWidget);
    });

    testWidgets('renders with custom min/max button width', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ActionGrid(
              minButtonWidth: 100,
              maxButtonWidth: 150,
              children: [
                ElevatedButton(onPressed: () {}, child: const Text('Action')),
              ],
            ),
          ),
        ),
      );

      expect(find.byType(ActionGrid), findsOneWidget);
    });

    testWidgets('renders with custom alignment', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ActionGrid(
              alignment: WrapAlignment.center,
              children: [
                ElevatedButton(onPressed: () {}, child: const Text('Centered')),
              ],
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
            body: ActionGrid(
              spacing: 20,
              runSpacing: 10,
              children: [
                ElevatedButton(onPressed: () {}, child: const Text('A')),
                ElevatedButton(onPressed: () {}, child: const Text('B')),
              ],
            ),
          ),
        ),
      );

      expect(find.byType(ActionGrid), findsOneWidget);
    });

    testWidgets('renders multiple rows of buttons', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SizedBox(
              width: 300,
              child: ActionGrid(
                children: List.generate(
                  6,
                  (i) => ElevatedButton(
                    onPressed: () {},
                    child: Text('Button $i'),
                  ),
                ),
              ),
            ),
          ),
        ),
      );

      expect(find.byType(ElevatedButton), findsNWidgets(6));
    });
  });
}
