import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/atoms/inputs/text_input.dart';

void main() {
  group('TextInput', () {
    testWidgets('renders with value', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: TextInput(value: 'John Doe', onChanged: (_) {}),
          ),
        ),
      );

      // Atom only renders the input field with value, no label
      expect(find.text('John Doe'), findsOneWidget);
      expect(find.byType(TextField), findsOneWidget);
    });

    testWidgets('calls onChanged when text is entered', (tester) async {
      String? changedValue;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: TextInput(
              value: '',
              onChanged: (value) => changedValue = value,
            ),
          ),
        ),
      );

      await tester.enterText(find.byType(TextField), 'New Value');
      expect(changedValue, 'New Value');
    });

    testWidgets('displays error text when provided', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: TextInput(
              value: 'invalid',
              onChanged: (_) {},
              errorText: 'Invalid email format',
            ),
          ),
        ),
      );

      expect(find.text('Invalid email format'), findsOneWidget);
    });

    testWidgets('displays helper text when provided', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: TextInput(
              value: '',
              onChanged: (_) {},
              helperText: 'Must be at least 8 characters',
            ),
          ),
        ),
      );

      expect(find.text('Must be at least 8 characters'), findsOneWidget);
    });

    testWidgets('shows placeholder text', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: TextInput(
              value: '',
              onChanged: (_) {},
              placeholder: 'Enter your name',
            ),
          ),
        ),
      );

      expect(find.text('Enter your name'), findsOneWidget);
    });

    testWidgets('obscures text when obscureText is true', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: TextInput(
              value: 'secret123',
              onChanged: (_) {},
              obscureText: true,
            ),
          ),
        ),
      );

      final textField = tester.widget<TextField>(find.byType(TextField));
      expect(textField.obscureText, true);
    });

    testWidgets('shows visibility toggle for password fields', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: TextInput(
              value: 'secret',
              onChanged: (_) {},
              obscureText: true,
            ),
          ),
        ),
      );

      // Should show visibility_off icon initially
      expect(find.byIcon(Icons.visibility_off), findsOneWidget);

      // Tap to toggle visibility
      await tester.tap(find.byIcon(Icons.visibility_off));
      await tester.pump();

      // Should now show visibility icon
      expect(find.byIcon(Icons.visibility), findsOneWidget);
    });

    testWidgets('disables input when enabled is false', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: TextInput(value: 'John', onChanged: (_) {}, enabled: false),
          ),
        ),
      );

      final textField = tester.widget<TextField>(find.byType(TextField));
      expect(textField.enabled, false);
    });

    testWidgets('shows prefix icon when provided', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: TextInput(
              value: '',
              onChanged: (_) {},
              prefixIcon: Icons.email,
            ),
          ),
        ),
      );

      expect(find.byIcon(Icons.email), findsOneWidget);
    });

    testWidgets('shows suffix icon when provided', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: TextInput(
              value: '',
              onChanged: (_) {},
              suffixIcon: Icons.search,
            ),
          ),
        ),
      );

      expect(find.byIcon(Icons.search), findsOneWidget);
    });

    testWidgets('uses correct keyboard type for email', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: TextInput(
              value: '',
              onChanged: (_) {},
              type: TextFieldType.email,
            ),
          ),
        ),
      );

      final textField = tester.widget<TextField>(find.byType(TextField));
      expect(textField.keyboardType, TextInputType.emailAddress);
    });

    testWidgets('uses correct keyboard type for phone', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: TextInput(
              value: '',
              onChanged: (_) {},
              type: TextFieldType.phone,
            ),
          ),
        ),
      );

      final textField = tester.widget<TextField>(find.byType(TextField));
      expect(textField.keyboardType, TextInputType.phone);
    });

    testWidgets('updates value when changed externally', (tester) async {
      String value = 'Initial';

      await tester.pumpWidget(
        StatefulBuilder(
          builder: (context, setState) {
            return MaterialApp(
              home: Scaffold(
                body: Column(
                  children: [
                    TextInput(
                      value: value,
                      onChanged: (newValue) {
                        setState(() => value = newValue);
                      },
                    ),
                    ElevatedButton(
                      onPressed: () {
                        setState(() => value = 'Updated');
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

      expect(find.text('Initial'), findsOneWidget);

      await tester.tap(find.text('Update'));
      await tester.pump();

      expect(find.text('Updated'), findsOneWidget);
    });

    testWidgets('respects maxLength constraint', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: TextInput(value: '', onChanged: (_) {}, maxLength: 10),
          ),
        ),
      );

      final textField = tester.widget<TextField>(find.byType(TextField));
      expect(textField.maxLength, 10);
    });

    testWidgets('supports multi-line input', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: TextInput(value: '', onChanged: (_) {}, maxLines: 3),
          ),
        ),
      );

      final textField = tester.widget<TextField>(find.byType(TextField));
      expect(textField.maxLines, 3);
    });

    testWidgets('disables autocorrect when specified', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: TextInput(value: '', onChanged: (_) {}, autocorrect: false),
          ),
        ),
      );

      final textField = tester.widget<TextField>(find.byType(TextField));
      expect(textField.autocorrect, false);
    });

    testWidgets('disables suggestions when specified', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: TextInput(
              value: '',
              onChanged: (_) {},
              enableSuggestions: false,
            ),
          ),
        ),
      );

      final textField = tester.widget<TextField>(find.byType(TextField));
      expect(textField.enableSuggestions, false);
    });
  });
}
