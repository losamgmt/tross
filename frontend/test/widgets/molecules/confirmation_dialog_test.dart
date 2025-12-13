/// Tests for ConfirmationDialog Molecule
///
/// Verifies:
/// - Title and message are displayed correctly
/// - Button labels are customizable
/// - Confirm callback is called
/// - Cancel callback is called
/// - Dialog pops with correct value
/// - Dangerous action styling
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/molecules/dialogs/confirmation_dialog.dart';

void main() {
  group('ConfirmationDialog Molecule', () {
    group('Basic Dialog', () {
      testWidgets('displays title', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: ConfirmationDialog(
                title: 'Test Title',
                message: 'Test Message',
                onConfirm: () {},
              ),
            ),
          ),
        );

        expect(find.text('Test Title'), findsOneWidget);
      });

      testWidgets('displays message', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: ConfirmationDialog(
                title: 'Test Title',
                message: 'This is the message content',
                onConfirm: () {},
              ),
            ),
          ),
        );

        expect(find.text('This is the message content'), findsOneWidget);
      });

      testWidgets('displays default button labels', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: ConfirmationDialog(
                title: 'Test',
                message: 'Message',
                onConfirm: () {},
              ),
            ),
          ),
        );

        expect(find.text('Confirm'), findsOneWidget);
        expect(find.text('Cancel'), findsOneWidget);
      });

      testWidgets('displays custom button labels', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: ConfirmationDialog(
                title: 'Test',
                message: 'Message',
                confirmLabel: 'Yes, Do It',
                cancelLabel: 'No, Go Back',
                onConfirm: () {},
              ),
            ),
          ),
        );

        expect(find.text('Yes, Do It'), findsOneWidget);
        expect(find.text('No, Go Back'), findsOneWidget);
      });
    });

    group('Interactions', () {
      testWidgets('calls onConfirm when confirm button tapped', (tester) async {
        var confirmCalled = false;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: ConfirmationDialog(
                title: 'Test',
                message: 'Message',
                onConfirm: () => confirmCalled = true,
              ),
            ),
          ),
        );

        await tester.tap(find.text('Confirm'));
        await tester.pumpAndSettle();

        expect(confirmCalled, isTrue);
      });

      testWidgets('calls onCancel when cancel button tapped', (tester) async {
        var cancelCalled = false;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: ConfirmationDialog(
                title: 'Test',
                message: 'Message',
                onConfirm: () {},
                onCancel: () => cancelCalled = true,
              ),
            ),
          ),
        );

        await tester.tap(find.text('Cancel'));
        await tester.pumpAndSettle();

        expect(cancelCalled, isTrue);
      });

      testWidgets('pops dialog with true when confirmed', (tester) async {
        bool? result;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: Builder(
                builder: (context) {
                  return ElevatedButton(
                    onPressed: () async {
                      result = await showDialog<bool>(
                        context: context,
                        builder: (context) => ConfirmationDialog(
                          title: 'Test',
                          message: 'Message',
                          onConfirm: () {},
                        ),
                      );
                    },
                    child: const Text('Show Dialog'),
                  );
                },
              ),
            ),
          ),
        );

        // Show the dialog
        await tester.tap(find.text('Show Dialog'));
        await tester.pumpAndSettle();

        // Confirm
        await tester.tap(find.text('Confirm'));
        await tester.pumpAndSettle();

        expect(result, isTrue);
      });

      testWidgets('pops dialog with false when cancelled', (tester) async {
        bool? result;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: Builder(
                builder: (context) {
                  return ElevatedButton(
                    onPressed: () async {
                      result = await showDialog<bool>(
                        context: context,
                        builder: (context) => ConfirmationDialog(
                          title: 'Test',
                          message: 'Message',
                          onConfirm: () {},
                        ),
                      );
                    },
                    child: const Text('Show Dialog'),
                  );
                },
              ),
            ),
          ),
        );

        // Show the dialog
        await tester.tap(find.text('Show Dialog'));
        await tester.pumpAndSettle();

        // Cancel
        await tester.tap(find.text('Cancel'));
        await tester.pumpAndSettle();

        expect(result, isFalse);
      });
    });

    group('Edge Cases', () {
      testWidgets('handles long messages', (tester) async {
        const longMessage =
            'This is a very long message that should still '
            'be displayed correctly in the dialog. It should wrap properly '
            'and not cause any layout issues. The dialog should remain readable.';

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: ConfirmationDialog(
                title: 'Long Message Test',
                message: longMessage,
                onConfirm: () {},
              ),
            ),
          ),
        );

        expect(find.text(longMessage), findsOneWidget);
      });

      testWidgets('handles special characters in names', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: ConfirmationDialog(
                title: 'Deactivate User?',
                message: "Are you sure you want to deactivate O'Brien-Smith?",
                confirmLabel: 'Deactivate',
                isDangerous: true,
                onConfirm: () {},
              ),
            ),
          ),
        );

        expect(find.textContaining("O'Brien-Smith"), findsOneWidget);
      });

      testWidgets('onCancel is optional', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: ConfirmationDialog(
                title: 'Test',
                message: 'Message',
                onConfirm: () {},
                // onCancel not provided
              ),
            ),
          ),
        );

        // Should still show cancel button
        expect(find.text('Cancel'), findsOneWidget);

        // Tapping cancel should still work (closes dialog)
        await tester.tap(find.text('Cancel'));
        await tester.pumpAndSettle();
      });
    });
  });
}
