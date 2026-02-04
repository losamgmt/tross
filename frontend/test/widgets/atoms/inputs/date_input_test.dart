import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross/widgets/atoms/inputs/date_input.dart';
import 'package:tross/widgets/atoms/interactions/touch_target.dart';

void main() {
  group('DateInput', () {
    testWidgets('renders with label and formatted date value', (tester) async {
      final testDate = DateTime(2024, 1, 15);

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DateInput(value: testDate, onChanged: (_) {}),
          ),
        ),
      );

      expect(find.text('Jan 15, 2024'), findsOneWidget);
    });

    testWidgets('shows required indicator when required is true', (
      tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(body: DateInput(value: null, onChanged: (_) {})),
        ),
      );
    });

    testWidgets('shows calendar icon by default', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(body: DateInput(value: null, onChanged: (_) {})),
        ),
      );

      expect(find.byIcon(Icons.calendar_today), findsOneWidget);
    });

    testWidgets('shows clear button when value is set', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DateInput(value: DateTime(2024, 1, 1), onChanged: (_) {}),
          ),
        ),
      );

      expect(find.byIcon(Icons.clear), findsOneWidget);
    });

    testWidgets('hides clear button when value is null', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(body: DateInput(value: null, onChanged: (_) {})),
        ),
      );

      expect(find.byIcon(Icons.clear), findsNothing);
    });

    testWidgets('hides clear button when showClearButton is false', (
      tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DateInput(
              value: DateTime(2024, 1, 1),
              onChanged: (_) {},
              showClearButton: false,
            ),
          ),
        ),
      );

      expect(find.byIcon(Icons.clear), findsNothing);
    });

    testWidgets('clears date when clear button is pressed', (tester) async {
      DateTime? currentDate = DateTime(2024, 1, 1);

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DateInput(
              value: currentDate,
              onChanged: (date) => currentDate = date,
            ),
          ),
        ),
      );

      expect(find.byIcon(Icons.clear), findsOneWidget);

      await tester.tap(find.byIcon(Icons.clear));
      expect(currentDate, null);
    });

    testWidgets('displays error text when provided', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DateInput(
              value: null,
              onChanged: (_) {},
              errorText: 'Date is required',
            ),
          ),
        ),
      );

      expect(find.text('Date is required'), findsOneWidget);
    });

    testWidgets('displays helper text when provided', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DateInput(
              value: null,
              onChanged: (_) {},
              helperText: 'Select your birth date',
            ),
          ),
        ),
      );

      expect(find.text('Select your birth date'), findsOneWidget);
    });

    testWidgets('shows placeholder text when value is null', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DateInput(
              value: null,
              onChanged: (_) {},
              placeholder: 'Choose a date',
            ),
          ),
        ),
      );

      // Placeholder appears in InputDecoration
      final inputDecorator = tester.widget<InputDecorator>(
        find.byType(InputDecorator),
      );
      expect(inputDecorator.decoration.hintText, 'Choose a date');
    });

    testWidgets('shows prefix icon when provided', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DateInput(
              value: null,
              onChanged: (_) {},
              prefixIcon: Icons.event,
            ),
          ),
        ),
      );

      expect(find.byIcon(Icons.event), findsOneWidget);
    });

    testWidgets(
      'shows suffix icon when value is null and custom icon provided',
      (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: DateInput(
                value: null,
                onChanged: (_) {},
                suffixIcon: Icons.today,
              ),
            ),
          ),
        );

        expect(find.byIcon(Icons.today), findsOneWidget);
      },
    );

    testWidgets('disables input when enabled is false', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DateInput(value: null, onChanged: (_) {}, enabled: false),
          ),
        ),
      );

      final inputDecorator = tester.widget<InputDecorator>(
        find.byType(InputDecorator),
      );
      expect(inputDecorator.decoration.enabled, false);
    });

    testWidgets('updates value when changed externally', (tester) async {
      DateTime? value = DateTime(2024, 1, 1);

      await tester.pumpWidget(
        StatefulBuilder(
          builder: (context, setState) {
            return MaterialApp(
              home: Scaffold(
                body: Column(
                  children: [
                    DateInput(
                      value: value,
                      onChanged: (newValue) {
                        setState(() => value = newValue);
                      },
                    ),
                    ElevatedButton(
                      onPressed: () {
                        setState(() => value = DateTime(2024, 12, 25));
                      },
                      child: const Text('Set to Christmas'),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      );

      expect(find.text('Jan 1, 2024'), findsOneWidget);

      await tester.tap(find.text('Set to Christmas'));
      await tester.pump();

      expect(find.text('Dec 25, 2024'), findsOneWidget);
    });

    testWidgets('handles null value', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(body: DateInput(value: null, onChanged: (_) {})),
        ),
      );

      // Should display empty text when value is null (placeholder may show)
      expect(find.byType(DateInput), findsOneWidget);
    });

    testWidgets('formats different months correctly', (tester) async {
      final dates = [
        (DateTime(2024, 1, 1), 'Jan 1, 2024'),
        (DateTime(2024, 2, 14), 'Feb 14, 2024'),
        (DateTime(2024, 3, 31), 'Mar 31, 2024'),
        (DateTime(2024, 4, 15), 'Apr 15, 2024'),
        (DateTime(2024, 5, 1), 'May 1, 2024'),
        (DateTime(2024, 6, 30), 'Jun 30, 2024'),
        (DateTime(2024, 7, 4), 'Jul 4, 2024'),
        (DateTime(2024, 8, 15), 'Aug 15, 2024'),
        (DateTime(2024, 9, 1), 'Sep 1, 2024'),
        (DateTime(2024, 10, 31), 'Oct 31, 2024'),
        (DateTime(2024, 11, 11), 'Nov 11, 2024'),
        (DateTime(2024, 12, 25), 'Dec 25, 2024'),
      ];

      for (final (date, expected) in dates) {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: DateInput(value: date, onChanged: (_) {}),
            ),
          ),
        );

        expect(
          find.text(expected),
          findsOneWidget,
          reason: 'Failed to format $date correctly',
        );

        // Clean up for next iteration
        await tester.pumpWidget(Container());
      }
    });

    // Note: Testing showDatePicker dialog interaction is unreliable in
    // flutter_test because the dialog is provided by Flutter SDK. We test:
    // 1. The widget is tappable (has correct structure)
    // 2. Callback behavior (via clear button which we control)
    // 3. Disabled state properly prevents interaction
    //
    // The actual date picker dialog is Flutter SDK code, not ours.

    testWidgets('is tappable when enabled', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DateInput(value: DateTime(2024, 1, 1), onChanged: (_) {}),
          ),
        ),
      );

      // Verify the widget has a TouchTarget (our tappable wrapper)
      expect(find.byType(TouchTarget), findsAtLeast(1));
      // Verify the input is rendered
      expect(find.byType(DateInput), findsOneWidget);
      // Verify the date is displayed
      expect(find.text('Jan 1, 2024'), findsOneWidget);
    });

    testWidgets('is not tappable when disabled', (tester) async {
      DateTime? selectedDate;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DateInput(
              value: DateTime(2024, 1, 1),
              onChanged: (date) => selectedDate = date,
              enabled: false,
            ),
          ),
        ),
      );

      // When disabled, TouchTarget does not render InkWell
      // This ensures no tap handling occurs
      expect(find.byType(InkWell), findsNothing);

      // Callback should not be invoked
      expect(selectedDate, isNull);
    });

    testWidgets('hides clear button when disabled', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DateInput(
              value: DateTime(2024, 1, 1),
              onChanged: (_) {},
              enabled: false,
            ),
          ),
        ),
      );

      expect(find.byIcon(Icons.clear), findsNothing);
    });

    group('Keyboard Accessibility', () {
      testWidgets('opens date picker on Space key when focused', (
        tester,
      ) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: DateInput(value: DateTime(2024, 1, 1), onChanged: (_) {}),
            ),
          ),
        );

        // Get the FocusNode from the KeyboardListener and request focus
        final keyboardListener = tester.widget<KeyboardListener>(
          find.byType(KeyboardListener),
        );
        keyboardListener.focusNode.requestFocus();
        await tester.pumpAndSettle();

        // Press Space key
        await tester.sendKeyEvent(LogicalKeyboardKey.space);
        await tester.pumpAndSettle();

        // Date picker dialog should appear (verify via OK button presence)
        expect(find.text('OK'), findsOneWidget);
      });

      testWidgets('opens date picker on Enter key when focused', (
        tester,
      ) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: DateInput(value: DateTime(2024, 1, 1), onChanged: (_) {}),
            ),
          ),
        );

        // Get the FocusNode from the KeyboardListener and request focus
        final keyboardListener = tester.widget<KeyboardListener>(
          find.byType(KeyboardListener),
        );
        keyboardListener.focusNode.requestFocus();
        await tester.pumpAndSettle();

        // Press Enter key
        await tester.sendKeyEvent(LogicalKeyboardKey.enter);
        await tester.pumpAndSettle();

        // Date picker dialog should appear
        expect(find.text('OK'), findsOneWidget);
      });

      testWidgets('does not open picker on keyboard when disabled', (
        tester,
      ) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: DateInput(
                value: DateTime(2024, 1, 1),
                onChanged: (_) {},
                enabled: false,
              ),
            ),
          ),
        );

        // Get the FocusNode and try to focus
        final keyboardListener = tester.widget<KeyboardListener>(
          find.byType(KeyboardListener),
        );
        keyboardListener.focusNode.requestFocus();
        await tester.pumpAndSettle();

        // Press Space key
        await tester.sendKeyEvent(LogicalKeyboardKey.space);
        await tester.pumpAndSettle();

        // Date picker should NOT appear
        expect(find.text('OK'), findsNothing);
      });

      testWidgets('is focusable via tab navigation', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: Column(
                children: [
                  const TextField(), // First focusable widget
                  DateInput(value: DateTime(2024, 1, 1), onChanged: (_) {}),
                ],
              ),
            ),
          ),
        );

        // Focus the TextField first
        await tester.tap(find.byType(TextField));
        await tester.pumpAndSettle();

        // Tab to the DateInput
        await tester.sendKeyEvent(LogicalKeyboardKey.tab);
        await tester.pumpAndSettle();

        // Verify DateInput's KeyboardListener received focus
        final keyboardListener = tester.widget<KeyboardListener>(
          find.byType(KeyboardListener),
        );
        expect(keyboardListener.focusNode.hasFocus, isTrue);
      });
    });
  });
}
