/// Tests for RadioInput Atom
///
/// Verifies:
/// - Basic rendering with label
/// - Selection state (via RadioGroup)
/// - Description display
/// - Callback firing (via RadioGroup)
/// - Enabled/disabled states
/// - Compact mode
/// - Generic type support
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/atoms/inputs/radio_input.dart';

void main() {
  group('RadioInput Atom', () {
    group('Basic Rendering', () {
      testWidgets('displays label text', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: RadioGroup<String>(
                groupValue: null,
                onChanged: (_) {},
                child: const RadioInput<String>(
                  value: 'option1',
                  label: 'First Option',
                ),
              ),
            ),
          ),
        );

        expect(find.text('First Option'), findsOneWidget);
      });

      testWidgets('displays Radio widget', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: RadioGroup<String>(
                groupValue: null,
                onChanged: (_) {},
                child: const RadioInput<String>(
                  value: 'option1',
                  label: 'Option',
                ),
              ),
            ),
          ),
        );

        expect(find.byType(Radio<String>), findsOneWidget);
      });
    });

    group('Selection State', () {
      testWidgets('radio is selected when value matches groupValue', (
        tester,
      ) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: RadioGroup<String>(
                groupValue: 'option1',
                onChanged: (_) {},
                child: const RadioInput<String>(
                  value: 'option1',
                  label: 'Selected Option',
                ),
              ),
            ),
          ),
        );

        // Selected option should have bold text
        final text = tester.widget<Text>(find.text('Selected Option'));
        expect(text.style?.fontWeight, FontWeight.w500);
      });

      testWidgets('radio is not selected when value differs from groupValue', (
        tester,
      ) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: RadioGroup<String>(
                groupValue: 'option2',
                onChanged: (_) {},
                child: const RadioInput<String>(
                  value: 'option1',
                  label: 'Not Selected',
                ),
              ),
            ),
          ),
        );

        // Unselected option should have normal font weight
        final text = tester.widget<Text>(find.text('Not Selected'));
        expect(text.style?.fontWeight, FontWeight.normal);
      });
    });

    group('Description', () {
      testWidgets('displays description when provided', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: RadioGroup<String>(
                groupValue: null,
                onChanged: (_) {},
                child: const RadioInput<String>(
                  value: 'express',
                  label: 'Express Shipping',
                  description: '2-3 business days',
                ),
              ),
            ),
          ),
        );

        expect(find.text('Express Shipping'), findsOneWidget);
        expect(find.text('2-3 business days'), findsOneWidget);
      });

      testWidgets('no description when not provided', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: RadioGroup<String>(
                groupValue: null,
                onChanged: (_) {},
                child: const RadioInput<String>(
                  value: 'option',
                  label: 'Simple Option',
                ),
              ),
            ),
          ),
        );

        // Only the label should exist in text widgets
        final texts = tester.widgetList<Text>(find.byType(Text));
        expect(texts.length, 1);
      });
    });

    group('Interaction', () {
      testWidgets('calls onChanged when tapped', (tester) async {
        String? selectedValue;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: RadioGroup<String>(
                groupValue: null,
                onChanged: (value) => selectedValue = value,
                child: const RadioInput<String>(
                  value: 'option1',
                  label: 'Tap Me',
                ),
              ),
            ),
          ),
        );

        await tester.tap(find.byType(RadioInput<String>));
        await tester.pump();

        expect(selectedValue, 'option1');
      });

      testWidgets('calls onChanged when radio button tapped', (tester) async {
        String? selectedValue;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: RadioGroup<String>(
                groupValue: null,
                onChanged: (value) => selectedValue = value,
                child: const RadioInput<String>(
                  value: 'option1',
                  label: 'Option',
                ),
              ),
            ),
          ),
        );

        await tester.tap(find.byType(Radio<String>));
        await tester.pump();

        expect(selectedValue, 'option1');
      });

      testWidgets('updates UI when selection changes', (tester) async {
        String? groupValue;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: StatefulBuilder(
                builder: (context, setState) => RadioGroup<String>(
                  groupValue: groupValue,
                  onChanged: (v) => setState(() => groupValue = v),
                  child: const Column(
                    children: [
                      RadioInput<String>(value: 'option1', label: 'Option 1'),
                      RadioInput<String>(value: 'option2', label: 'Option 2'),
                    ],
                  ),
                ),
              ),
            ),
          ),
        );

        // Initially no selection
        expect(groupValue, isNull);

        // Tap first option
        await tester.tap(find.text('Option 1'));
        await tester.pump();
        expect(groupValue, 'option1');

        // Tap second option
        await tester.tap(find.text('Option 2'));
        await tester.pump();
        expect(groupValue, 'option2');
      });
    });

    group('Enabled/Disabled States', () {
      testWidgets('enabled radio responds to tap', (tester) async {
        String? selectedValue;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: RadioGroup<String>(
                groupValue: null,
                onChanged: (value) => selectedValue = value,
                child: const RadioInput<String>(
                  value: 'option1',
                  label: 'Enabled',
                  enabled: true,
                ),
              ),
            ),
          ),
        );

        await tester.tap(find.byType(RadioInput<String>));
        await tester.pump();

        expect(selectedValue, 'option1');
      });

      testWidgets('disabled radio does not respond to tap', (tester) async {
        String? selectedValue;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: RadioGroup<String>(
                groupValue: null,
                onChanged: (value) => selectedValue = value,
                child: const RadioInput<String>(
                  value: 'option1',
                  label: 'Disabled',
                  enabled: false,
                ),
              ),
            ),
          ),
        );

        await tester.tap(find.byType(RadioInput<String>));
        await tester.pump();

        expect(selectedValue, isNull);
      });
    });

    group('Compact Mode', () {
      testWidgets('compact mode has smaller font than standard', (
        tester,
      ) async {
        // Pump compact widget
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: RadioGroup<String>(
                groupValue: null,
                onChanged: (_) {},
                child: const RadioInput<String>(
                  value: 'option1',
                  label: 'Compact',
                  compact: true,
                ),
              ),
            ),
          ),
        );
        final compactText = tester.widget<Text>(find.text('Compact'));
        final compactSize = compactText.style?.fontSize;

        // Pump standard widget
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: RadioGroup<String>(
                groupValue: null,
                onChanged: (_) {},
                child: const RadioInput<String>(
                  value: 'option1',
                  label: 'Standard',
                  compact: false,
                ),
              ),
            ),
          ),
        );
        final standardText = tester.widget<Text>(find.text('Standard'));
        final standardSize = standardText.style?.fontSize;

        // Verify compact is smaller than standard
        expect(compactSize, lessThan(standardSize!));
      });
    });

    group('Generic Types', () {
      testWidgets('works with enum types', (tester) async {
        _TestPriority? selected;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: RadioGroup<_TestPriority>(
                groupValue: null,
                onChanged: (v) => selected = v,
                child: const Column(
                  children: [
                    RadioInput<_TestPriority>(
                      value: _TestPriority.high,
                      label: 'High',
                    ),
                    RadioInput<_TestPriority>(
                      value: _TestPriority.medium,
                      label: 'Medium',
                    ),
                    RadioInput<_TestPriority>(
                      value: _TestPriority.low,
                      label: 'Low',
                    ),
                  ],
                ),
              ),
            ),
          ),
        );

        await tester.tap(find.text('High'));
        await tester.pump();
        expect(selected, _TestPriority.high);

        await tester.tap(find.text('Medium'));
        await tester.pump();
        expect(selected, _TestPriority.medium);

        await tester.tap(find.text('Low'));
        await tester.pump();
        expect(selected, _TestPriority.low);
      });

      testWidgets('works with int types', (tester) async {
        int? selected;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: RadioGroup<int>(
                groupValue: null,
                onChanged: (v) => selected = v,
                child: const RadioInput<int>(value: 42, label: 'Forty-Two'),
              ),
            ),
          ),
        );

        await tester.tap(find.byType(RadioInput<int>));
        await tester.pump();

        expect(selected, 42);
      });
    });

    group('Layout', () {
      testWidgets('uses Row for layout', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: RadioGroup<String>(
                groupValue: null,
                onChanged: (_) {},
                child: const RadioInput<String>(
                  value: 'option1',
                  label: 'Option',
                ),
              ),
            ),
          ),
        );

        expect(find.byType(Row), findsOneWidget);
      });

      testWidgets('label expands to fill available space', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: RadioGroup<String>(
                groupValue: null,
                onChanged: (_) {},
                child: const RadioInput<String>(
                  value: 'option1',
                  label: 'Option',
                ),
              ),
            ),
          ),
        );

        expect(find.byType(Expanded), findsOneWidget);
      });
    });
  });
}

enum _TestPriority { high, medium, low }
