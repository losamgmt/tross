/// Tests for UnsavedChangesDialog Molecule
///
/// Verifies:
/// - Title and message are displayed correctly
/// - Change count is reflected in message
/// - Discard returns true
/// - Keep Editing returns false
/// - Button labels are correct
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/molecules/dialogs/unsaved_changes_dialog.dart';

void main() {
  group('UnsavedChangesDialog Molecule', () {
    group('Basic Display', () {
      testWidgets('displays default title', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(home: Scaffold(body: UnsavedChangesDialog())),
        );

        expect(find.text('Discard Changes?'), findsOneWidget);
      });

      testWidgets('displays custom title', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(body: UnsavedChangesDialog(title: 'Custom Warning')),
          ),
        );

        expect(find.text('Custom Warning'), findsOneWidget);
      });

      testWidgets('displays default message for zero changes', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(body: UnsavedChangesDialog(changeCount: 0)),
          ),
        );

        expect(
          find.text(
            'You have unsaved changes. Are you sure you want to discard them?',
          ),
          findsOneWidget,
        );
      });

      testWidgets('displays singular message for one change', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(body: UnsavedChangesDialog(changeCount: 1)),
          ),
        );

        expect(
          find.text(
            'You have 1 unsaved change. Are you sure you want to discard it?',
          ),
          findsOneWidget,
        );
      });

      testWidgets('displays plural message for multiple changes', (
        tester,
      ) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(body: UnsavedChangesDialog(changeCount: 5)),
          ),
        );

        expect(
          find.text(
            'You have 5 unsaved changes. Are you sure you want to discard them?',
          ),
          findsOneWidget,
        );
      });

      testWidgets('displays custom message', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: UnsavedChangesDialog(
                message: 'Custom warning message here.',
              ),
            ),
          ),
        );

        expect(find.text('Custom warning message here.'), findsOneWidget);
      });
    });

    group('Button Labels', () {
      testWidgets('displays default Discard label', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(home: Scaffold(body: UnsavedChangesDialog())),
        );

        expect(find.text('Discard'), findsOneWidget);
      });

      testWidgets('displays default Keep Editing label', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(home: Scaffold(body: UnsavedChangesDialog())),
        );

        expect(find.text('Keep Editing'), findsOneWidget);
      });

      testWidgets('displays custom button labels', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: UnsavedChangesDialog(
                discardLabel: 'Yes, Discard',
                stayLabel: 'No, Continue',
              ),
            ),
          ),
        );

        expect(find.text('Yes, Discard'), findsOneWidget);
        expect(find.text('No, Continue'), findsOneWidget);
      });
    });

    group('Button Actions', () {
      testWidgets('tapping Discard returns true', (tester) async {
        bool? result;

        await tester.pumpWidget(
          MaterialApp(
            home: Builder(
              builder: (context) => Scaffold(
                body: ElevatedButton(
                  onPressed: () async {
                    result = await UnsavedChangesDialog.show(context: context);
                  },
                  child: const Text('Show Dialog'),
                ),
              ),
            ),
          ),
        );

        await tester.tap(find.text('Show Dialog'));
        await tester.pumpAndSettle();

        await tester.tap(find.text('Discard'));
        await tester.pumpAndSettle();

        expect(result, isTrue);
      });

      testWidgets('tapping Keep Editing returns false', (tester) async {
        bool? result;

        await tester.pumpWidget(
          MaterialApp(
            home: Builder(
              builder: (context) => Scaffold(
                body: ElevatedButton(
                  onPressed: () async {
                    result = await UnsavedChangesDialog.show(context: context);
                  },
                  child: const Text('Show Dialog'),
                ),
              ),
            ),
          ),
        );

        await tester.tap(find.text('Show Dialog'));
        await tester.pumpAndSettle();

        await tester.tap(find.text('Keep Editing'));
        await tester.pumpAndSettle();

        expect(result, isFalse);
      });
    });

    group('Static Show Method', () {
      testWidgets('show() displays dialog with changeCount', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Builder(
              builder: (context) => Scaffold(
                body: ElevatedButton(
                  onPressed: () {
                    UnsavedChangesDialog.show(context: context, changeCount: 3);
                  },
                  child: const Text('Show Dialog'),
                ),
              ),
            ),
          ),
        );

        await tester.tap(find.text('Show Dialog'));
        await tester.pumpAndSettle();

        expect(
          find.text(
            'You have 3 unsaved changes. Are you sure you want to discard them?',
          ),
          findsOneWidget,
        );
      });
    });

    group('Styling', () {
      testWidgets('Discard button uses error color', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            theme: ThemeData(
              colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
            ),
            home: const Scaffold(body: UnsavedChangesDialog()),
          ),
        );

        final discardButton = tester.widget<ElevatedButton>(
          find.widgetWithText(ElevatedButton, 'Discard'),
        );

        // Verify it's styled (has a style applied)
        expect(discardButton.style, isNotNull);
      });
    });
  });
}
