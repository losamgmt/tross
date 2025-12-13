/// Tests for UnderConstructionDisplay organism
///
/// **BEHAVIORAL FOCUS:**
/// - Renders default and custom content correctly
/// - Shows/hides animation based on prop
/// - Displays icon, title, message, and progress indicator
/// - Respects constraints and centering
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/organisms/under_construction_display.dart';

import '../../helpers/test_helpers.dart';

void main() {
  group('UnderConstructionDisplay', () {
    group('default rendering', () {
      testWidgets('shows default title when none provided', (tester) async {
        await tester.pumpTestWidget(const UnderConstructionDisplay());

        expect(find.text('Coming Soon!'), findsOneWidget);
      });

      testWidgets('shows default message when none provided', (tester) async {
        await tester.pumpTestWidget(const UnderConstructionDisplay());

        expect(
          find.textContaining("We're working hard to bring you"),
          findsOneWidget,
        );
      });

      testWidgets('shows default construction icon', (tester) async {
        await tester.pumpTestWidget(const UnderConstructionDisplay());

        expect(find.byIcon(Icons.construction), findsOneWidget);
      });

      testWidgets('shows progress indicator', (tester) async {
        await tester.pumpTestWidget(const UnderConstructionDisplay());

        expect(find.byType(LinearProgressIndicator), findsOneWidget);
      });
    });

    group('custom content', () {
      testWidgets('shows custom title when provided', (tester) async {
        await tester.pumpTestWidget(
          const UnderConstructionDisplay(title: 'Feature In Progress'),
        );

        expect(find.text('Feature In Progress'), findsOneWidget);
        expect(find.text('Coming Soon!'), findsNothing);
      });

      testWidgets('shows custom message when provided', (tester) async {
        await tester.pumpTestWidget(
          const UnderConstructionDisplay(message: 'Custom message here'),
        );

        expect(find.text('Custom message here'), findsOneWidget);
      });

      testWidgets('shows custom icon when provided', (tester) async {
        await tester.pumpTestWidget(
          const UnderConstructionDisplay(icon: Icons.build),
        );

        expect(find.byIcon(Icons.build), findsOneWidget);
        expect(find.byIcon(Icons.construction), findsNothing);
      });

      testWidgets('renders all custom props together', (tester) async {
        await tester.pumpTestWidget(
          const UnderConstructionDisplay(
            title: 'Analytics Dashboard',
            message: 'Advanced analytics coming Q2 2025',
            icon: Icons.analytics,
          ),
        );

        expect(find.text('Analytics Dashboard'), findsOneWidget);
        expect(find.text('Advanced analytics coming Q2 2025'), findsOneWidget);
        expect(find.byIcon(Icons.analytics), findsOneWidget);
      });
    });

    group('animation behavior', () {
      testWidgets('shows animation by default', (tester) async {
        await tester.pumpTestWidget(const UnderConstructionDisplay());

        // Animation uses TweenAnimationBuilder
        expect(find.byType(TweenAnimationBuilder<double>), findsOneWidget);
      });

      testWidgets('hides animation when showAnimation is false', (
        tester,
      ) async {
        await tester.pumpTestWidget(
          const UnderConstructionDisplay(showAnimation: false),
        );

        // No TweenAnimationBuilder when animation disabled
        expect(find.byType(TweenAnimationBuilder<double>), findsNothing);

        // Icon container still renders
        expect(find.byIcon(Icons.construction), findsOneWidget);
      });

      testWidgets('animation completes over 800ms', (tester) async {
        await tester.pumpTestWidget(const UnderConstructionDisplay());

        // Pump through the animation duration
        await tester.pump(const Duration(milliseconds: 400));
        await tester.pump(const Duration(milliseconds: 400));

        // Widget should still be visible after animation
        expect(find.text('Coming Soon!'), findsOneWidget);
      });
    });

    group('layout and structure', () {
      testWidgets('wraps content in Center widgets', (tester) async {
        await tester.pumpTestWidget(const UnderConstructionDisplay());

        // Multiple Center widgets may exist due to test harness
        expect(find.byType(Center), findsWidgets);
      });

      testWidgets('has scrollable content', (tester) async {
        await tester.pumpTestWidget(const UnderConstructionDisplay());

        expect(find.byType(SingleChildScrollView), findsOneWidget);
      });

      testWidgets('constrains max width to 600px', (tester) async {
        await tester.pumpTestWidget(const UnderConstructionDisplay());

        // Find all ConstrainedBox widgets and check one has maxWidth 600
        final constrainedBoxes = tester
            .widgetList<ConstrainedBox>(find.byType(ConstrainedBox))
            .where((c) => c.constraints.maxWidth == 600);

        expect(constrainedBoxes, isNotEmpty);
      });

      testWidgets('uses Column for vertical layout', (tester) async {
        await tester.pumpTestWidget(const UnderConstructionDisplay());

        expect(find.byType(Column), findsOneWidget);
      });

      testWidgets('icon wrapped in circular container', (tester) async {
        await tester.pumpTestWidget(const UnderConstructionDisplay());

        // Find container with circle shape
        final containers = tester
            .widgetList<Container>(find.byType(Container))
            .where(
              (c) =>
                  c.decoration is BoxDecoration &&
                  (c.decoration as BoxDecoration).shape == BoxShape.circle,
            );

        expect(containers, isNotEmpty);
      });

      testWidgets('progress indicator has fixed 200px width', (tester) async {
        await tester.pumpTestWidget(const UnderConstructionDisplay());

        final sizedBoxes = tester
            .widgetList<SizedBox>(find.byType(SizedBox))
            .where((s) => s.width == 200);

        expect(sizedBoxes, isNotEmpty);
      });
    });

    group('text styling', () {
      testWidgets('title uses headline medium style', (tester) async {
        await tester.pumpTestWidget(const UnderConstructionDisplay());

        final titleText = tester.widget<Text>(find.text('Coming Soon!'));
        expect(titleText.textAlign, TextAlign.center);
        expect(titleText.style?.fontWeight, FontWeight.bold);
      });

      testWidgets('message is center-aligned', (tester) async {
        await tester.pumpTestWidget(const UnderConstructionDisplay());

        final messageText = tester.widget<Text>(
          find.textContaining("We're working hard"),
        );
        expect(messageText.textAlign, TextAlign.center);
      });
    });

    group('accessibility', () {
      testWidgets('all text is readable', (tester) async {
        await tester.pumpTestWidget(
          const UnderConstructionDisplay(
            title: 'Test Title',
            message: 'Test message content',
          ),
        );

        expect(find.text('Test Title'), findsOneWidget);
        expect(find.text('Test message content'), findsOneWidget);
      });

      testWidgets('icon is visible and identifiable', (tester) async {
        await tester.pumpTestWidget(const UnderConstructionDisplay());

        final icon = tester.widget<Icon>(find.byIcon(Icons.construction));
        expect(icon.size, isNotNull);
        expect(icon.color, isNotNull);
      });
    });
  });
}
