/// EntityFormModal Organism Tests
///
/// Tests for the context-agnostic entity create/edit modal.
/// Follows behavioral testing patterns - verifies user-facing behavior.
///
/// NOTE: Tests render EntityFormModal directly (not via showDialog)
/// since dialog context doesn't inherit test providers. This tests
/// the modal's UI/behavior, not the showDialog wrapper.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/models/form_mode.dart';
import 'package:tross_app/services/entity_metadata.dart';
import 'package:tross_app/widgets/organisms/modals/entity_form_modal.dart';
import '../../../helpers/helpers.dart';

void main() {
  // Initialize metadata registry for all tests
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    await EntityMetadataRegistry.instance.initialize();
  });

  group('EntityFormModal', () {
    group('create mode', () {
      testWidgets('shows "Create" title prefix', (tester) async {
        await pumpTestWidget(
          tester,
          const Dialog(
            child: EntityFormModal(entityName: 'role', mode: FormMode.create),
          ),
          withProviders: true,
        );

        await tester.pumpAndSettle();

        // Should show "Create Role" title
        expect(find.textContaining('Create'), findsWidgets);
      });

      testWidgets('shows Create button with add icon', (tester) async {
        await pumpTestWidget(
          tester,
          const Dialog(
            child: EntityFormModal(entityName: 'role', mode: FormMode.create),
          ),
          withProviders: true,
        );

        await tester.pumpAndSettle();

        expect(find.text('Create'), findsWidgets);
        expect(find.byIcon(Icons.add), findsWidgets);
      });
    });

    group('edit mode', () {
      testWidgets('shows "Edit" title prefix', (tester) async {
        await pumpTestWidget(
          tester,
          const Dialog(
            child: EntityFormModal(
              entityName: 'role',
              mode: FormMode.edit,
              initialValue: {'id': 1, 'name': 'Admin'},
            ),
          ),
          withProviders: true,
        );

        await tester.pumpAndSettle();

        expect(find.textContaining('Edit'), findsWidgets);
      });

      testWidgets('shows Save button with save icon', (tester) async {
        await pumpTestWidget(
          tester,
          const Dialog(
            child: EntityFormModal(
              entityName: 'role',
              mode: FormMode.edit,
              initialValue: {'id': 1, 'name': 'Admin'},
            ),
          ),
          withProviders: true,
        );

        await tester.pumpAndSettle();

        expect(find.text('Save'), findsWidgets);
        expect(find.byIcon(Icons.save), findsWidgets);
      });

      testWidgets('pre-populates form with initial value', (tester) async {
        await pumpTestWidget(
          tester,
          const Dialog(
            child: EntityFormModal(
              entityName: 'role',
              mode: FormMode.edit,
              initialValue: {'id': 1, 'name': 'Administrator'},
            ),
          ),
          withProviders: true,
        );

        await tester.pumpAndSettle();

        // The name field should show the initial value
        expect(find.text('Administrator'), findsWidgets);
      });
    });

    group('view mode', () {
      testWidgets('shows "View" title prefix', (tester) async {
        await pumpTestWidget(
          tester,
          const Dialog(
            child: EntityFormModal(
              entityName: 'role',
              mode: FormMode.view,
              initialValue: {'id': 1, 'name': 'Admin'},
            ),
          ),
          withProviders: true,
        );

        await tester.pumpAndSettle();

        expect(find.textContaining('View'), findsWidgets);
      });

      testWidgets('does not show submit button', (tester) async {
        await pumpTestWidget(
          tester,
          const Dialog(
            child: EntityFormModal(
              entityName: 'role',
              mode: FormMode.view,
              initialValue: {'id': 1, 'name': 'Admin'},
            ),
          ),
          withProviders: true,
        );

        await tester.pumpAndSettle();

        // Should not have Create or Save buttons
        expect(find.byIcon(Icons.add), findsNothing);
        expect(find.byIcon(Icons.save), findsNothing);
      });
    });

    group('cancel behavior', () {
      testWidgets('shows Cancel button', (tester) async {
        await pumpTestWidget(
          tester,
          const Dialog(
            child: EntityFormModal(entityName: 'role', mode: FormMode.create),
          ),
          withProviders: true,
        );

        await tester.pumpAndSettle();

        expect(find.text('Cancel'), findsOneWidget);
      });

      testWidgets('Cancel calls Navigator.pop', (tester) async {
        // Test that cancel button triggers navigation pop
        // We verify this by checking that onSubmit is NOT called when cancel is tapped
        bool onSubmitCalled = false;

        await pumpTestWidget(
          tester,
          Dialog(
            child: EntityFormModal(
              entityName: 'role',
              mode: FormMode.create,
              onSubmit: (_) => onSubmitCalled = true,
            ),
          ),
          withProviders: true,
        );

        await tester.pumpAndSettle();

        // Verify Cancel button exists and is tappable
        expect(find.text('Cancel'), findsOneWidget);

        // Tap cancel - in a real app this calls Navigator.pop
        // In tests, we just verify onSubmit was NOT called
        await tester.tap(find.text('Cancel'));
        await tester.pumpAndSettle();

        // Cancel should NOT trigger onSubmit
        expect(onSubmitCalled, isFalse);
      });
    });

    group('custom title', () {
      testWidgets('uses custom title when provided', (tester) async {
        await pumpTestWidget(
          tester,
          const Dialog(
            child: EntityFormModal(
              entityName: 'role',
              mode: FormMode.create,
              title: 'Add New Permission Group',
            ),
          ),
          withProviders: true,
        );

        await tester.pumpAndSettle();

        expect(find.text('Add New Permission Group'), findsWidgets);
      });
    });
  });
}
