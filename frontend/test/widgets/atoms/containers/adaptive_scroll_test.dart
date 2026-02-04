/// Tests for AdaptiveScroll atom
///
/// **BEHAVIORAL FOCUS:**
/// - Renders child content
/// - Applies platform-appropriate physics
/// - Handles scroll direction variants
/// - Respects physics/keyboard behavior overrides
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross/widgets/atoms/containers/adaptive_scroll.dart';

void main() {
  group('AdaptiveScroll', () {
    group('basic rendering', () {
      testWidgets('renders child widget', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(body: AdaptiveScroll(child: Text('Scroll Content'))),
          ),
        );

        expect(find.text('Scroll Content'), findsOneWidget);
      });

      testWidgets('wraps content in SingleChildScrollView', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(body: AdaptiveScroll(child: Text('Content'))),
          ),
        );

        expect(find.byType(SingleChildScrollView), findsOneWidget);
      });
    });

    group('scroll direction', () {
      testWidgets('vertical constructor sets vertical direction', (
        tester,
      ) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: AdaptiveScroll.vertical(child: Text('Vertical')),
            ),
          ),
        );

        final scrollView = tester.widget<SingleChildScrollView>(
          find.byType(SingleChildScrollView),
        );
        expect(scrollView.scrollDirection, Axis.vertical);
      });

      testWidgets('horizontal constructor sets horizontal direction', (
        tester,
      ) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: AdaptiveScroll.horizontal(child: Text('Horizontal')),
            ),
          ),
        );

        final scrollView = tester.widget<SingleChildScrollView>(
          find.byType(SingleChildScrollView),
        );
        expect(scrollView.scrollDirection, Axis.horizontal);
      });
    });

    group('physics override', () {
      testWidgets('uses custom physics when provided', (tester) async {
        const customPhysics = BouncingScrollPhysics();

        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: AdaptiveScroll(
                physicsOverride: customPhysics,
                child: Text('Custom Physics'),
              ),
            ),
          ),
        );

        final scrollView = tester.widget<SingleChildScrollView>(
          find.byType(SingleChildScrollView),
        );
        expect(scrollView.physics, isA<BouncingScrollPhysics>());
      });
    });

    group('padding', () {
      testWidgets('applies padding to scroll view', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: AdaptiveScroll(
                padding: EdgeInsets.all(16),
                child: Text('Padded'),
              ),
            ),
          ),
        );

        final scrollView = tester.widget<SingleChildScrollView>(
          find.byType(SingleChildScrollView),
        );
        expect(scrollView.padding, const EdgeInsets.all(16));
      });
    });

    group('scroll controller', () {
      testWidgets('uses provided scroll controller', (tester) async {
        final controller = ScrollController();

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: AdaptiveScroll(
                controller: controller,
                child: const SizedBox(height: 2000, child: Text('Tall')),
              ),
            ),
          ),
        );

        // Scroll programmatically
        controller.jumpTo(100);
        await tester.pump();

        expect(controller.offset, 100);
        controller.dispose();
      });
    });
  });

  group('AdaptiveListView', () {
    group('basic rendering', () {
      testWidgets('renders list items', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: AdaptiveListView(
                itemCount: 5,
                itemBuilder: (context, index) => Text('Item $index'),
              ),
            ),
          ),
        );

        expect(find.text('Item 0'), findsOneWidget);
        expect(find.text('Item 1'), findsOneWidget);
      });

      testWidgets('uses ListView.builder', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: AdaptiveListView(
                itemCount: 3,
                itemBuilder: (context, index) => Text('Item $index'),
              ),
            ),
          ),
        );

        expect(find.byType(ListView), findsOneWidget);
      });
    });

    group('separated list', () {
      testWidgets('uses ListView.separated when separatorBuilder provided', (
        tester,
      ) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: AdaptiveListView(
                itemCount: 3,
                itemBuilder: (context, index) => Text('Item $index'),
                separatorBuilder: (context, index) => const Divider(),
              ),
            ),
          ),
        );

        expect(find.byType(Divider), findsNWidgets(2)); // n-1 separators
      });
    });

    group('shrinkWrap', () {
      testWidgets('respects shrinkWrap property', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: Column(
                children: [
                  AdaptiveListView(
                    shrinkWrap: true,
                    itemCount: 2,
                    itemBuilder: (context, index) => Text('Item $index'),
                  ),
                ],
              ),
            ),
          ),
        );

        final listView = tester.widget<ListView>(find.byType(ListView));
        expect(listView.shrinkWrap, isTrue);
      });
    });
  });
}
