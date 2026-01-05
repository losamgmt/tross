/// Widget Entity Scenario Tests
///
/// Validates that entity-aware widgets work correctly for ALL entities.
/// Zero per-entity code - all tests generated from metadata.
///
/// Strategy: Test each generic widget against every entity to ensure
/// the widget correctly handles all field types, relationships, and patterns.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/organisms/cards/entity_detail_card.dart';

import '../factory/factory.dart';
import '../helpers/helpers.dart';

void main() {
  setUpAll(() async {
    await EntityTestRegistry.ensureInitialized();
  });

  group('EntityDetailCard - Cross Entity', () {
    // =========================================================================
    // These tests verify EntityDetailCard works for EVERY entity in the system
    // =========================================================================

    for (final entityName in allKnownEntities) {
      testWidgets('$entityName - displays entity data correctly', (
        tester,
      ) async {
        final entityData = entityName.testData();
        final metadata = EntityTestRegistry.get(entityName);

        await pumpTestWidget(
          tester,
          EntityDetailCard(
            entityName: entityName,
            entity: entityData,
            title: metadata.displayName,
          ),
          withProviders: true,
        );

        // Card should render without error
        expect(find.text(metadata.displayName), findsWidgets);
      });

      testWidgets('$entityName - shows loading state', (tester) async {
        final metadata = EntityTestRegistry.get(entityName);

        await pumpTestWidget(
          tester,
          EntityDetailCard(
            entityName: entityName,
            entity: null,
            title: 'Loading ${metadata.displayName}',
            isLoading: true,
          ),
          withProviders: true,
        );

        expect(find.byType(CircularProgressIndicator), findsOneWidget);
      });

      testWidgets('$entityName - shows empty state', (tester) async {
        final metadata = EntityTestRegistry.get(entityName);

        await pumpTestWidget(
          tester,
          EntityDetailCard(
            entityName: entityName,
            entity: null,
            title: 'No ${metadata.displayName}',
          ),
          withProviders: true,
        );

        expect(find.byIcon(Icons.inbox_outlined), findsWidgets);
      });

      testWidgets('$entityName - shows error state', (tester) async {
        final metadata = EntityTestRegistry.get(entityName);

        await pumpTestWidget(
          tester,
          EntityDetailCard(
            entityName: entityName,
            entity: null,
            title: metadata.displayName,
            error: 'Failed to load ${metadata.displayName.toLowerCase()}',
          ),
          withProviders: true,
        );

        expect(find.byIcon(Icons.error_outline), findsWidgets);
        expect(find.textContaining('Failed to load'), findsWidgets);
      });
    }
  });

  group('EntityDetailCard - Edit Callback', () {
    for (final entityName in allKnownEntities) {
      testWidgets('$entityName - edit button triggers callback', (
        tester,
      ) async {
        final entityData = entityName.testData();
        final metadata = EntityTestRegistry.get(entityName);
        var editCalled = false;

        await pumpTestWidget(
          tester,
          EntityDetailCard(
            entityName: entityName,
            entity: entityData,
            title: metadata.displayName,
            onEdit: () => editCalled = true,
          ),
          withProviders: true,
        );

        // Find and tap edit button - onEdit was provided so button must exist
        final editButton = find.byIcon(Icons.edit);
        expect(
          editButton,
          findsOneWidget,
          reason: '$entityName should show edit button',
        );

        await tester.tap(editButton);
        await tester.pump();
        expect(editCalled, isTrue, reason: '$entityName edit should trigger');
      });
    }
  });
}
