import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/atoms/display/number_field_display.dart';

void main() {
  group('NumberFieldDisplay', () {
    testWidgets('renders with label and integer value', (tester) async {
      await tester.pumpWidget(
        MaterialApp(home: Scaffold(body: NumberFieldDisplay(value: 25))),
      );

      expect(find.text('25'), findsOneWidget);
    });

    testWidgets('renders with decimal value', (tester) async {
      await tester.pumpWidget(
        MaterialApp(home: Scaffold(body: NumberFieldDisplay(value: 99.99))),
      );

      expect(find.text('99.99'), findsOneWidget);
    });

    testWidgets('displays empty text when value is null', (tester) async {
      await tester.pumpWidget(
        MaterialApp(home: Scaffold(body: NumberFieldDisplay(value: null))),
      );

      expect(find.text('--'), findsOneWidget);
    });

    testWidgets('uses custom empty text when provided', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: NumberFieldDisplay(value: null, emptyText: 'N/A'),
          ),
        ),
      );

      expect(find.text('N/A'), findsOneWidget);
    });

    testWidgets('displays prefix when provided', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(body: NumberFieldDisplay(value: 50, prefix: '\$')),
        ),
      );

      expect(find.text('\$50'), findsOneWidget);
    });

    testWidgets('displays suffix when provided', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(body: NumberFieldDisplay(value: 15, suffix: '%')),
        ),
      );

      expect(find.text('15%'), findsOneWidget);
    });

    testWidgets('displays both prefix and suffix', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: NumberFieldDisplay(value: 72, prefix: '~', suffix: '°F'),
          ),
        ),
      );

      expect(find.text('~72°F'), findsOneWidget);
    });

    testWidgets('formats number with specified decimals', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(body: NumberFieldDisplay(value: 99.5, decimals: 2)),
        ),
      );

      expect(find.text('99.50'), findsOneWidget);
    });

    testWidgets('rounds to specified decimals', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(body: NumberFieldDisplay(value: 3.14159, decimals: 2)),
        ),
      );

      expect(find.text('3.14'), findsOneWidget);
    });

    testWidgets('shows integer without decimals by default', (tester) async {
      await tester.pumpWidget(
        MaterialApp(home: Scaffold(body: NumberFieldDisplay(value: 42))),
      );

      expect(find.text('42'), findsOneWidget);
      expect(find.text('42.0'), findsNothing);
    });

    testWidgets('shows whole number without decimals', (tester) async {
      await tester.pumpWidget(
        MaterialApp(home: Scaffold(body: NumberFieldDisplay(value: 100.0))),
      );

      expect(find.text('100'), findsOneWidget);
    });

    testWidgets('displays icon when provided', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(body: NumberFieldDisplay(value: 95, icon: Icons.star)),
        ),
      );

      expect(find.byIcon(Icons.star), findsOneWidget);
    });

    testWidgets('applies custom value style', (tester) async {
      const customStyle = TextStyle(
        color: Colors.green,
        fontWeight: FontWeight.bold,
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: NumberFieldDisplay(value: 1000, valueStyle: customStyle),
          ),
        ),
      );

      final textWidget = tester.widget<Text>(find.text('1000'));
      expect(textWidget.style?.color, Colors.green);
      expect(textWidget.style?.fontWeight, FontWeight.bold);
    });

    testWidgets('handles zero value', (tester) async {
      await tester.pumpWidget(
        MaterialApp(home: Scaffold(body: NumberFieldDisplay(value: 0))),
      );

      expect(find.text('0'), findsOneWidget);
    });

    testWidgets('handles negative numbers', (tester) async {
      await tester.pumpWidget(
        MaterialApp(home: Scaffold(body: NumberFieldDisplay(value: -15))),
      );

      expect(find.text('-15'), findsOneWidget);
    });

    testWidgets('handles very large numbers', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(body: NumberFieldDisplay(value: 7800000000)),
        ),
      );

      expect(find.text('7800000000'), findsOneWidget);
    });

    testWidgets('handles very small decimals', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(body: NumberFieldDisplay(value: 0.00001, decimals: 5)),
        ),
      );

      expect(find.text('0.00001'), findsOneWidget);
    });

    testWidgets('combines prefix, decimals, and suffix', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: NumberFieldDisplay(
              value: 19.99,
              prefix: '\$',
              suffix: ' USD',
              decimals: 2,
            ),
          ),
        ),
      );

      expect(find.text('\$19.99 USD'), findsOneWidget);
    });

    testWidgets('updates when value changes', (tester) async {
      num? value = 10;

      await tester.pumpWidget(
        StatefulBuilder(
          builder: (context, setState) {
            return MaterialApp(
              home: Scaffold(
                body: Column(
                  children: [
                    NumberFieldDisplay(value: value),
                    ElevatedButton(
                      onPressed: () {
                        setState(() => value = 25);
                      },
                      child: const Text('Update'),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      );

      expect(find.text('10'), findsOneWidget);

      await tester.tap(find.text('Update'));
      await tester.pump();

      expect(find.text('25'), findsOneWidget);
      expect(find.text('10'), findsNothing);
    });
  });
}
