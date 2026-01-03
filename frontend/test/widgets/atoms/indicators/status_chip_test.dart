/// Tests for StatusChip Atom
///
/// Verifies:
/// - Basic rendering with label and color
/// - Icon rendering
/// - Compact mode
/// - Outlined variant
/// - Factory constructors (success, warning, error, neutral, info)
/// - Contrast color calculation
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/atoms/indicators/status_chip.dart';

void main() {
  group('StatusChip Atom', () {
    group('Basic Rendering', () {
      testWidgets('displays label text', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: StatusChip(label: 'Active', color: Colors.green),
            ),
          ),
        );

        expect(find.text('Active'), findsOneWidget);
      });

      testWidgets('applies background color', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: StatusChip(label: 'Test', color: Colors.blue),
            ),
          ),
        );

        final container = tester.widget<Container>(find.byType(Container));
        final decoration = container.decoration as BoxDecoration;
        expect(decoration.color, Colors.blue);
      });

      testWidgets('has rounded corners', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: StatusChip(label: 'Test', color: Colors.green),
            ),
          ),
        );

        final container = tester.widget<Container>(find.byType(Container));
        final decoration = container.decoration as BoxDecoration;
        expect(decoration.borderRadius, isNotNull);
      });
    });

    group('Icon Support', () {
      testWidgets('displays icon when provided', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: StatusChip(
                label: 'Pending',
                color: Colors.orange,
                icon: Icons.hourglass_empty,
              ),
            ),
          ),
        );

        expect(find.byIcon(Icons.hourglass_empty), findsOneWidget);
        expect(find.text('Pending'), findsOneWidget);
      });

      testWidgets('no icon when not provided', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: StatusChip(label: 'Test', color: Colors.green),
            ),
          ),
        );

        expect(find.byType(Icon), findsNothing);
      });

      testWidgets('icon appears before label', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: StatusChip(
                label: 'Status',
                color: Colors.blue,
                icon: Icons.check,
              ),
            ),
          ),
        );

        // Find the Row and verify icon comes before text
        final row = tester.widget<Row>(find.byType(Row));
        expect(row.children.length, 3); // Icon, SizedBox, Text
        expect(row.children.first, isA<Icon>());
      });
    });

    group('Compact Mode', () {
      testWidgets('compact mode has smaller font than standard', (
        tester,
      ) async {
        // Pump compact widget
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: StatusChip(
                label: 'Compact',
                color: Colors.green,
                compact: true,
              ),
            ),
          ),
        );
        final compactText = tester.widget<Text>(find.text('Compact'));
        final compactSize = compactText.style?.fontSize;

        // Pump standard widget
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: StatusChip(
                label: 'Standard',
                color: Colors.green,
                compact: false,
              ),
            ),
          ),
        );
        final standardText = tester.widget<Text>(find.text('Standard'));
        final standardSize = standardText.style?.fontSize;

        // Verify compact is smaller than standard
        expect(compactSize, lessThan(standardSize!));
      });

      testWidgets('compact icon is smaller', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: StatusChip(
                label: 'Test',
                color: Colors.green,
                icon: Icons.check,
                compact: true,
              ),
            ),
          ),
        );

        final icon = tester.widget<Icon>(find.byIcon(Icons.check));
        expect(icon.size, 12.0);
      });

      testWidgets('standard icon is larger', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: StatusChip(
                label: 'Test',
                color: Colors.green,
                icon: Icons.check,
                compact: false,
              ),
            ),
          ),
        );

        final icon = tester.widget<Icon>(find.byIcon(Icons.check));
        expect(icon.size, 14.0);
      });
    });

    group('Outlined Variant', () {
      testWidgets('outlined has transparent background', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: StatusChip(
                label: 'Outlined',
                color: Colors.blue,
                outlined: true,
              ),
            ),
          ),
        );

        final container = tester.widget<Container>(find.byType(Container));
        final decoration = container.decoration as BoxDecoration;
        expect(decoration.color, Colors.transparent);
      });

      testWidgets('outlined has border', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: StatusChip(
                label: 'Outlined',
                color: Colors.blue,
                outlined: true,
              ),
            ),
          ),
        );

        final container = tester.widget<Container>(find.byType(Container));
        final decoration = container.decoration as BoxDecoration;
        expect(decoration.border, isNotNull);
      });

      testWidgets('outlined text uses chip color', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: StatusChip(
                label: 'Outlined',
                color: Colors.blue,
                outlined: true,
              ),
            ),
          ),
        );

        final text = tester.widget<Text>(find.text('Outlined'));
        expect(text.style?.color, Colors.blue);
      });
    });

    group('Contrast Color', () {
      testWidgets('dark background uses white text', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: StatusChip(label: 'Dark', color: Colors.black),
            ),
          ),
        );

        final text = tester.widget<Text>(find.text('Dark'));
        expect(text.style?.color, Colors.white);
      });

      testWidgets('light background uses dark text', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: StatusChip(label: 'Light', color: Colors.yellow),
            ),
          ),
        );

        final text = tester.widget<Text>(find.text('Light'));
        // Verify text is dark (low luminance) for contrast on light background
        final textLuminance = text.style?.color?.computeLuminance() ?? 1.0;
        expect(textLuminance, lessThan(0.5));
      });
    });

    group('Factory Constructors', () {
      testWidgets('success factory renders with label', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: StatusChip.success(label: 'Active')),
          ),
        );

        expect(find.text('Active'), findsOneWidget);
        expect(find.byType(StatusChip), findsOneWidget);
      });

      testWidgets('warning factory renders with label', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: StatusChip.warning(label: 'Pending')),
          ),
        );

        expect(find.text('Pending'), findsOneWidget);
        expect(find.byType(StatusChip), findsOneWidget);
      });

      testWidgets('error factory renders with label', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: StatusChip.error(label: 'Failed')),
          ),
        );

        expect(find.text('Failed'), findsOneWidget);
        expect(find.byType(StatusChip), findsOneWidget);
      });

      testWidgets('neutral factory renders with label', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: StatusChip.neutral(label: 'Draft')),
          ),
        );

        expect(find.text('Draft'), findsOneWidget);
        expect(find.byType(StatusChip), findsOneWidget);
      });

      testWidgets('info factory renders with label', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: StatusChip.info(label: 'Info')),
          ),
        );

        expect(find.text('Info'), findsOneWidget);
        expect(find.byType(StatusChip), findsOneWidget);
      });

      testWidgets('factory constructors support icons', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: StatusChip.success(label: 'Done', icon: Icons.check_circle),
            ),
          ),
        );

        expect(find.byIcon(Icons.check_circle), findsOneWidget);
      });

      testWidgets('factory constructors support compact mode', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: StatusChip.warning(label: 'Compact', compact: true),
            ),
          ),
        );

        final text = tester.widget<Text>(find.text('Compact'));
        expect(text.style?.fontSize, 11.0);
      });
    });

    group('Typography', () {
      testWidgets('uses semibold font weight', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: StatusChip(label: 'Test', color: Colors.blue),
            ),
          ),
        );

        final text = tester.widget<Text>(find.text('Test'));
        expect(text.style?.fontWeight, FontWeight.w600);
      });

      testWidgets('has letter spacing applied', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: StatusChip(label: 'Test', color: Colors.blue),
            ),
          ),
        );

        final text = tester.widget<Text>(find.text('Test'));
        expect(text.style?.letterSpacing, isNotNull);
        expect(text.style!.letterSpacing, greaterThan(0));
      });
    });

    group('Layout', () {
      testWidgets('row uses min main axis size', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: StatusChip(label: 'Compact', color: Colors.green),
            ),
          ),
        );

        final row = tester.widget<Row>(find.byType(Row));
        expect(row.mainAxisSize, MainAxisSize.min);
      });
    });
  });
}
