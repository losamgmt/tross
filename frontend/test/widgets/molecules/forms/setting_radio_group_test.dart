/// SettingRadioGroup Tests
///
/// Tests the radio button group molecule for settings screens.
///
/// Coverage targets:
/// - Label and description rendering
/// - Radio option rendering
/// - Selection state
/// - Disabled state
/// - Custom active color
/// - Subtitle and trailing widget support
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/molecules/forms/setting_radio_group.dart';

void main() {
  Widget buildTestWidget({required Widget child}) {
    return MaterialApp(
      home: Scaffold(body: SingleChildScrollView(child: child)),
    );
  }

  group('SettingRadioGroup', () {
    group('Rendering', () {
      testWidgets('displays label text', (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            child: SettingRadioGroup<String>(
              label: 'Test Label',
              value: 'option1',
              options: const [RadioOption(value: 'option1', label: 'Option 1')],
            ),
          ),
        );

        expect(find.text('Test Label'), findsOneWidget);
      });

      testWidgets('displays description when provided', (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            child: SettingRadioGroup<String>(
              label: 'Test Label',
              description: 'This is a description',
              value: 'option1',
              options: const [RadioOption(value: 'option1', label: 'Option 1')],
            ),
          ),
        );

        expect(find.text('This is a description'), findsOneWidget);
      });

      testWidgets('does not display description when null', (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            child: SettingRadioGroup<String>(
              label: 'Test Label',
              value: 'option1',
              options: const [RadioOption(value: 'option1', label: 'Option 1')],
            ),
          ),
        );

        // Only label should be present
        expect(find.text('Test Label'), findsOneWidget);
        expect(find.byType(Text), findsNWidgets(2)); // Label + option label
      });

      testWidgets('displays all radio options', (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            child: SettingRadioGroup<String>(
              label: 'Options',
              value: 'opt1',
              options: const [
                RadioOption(value: 'opt1', label: 'First Option'),
                RadioOption(value: 'opt2', label: 'Second Option'),
                RadioOption(value: 'opt3', label: 'Third Option'),
              ],
            ),
          ),
        );

        expect(find.text('First Option'), findsOneWidget);
        expect(find.text('Second Option'), findsOneWidget);
        expect(find.text('Third Option'), findsOneWidget);
      });

      testWidgets('displays option subtitle when provided', (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            child: SettingRadioGroup<String>(
              label: 'Options',
              value: 'opt1',
              options: const [
                RadioOption(
                  value: 'opt1',
                  label: 'First Option',
                  subtitle: 'Subtitle text',
                ),
              ],
            ),
          ),
        );

        expect(find.text('Subtitle text'), findsOneWidget);
      });

      testWidgets('displays option trailing widget when provided', (
        tester,
      ) async {
        await tester.pumpWidget(
          buildTestWidget(
            child: SettingRadioGroup<String>(
              label: 'Options',
              value: 'opt1',
              options: const [
                RadioOption(
                  value: 'opt1',
                  label: 'First Option',
                  trailing: Icon(Icons.info),
                ),
              ],
            ),
          ),
        );

        expect(find.byIcon(Icons.info), findsOneWidget);
      });
    });

    group('Selection', () {
      testWidgets('shows correct option as selected', (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            child: SettingRadioGroup<String>(
              label: 'Options',
              value: 'opt2',
              options: const [
                RadioOption(value: 'opt1', label: 'First'),
                RadioOption(value: 'opt2', label: 'Second'),
              ],
            ),
          ),
        );

        // Find RadioListTiles
        final radioTiles = tester.widgetList<RadioListTile<String>>(
          find.byType(RadioListTile<String>),
        );

        expect(radioTiles.length, 2);
        expect(radioTiles.first.value, 'opt1');
        expect(radioTiles.last.value, 'opt2');
      });

      testWidgets('calls onChanged when option tapped', (tester) async {
        String? selectedValue = 'opt1';

        await tester.pumpWidget(
          buildTestWidget(
            child: StatefulBuilder(
              builder: (context, setState) => SettingRadioGroup<String>(
                label: 'Options',
                value: selectedValue,
                options: const [
                  RadioOption(value: 'opt1', label: 'First'),
                  RadioOption(value: 'opt2', label: 'Second'),
                ],
                onChanged: (value) {
                  setState(() => selectedValue = value);
                },
              ),
            ),
          ),
        );

        // Tap the second option
        await tester.tap(find.text('Second'));
        await tester.pumpAndSettle();

        expect(selectedValue, 'opt2');
      });

      testWidgets('handles null initial value', (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            child: SettingRadioGroup<String>(
              label: 'Options',
              value: null,
              options: const [
                RadioOption(value: 'opt1', label: 'First'),
                RadioOption(value: 'opt2', label: 'Second'),
              ],
            ),
          ),
        );

        // Should render without error
        expect(find.text('First'), findsOneWidget);
        expect(find.text('Second'), findsOneWidget);
      });
    });

    group('Disabled State', () {
      testWidgets('disabled group does not call onChanged', (tester) async {
        bool callbackCalled = false;

        await tester.pumpWidget(
          buildTestWidget(
            child: SettingRadioGroup<String>(
              label: 'Options',
              value: 'opt1',
              options: const [
                RadioOption(value: 'opt1', label: 'First'),
                RadioOption(value: 'opt2', label: 'Second'),
              ],
              enabled: false,
              onChanged: (_) => callbackCalled = true,
            ),
          ),
        );

        // Tap the second option
        await tester.tap(find.text('Second'));
        await tester.pumpAndSettle();

        // Callback should NOT have been called
        expect(callbackCalled, isFalse);
      });
    });

    group('Custom Styling', () {
      testWidgets('applies custom active color', (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            child: SettingRadioGroup<String>(
              label: 'Options',
              value: 'opt1',
              options: const [RadioOption(value: 'opt1', label: 'First')],
              activeColor: Colors.red,
            ),
          ),
        );

        final radioTile = tester.widget<RadioListTile<String>>(
          find.byType(RadioListTile<String>),
        );

        expect(radioTile.activeColor, Colors.red);
      });
    });

    group('Different Value Types', () {
      testWidgets('works with int values', (tester) async {
        int? selectedValue = 1;

        await tester.pumpWidget(
          buildTestWidget(
            child: StatefulBuilder(
              builder: (context, setState) => SettingRadioGroup<int>(
                label: 'Priority',
                value: selectedValue,
                options: const [
                  RadioOption(value: 1, label: 'Low'),
                  RadioOption(value: 2, label: 'Medium'),
                  RadioOption(value: 3, label: 'High'),
                ],
                onChanged: (value) => setState(() => selectedValue = value),
              ),
            ),
          ),
        );

        await tester.tap(find.text('High'));
        await tester.pumpAndSettle();

        expect(selectedValue, 3);
      });

      testWidgets('works with enum values', (tester) async {
        _TestEnum? selectedValue = _TestEnum.optionA;

        await tester.pumpWidget(
          buildTestWidget(
            child: StatefulBuilder(
              builder: (context, setState) => SettingRadioGroup<_TestEnum>(
                label: 'Enum Options',
                value: selectedValue,
                options: const [
                  RadioOption(value: _TestEnum.optionA, label: 'Option A'),
                  RadioOption(value: _TestEnum.optionB, label: 'Option B'),
                ],
                onChanged: (value) => setState(() => selectedValue = value),
              ),
            ),
          ),
        );

        await tester.tap(find.text('Option B'));
        await tester.pumpAndSettle();

        expect(selectedValue, _TestEnum.optionB);
      });
    });
  });

  group('RadioOption', () {
    test('creates with required parameters', () {
      const option = RadioOption<String>(value: 'test', label: 'Test Label');
      expect(option.value, 'test');
      expect(option.label, 'Test Label');
      expect(option.subtitle, isNull);
      expect(option.trailing, isNull);
    });

    test('creates with all parameters', () {
      const option = RadioOption<String>(
        value: 'test',
        label: 'Test Label',
        subtitle: 'Subtitle',
        trailing: Icon(Icons.check),
      );
      expect(option.value, 'test');
      expect(option.label, 'Test Label');
      expect(option.subtitle, 'Subtitle');
      expect(option.trailing, isNotNull);
    });
  });
}

enum _TestEnum { optionA, optionB }
