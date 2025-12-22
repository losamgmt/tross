/// TimeInput Atom Tests
///
/// Tests the time input atom - pure time picker field.
/// NO label wrapper (molecule's job) - just the input.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/atoms/inputs/time_input.dart';

void main() {
  group('TimeInput Atom', () {
    // =========================================================================
    // Basic Rendering
    // =========================================================================
    group('Basic Rendering', () {
      testWidgets('renders with null value and placeholder', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: TimeInput(value: null, onChanged: (_) {})),
          ),
        );

        expect(find.text('Select time'), findsWidgets);
        expect(find.byIcon(Icons.access_time), findsOneWidget);
      });

      testWidgets('renders with custom placeholder', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: TimeInput(
                value: null,
                onChanged: (_) {},
                placeholder: 'Choose start time',
              ),
            ),
          ),
        );

        expect(find.text('Choose start time'), findsWidgets);
      });

      testWidgets('renders with time value in 12-hour format', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: TimeInput(
                value: const TimeOfDay(hour: 14, minute: 30),
                onChanged: (_) {},
              ),
            ),
          ),
        );

        expect(find.text('2:30 PM'), findsOneWidget);
      });

      testWidgets('renders with time value in 24-hour format', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: TimeInput(
                value: const TimeOfDay(hour: 14, minute: 30),
                onChanged: (_) {},
                use24HourFormat: true,
              ),
            ),
          ),
        );

        expect(find.text('14:30'), findsOneWidget);
      });

      testWidgets('formats 12:00 PM correctly', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: TimeInput(
                value: const TimeOfDay(hour: 12, minute: 0),
                onChanged: (_) {},
              ),
            ),
          ),
        );

        expect(find.text('12:00 PM'), findsOneWidget);
      });

      testWidgets('formats 12:00 AM (midnight) correctly', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: TimeInput(
                value: const TimeOfDay(hour: 0, minute: 0),
                onChanged: (_) {},
              ),
            ),
          ),
        );

        expect(find.text('12:00 AM'), findsOneWidget);
      });

      testWidgets('formats single-digit minutes with leading zero', (
        tester,
      ) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: TimeInput(
                value: const TimeOfDay(hour: 9, minute: 5),
                onChanged: (_) {},
              ),
            ),
          ),
        );

        expect(find.text('9:05 AM'), findsOneWidget);
      });
    });

    // =========================================================================
    // Icon Rendering
    // =========================================================================
    group('Icon Rendering', () {
      testWidgets('shows default clock icon as prefix', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: TimeInput(value: null, onChanged: (_) {})),
          ),
        );

        expect(find.byIcon(Icons.access_time), findsOneWidget);
      });

      testWidgets('shows custom prefix icon when provided', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: TimeInput(
                value: null,
                onChanged: (_) {},
                prefixIcon: Icons.schedule,
              ),
            ),
          ),
        );

        expect(find.byIcon(Icons.schedule), findsOneWidget);
      });

      testWidgets('shows clear button when value is present and enabled', (
        tester,
      ) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: TimeInput(
                value: const TimeOfDay(hour: 10, minute: 0),
                onChanged: (_) {},
              ),
            ),
          ),
        );

        expect(find.byIcon(Icons.clear), findsOneWidget);
      });

      testWidgets('hides clear button when showClearButton is false', (
        tester,
      ) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: TimeInput(
                value: const TimeOfDay(hour: 10, minute: 0),
                onChanged: (_) {},
                showClearButton: false,
              ),
            ),
          ),
        );

        expect(find.byIcon(Icons.clear), findsNothing);
      });

      testWidgets('shows suffix icon when no value and suffix provided', (
        tester,
      ) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: TimeInput(
                value: null,
                onChanged: (_) {},
                suffixIcon: Icons.keyboard_arrow_down,
              ),
            ),
          ),
        );

        expect(find.byIcon(Icons.keyboard_arrow_down), findsOneWidget);
      });
    });

    // =========================================================================
    // Clear Button Behavior
    // =========================================================================
    group('Clear Button', () {
      testWidgets('calls onChanged with null when clear is tapped', (
        tester,
      ) async {
        TimeOfDay? changedValue = const TimeOfDay(hour: 10, minute: 0);

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: TimeInput(
                value: const TimeOfDay(hour: 10, minute: 0),
                onChanged: (value) => changedValue = value,
              ),
            ),
          ),
        );

        await tester.tap(find.byIcon(Icons.clear));
        await tester.pump();

        expect(changedValue, isNull);
      });

      testWidgets('does not show clear button when disabled', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: TimeInput(
                value: const TimeOfDay(hour: 10, minute: 0),
                onChanged: (_) {},
                enabled: false,
              ),
            ),
          ),
        );

        expect(find.byIcon(Icons.clear), findsNothing);
      });
    });

    // =========================================================================
    // Helper/Error Text
    // =========================================================================
    group('Helper and Error Text', () {
      testWidgets('displays error text when provided', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: TimeInput(
                value: null,
                onChanged: (_) {},
                errorText: 'Start time is required',
              ),
            ),
          ),
        );

        expect(find.text('Start time is required'), findsOneWidget);
      });

      testWidgets('displays helper text when provided', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: TimeInput(
                value: null,
                onChanged: (_) {},
                helperText: 'Select your preferred time',
              ),
            ),
          ),
        );

        expect(find.text('Select your preferred time'), findsOneWidget);
      });
    });

    // =========================================================================
    // Disabled State
    // =========================================================================
    group('Disabled State', () {
      testWidgets('does not open picker when disabled', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: TimeInput(value: null, onChanged: (_) {}, enabled: false),
            ),
          ),
        );

        // Tap the input
        await tester.tap(find.byType(InkWell));
        await tester.pumpAndSettle();

        // Time picker dialog should NOT appear
        expect(find.byType(TimePickerDialog), findsNothing);
      });
    });

    // =========================================================================
    // Time Picker Dialog
    // =========================================================================
    group('Time Picker Dialog', () {
      testWidgets('opens time picker when tapped', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: TimeInput(
                value: const TimeOfDay(hour: 10, minute: 0),
                onChanged: (_) {},
              ),
            ),
          ),
        );

        await tester.tap(find.byType(InkWell).first);
        await tester.pumpAndSettle();

        expect(find.byType(TimePickerDialog), findsOneWidget);
      });

      testWidgets('uses current time when value is null', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: TimeInput(value: null, onChanged: (_) {})),
          ),
        );

        await tester.tap(find.byType(InkWell).first);
        await tester.pumpAndSettle();

        // Dialog opens (initial time defaults to TimeOfDay.now())
        expect(find.byType(TimePickerDialog), findsOneWidget);
      });
    });
  });
}
