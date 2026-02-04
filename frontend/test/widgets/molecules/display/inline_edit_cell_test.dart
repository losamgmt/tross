/// Tests for InlineEditCell Molecule
///
/// Verifies:
/// - Display mode rendering
/// - Edit mode rendering
/// - Edit trigger types (double tap, single tap, long press)
/// - Edit hint icon visibility
/// - Enabled/disabled states
/// - Custom display widgets
/// - InlineEditTextField helper widget
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross/widgets/molecules/display/inline_edit_cell.dart';

void main() {
  group('InlineEditCell', () {
    group('display mode', () {
      testWidgets('renders value as text when not editing', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: InlineEditCell(
                value: 'Test Value',
                isEditing: false,
                editWidget: TextField(),
              ),
            ),
          ),
        );

        expect(find.text('Test Value'), findsOneWidget);
        expect(find.byType(TextField), findsNothing);
      });

      testWidgets('renders custom displayWidget when provided', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: InlineEditCell(
                value: 'ignored',
                displayWidget: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: const [Icon(Icons.star), Text('Custom Display')],
                ),
                isEditing: false,
                editWidget: const TextField(),
              ),
            ),
          ),
        );

        expect(find.text('Custom Display'), findsOneWidget);
        expect(find.byIcon(Icons.star), findsOneWidget);
        expect(find.text('ignored'), findsNothing);
      });

      testWidgets('shows edit hint icon when showEditHint is true', (
        tester,
      ) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: InlineEditCell(
                value: 'Value',
                isEditing: false,
                showEditHint: true,
                editIcon: Icons.edit,
                editWidget: TextField(),
              ),
            ),
          ),
        );

        expect(find.byIcon(Icons.edit), findsOneWidget);
      });

      testWidgets('hides edit hint icon when showEditHint is false', (
        tester,
      ) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: InlineEditCell(
                value: 'Value',
                isEditing: false,
                showEditHint: false,
                editWidget: TextField(),
              ),
            ),
          ),
        );

        expect(find.byIcon(Icons.edit), findsNothing);
      });

      testWidgets('uses custom edit icon', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: InlineEditCell(
                value: 'Value',
                isEditing: false,
                showEditHint: true,
                editIcon: Icons.create,
                editWidget: TextField(),
              ),
            ),
          ),
        );

        expect(find.byIcon(Icons.create), findsOneWidget);
      });
    });

    group('edit mode', () {
      testWidgets('renders editWidget when isEditing is true', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: InlineEditCell(
                value: 'Value',
                isEditing: true,
                editWidget: TextField(key: Key('edit-field')),
              ),
            ),
          ),
        );

        expect(find.byKey(const Key('edit-field')), findsOneWidget);
        expect(find.text('Value'), findsNothing);
      });

      testWidgets('hides display content when editing', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: InlineEditCell(
                value: 'Display Value',
                isEditing: true,
                editWidget: TextField(),
              ),
            ),
          ),
        );

        expect(find.text('Display Value'), findsNothing);
        expect(find.byType(TextField), findsOneWidget);
      });
    });

    group('edit triggers', () {
      testWidgets('calls onEditStart on double tap by default', (tester) async {
        var editStarted = false;
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: InlineEditCell(
                value: 'Value',
                isEditing: false,
                onEditStart: () => editStarted = true,
                editWidget: const TextField(),
              ),
            ),
          ),
        );

        await tester.tap(find.text('Value'));
        await tester.pump(const Duration(milliseconds: 50));
        await tester.tap(find.text('Value'));
        await tester.pumpAndSettle();

        expect(editStarted, isTrue);
      });

      testWidgets('calls onEditStart on single tap when configured', (
        tester,
      ) async {
        var editStarted = false;
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: InlineEditCell(
                value: 'Value',
                isEditing: false,
                onEditStart: () => editStarted = true,
                editTrigger: InlineEditTrigger.singleTap,
                editWidget: const TextField(),
              ),
            ),
          ),
        );

        await tester.tap(find.text('Value'));
        await tester.pumpAndSettle();

        expect(editStarted, isTrue);
      });

      testWidgets('calls onEditStart on long press when configured', (
        tester,
      ) async {
        var editStarted = false;
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: InlineEditCell(
                value: 'Value',
                isEditing: false,
                onEditStart: () => editStarted = true,
                editTrigger: InlineEditTrigger.longPress,
                editWidget: const TextField(),
              ),
            ),
          ),
        );

        await tester.longPress(find.text('Value'));
        await tester.pumpAndSettle();

        expect(editStarted, isTrue);
      });
    });

    group('enabled state', () {
      testWidgets('does not call onEditStart when disabled', (tester) async {
        var editStarted = false;
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: InlineEditCell(
                value: 'Value',
                isEditing: false,
                onEditStart: () => editStarted = true,
                enabled: false,
                editTrigger: InlineEditTrigger.singleTap,
                editWidget: const TextField(),
              ),
            ),
          ),
        );

        await tester.tap(find.text('Value'));
        await tester.pumpAndSettle();

        expect(editStarted, isFalse);
      });

      testWidgets('has reduced opacity when disabled', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: InlineEditCell(
                value: 'Value',
                isEditing: false,
                enabled: false,
                editWidget: TextField(),
              ),
            ),
          ),
        );

        final opacity = tester.widget<Opacity>(find.byType(Opacity));
        expect(opacity.opacity, equals(0.5));
      });

      testWidgets('hides edit hint when disabled', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: InlineEditCell(
                value: 'Value',
                isEditing: false,
                showEditHint: true,
                enabled: false,
                editWidget: TextField(),
              ),
            ),
          ),
        );

        expect(find.byIcon(Icons.edit), findsNothing);
      });
    });
  });

  group('InlineEditTextField', () {
    testWidgets('renders with initial value', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(body: InlineEditTextField(initialValue: 'Initial')),
        ),
      );

      expect(find.text('Initial'), findsOneWidget);
    });

    testWidgets('calls onSubmit when submitted', (tester) async {
      String? submittedValue;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: InlineEditTextField(
              initialValue: 'Start',
              onSubmit: (value) => submittedValue = value,
            ),
          ),
        ),
      );

      await tester.enterText(find.byType(TextField), 'New Value');
      await tester.testTextInput.receiveAction(TextInputAction.done);
      await tester.pumpAndSettle();

      expect(submittedValue, equals('New Value'));
    });

    testWidgets('auto-focuses by default', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: InlineEditTextField(initialValue: 'Value', autofocus: true),
          ),
        ),
      );

      await tester.pumpAndSettle();

      final textField = tester.widget<TextField>(find.byType(TextField));
      expect(textField.autofocus, isTrue);
    });
  });

  group('InlineEditTrigger', () {
    testWidgets('doubleTap requires two taps', (tester) async {
      var tapCount = 0;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: InlineEditCell(
              value: 'Value',
              isEditing: false,
              onEditStart: () => tapCount++,
              editTrigger: InlineEditTrigger.doubleTap,
              editWidget: const TextField(),
            ),
          ),
        ),
      );

      // Single tap should not trigger
      await tester.tap(find.text('Value'));
      await tester.pumpAndSettle();
      expect(tapCount, equals(0));

      // Double tap should trigger
      await tester.tap(find.text('Value'));
      await tester.pump(const Duration(milliseconds: 50));
      await tester.tap(find.text('Value'));
      await tester.pumpAndSettle();
      expect(tapCount, equals(1));
    });
  });
}
