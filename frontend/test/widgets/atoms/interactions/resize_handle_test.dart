import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/atoms/interactions/resize_handle.dart';

void main() {
  group('ResizeHandle', () {
    testWidgets('renders visual indicator', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: Scaffold(body: ResizeHandle())),
      );

      expect(find.byType(Container), findsWidgets);
    });

    testWidgets('horizontal constructor creates handle', (tester) async {
      await tester.pumpWidget(
        MaterialApp(home: Scaffold(body: ResizeHandle.horizontal())),
      );

      expect(find.byType(ResizeHandle), findsOneWidget);
    });

    testWidgets('vertical constructor creates handle', (tester) async {
      await tester.pumpWidget(
        MaterialApp(home: Scaffold(body: ResizeHandle.vertical())),
      );

      expect(find.byType(ResizeHandle), findsOneWidget);
    });

    testWidgets('calls onDragUpdate during horizontal drag', (tester) async {
      double totalDelta = 0;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Center(
              child: SizedBox(
                width: 100,
                height: 100,
                child: ResizeHandle.horizontal(
                  onDragUpdate: (delta) => totalDelta += delta,
                ),
              ),
            ),
          ),
        ),
      );

      final gesture = await tester.startGesture(
        tester.getCenter(find.byType(ResizeHandle)),
      );
      await gesture.moveBy(const Offset(50, 0));
      await gesture.up();
      await tester.pump();

      expect(totalDelta, greaterThan(0));
    });

    testWidgets('calls onDragStart when drag begins', (tester) async {
      var dragStarted = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Center(
              child: SizedBox(
                width: 100,
                height: 100,
                child: ResizeHandle.horizontal(
                  onDragStart: () => dragStarted = true,
                  onDragUpdate: (_) {},
                ),
              ),
            ),
          ),
        ),
      );

      final gesture = await tester.startGesture(
        tester.getCenter(find.byType(ResizeHandle)),
      );
      await gesture.moveBy(const Offset(10, 0));
      await tester.pump();

      expect(dragStarted, isTrue);
      await gesture.up();
    });

    testWidgets('calls onDragEnd when drag finishes', (tester) async {
      var dragEnded = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Center(
              child: SizedBox(
                width: 100,
                height: 100,
                child: ResizeHandle.horizontal(
                  onDragUpdate: (_) {},
                  onDragEnd: () => dragEnded = true,
                ),
              ),
            ),
          ),
        ),
      );

      final gesture = await tester.startGesture(
        tester.getCenter(find.byType(ResizeHandle)),
      );
      await gesture.moveBy(const Offset(10, 0));
      await gesture.up();
      await tester.pump();

      expect(dragEnded, isTrue);
    });

    testWidgets('has Semantics for accessibility', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: Scaffold(body: ResizeHandle())),
      );

      expect(find.byType(Semantics), findsWidgets);
    });

    testWidgets('respects enabled=false', (tester) async {
      double totalDelta = 0;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Center(
              child: SizedBox(
                width: 100,
                height: 100,
                child: ResizeHandle.horizontal(
                  enabled: false,
                  onDragUpdate: (delta) => totalDelta += delta,
                ),
              ),
            ),
          ),
        ),
      );

      final gesture = await tester.startGesture(
        tester.getCenter(find.byType(ResizeHandle)),
      );
      await gesture.moveBy(const Offset(50, 0));
      await gesture.up();
      await tester.pump();

      expect(totalDelta, equals(0));
    });
  });
}
