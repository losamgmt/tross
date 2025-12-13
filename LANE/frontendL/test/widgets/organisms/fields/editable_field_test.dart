import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/organisms/fields/editable_field.dart';

void main() {
  group('EditableField', () {
    late int updateCallCount;
    late dynamic lastUpdateValue;
    late Exception? lastError;
    late bool shouldSucceed;

    setUp(() {
      updateCallCount = 0;
      lastUpdateValue = null;
      lastError = null;
      shouldSucceed = true;
    });

    Future<bool> mockUpdateApi(dynamic value) async {
      updateCallCount++;
      lastUpdateValue = value;
      if (lastError != null) {
        throw lastError!;
      }
      await Future.delayed(const Duration(milliseconds: 10));
      return shouldSucceed;
    }

    group('Basic Rendering', () {
      testWidgets('renders edit widget with current value', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: EditableField<dynamic, bool>(
                value: true,
                displayWidget: const Text('Display'),
                editWidget: (value, onChange) => Text('Value: $value'),
                onUpdate: mockUpdateApi,
              ),
            ),
          ),
        );

        expect(find.text('Value: true'), findsOneWidget);
      });

      testWidgets('passes value to edit widget function', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: EditableField<dynamic, String>(
                value: 'test-value',
                displayWidget: const Text('Display'),
                editWidget: (value, onChange) => Text('Current: $value'),
                onUpdate: mockUpdateApi,
              ),
            ),
          ),
        );

        expect(find.text('Current: test-value'), findsOneWidget);
      });
    });

    group('Value Changes', () {
      testWidgets('triggers update when edit widget calls onChange', (
        tester,
      ) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: EditableField<dynamic, bool>(
                value: true,
                displayWidget: const Text('Display'),
                editWidget: (value, onChange) => ElevatedButton(
                  onPressed: () => onChange(false),
                  child: const Text('Toggle'),
                ),
                onUpdate: mockUpdateApi,
                confirmationConfig: null,
              ),
            ),
          ),
        );

        await tester.tap(find.text('Toggle'));
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 100));

        expect(updateCallCount, 1);
        expect(lastUpdateValue, false);
      });

      testWidgets('skips update when value unchanged', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: EditableField<dynamic, bool>(
                value: true,
                displayWidget: const Text('Display'),
                editWidget: (value, onChange) => ElevatedButton(
                  onPressed: () => onChange(true), // Same value
                  child: const Text('Update'),
                ),
                onUpdate: mockUpdateApi,
              ),
            ),
          ),
        );

        await tester.tap(find.text('Update'));
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 100));

        expect(updateCallCount, 0); // Should skip
      });
    });

    group('Confirmation Dialog', () {
      testWidgets('shows confirmation dialog when configured', (tester) async {
        final config = ConfirmationConfig(
          title: 'Confirm Change',
          getMessage: (value) => 'Set to $value?',
        );

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: EditableField<dynamic, bool>(
                value: true,
                displayWidget: const Text('Display'),
                editWidget: (value, onChange) => ElevatedButton(
                  onPressed: () => onChange(false),
                  child: const Text('Change'),
                ),
                onUpdate: mockUpdateApi,
                confirmationConfig: config,
              ),
            ),
          ),
        );

        await tester.tap(find.text('Change'));
        await tester.pump();

        expect(find.text('Confirm Change'), findsOneWidget);
        expect(find.text('Set to false?'), findsOneWidget);
      });

      testWidgets('proceeds with update when confirmed', (tester) async {
        final config = ConfirmationConfig(
          title: 'Confirm',
          getMessage: (_) => 'Are you sure?',
        );

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: EditableField<dynamic, bool>(
                value: true,
                displayWidget: const Text('Display'),
                editWidget: (value, onChange) => ElevatedButton(
                  onPressed: () => onChange(false),
                  child: const Text('Change'),
                ),
                onUpdate: mockUpdateApi,
                confirmationConfig: config,
              ),
            ),
          ),
        );

        await tester.tap(find.text('Change'));
        await tester.pump();

        // Tap specifically the elevated button with "Confirm" text (dialog action)
        await tester.tap(find.widgetWithText(ElevatedButton, 'Confirm'));
        await tester.pumpAndSettle();

        expect(updateCallCount, 1);
        expect(lastUpdateValue, false);
      });

      testWidgets('cancels update when dialog dismissed', (tester) async {
        final config = ConfirmationConfig(
          title: 'Confirm',
          getMessage: (_) => 'Are you sure?',
        );

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: EditableField<dynamic, bool>(
                value: true,
                displayWidget: const Text('Display'),
                editWidget: (value, onChange) => ElevatedButton(
                  onPressed: () => onChange(false),
                  child: const Text('Change'),
                ),
                onUpdate: mockUpdateApi,
                confirmationConfig: config,
              ),
            ),
          ),
        );

        await tester.tap(find.text('Change'));
        await tester.pump();

        await tester.tap(find.text('Cancel'));
        await tester.pump();

        expect(updateCallCount, 0);
      });

      testWidgets('skips confirmation when config is null', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: EditableField<dynamic, bool>(
                value: true,
                displayWidget: const Text('Display'),
                editWidget: (value, onChange) => ElevatedButton(
                  onPressed: () => onChange(false),
                  child: const Text('Change'),
                ),
                onUpdate: mockUpdateApi,
                confirmationConfig: null,
              ),
            ),
          ),
        );

        await tester.tap(find.text('Change'));
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 100));

        expect(find.text('Confirm'), findsNothing);
        expect(updateCallCount, 1);
      });
    });

    group('Loading States', () {
      testWidgets('shows loading indicator during update', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: EditableField<dynamic, bool>(
                value: true,
                displayWidget: const Text('Display'),
                editWidget: (value, onChange) => ElevatedButton(
                  onPressed: () => onChange(false),
                  child: const Text('Change'),
                ),
                onUpdate: (value) async {
                  await Future.delayed(const Duration(milliseconds: 100));
                  return true;
                },
                confirmationConfig: null,
                showLoading: true,
              ),
            ),
          ),
        );

        await tester.tap(find.text('Change'));
        await tester.pump();

        expect(find.byType(CircularProgressIndicator), findsOneWidget);

        // Let the async operation complete
        await tester.pumpAndSettle();
      });

      testWidgets('hides loading when showLoading is false', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: EditableField<dynamic, bool>(
                value: true,
                displayWidget: const Text('Display'),
                editWidget: (value, onChange) => ElevatedButton(
                  onPressed: () => onChange(false),
                  child: const Text('Change'),
                ),
                onUpdate: (value) async {
                  await Future.delayed(const Duration(milliseconds: 10));
                  return true;
                },
                confirmationConfig: null,
                showLoading: false,
              ),
            ),
          ),
        );

        await tester.tap(find.text('Change'));
        await tester.pump();

        expect(find.byType(CircularProgressIndicator), findsNothing);
        expect(find.text('Change'), findsOneWidget);

        // Let the async operation complete
        await tester.pumpAndSettle();
      });
    });

    group('Success Handling', () {
      testWidgets('shows success message after successful update', (
        tester,
      ) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: EditableField<dynamic, bool>(
                value: true,
                displayWidget: const Text('Display'),
                editWidget: (value, onChange) => ElevatedButton(
                  onPressed: () => onChange(false),
                  child: const Text('Change'),
                ),
                onUpdate: mockUpdateApi,
                confirmationConfig: null,
              ),
            ),
          ),
        );

        await tester.tap(find.text('Change'));
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 100));

        expect(find.text('Updated successfully'), findsOneWidget);
      });

      testWidgets('calls onChanged callback after success', (tester) async {
        bool onChangedCalled = false;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: EditableField<dynamic, bool>(
                value: true,
                displayWidget: const Text('Display'),
                editWidget: (value, onChange) => ElevatedButton(
                  onPressed: () => onChange(false),
                  child: const Text('Change'),
                ),
                onUpdate: mockUpdateApi,
                onChanged: () {
                  onChangedCalled = true;
                },
                confirmationConfig: null,
              ),
            ),
          ),
        );

        await tester.tap(find.text('Change'));
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 100));

        expect(onChangedCalled, true);
      });
    });

    group('Error Handling', () {
      testWidgets('shows error message when API returns false', (tester) async {
        shouldSucceed = false;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: EditableField<dynamic, bool>(
                value: true,
                displayWidget: const Text('Display'),
                editWidget: (value, onChange) => ElevatedButton(
                  onPressed: () => onChange(false),
                  child: const Text('Change'),
                ),
                onUpdate: mockUpdateApi,
                confirmationConfig: null,
              ),
            ),
          ),
        );

        await tester.tap(find.text('Change'));
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 100));

        expect(find.text('Update failed'), findsOneWidget);
      });

      testWidgets('shows error message when API throws exception', (
        tester,
      ) async {
        lastError = Exception('Network error');

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: EditableField<dynamic, bool>(
                value: true,
                displayWidget: const Text('Display'),
                editWidget: (value, onChange) => ElevatedButton(
                  onPressed: () => onChange(false),
                  child: const Text('Change'),
                ),
                onUpdate: mockUpdateApi,
                confirmationConfig: null,
              ),
            ),
          ),
        );

        await tester.tap(find.text('Change'));
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 100));

        expect(find.textContaining('Error:'), findsOneWidget);
        expect(find.textContaining('Network error'), findsOneWidget);
      });

      testWidgets('does not call onChanged after error', (tester) async {
        shouldSucceed = false;
        bool onChangedCalled = false;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: EditableField<dynamic, bool>(
                value: true,
                displayWidget: const Text('Display'),
                editWidget: (value, onChange) => ElevatedButton(
                  onPressed: () => onChange(false),
                  child: const Text('Change'),
                ),
                onUpdate: mockUpdateApi,
                onChanged: () {
                  onChangedCalled = true;
                },
                confirmationConfig: null,
              ),
            ),
          ),
        );

        await tester.tap(find.text('Change'));
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 100));

        expect(onChangedCalled, false);
      });
    });

    group('ConfirmationConfig', () {
      test('boolean factory creates appropriate messages', () {
        final config = ConfirmationConfig.boolean(
          fieldName: 'Status',
          trueAction: 'activate',
          falseAction: 'deactivate',
        );

        expect(config.title, 'Change Status?');
        expect(config.getMessage(true), contains('activate'));
        expect(config.getMessage(false), contains('deactivate'));
        expect(config.isDangerous, false);
      });

      test('text factory creates appropriate messages', () {
        final config = ConfirmationConfig.text(fieldName: 'Email');

        expect(config.title, 'Update Email?');
        expect(
          config.getMessage('test@example.com'),
          contains('test@example.com'),
        );
      });

      test('custom config allows full customization', () {
        final config = ConfirmationConfig(
          title: 'Custom Title',
          getMessage: (value) => 'Custom message with $value',
          isDangerous: true,
        );

        expect(config.title, 'Custom Title');
        expect(config.getMessage('test'), 'Custom message with test');
        expect(config.isDangerous, true);
      });
    });

    group('Type Safety', () {
      testWidgets('works with bool type', (tester) async {
        bool? receivedValue;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: EditableField<dynamic, bool>(
                value: true,
                displayWidget: const Text('Display'),
                editWidget: (value, onChange) => ElevatedButton(
                  onPressed: () => onChange(false),
                  child: const Text('Change'),
                ),
                onUpdate: (value) async {
                  receivedValue = value;
                  return true;
                },
                confirmationConfig: null,
              ),
            ),
          ),
        );

        await tester.tap(find.text('Change'));
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 100));

        expect(receivedValue, false);
        expect(receivedValue is bool, true);
      });

      testWidgets('works with String type', (tester) async {
        String? receivedValue;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: EditableField<dynamic, String>(
                value: 'old',
                displayWidget: const Text('Display'),
                editWidget: (value, onChange) => ElevatedButton(
                  onPressed: () => onChange('new'),
                  child: const Text('Change'),
                ),
                onUpdate: (value) async {
                  receivedValue = value;
                  return true;
                },
                confirmationConfig: null,
              ),
            ),
          ),
        );

        await tester.tap(find.text('Change'));
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 100));

        expect(receivedValue, 'new');
        expect(receivedValue is String, true);
      });

      testWidgets('works with int type', (tester) async {
        int? receivedValue;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: EditableField<dynamic, int>(
                value: 5,
                displayWidget: const Text('Display'),
                editWidget: (value, onChange) => ElevatedButton(
                  onPressed: () => onChange(10),
                  child: const Text('Change'),
                ),
                onUpdate: (value) async {
                  receivedValue = value;
                  return true;
                },
                confirmationConfig: null,
              ),
            ),
          ),
        );

        await tester.tap(find.text('Change'));
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 100));

        expect(receivedValue, 10);
        expect(receivedValue is int, true);
      });
    });
  });
}
