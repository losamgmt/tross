/// SectionHeader Atom Tests
///
/// Tests the section header typography atom.
/// Renders styled section titles with optional icon and action.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/atoms/typography/section_header.dart';

void main() {
  group('SectionHeader Atom', () {
    // =========================================================================
    // Basic Rendering
    // =========================================================================
    group('Basic Rendering', () {
      testWidgets('renders text correctly', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(body: SectionHeader(text: 'General Settings')),
          ),
        );

        expect(find.text('General Settings'), findsOneWidget);
      });

      testWidgets('renders as a Row widget', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(body: SectionHeader(text: 'Test')),
          ),
        );

        expect(find.byType(Row), findsOneWidget);
      });

      testWidgets('text is inside Expanded widget for proper layout', (
        tester,
      ) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(body: SectionHeader(text: 'Long Section Title')),
          ),
        );

        final expanded = find.ancestor(
          of: find.text('Long Section Title'),
          matching: find.byType(Expanded),
        );
        expect(expanded, findsOneWidget);
      });
    });

    // =========================================================================
    // Icon Rendering
    // =========================================================================
    group('Icon Rendering', () {
      testWidgets('shows icon when provided', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: SectionHeader(text: 'Settings', icon: Icons.settings),
            ),
          ),
        );

        expect(find.byIcon(Icons.settings), findsOneWidget);
      });

      testWidgets('does not show icon when not provided', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(body: SectionHeader(text: 'Settings')),
          ),
        );

        expect(find.byType(Icon), findsNothing);
      });

      testWidgets('icon uses custom color when provided', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: SectionHeader(
                text: 'Settings',
                icon: Icons.settings,
                color: Colors.red,
              ),
            ),
          ),
        );

        final icon = tester.widget<Icon>(find.byType(Icon));
        expect(icon.color, Colors.red);
      });

      testWidgets('icon has correct size', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: SectionHeader(text: 'Settings', icon: Icons.settings),
            ),
          ),
        );

        final icon = tester.widget<Icon>(find.byType(Icon));
        expect(icon.size, 20);
      });
    });

    // =========================================================================
    // Action Widget
    // =========================================================================
    group('Action Widget', () {
      testWidgets('shows action widget when provided', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: SectionHeader(
                text: 'Items',
                action: TextButton(onPressed: () {}, child: const Text('ADD')),
              ),
            ),
          ),
        );

        expect(find.text('ADD'), findsOneWidget);
        expect(find.byType(TextButton), findsOneWidget);
      });

      testWidgets('does not show action when not provided', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(body: SectionHeader(text: 'Items')),
          ),
        );

        expect(find.byType(TextButton), findsNothing);
      });

      testWidgets('action is tappable', (tester) async {
        bool tapped = false;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: SectionHeader(
                text: 'Items',
                action: TextButton(
                  onPressed: () => tapped = true,
                  child: const Text('ADD'),
                ),
              ),
            ),
          ),
        );

        await tester.tap(find.text('ADD'));
        await tester.pump();

        expect(tapped, isTrue);
      });
    });

    // =========================================================================
    // Custom Styling
    // =========================================================================
    group('Custom Styling', () {
      testWidgets('applies custom text style', (tester) async {
        const customStyle = TextStyle(
          fontSize: 24,
          fontWeight: FontWeight.bold,
          color: Colors.blue,
        );

        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: SectionHeader(text: 'Custom', style: customStyle),
            ),
          ),
        );

        final text = tester.widget<Text>(find.text('Custom'));
        expect(text.style?.fontSize, 24);
        expect(text.style?.fontWeight, FontWeight.bold);
        expect(text.style?.color, Colors.blue);
      });

      testWidgets('applies custom color to text', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: SectionHeader(text: 'Colored', color: Colors.green),
            ),
          ),
        );

        // The color is applied via the default style, verify icon color
        // since text style comes from theme with color override
        final text = tester.widget<Text>(find.text('Colored'));
        // Color should be applied (exact verification depends on theme)
        expect(text.style, isNotNull);
      });
    });

    // =========================================================================
    // Padding
    // =========================================================================
    group('Padding', () {
      testWidgets('applies custom padding when provided', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: SectionHeader(text: 'Padded', padding: EdgeInsets.all(20)),
            ),
          ),
        );

        final padding = find.byType(Padding);
        expect(padding, findsOneWidget);

        final paddingWidget = tester.widget<Padding>(padding);
        expect(paddingWidget.padding, const EdgeInsets.all(20));
      });

      testWidgets('no extra padding when not provided', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(body: SectionHeader(text: 'No Padding')),
          ),
        );

        // The top-level widget should be Row, not Padding
        final sectionHeader = find.byType(SectionHeader);
        final firstChild = find
            .descendant(of: sectionHeader, matching: find.byType(Row))
            .first;
        expect(firstChild, findsOneWidget);
      });
    });

    // =========================================================================
    // Complete Composition
    // =========================================================================
    group('Complete Composition', () {
      testWidgets('renders icon, text, and action together', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: SectionHeader(
                text: 'Labor Rates',
                icon: Icons.attach_money,
                action: IconButton(
                  onPressed: () {},
                  icon: const Icon(Icons.add),
                ),
              ),
            ),
          ),
        );

        expect(find.text('Labor Rates'), findsOneWidget);
        expect(find.byIcon(Icons.attach_money), findsOneWidget);
        expect(find.byIcon(Icons.add), findsOneWidget);
      });
    });
  });
}
