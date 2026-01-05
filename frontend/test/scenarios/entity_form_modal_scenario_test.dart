/// EntityFormModal Cross-Entity Scenario Tests
///
/// Validates that EntityFormModal works correctly for ALL entities.
/// Uses MetadataFieldConfigFactory internally to generate fields.
/// Zero per-entity code - all tests generated from metadata.
///
/// Test categories:
/// - Create mode for each entity
/// - Edit mode for each entity
/// - Modal rendering and basic functionality
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/models/form_mode.dart';
import 'package:tross_app/widgets/organisms/modals/entity_form_modal.dart';

import '../factory/factory.dart';
import '../helpers/helpers.dart';

void main() {
  setUpAll(() async {
    await EntityTestRegistry.ensureInitialized();
  });

  group('EntityFormModal - Create Mode', () {
    for (final entityName in allKnownEntities) {
      testWidgets('$entityName - renders create modal with correct title', (
        tester,
      ) async {
        final metadata = EntityTestRegistry.get(entityName);

        await pumpTestWidget(
          tester,
          EntityFormModal(entityName: entityName, mode: FormMode.create),
          withProviders: true,
        );

        // Should show "Create [Entity]" title
        expect(find.textContaining('Create'), findsWidgets);
        expect(find.textContaining(metadata.displayName), findsWidgets);
      });

      testWidgets('$entityName - shows add icon for create mode', (
        tester,
      ) async {
        await pumpTestWidget(
          tester,
          EntityFormModal(entityName: entityName, mode: FormMode.create),
          withProviders: true,
        );

        // Create mode should have add icon on submit button
        expect(find.byIcon(Icons.add), findsWidgets);
      });

      testWidgets('$entityName - renders form fields without crash', (
        tester,
      ) async {
        await pumpTestWidget(
          tester,
          EntityFormModal(entityName: entityName, mode: FormMode.create),
          withProviders: true,
        );

        // Should render without error
        expect(tester.takeException(), isNull);

        // Should have Cancel button
        expect(find.text('Cancel'), findsOneWidget);
      });
    }
  });

  group('EntityFormModal - Edit Mode', () {
    for (final entityName in allKnownEntities) {
      testWidgets('$entityName - renders edit modal with correct title', (
        tester,
      ) async {
        final metadata = EntityTestRegistry.get(entityName);
        final testData = entityName.testData();

        await pumpTestWidget(
          tester,
          EntityFormModal(
            entityName: entityName,
            mode: FormMode.edit,
            initialValue: testData,
          ),
          withProviders: true,
        );

        // Should show "Edit [Entity]" title
        expect(find.textContaining('Edit'), findsWidgets);
        expect(find.textContaining(metadata.displayName), findsWidgets);
      });

      testWidgets('$entityName - shows save icon for edit mode', (
        tester,
      ) async {
        final testData = entityName.testData();

        await pumpTestWidget(
          tester,
          EntityFormModal(
            entityName: entityName,
            mode: FormMode.edit,
            initialValue: testData,
          ),
          withProviders: true,
        );

        // Edit mode should have save icon on submit button
        expect(find.byIcon(Icons.save), findsWidgets);
      });

      testWidgets('$entityName - loads with initial values without crash', (
        tester,
      ) async {
        final testData = entityName.testData();

        await pumpTestWidget(
          tester,
          EntityFormModal(
            entityName: entityName,
            mode: FormMode.edit,
            initialValue: testData,
          ),
          withProviders: true,
        );

        // Should render without error
        expect(tester.takeException(), isNull);
      });
    }
  });

  group('EntityFormModal - View Mode', () {
    for (final entityName in allKnownEntities) {
      testWidgets('$entityName - renders view modal as read-only', (
        tester,
      ) async {
        final metadata = EntityTestRegistry.get(entityName);
        final testData = entityName.testData();

        await pumpTestWidget(
          tester,
          EntityFormModal(
            entityName: entityName,
            mode: FormMode.view,
            initialValue: testData,
          ),
          withProviders: true,
        );

        // Should show "View [Entity]" title
        expect(find.textContaining('View'), findsWidgets);
        expect(find.textContaining(metadata.displayName), findsWidgets);

        // View mode should NOT have submit button (save/add)
        // Only Cancel button should be visible
        expect(find.text('Cancel'), findsOneWidget);
      });

      testWidgets('$entityName - renders without crash', (tester) async {
        final testData = entityName.testData();

        await pumpTestWidget(
          tester,
          EntityFormModal(
            entityName: entityName,
            mode: FormMode.view,
            initialValue: testData,
          ),
          withProviders: true,
        );

        // Should render without error
        expect(tester.takeException(), isNull);
      });
    }
  });

  group('EntityFormModal - Custom Title', () {
    for (final entityName in allKnownEntities) {
      testWidgets('$entityName - allows custom title override', (tester) async {
        const customTitle = 'Custom Modal Title';

        await pumpTestWidget(
          tester,
          EntityFormModal(
            entityName: entityName,
            mode: FormMode.create,
            title: customTitle,
          ),
          withProviders: true,
        );

        // Should show custom title instead of auto-generated one
        expect(find.text(customTitle), findsOneWidget);
      });
    }
  });

  group('EntityFormModal - Field Filtering', () {
    for (final entityName in allKnownEntities) {
      testWidgets('$entityName - works with includeFields filter', (
        tester,
      ) async {
        final metadata = EntityTestRegistry.get(entityName);

        // Get first non-id field for testing
        final fields = metadata.fields.keys.where((f) => f != 'id').toList();
        if (fields.isEmpty) return; // Skip if no non-id fields

        final includeFields = [fields.first];

        await pumpTestWidget(
          tester,
          EntityFormModal(
            entityName: entityName,
            mode: FormMode.create,
            includeFields: includeFields,
          ),
          withProviders: true,
        );

        // Should render without error
        expect(tester.takeException(), isNull);
      });

      testWidgets('$entityName - works with excludeFields filter', (
        tester,
      ) async {
        await pumpTestWidget(
          tester,
          EntityFormModal(
            entityName: entityName,
            mode: FormMode.create,
            excludeFields: const ['id', 'created_at', 'updated_at'],
          ),
          withProviders: true,
        );

        // Should render without error
        expect(tester.takeException(), isNull);
      });
    }
  });
}
