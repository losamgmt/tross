import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross/widgets/atoms/interactions/collapse_toggle_icon.dart';

void main() {
  group('CollapseToggleIcon', () {
    testWidgets('renders expand_more icon', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: Scaffold(body: CollapseToggleIcon())),
      );

      expect(find.byIcon(Icons.expand_more), findsOneWidget);
    });

    testWidgets('calls onTap when tapped', (tester) async {
      var tapped = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(body: CollapseToggleIcon(onTap: () => tapped = true)),
        ),
      );

      await tester.tap(find.byType(CollapseToggleIcon));
      await tester.pump();

      expect(tapped, isTrue);
    });

    testWidgets('renders as plain icon without onTap', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(body: CollapseToggleIcon(isExpanded: true)),
        ),
      );

      // Should NOT be wrapped in IconButton when no onTap
      expect(find.byType(IconButton), findsNothing);
      expect(find.byIcon(Icons.expand_more), findsOneWidget);
    });

    testWidgets('renders as IconButton with onTap', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(body: CollapseToggleIcon(onTap: () {})),
        ),
      );

      expect(find.byType(IconButton), findsOneWidget);
    });

    testWidgets('respects custom size', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: Scaffold(body: CollapseToggleIcon(size: 32.0))),
      );

      final icon = tester.widget<Icon>(find.byType(Icon));
      expect(icon.size, equals(32.0));
    });

    testWidgets('respects custom color', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(body: CollapseToggleIcon(color: Colors.red)),
        ),
      );

      final icon = tester.widget<Icon>(find.byType(Icon));
      expect(icon.color, equals(Colors.red));
    });

    testWidgets('uses external animation when provided', (tester) async {
      final controller = AnimationController(
        vsync: const TestVSync(),
        duration: const Duration(milliseconds: 200),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(body: CollapseToggleIcon(animation: controller)),
        ),
      );

      // Should render AnimatedBuilder for external animation
      expect(find.byType(AnimatedBuilder), findsWidgets);

      controller.dispose();
    });

    testWidgets('semantic label defaults based on isExpanded', (tester) async {
      // Expanded state
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(body: CollapseToggleIcon(isExpanded: true)),
        ),
      );

      // Find the Semantics widget that wraps CollapseToggleIcon specifically
      final expandedSemantics = tester.widget<Semantics>(
        find
            .descendant(
              of: find.byType(CollapseToggleIcon),
              matching: find.byType(Semantics),
            )
            .first,
      );
      expect(expandedSemantics.properties.label, equals('Collapse'));

      // Collapsed state
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(body: CollapseToggleIcon(isExpanded: false)),
        ),
      );

      final collapsedSemantics = tester.widget<Semantics>(
        find
            .descendant(
              of: find.byType(CollapseToggleIcon),
              matching: find.byType(Semantics),
            )
            .first,
      );
      expect(collapsedSemantics.properties.label, equals('Expand'));
    });

    testWidgets('uses custom semantic label when provided', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: CollapseToggleIcon(semanticLabel: 'Toggle filters'),
          ),
        ),
      );

      final semantics = tester.widget<Semantics>(
        find
            .descendant(
              of: find.byType(CollapseToggleIcon),
              matching: find.byType(Semantics),
            )
            .first,
      );
      expect(semantics.properties.label, equals('Toggle filters'));
    });

    testWidgets('shows tooltip on IconButton', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CollapseToggleIcon(onTap: () {}, isExpanded: true),
          ),
        ),
      );

      final iconButton = tester.widget<IconButton>(find.byType(IconButton));
      expect(iconButton.tooltip, equals('Collapse'));
    });

    testWidgets('integrates with CollapseController animation', (tester) async {
      // This test verifies the icon works with a real AnimationController
      // simulating how CollapseController provides its animation
      final controller = AnimationController(
        vsync: const TestVSync(),
        duration: const Duration(milliseconds: 200),
        value: 1.0, // Start expanded
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CollapseToggleIcon(
              animation: controller,
              onTap: () => controller.reverse(),
            ),
          ),
        ),
      );

      // Tap to trigger collapse
      await tester.tap(find.byType(CollapseToggleIcon));
      await tester.pumpAndSettle();

      // Animation should have completed to 0.0
      expect(controller.value, equals(0.0));

      controller.dispose();
    });
  });
}
