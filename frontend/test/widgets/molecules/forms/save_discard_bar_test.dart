/// SaveDiscardBar Tests
///
/// Tests observable BEHAVIOR:
/// - User sees bar when form is dirty
/// - User sees change count indicator
/// - User sees saving progress state
/// - User sees success/error feedback
/// - User taps save, callback fires
/// - User taps discard, callback fires
///
/// NO implementation details:
/// - ❌ Container/decoration inspection
/// - ❌ Widget tree structure
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/providers/editable_form_notifier.dart';
import 'package:tross_app/widgets/molecules/forms/save_discard_bar.dart';

import '../../../helpers/behavioral_test_helpers.dart';

void main() {
  group('SaveDiscardBar', () {
    Widget buildBar({
      bool isDirty = true,
      int changeCount = 1,
      SaveState saveState = SaveState.idle,
      String? saveError,
      VoidCallback? onSave,
      VoidCallback? onDiscard,
      String saveLabel = 'Save Changes',
      String discardLabel = 'Discard',
    }) {
      return MaterialApp(
        home: Scaffold(
          body: Column(
            children: [
              const Spacer(),
              SaveDiscardBar(
                isDirty: isDirty,
                changeCount: changeCount,
                saveState: saveState,
                saveError: saveError,
                onSave: onSave,
                onDiscard: onDiscard,
                saveLabel: saveLabel,
                discardLabel: discardLabel,
              ),
            ],
          ),
        ),
      );
    }

    // =========================================================================
    // Visibility
    // =========================================================================
    group('Visibility', () {
      testWidgets('shows bar when form is dirty', (tester) async {
        await tester.pumpWidget(buildBar(isDirty: true));

        assertTextVisible('Save Changes');
        assertTextVisible('Discard');
      });

      testWidgets('hides bar when form is clean', (tester) async {
        await tester.pumpWidget(buildBar(isDirty: false));

        expect(find.text('Save Changes'), findsNothing);
        expect(find.text('Discard'), findsNothing);
      });

      testWidgets('shows bar during success state even if clean', (
        tester,
      ) async {
        await tester.pumpWidget(
          buildBar(isDirty: false, saveState: SaveState.success),
        );

        assertTextVisible('Saved successfully');
      });
    });

    // =========================================================================
    // Status Indicator
    // =========================================================================
    group('Status Indicator', () {
      testWidgets('shows change count for single change', (tester) async {
        await tester.pumpWidget(
          buildBar(isDirty: true, changeCount: 1, saveState: SaveState.idle),
        );

        assertTextVisible('1 unsaved change');
      });

      testWidgets('shows change count for multiple changes', (tester) async {
        await tester.pumpWidget(
          buildBar(isDirty: true, changeCount: 5, saveState: SaveState.idle),
        );

        assertTextVisible('5 unsaved changes');
      });

      testWidgets('shows saving state', (tester) async {
        await tester.pumpWidget(
          buildBar(isDirty: true, saveState: SaveState.saving),
        );

        assertTextVisible('Saving...');
        expect(find.byType(CircularProgressIndicator), findsOneWidget);
      });

      testWidgets('shows success state', (tester) async {
        await tester.pumpWidget(
          buildBar(isDirty: false, saveState: SaveState.success),
        );

        assertTextVisible('Saved successfully');
        assertIconVisible(Icons.check_circle);
      });

      testWidgets('shows error state with message', (tester) async {
        await tester.pumpWidget(
          buildBar(
            isDirty: true,
            saveState: SaveState.error,
            saveError: 'Network connection failed',
          ),
        );

        assertTextVisible('Network connection failed');
        assertIconVisible(Icons.error_outline);
      });

      testWidgets('shows default error message if none provided', (
        tester,
      ) async {
        await tester.pumpWidget(
          buildBar(isDirty: true, saveState: SaveState.error, saveError: null),
        );

        assertTextVisible('Save failed');
      });
    });

    // =========================================================================
    // Button Actions
    // =========================================================================
    group('Button Actions', () {
      testWidgets('tapping save calls onSave callback', (tester) async {
        bool saveCalled = false;

        await tester.pumpWidget(
          buildBar(isDirty: true, onSave: () => saveCalled = true),
        );

        await tester.tap(find.text('Save Changes'));
        await tester.pumpAndSettle();

        expect(saveCalled, isTrue);
      });

      testWidgets('tapping discard calls onDiscard callback', (tester) async {
        bool discardCalled = false;

        await tester.pumpWidget(
          buildBar(isDirty: true, onDiscard: () => discardCalled = true),
        );

        await tester.tap(find.text('Discard'));
        await tester.pumpAndSettle();

        expect(discardCalled, isTrue);
      });

      testWidgets('buttons disabled during saving', (tester) async {
        bool saveCalled = false;
        bool discardCalled = false;

        await tester.pumpWidget(
          buildBar(
            isDirty: true,
            saveState: SaveState.saving,
            onSave: () => saveCalled = true,
            onDiscard: () => discardCalled = true,
          ),
        );

        await tester.tap(find.text('Save Changes'));
        await tester.tap(find.text('Discard'));
        await tester
            .pump(); // Don't use pumpAndSettle - CircularProgressIndicator animates forever

        expect(saveCalled, isFalse);
        expect(discardCalled, isFalse);
      });
    });

    // =========================================================================
    // Custom Labels
    // =========================================================================
    group('Custom Labels', () {
      testWidgets('uses custom save label', (tester) async {
        await tester.pumpWidget(
          buildBar(isDirty: true, saveLabel: 'Apply Settings'),
        );

        assertTextVisible('Apply Settings');
      });

      testWidgets('uses custom discard label', (tester) async {
        await tester.pumpWidget(
          buildBar(isDirty: true, discardLabel: 'Cancel'),
        );

        assertTextVisible('Cancel');
      });
    });

    // =========================================================================
    // Icons
    // =========================================================================
    group('Icons', () {
      testWidgets('shows edit icon for idle state', (tester) async {
        await tester.pumpWidget(
          buildBar(isDirty: true, saveState: SaveState.idle),
        );

        assertIconVisible(Icons.edit_outlined);
      });

      testWidgets('shows save icon on button', (tester) async {
        await tester.pumpWidget(buildBar(isDirty: true));

        assertIconVisible(Icons.save);
      });
    });
  });
}
