import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross/widgets/atoms/interactions/touch_target.dart';

void main() {
  group('TouchTarget', () {
    testWidgets('renders child widget', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(body: TouchTarget(child: Icon(Icons.edit))),
        ),
      );

      expect(find.byIcon(Icons.edit), findsOneWidget);
    });

    testWidgets('calls onTap when tapped', (tester) async {
      var tapped = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: TouchTarget(
              onTap: () => tapped = true,
              child: const Icon(Icons.edit),
            ),
          ),
        ),
      );

      await tester.tap(find.byType(TouchTarget));
      await tester.pump();

      expect(tapped, isTrue);
    });

    testWidgets('calls onLongPress when long pressed', (tester) async {
      var longPressed = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: TouchTarget(
              onLongPress: () => longPressed = true,
              child: const Icon(Icons.more_vert),
            ),
          ),
        ),
      );

      await tester.longPress(find.byType(TouchTarget));
      await tester.pump();

      expect(longPressed, isTrue);
    });

    testWidgets('shows tooltip when provided with callback', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: TouchTarget(
              tooltip: 'Edit item',
              onTap: () {},
              child: const Icon(Icons.edit),
            ),
          ),
        ),
      );

      expect(find.byType(Tooltip), findsOneWidget);
    });

    testWidgets('is disabled when enabled=false', (tester) async {
      var tapped = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: TouchTarget(
              onTap: () => tapped = true,
              enabled: false,
              child: const Icon(Icons.edit),
            ),
          ),
        ),
      );

      await tester.tap(find.byType(TouchTarget));
      await tester.pump();

      expect(tapped, isFalse);
    });

    testWidgets('has Semantics when semanticLabel provided', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: TouchTarget(
              semanticLabel: 'Edit item',
              onTap: () {},
              child: const Icon(Icons.edit),
            ),
          ),
        ),
      );

      expect(find.byType(Semantics), findsWidgets);
    });
  });
}
