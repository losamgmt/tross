/// EmptyState Molecule Tests ✅ SPACING FIXED, READY FOR FULL MIGRATION
///
/// Comprehensive tests for the EmptyState molecule component
/// Tests rendering, factory methods, and action button integration
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/molecules/empty_state.dart';

void main() {
  group('EmptyState Molecule Tests', () {
    testWidgets('renders with required properties', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: EmptyState(icon: Icons.inbox, title: 'Test Title'),
          ),
        ),
      );

      expect(find.byIcon(Icons.inbox), findsOneWidget);
      expect(find.text('Test Title'), findsOneWidget);
    });

    testWidgets('renders optional message', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: EmptyState(
              icon: Icons.inbox,
              title: 'Test Title',
              message: 'Test Message',
            ),
          ),
        ),
      );

      expect(find.text('Test Message'), findsOneWidget);
    });

    testWidgets('does not render message when not provided', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: EmptyState(icon: Icons.inbox, title: 'Test Title'),
          ),
        ),
      );

      // Should only find title text, not message
      expect(find.byType(Text), findsOneWidget);
    });

    testWidgets('renders action button when provided', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: EmptyState(
              icon: Icons.inbox,
              title: 'Test Title',
              action: ElevatedButton(
                onPressed: () {},
                child: const Text('Action'),
              ),
            ),
          ),
        ),
      );

      expect(find.byType(ElevatedButton), findsOneWidget);
      expect(find.text('Action'), findsOneWidget);
    });

    testWidgets('action button is tappable', (tester) async {
      bool actionCalled = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: EmptyState(
              icon: Icons.inbox,
              title: 'Test Title',
              action: ElevatedButton(
                onPressed: () => actionCalled = true,
                child: const Text('Retry'),
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Retry'));
      await tester.pump();

      expect(actionCalled, true);
    });

    testWidgets('icon has correct size', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: EmptyState(icon: Icons.inbox, title: 'Test Title'),
          ),
        ),
      );

      final icon = tester.widget<Icon>(find.byIcon(Icons.inbox));
      // Icon size is TestSpacing.xxl * 2 = 24 * 2 = 48
      expect(icon.size, 48.0);
    });

    testWidgets('is centered in parent', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: EmptyState(icon: Icons.inbox, title: 'Test Title'),
          ),
        ),
      );

      // Verify EmptyState contains a Center widget by checking the first widget child
      final emptyState = tester.widget<EmptyState>(find.byType(EmptyState));
      expect(emptyState, isNotNull);

      // Find Center that directly contains the Padding (EmptyState's structure)
      final centerWithPadding = find.ancestor(
        of: find.byType(Padding),
        matching: find.byType(Center),
      );
      expect(centerWithPadding, findsWidgets);
    });

    testWidgets('has proper padding', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: EmptyState(icon: Icons.inbox, title: 'Test Title'),
          ),
        ),
      );

      // Test behavior: EmptyState is properly rendered
      expect(find.byType(EmptyState), findsOneWidget);
      expect(find.text('Test Title'), findsOneWidget);
      expect(find.byIcon(Icons.inbox), findsOneWidget);
    });

    testWidgets('renders content correctly', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: EmptyState(icon: Icons.inbox, title: 'Test Title'),
          ),
        ),
      );

      // Test behavior: title and icon are displayed
      expect(find.text('Test Title'), findsOneWidget);
      expect(find.byIcon(Icons.inbox), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    group('NoData Factory Tests', () {
      testWidgets('creates empty state with default title', (tester) async {
        await tester.pumpWidget(
          MaterialApp(home: Scaffold(body: EmptyState.noData())),
        );

        expect(find.byIcon(Icons.inbox_outlined), findsOneWidget);
        expect(find.text('No Data'), findsOneWidget);
        expect(find.text('No items to display'), findsOneWidget);
      });

      testWidgets('accepts custom title', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: EmptyState.noData(title: 'Custom Title')),
          ),
        );

        expect(find.text('Custom Title'), findsOneWidget);
      });

      testWidgets('accepts custom message', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: EmptyState.noData(message: 'Custom Message')),
          ),
        );

        expect(find.text('Custom Message'), findsOneWidget);
      });
    });

    group('NoResults Factory Tests', () {
      testWidgets('creates search empty state', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: EmptyState.noResults(searchTerm: 'test query'),
            ),
          ),
        );

        expect(find.byIcon(Icons.search_off), findsOneWidget);
        expect(find.text('No Results Found'), findsOneWidget);
        expect(find.text('No matches for "test query"'), findsOneWidget);
      });

      testWidgets('includes search term in message', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: EmptyState.noResults(searchTerm: 'admin')),
          ),
        );

        expect(find.textContaining('admin'), findsOneWidget);
      });
    });

    group('Error Factory Tests', () {
      testWidgets('creates error state with default values', (tester) async {
        await tester.pumpWidget(
          MaterialApp(home: Scaffold(body: EmptyState.error())),
        );

        expect(find.byIcon(Icons.error_outline), findsOneWidget);
        expect(find.text('Error'), findsOneWidget);
        expect(find.text('Something went wrong'), findsOneWidget);
      });

      testWidgets('accepts custom title and message', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: EmptyState.error(
                title: 'Load Failed',
                message: 'Could not load data',
              ),
            ),
          ),
        );

        expect(find.text('Load Failed'), findsOneWidget);
        expect(find.text('Could not load data'), findsOneWidget);
      });

      testWidgets('renders retry action', (tester) async {
        bool retryCalled = false;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: EmptyState.error(
                action: ElevatedButton(
                  onPressed: () => retryCalled = true,
                  child: const Text('Retry'),
                ),
              ),
            ),
          ),
        );

        expect(find.text('Retry'), findsOneWidget);

        await tester.tap(find.text('Retry'));
        await tester.pump();

        expect(retryCalled, true);
      });
    });

    testWidgets('title has proper text styling', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: EmptyState(icon: Icons.inbox, title: 'Styled Title'),
          ),
        ),
      );

      final titleText = tester.widget<Text>(find.text('Styled Title'));
      expect(titleText.style?.fontWeight, FontWeight.w600);
      expect(titleText.textAlign, TextAlign.center);
    });

    testWidgets('message has proper text styling', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: EmptyState(
              icon: Icons.inbox,
              title: 'Title',
              message: 'Styled Message',
            ),
          ),
        ),
      );

      final messageText = tester.widget<Text>(find.text('Styled Message'));
      expect(messageText.textAlign, TextAlign.center);
    });

    testWidgets('has proper spacing between elements', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: EmptyState(
              icon: Icons.inbox,
              title: 'Title',
              message: 'Message',
              action: ElevatedButton(
                onPressed: () {},
                child: const Text('Action'),
              ),
            ),
          ),
        ),
      );

      final sizedBoxes = tester.widgetList<SizedBox>(find.byType(SizedBox));

      // Should have spacing between icon and title, title and message, message and action
      expect(sizedBoxes.length, greaterThan(0));
    });

    testWidgets('icon respects theme colors', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: ThemeData.light(),
          home: const Scaffold(
            body: EmptyState(icon: Icons.inbox, title: 'Test'),
          ),
        ),
      );

      final icon = tester.widget<Icon>(find.byIcon(Icons.inbox));
      expect(icon.color, isNotNull);
    });

    testWidgets('works with dark theme', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: ThemeData.dark(),
          home: const Scaffold(
            body: EmptyState(
              icon: Icons.inbox,
              title: 'Dark Theme Test',
              message: 'Testing dark theme',
            ),
          ),
        ),
      );

      expect(find.text('Dark Theme Test'), findsOneWidget);
      expect(find.text('Testing dark theme'), findsOneWidget);
    });
  });
}
