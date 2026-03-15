import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross/widgets/atoms/interactions/collapse_controller.dart';

void main() {
  group('CollapseController', () {
    testWidgets('renders child from builder', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CollapseController(
              builder: (context, isExpanded, toggle, animation) =>
                  const Text('Test Content'),
            ),
          ),
        ),
      );

      expect(find.text('Test Content'), findsOneWidget);
    });

    testWidgets('starts expanded by default', (tester) async {
      bool? capturedExpanded;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CollapseController(
              builder: (context, isExpanded, toggle, animation) {
                capturedExpanded = isExpanded;
                return Text(isExpanded ? 'Expanded' : 'Collapsed');
              },
            ),
          ),
        ),
      );

      expect(capturedExpanded, isTrue);
      expect(find.text('Expanded'), findsOneWidget);
    });

    testWidgets('starts collapsed when initiallyExpanded is false', (
      tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CollapseController(
              initiallyExpanded: false,
              builder: (context, isExpanded, toggle, animation) =>
                  Text(isExpanded ? 'Expanded' : 'Collapsed'),
            ),
          ),
        ),
      );

      expect(find.text('Collapsed'), findsOneWidget);
    });

    testWidgets('toggle() changes state', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CollapseController(
              builder: (context, isExpanded, toggle, animation) {
                return GestureDetector(
                  key: const Key('toggle-button'),
                  onTap: toggle,
                  child: Text(isExpanded ? 'Expanded' : 'Collapsed'),
                );
              },
            ),
          ),
        ),
      );

      expect(find.text('Expanded'), findsOneWidget);

      // Tap to collapse
      await tester.tap(find.byKey(const Key('toggle-button')));
      await tester.pump();

      expect(find.text('Collapsed'), findsOneWidget);

      // Tap to expand again
      await tester.tap(find.byKey(const Key('toggle-button')));
      await tester.pump();

      expect(find.text('Expanded'), findsOneWidget);
    });

    testWidgets('animation value changes during transition', (tester) async {
      List<double> animationValues = [];

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CollapseController(
              duration: const Duration(milliseconds: 200),
              builder: (context, isExpanded, toggle, animation) {
                animationValues.add(animation.value);
                return GestureDetector(
                  key: const Key('toggle-button'),
                  onTap: toggle,
                  child: Text('Animation: ${animation.value}'),
                );
              },
            ),
          ),
        ),
      );

      // Initial: expanded = 1.0
      expect(animationValues.last, equals(1.0));

      // Collapse
      animationValues.clear();
      await tester.tap(find.byKey(const Key('toggle-button')));
      await tester.pumpAndSettle();

      // Final: collapsed = 0.0
      expect(animationValues.last, equals(0.0));
    });

    testWidgets('onExpansionChanged callback fires on toggle', (tester) async {
      final expansionChanges = <bool>[];

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CollapseController(
              onExpansionChanged: (expanded) => expansionChanges.add(expanded),
              builder: (context, isExpanded, toggle, animation) =>
                  GestureDetector(
                    key: const Key('toggle-button'),
                    onTap: toggle,
                    child: const Text('Toggle'),
                  ),
            ),
          ),
        ),
      );

      expect(expansionChanges, isEmpty);

      await tester.tap(find.byKey(const Key('toggle-button')));
      await tester.pump();

      expect(expansionChanges, equals([false])); // Collapsed

      await tester.tap(find.byKey(const Key('toggle-button')));
      await tester.pump();

      expect(expansionChanges, equals([false, true])); // Expanded again
    });

    testWidgets('programmatic control via GlobalKey', (tester) async {
      final key = GlobalKey<CollapseControllerState>();

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CollapseController(
              key: key,
              builder: (context, isExpanded, toggle, animation) =>
                  Text(isExpanded ? 'Expanded' : 'Collapsed'),
            ),
          ),
        ),
      );

      expect(find.text('Expanded'), findsOneWidget);
      expect(key.currentState!.isExpanded, isTrue);

      // Programmatic collapse
      key.currentState!.collapse();
      await tester.pump();

      expect(find.text('Collapsed'), findsOneWidget);
      expect(key.currentState!.isExpanded, isFalse);

      // Programmatic expand
      key.currentState!.expand();
      await tester.pump();

      expect(find.text('Expanded'), findsOneWidget);

      // setExpanded
      key.currentState!.setExpanded(false);
      await tester.pump();

      expect(find.text('Collapsed'), findsOneWidget);
    });

    testWidgets('expand() does nothing when already expanded', (tester) async {
      final key = GlobalKey<CollapseControllerState>();
      var toggleCount = 0;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CollapseController(
              key: key,
              onExpansionChanged: (_) => toggleCount++,
              builder: (context, isExpanded, toggle, animation) =>
                  Text(isExpanded ? 'Expanded' : 'Collapsed'),
            ),
          ),
        ),
      );

      expect(toggleCount, equals(0));

      // expand() when already expanded should not toggle
      key.currentState!.expand();
      await tester.pump();

      expect(toggleCount, equals(0));
      expect(find.text('Expanded'), findsOneWidget);
    });

    testWidgets('collapse() does nothing when already collapsed', (
      tester,
    ) async {
      final key = GlobalKey<CollapseControllerState>();
      var toggleCount = 0;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CollapseController(
              key: key,
              initiallyExpanded: false,
              onExpansionChanged: (_) => toggleCount++,
              builder: (context, isExpanded, toggle, animation) =>
                  Text(isExpanded ? 'Expanded' : 'Collapsed'),
            ),
          ),
        ),
      );

      expect(toggleCount, equals(0));

      // collapse() when already collapsed should not toggle
      key.currentState!.collapse();
      await tester.pump();

      expect(toggleCount, equals(0));
      expect(find.text('Collapsed'), findsOneWidget);
    });
  });
}
