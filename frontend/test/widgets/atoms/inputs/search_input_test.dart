/// Tests for SearchInput Atom
///
/// Verifies:
/// - Basic rendering with placeholder
/// - Search icon display
/// - Text input and onChanged callback
/// - Clear button functionality
/// - Compact mode
/// - Enabled/disabled states
/// - onSubmitted callback
/// - External value sync
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/atoms/inputs/search_input.dart';

void main() {
  group('SearchInput Atom', () {
    group('Basic Rendering', () {
      testWidgets('displays placeholder text', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: SearchInput(
                value: '',
                onChanged: (_) {},
                placeholder: 'Search users...',
              ),
            ),
          ),
        );

        expect(find.text('Search users...'), findsOneWidget);
      });

      testWidgets('displays default placeholder when not specified', (
        tester,
      ) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: SearchInput(value: '', onChanged: (_) {}),
            ),
          ),
        );

        expect(find.text('Search...'), findsOneWidget);
      });

      testWidgets('displays current value', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: SearchInput(value: 'existing query', onChanged: (_) {}),
            ),
          ),
        );

        expect(find.text('existing query'), findsOneWidget);
      });

      testWidgets('displays search icon by default', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: SearchInput(value: '', onChanged: (_) {}),
            ),
          ),
        );

        expect(find.byIcon(Icons.search), findsOneWidget);
      });

      testWidgets('displays custom leading icon', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: SearchInput(
                value: '',
                onChanged: (_) {},
                leadingIcon: Icons.filter_list,
              ),
            ),
          ),
        );

        expect(find.byIcon(Icons.filter_list), findsOneWidget);
        expect(find.byIcon(Icons.search), findsNothing);
      });
    });

    group('Input Interaction', () {
      testWidgets('calls onChanged when typing', (tester) async {
        String capturedValue = '';

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: SearchInput(
                value: '',
                onChanged: (value) => capturedValue = value,
              ),
            ),
          ),
        );

        await tester.enterText(find.byType(TextField), 'test query');
        expect(capturedValue, 'test query');
      });

      testWidgets('calls onSubmitted when pressing Enter', (tester) async {
        String? submittedValue;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: SearchInput(
                value: '',
                onChanged: (_) {},
                onSubmitted: (value) => submittedValue = value,
              ),
            ),
          ),
        );

        await tester.enterText(find.byType(TextField), 'search term');
        await tester.testTextInput.receiveAction(TextInputAction.done);
        await tester.pump();

        expect(submittedValue, 'search term');
      });
    });

    group('Clear Button', () {
      testWidgets('shows clear button when has text', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: SearchInput(value: 'some text', onChanged: (_) {}),
            ),
          ),
        );

        expect(find.byIcon(Icons.clear), findsOneWidget);
      });

      testWidgets('hides clear button when empty', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: SearchInput(value: '', onChanged: (_) {}),
            ),
          ),
        );

        expect(find.byIcon(Icons.clear), findsNothing);
      });

      testWidgets('clears text when clear button tapped', (tester) async {
        String currentValue = 'test';

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: StatefulBuilder(
                builder: (context, setState) => SearchInput(
                  value: currentValue,
                  onChanged: (value) => setState(() => currentValue = value),
                ),
              ),
            ),
          ),
        );

        expect(find.text('test'), findsOneWidget);

        await tester.tap(find.byIcon(Icons.clear));
        await tester.pump();

        expect(currentValue, '');
      });

      testWidgets('respects showClearButton=false', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: SearchInput(
                value: 'has text',
                onChanged: (_) {},
                showClearButton: false,
              ),
            ),
          ),
        );

        expect(find.byIcon(Icons.clear), findsNothing);
      });

      testWidgets('hides clear button when disabled', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: SearchInput(
                value: 'has text',
                onChanged: (_) {},
                enabled: false,
              ),
            ),
          ),
        );

        expect(find.byIcon(Icons.clear), findsNothing);
      });
    });

    group('Compact Mode', () {
      testWidgets('standard mode uses larger icon', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: SearchInput(value: '', onChanged: (_) {}, compact: false),
            ),
          ),
        );

        final icon = tester.widget<Icon>(find.byIcon(Icons.search));
        expect(icon.size, 20.0);
      });

      testWidgets('compact mode uses smaller icon', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: SearchInput(value: '', onChanged: (_) {}, compact: true),
            ),
          ),
        );

        final icon = tester.widget<Icon>(find.byIcon(Icons.search));
        expect(icon.size, 18.0);
      });
    });

    group('Enabled/Disabled States', () {
      testWidgets('enabled state allows input', (tester) async {
        String value = '';

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: SearchInput(
                value: value,
                onChanged: (v) => value = v,
                enabled: true,
              ),
            ),
          ),
        );

        await tester.enterText(find.byType(TextField), 'typed');
        expect(value, 'typed');
      });

      testWidgets('disabled state prevents input', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: SearchInput(value: '', onChanged: (_) {}, enabled: false),
            ),
          ),
        );

        final textField = tester.widget<TextField>(find.byType(TextField));
        expect(textField.enabled, false);
      });
    });

    group('External Value Sync', () {
      testWidgets('updates when external value changes', (tester) async {
        String externalValue = 'initial';

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: StatefulBuilder(
                builder: (context, setState) => Column(
                  children: [
                    SearchInput(
                      value: externalValue,
                      onChanged: (v) => setState(() => externalValue = v),
                    ),
                    ElevatedButton(
                      onPressed: () => setState(() => externalValue = 'reset'),
                      child: const Text('Reset'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );

        expect(find.text('initial'), findsOneWidget);

        await tester.tap(find.text('Reset'));
        await tester.pump();

        expect(find.text('reset'), findsOneWidget);
      });
    });

    group('Autofocus', () {
      testWidgets('respects autofocus=true', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: SearchInput(value: '', onChanged: (_) {}, autofocus: true),
            ),
          ),
        );

        final textField = tester.widget<TextField>(find.byType(TextField));
        expect(textField.autofocus, true);
      });

      testWidgets('default autofocus is false', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: SearchInput(value: '', onChanged: (_) {}),
            ),
          ),
        );

        final textField = tester.widget<TextField>(find.byType(TextField));
        expect(textField.autofocus, false);
      });
    });

    group('Styling', () {
      testWidgets('has rounded border', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: SearchInput(value: '', onChanged: (_) {}),
            ),
          ),
        );

        final textField = tester.widget<TextField>(find.byType(TextField));
        final decoration = textField.decoration!;
        expect(decoration.border, isA<OutlineInputBorder>());
      });

      testWidgets('has filled background', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: SearchInput(value: '', onChanged: (_) {}),
            ),
          ),
        );

        final textField = tester.widget<TextField>(find.byType(TextField));
        final decoration = textField.decoration!;
        expect(decoration.filled, true);
      });
    });
  });
}
