/// Tests for CheckboxInput Atom
///
/// Verifies:
/// - Basic rendering with label
/// - Checked/unchecked states
/// - Description display
/// - Callback firing
/// - Enabled/disabled states
/// - Compact mode
/// - Tristate support
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/atoms/inputs/checkbox_input.dart';

void main() {
  group('CheckboxInput Atom', () {
    group('Basic Rendering', () {
      testWidgets('displays label text', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: CheckboxInput(
                value: false,
                onChanged: (_) {},
                label: 'Accept Terms',
              ),
            ),
          ),
        );

        expect(find.text('Accept Terms'), findsOneWidget);
      });

      testWidgets('displays Checkbox widget', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: CheckboxInput(
                value: false,
                onChanged: (_) {},
                label: 'Option',
              ),
            ),
          ),
        );

        expect(find.byType(Checkbox), findsOneWidget);
      });
    });

    group('Checked States', () {
      testWidgets('checkbox shows checked when value is true', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: CheckboxInput(
                value: true,
                onChanged: (_) {},
                label: 'Checked',
              ),
            ),
          ),
        );

        final checkbox = tester.widget<Checkbox>(find.byType(Checkbox));
        expect(checkbox.value, true);
      });

      testWidgets('checkbox shows unchecked when value is false', (
        tester,
      ) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: CheckboxInput(
                value: false,
                onChanged: (_) {},
                label: 'Unchecked',
              ),
            ),
          ),
        );

        final checkbox = tester.widget<Checkbox>(find.byType(Checkbox));
        expect(checkbox.value, false);
      });

      testWidgets('checked option uses bold font weight', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: CheckboxInput(
                value: true,
                onChanged: (_) {},
                label: 'Checked',
              ),
            ),
          ),
        );

        final text = tester.widget<Text>(find.text('Checked'));
        expect(text.style?.fontWeight, FontWeight.w500);
      });

      testWidgets('unchecked option uses normal font weight', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: CheckboxInput(
                value: false,
                onChanged: (_) {},
                label: 'Unchecked',
              ),
            ),
          ),
        );

        final text = tester.widget<Text>(find.text('Unchecked'));
        expect(text.style?.fontWeight, FontWeight.normal);
      });
    });

    group('Description', () {
      testWidgets('displays description when provided', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: CheckboxInput(
                value: false,
                onChanged: (_) {},
                label: 'Subscribe',
                description: 'Receive weekly updates',
              ),
            ),
          ),
        );

        expect(find.text('Subscribe'), findsOneWidget);
        expect(find.text('Receive weekly updates'), findsOneWidget);
      });

      testWidgets('no description when not provided', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: CheckboxInput(
                value: false,
                onChanged: (_) {},
                label: 'Simple Option',
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
        bool? changedValue;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: CheckboxInput(
                value: false,
                onChanged: (value) => changedValue = value,
                label: 'Tap Me',
              ),
            ),
          ),
        );

        await tester.tap(find.byType(CheckboxInput));
        await tester.pump();

        expect(changedValue, true);
      });

      testWidgets('toggles from true to false', (tester) async {
        bool? changedValue;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: CheckboxInput(
                value: true,
                onChanged: (value) => changedValue = value,
                label: 'Toggle',
              ),
            ),
          ),
        );

        await tester.tap(find.byType(CheckboxInput));
        await tester.pump();

        expect(changedValue, false);
      });

      testWidgets('calls onChanged when checkbox tapped', (tester) async {
        bool? changedValue;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: CheckboxInput(
                value: false,
                onChanged: (value) => changedValue = value,
                label: 'Option',
              ),
            ),
          ),
        );

        await tester.tap(find.byType(Checkbox));
        await tester.pump();

        expect(changedValue, true);
      });

      testWidgets('updates UI when value changes', (tester) async {
        bool currentValue = false;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: StatefulBuilder(
                builder: (context, setState) => CheckboxInput(
                  value: currentValue,
                  onChanged: (v) => setState(() => currentValue = v ?? false),
                  label: 'Toggleable',
                ),
              ),
            ),
          ),
        );

        expect(currentValue, false);

        await tester.tap(find.byType(CheckboxInput));
        await tester.pump();
        expect(currentValue, true);

        await tester.tap(find.byType(CheckboxInput));
        await tester.pump();
        expect(currentValue, false);
      });
    });

    group('Enabled/Disabled States', () {
      testWidgets('enabled checkbox responds to tap', (tester) async {
        bool? changedValue;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: CheckboxInput(
                value: false,
                onChanged: (value) => changedValue = value,
                label: 'Enabled',
                enabled: true,
              ),
            ),
          ),
        );

        await tester.tap(find.byType(CheckboxInput));
        await tester.pump();

        expect(changedValue, true);
      });

      testWidgets('disabled checkbox does not respond to tap', (tester) async {
        bool? changedValue;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: CheckboxInput(
                value: false,
                onChanged: (value) => changedValue = value,
                label: 'Disabled',
                enabled: false,
              ),
            ),
          ),
        );

        await tester.tap(find.byType(CheckboxInput));
        await tester.pump();

        expect(changedValue, isNull);
      });

      testWidgets('disabled checkbox has null onChanged', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: CheckboxInput(
                value: false,
                onChanged: (_) {},
                label: 'Disabled',
                enabled: false,
              ),
            ),
          ),
        );

        final checkbox = tester.widget<Checkbox>(find.byType(Checkbox));
        expect(checkbox.onChanged, isNull);
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
              body: CheckboxInput(
                value: false,
                onChanged: (_) {},
                label: 'Compact',
                compact: true,
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
              body: CheckboxInput(
                value: false,
                onChanged: (_) {},
                label: 'Standard',
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
    });

    group('Tristate Support', () {
      testWidgets('tristate checkbox accepts null value', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: CheckboxInput(
                value: null,
                onChanged: (_) {},
                label: 'Indeterminate',
                tristate: true,
              ),
            ),
          ),
        );

        final checkbox = tester.widget<Checkbox>(find.byType(Checkbox));
        expect(checkbox.value, isNull);
        expect(checkbox.tristate, true);
      });

      testWidgets('tristate cycles: null -> true -> false -> null', (
        tester,
      ) async {
        bool? currentValue;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: StatefulBuilder(
                builder: (context, setState) => CheckboxInput(
                  value: currentValue,
                  onChanged: (v) => setState(() => currentValue = v),
                  label: 'Tristate',
                  tristate: true,
                ),
              ),
            ),
          ),
        );

        // Start at null (indeterminate)
        expect(currentValue, isNull);

        // null -> true
        await tester.tap(find.byType(CheckboxInput));
        await tester.pump();
        expect(currentValue, true);

        // true -> false
        await tester.tap(find.byType(CheckboxInput));
        await tester.pump();
        expect(currentValue, false);

        // false -> null
        await tester.tap(find.byType(CheckboxInput));
        await tester.pump();
        expect(currentValue, isNull);
      });

      testWidgets('non-tristate only toggles true/false', (tester) async {
        bool? currentValue = false;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: StatefulBuilder(
                builder: (context, setState) => CheckboxInput(
                  value: currentValue,
                  onChanged: (v) => setState(() => currentValue = v),
                  label: 'Binary',
                  tristate: false,
                ),
              ),
            ),
          ),
        );

        // false -> true
        await tester.tap(find.byType(CheckboxInput));
        await tester.pump();
        expect(currentValue, true);

        // true -> false
        await tester.tap(find.byType(CheckboxInput));
        await tester.pump();
        expect(currentValue, false);

        // false -> true (no null)
        await tester.tap(find.byType(CheckboxInput));
        await tester.pump();
        expect(currentValue, true);
      });
    });

    group('Layout', () {
      testWidgets('uses Row for layout', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: CheckboxInput(
                value: false,
                onChanged: (_) {},
                label: 'Option',
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
              body: CheckboxInput(
                value: false,
                onChanged: (_) {},
                label: 'Option',
              ),
            ),
          ),
        );

        expect(find.byType(Expanded), findsOneWidget);
      });
    });
  });
}
