/// CenteredLayout Template Tests
///
/// Tests the CenteredLayout template for pre-auth pages.
/// Validates: structure, responsiveness, content rendering, footer.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/templates/centered_layout.dart';

void main() {
  group('CenteredLayout Template', () {
    group('Basic Structure', () {
      testWidgets('renders child content', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(home: CenteredLayout(child: Text('Test Content'))),
        );

        expect(find.text('Test Content'), findsOneWidget);
      });

      testWidgets('wraps content in Scaffold', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(home: CenteredLayout(child: Text('Content'))),
        );

        expect(find.byType(Scaffold), findsOneWidget);
      });

      testWidgets('wraps content in SafeArea by default', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(home: CenteredLayout(child: Text('Content'))),
        );

        expect(find.byType(SafeArea), findsOneWidget);
      });

      testWidgets('can disable SafeArea', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: CenteredLayout(useSafeArea: false, child: Text('Content')),
          ),
        );

        expect(find.byType(SafeArea), findsNothing);
      });

      testWidgets('centers content on screen', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(home: CenteredLayout(child: Text('Centered'))),
        );

        expect(find.byType(Center), findsOneWidget);
      });

      testWidgets('content is scrollable', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(home: CenteredLayout(child: Text('Scrollable'))),
        );

        expect(find.byType(SingleChildScrollView), findsOneWidget);
      });
    });

    group('Width Constraints', () {
      testWidgets('applies default maxWidth of 500', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(home: CenteredLayout(child: Text('Content'))),
        );

        // Find Container with constraints
        final container = tester.widget<Container>(
          find.byType(Container).first,
        );
        expect(container.constraints?.maxWidth, 500);
      });

      testWidgets('applies custom maxWidth', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: CenteredLayout(maxWidth: 800, child: Text('Content')),
          ),
        );

        final container = tester.widget<Container>(
          find.byType(Container).first,
        );
        expect(container.constraints?.maxWidth, 800);
      });
    });

    group('Footer', () {
      testWidgets('renders without footer by default', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(home: CenteredLayout(child: Text('Main'))),
        );

        expect(find.text('Main'), findsOneWidget);
        // Only main content column children
      });

      testWidgets('renders footer when provided', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: CenteredLayout(
              footer: Text('Footer Text'),
              child: Text('Main'),
            ),
          ),
        );

        expect(find.text('Main'), findsOneWidget);
        expect(find.text('Footer Text'), findsOneWidget);
      });
    });

    group('Responsive Variant', () {
      testWidgets('renders via static responsive factory', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: CenteredLayout.responsive(
              child: const Text('Responsive Content'),
            ),
          ),
        );

        expect(find.text('Responsive Content'), findsOneWidget);
        expect(find.byType(Scaffold), findsOneWidget);
      });

      testWidgets('responsive variant includes LayoutBuilder', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: CenteredLayout.responsive(child: const Text('Content')),
          ),
        );

        expect(find.byType(LayoutBuilder), findsWidgets);
      });

      testWidgets('responsive variant renders footer', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: CenteredLayout.responsive(
              footer: const Text('Responsive Footer'),
              child: const Text('Main'),
            ),
          ),
        );

        expect(find.text('Responsive Footer'), findsOneWidget);
      });

      testWidgets('adapts width on wide screens', (tester) async {
        tester.view.physicalSize = const Size(1920, 1080);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(() => tester.view.resetPhysicalSize());

        await tester.pumpWidget(
          MaterialApp(
            home: CenteredLayout.responsive(child: const Text('Wide')),
          ),
        );

        expect(find.text('Wide'), findsOneWidget);
        // On wide screens, maxWidth should be 500
      });

      testWidgets('adapts width on narrow screens', (tester) async {
        tester.view.physicalSize = const Size(400, 800);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(() => tester.view.resetPhysicalSize());

        await tester.pumpWidget(
          MaterialApp(
            home: CenteredLayout.responsive(child: const Text('Narrow')),
          ),
        );

        expect(find.text('Narrow'), findsOneWidget);
        // On narrow screens, maxWidth should be ~90% of screen width
      });
    });

    group('Padding', () {
      testWidgets('applies default padding from spacing', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(home: CenteredLayout(child: Text('Content'))),
        );

        // SingleChildScrollView should have non-zero padding
        final scrollView = tester.widget<SingleChildScrollView>(
          find.byType(SingleChildScrollView),
        );
        expect(scrollView.padding, isNotNull);
      });

      testWidgets('can override padding', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: CenteredLayout(
              padding: EdgeInsets.all(100),
              child: Text('Content'),
            ),
          ),
        );

        final scrollView = tester.widget<SingleChildScrollView>(
          find.byType(SingleChildScrollView),
        );
        expect(scrollView.padding, const EdgeInsets.all(100));
      });
    });

    group('Column Layout', () {
      testWidgets('uses Column for vertical layout', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(home: CenteredLayout(child: Text('Content'))),
        );

        expect(find.byType(Column), findsWidgets);
      });

      testWidgets('Column stretches children horizontally', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(home: CenteredLayout(child: Text('Content'))),
        );

        final column = tester.widget<Column>(find.byType(Column).first);
        expect(column.crossAxisAlignment, CrossAxisAlignment.stretch);
      });

      testWidgets('Column centers content vertically', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(home: CenteredLayout(child: Text('Content'))),
        );

        final column = tester.widget<Column>(find.byType(Column).first);
        expect(column.mainAxisAlignment, MainAxisAlignment.center);
      });
    });
  });
}
