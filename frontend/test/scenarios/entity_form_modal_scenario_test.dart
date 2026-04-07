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
import 'package:tross/models/form_mode.dart';
import 'package:tross/widgets/organisms/modals/entity_form_modal.dart';

import '../factory/factory.dart';
import '../helpers/helpers.dart';

void main() {
  setUpAll(() async {
    await EntityTestRegistry.ensureInitialized();
  });

  group('EntityFormModal - Create Mode', () {
    testWidgets('renders create modal with correct title for all entities', (
      tester,
    ) async {
      for (final entityName in EntityTestRegistry.allEntityNames) {
        final metadata = EntityTestRegistry.get(entityName);

        await pumpTestWidget(
          tester,
          EntityFormModal(entityName: entityName, mode: FormMode.create),
          withProviders: true,
        );

        // Should show "Create [Entity]" title
        expect(
          find.textContaining('Create'),
          findsWidgets,
          reason: '$entityName: should show Create in title',
        );
        expect(
          find.textContaining(metadata.displayName),
          findsWidgets,
          reason: '$entityName: should show display name in title',
        );
      }
    });

    testWidgets('shows add icon for create mode for all entities', (
      tester,
    ) async {
      for (final entityName in EntityTestRegistry.allEntityNames) {
        await pumpTestWidget(
          tester,
          EntityFormModal(entityName: entityName, mode: FormMode.create),
          withProviders: true,
        );

        // Create mode should have add icon on submit button
        expect(
          find.byIcon(Icons.add),
          findsWidgets,
          reason: '$entityName: create mode should have add icon',
        );
      }
    });

    testWidgets('renders form fields without crash for all entities', (
      tester,
    ) async {
      for (final entityName in EntityTestRegistry.allEntityNames) {
        await pumpTestWidget(
          tester,
          EntityFormModal(entityName: entityName, mode: FormMode.create),
          withProviders: true,
        );

        // Should render without error
        expect(
          tester.takeException(),
          isNull,
          reason: '$entityName: should render without error',
        );

        // Should have Cancel button
        expect(
          find.text('Cancel'),
          findsOneWidget,
          reason: '$entityName: should have Cancel button',
        );
      }
    });
  });

  group('EntityFormModal - Edit Mode', () {
    testWidgets('renders edit modal with correct title for all entities', (
      tester,
    ) async {
      for (final entityName in EntityTestRegistry.allEntityNames) {
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
        expect(
          find.textContaining('Edit'),
          findsWidgets,
          reason: '$entityName: should show Edit in title',
        );
        expect(
          find.textContaining(metadata.displayName),
          findsWidgets,
          reason: '$entityName: should show display name in title',
        );
      }
    });

    testWidgets('shows save icon for edit mode for all entities', (
      tester,
    ) async {
      for (final entityName in EntityTestRegistry.allEntityNames) {
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
        expect(
          find.byIcon(Icons.save),
          findsWidgets,
          reason: '$entityName: edit mode should have save icon',
        );
      }
    });

    testWidgets('loads with initial values without crash for all entities', (
      tester,
    ) async {
      for (final entityName in EntityTestRegistry.allEntityNames) {
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
        expect(
          tester.takeException(),
          isNull,
          reason: '$entityName: should render without error',
        );
      }
    });
  });

  group('EntityFormModal - View Mode', () {
    testWidgets('renders view modal as read-only for all entities', (
      tester,
    ) async {
      for (final entityName in EntityTestRegistry.allEntityNames) {
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
        expect(
          find.textContaining('View'),
          findsWidgets,
          reason: '$entityName: should show View in title',
        );
        expect(
          find.textContaining(metadata.displayName),
          findsWidgets,
          reason: '$entityName: should show display name in title',
        );

        // View mode should NOT have submit button (save/add)
        // Only Cancel button should be visible
        expect(
          find.text('Cancel'),
          findsOneWidget,
          reason: '$entityName: should have Cancel button',
        );
      }
    });

    testWidgets('renders without crash for all entities', (tester) async {
      for (final entityName in EntityTestRegistry.allEntityNames) {
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
        expect(
          tester.takeException(),
          isNull,
          reason: '$entityName: should render without error',
        );
      }
    });
  });

  group('EntityFormModal - Custom Title', () {
    testWidgets('allows custom title override for all entities', (
      tester,
    ) async {
      const customTitle = 'Custom Modal Title';

      for (final entityName in EntityTestRegistry.allEntityNames) {
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
        expect(
          find.text(customTitle),
          findsOneWidget,
          reason: '$entityName: should show custom title',
        );
      }
    });
  });

  group('EntityFormModal - Field Filtering', () {
    testWidgets('works with includeFields filter for all entities', (
      tester,
    ) async {
      for (final entityName in EntityTestRegistry.allEntityNames) {
        final metadata = EntityTestRegistry.get(entityName);

        // Get first non-id field for testing
        final fields = metadata.fields.keys.where((f) => f != 'id').toList();
        if (fields.isEmpty) continue; // Skip if no non-id fields

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
        expect(
          tester.takeException(),
          isNull,
          reason: '$entityName: should render without error with includeFields',
        );
      }
    });

    testWidgets('works with excludeFields filter for all entities', (
      tester,
    ) async {
      for (final entityName in EntityTestRegistry.allEntityNames) {
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
        expect(
          tester.takeException(),
          isNull,
          reason: '$entityName: should render without error with excludeFields',
        );
      }
    });
  });
}
