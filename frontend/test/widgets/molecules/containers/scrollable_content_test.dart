/// ScrollableContent Molecule Tests
///
/// Tests the semantic scrollable container wrapper molecule.
/// Zero logic - just wraps SingleChildScrollView with semantic API.
library;

import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/molecules/containers/scrollable_content.dart';

void main() {
  group('ScrollableContent Molecule', () {
    // =========================================================================
    // Basic Rendering
    // =========================================================================
    group('Basic Rendering', () {
      testWidgets('renders child widget', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(body: ScrollableContent(child: Text('Scroll me'))),
          ),
        );

        expect(find.text('Scroll me'), findsOneWidget);
      });

      testWidgets('wraps child in SingleChildScrollView', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(body: ScrollableContent(child: Text('Content'))),
          ),
        );

        expect(find.byType(SingleChildScrollView), findsOneWidget);
      });

      testWidgets('defaults to vertical scrolling', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(body: ScrollableContent(child: Text('Vertical'))),
          ),
        );

        final scrollView = tester.widget<SingleChildScrollView>(
          find.byType(SingleChildScrollView),
        );
        expect(scrollView.scrollDirection, Axis.vertical);
      });
    });

    // =========================================================================
    // Scroll Direction
    // =========================================================================
    group('Scroll Direction', () {
      testWidgets('supports horizontal scrolling', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: ScrollableContent(
                scrollDirection: Axis.horizontal,
                child: Text('Horizontal'),
              ),
            ),
          ),
        );

        final scrollView = tester.widget<SingleChildScrollView>(
          find.byType(SingleChildScrollView),
        );
        expect(scrollView.scrollDirection, Axis.horizontal);
      });
    });

    // =========================================================================
    // Named Constructors
    // =========================================================================
    group('Named Constructors', () {
      testWidgets('vertical() creates vertical scroll', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: ScrollableContent.vertical(child: Text('Vertical')),
            ),
          ),
        );

        final scrollView = tester.widget<SingleChildScrollView>(
          find.byType(SingleChildScrollView),
        );
        expect(scrollView.scrollDirection, Axis.vertical);
        expect(scrollView.primary, isTrue);
      });

      testWidgets('horizontal() creates horizontal scroll', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: ScrollableContent.horizontal(child: Text('Horizontal')),
            ),
          ),
        );

        final scrollView = tester.widget<SingleChildScrollView>(
          find.byType(SingleChildScrollView),
        );
        expect(scrollView.scrollDirection, Axis.horizontal);
        expect(scrollView.primary, isFalse);
      });
    });

    // =========================================================================
    // Padding
    // =========================================================================
    group('Padding', () {
      testWidgets('applies padding to scroll view', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: ScrollableContent(
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

      testWidgets('no padding by default', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(body: ScrollableContent(child: Text('No padding'))),
          ),
        );

        final scrollView = tester.widget<SingleChildScrollView>(
          find.byType(SingleChildScrollView),
        );
        expect(scrollView.padding, isNull);
      });
    });

    // =========================================================================
    // Reverse
    // =========================================================================
    group('Reverse', () {
      testWidgets('supports reverse scrolling', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: ScrollableContent(reverse: true, child: Text('Reversed')),
            ),
          ),
        );

        final scrollView = tester.widget<SingleChildScrollView>(
          find.byType(SingleChildScrollView),
        );
        expect(scrollView.reverse, isTrue);
      });

      testWidgets('defaults to non-reversed', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(body: ScrollableContent(child: Text('Normal'))),
          ),
        );

        final scrollView = tester.widget<SingleChildScrollView>(
          find.byType(SingleChildScrollView),
        );
        expect(scrollView.reverse, isFalse);
      });
    });

    // =========================================================================
    // Physics
    // =========================================================================
    group('Physics', () {
      testWidgets('applies custom physics', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: ScrollableContent(
                physics: BouncingScrollPhysics(),
                child: Text('Bouncy'),
              ),
            ),
          ),
        );

        final scrollView = tester.widget<SingleChildScrollView>(
          find.byType(SingleChildScrollView),
        );
        expect(scrollView.physics, isA<BouncingScrollPhysics>());
      });

      testWidgets('applies NeverScrollableScrollPhysics', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: ScrollableContent(
                physics: NeverScrollableScrollPhysics(),
                child: Text('No scroll'),
              ),
            ),
          ),
        );

        final scrollView = tester.widget<SingleChildScrollView>(
          find.byType(SingleChildScrollView),
        );
        expect(scrollView.physics, isA<NeverScrollableScrollPhysics>());
      });
    });

    // =========================================================================
    // Controller
    // =========================================================================
    group('Controller', () {
      testWidgets('accepts scroll controller', (tester) async {
        final controller = ScrollController();
        addTearDown(controller.dispose);

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: ScrollableContent(
                controller: controller,
                primary: false, // Required when controller is provided
                child: const SizedBox(height: 2000, child: Text('Tall')),
              ),
            ),
          ),
        );

        final scrollView = tester.widget<SingleChildScrollView>(
          find.byType(SingleChildScrollView),
        );
        expect(scrollView.controller, controller);
      });
    });

    // =========================================================================
    // Drag Behavior
    // =========================================================================
    group('Drag Behavior', () {
      testWidgets('defaults to DragStartBehavior.start', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(body: ScrollableContent(child: Text('Drag'))),
          ),
        );

        final scrollView = tester.widget<SingleChildScrollView>(
          find.byType(SingleChildScrollView),
        );
        expect(scrollView.dragStartBehavior, DragStartBehavior.start);
      });

      testWidgets('supports DragStartBehavior.down', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: ScrollableContent(
                dragStartBehavior: DragStartBehavior.down,
                child: Text('Drag down'),
              ),
            ),
          ),
        );

        final scrollView = tester.widget<SingleChildScrollView>(
          find.byType(SingleChildScrollView),
        );
        expect(scrollView.dragStartBehavior, DragStartBehavior.down);
      });
    });

    // =========================================================================
    // Clip Behavior
    // =========================================================================
    group('Clip Behavior', () {
      testWidgets('defaults to Clip.hardEdge', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(body: ScrollableContent(child: Text('Clip'))),
          ),
        );

        final scrollView = tester.widget<SingleChildScrollView>(
          find.byType(SingleChildScrollView),
        );
        expect(scrollView.clipBehavior, Clip.hardEdge);
      });

      testWidgets('supports Clip.none', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: ScrollableContent(
                clipBehavior: Clip.none,
                child: Text('No clip'),
              ),
            ),
          ),
        );

        final scrollView = tester.widget<SingleChildScrollView>(
          find.byType(SingleChildScrollView),
        );
        expect(scrollView.clipBehavior, Clip.none);
      });
    });

    // =========================================================================
    // Keyboard Dismiss Behavior
    // =========================================================================
    group('Keyboard Dismiss Behavior', () {
      testWidgets('defaults to manual', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(body: ScrollableContent(child: Text('Keyboard'))),
          ),
        );

        final scrollView = tester.widget<SingleChildScrollView>(
          find.byType(SingleChildScrollView),
        );
        expect(
          scrollView.keyboardDismissBehavior,
          ScrollViewKeyboardDismissBehavior.manual,
        );
      });

      testWidgets('supports onDrag behavior', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: ScrollableContent(
                keyboardDismissBehavior:
                    ScrollViewKeyboardDismissBehavior.onDrag,
                child: Text('Dismiss on drag'),
              ),
            ),
          ),
        );

        final scrollView = tester.widget<SingleChildScrollView>(
          find.byType(SingleChildScrollView),
        );
        expect(
          scrollView.keyboardDismissBehavior,
          ScrollViewKeyboardDismissBehavior.onDrag,
        );
      });
    });

    // =========================================================================
    // Restoration ID
    // =========================================================================
    group('Restoration ID', () {
      testWidgets('accepts restoration ID', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: ScrollableContent(
                restorationId: 'scroll_position',
                child: Text('Restorable'),
              ),
            ),
          ),
        );

        final scrollView = tester.widget<SingleChildScrollView>(
          find.byType(SingleChildScrollView),
        );
        expect(scrollView.restorationId, 'scroll_position');
      });
    });
  });
}
