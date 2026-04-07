/// DataTable Cross-Entity Scenario Tests
///
/// Validates that AppDataTable works correctly for ALL entities.
/// Uses MetadataTableColumnFactory to generate columns from metadata.
/// Zero per-entity code - all tests generated from metadata.
///
/// Test categories:
/// - Basic rendering for each entity
/// - Loading/error/empty states
/// - Column generation from metadata
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross/config/table_column.dart';
import 'package:tross/widgets/organisms/tables/data_table.dart';
import 'package:tross/services/metadata_table_column_factory.dart';

import '../factory/factory.dart';
import '../helpers/helpers.dart';

void main() {
  setUpAll(() async {
    await EntityTestRegistry.ensureInitialized();
  });

  group('AppDataTable - Cross Entity Rendering', () {
    testWidgets('renders table with data for all entities', (tester) async {
      for (final entityName in EntityTestRegistry.allEntityNames) {
        final testData = entityName.testDataList(count: 3);

        // Build columns using factory (requires context for provider access)
        late List<TableColumn<Map<String, dynamic>>> columns;

        await pumpTestWidget(
          tester,
          Builder(
            builder: (context) {
              columns = MetadataTableColumnFactory.forEntity(
                context,
                entityName,
              );
              return AppDataTable<Map<String, dynamic>>(
                columns: columns,
                data: testData,
              );
            },
          ),
          withProviders: true,
        );

        // Table should render data
        expect(
          find.byType(AppDataTable<Map<String, dynamic>>),
          findsOneWidget,
          reason: '$entityName: should render table',
        );

        // Should not show loading or error
        expect(
          find.byType(CircularProgressIndicator),
          findsNothing,
          reason: '$entityName: should not show loading',
        );
      }
    });

    testWidgets('shows loading state for all entities', (tester) async {
      for (final entityName in EntityTestRegistry.allEntityNames) {
        await pumpTestWidget(
          tester,
          Builder(
            builder: (context) {
              final columns = MetadataTableColumnFactory.forEntity(
                context,
                entityName,
              );
              return AppDataTable<Map<String, dynamic>>(
                columns: columns,
                data: const [],
                state: AppDataTableState.loading,
              );
            },
          ),
          withProviders: true,
        );

        expect(
          find.byType(CircularProgressIndicator),
          findsOneWidget,
          reason: '$entityName: should show loading indicator',
        );
      }
    });

    testWidgets('shows empty state for all entities', (tester) async {
      for (final entityName in EntityTestRegistry.allEntityNames) {
        final metadata = EntityTestRegistry.get(entityName);

        await pumpTestWidget(
          tester,
          Builder(
            builder: (context) {
              final columns = MetadataTableColumnFactory.forEntity(
                context,
                entityName,
              );
              return AppDataTable<Map<String, dynamic>>(
                columns: columns,
                data: const [],
                state: AppDataTableState.empty,
                emptyMessage: 'No ${metadata.displayName} found',
              );
            },
          ),
          withProviders: true,
        );

        expect(
          find.textContaining('No'),
          findsWidgets,
          reason: '$entityName: should show empty message',
        );
      }
    });

    testWidgets('shows error state for all entities', (tester) async {
      const errorMessage = 'Failed to load data';
      
      for (final entityName in EntityTestRegistry.allEntityNames) {
        await pumpTestWidget(
          tester,
          Builder(
            builder: (context) {
              final columns = MetadataTableColumnFactory.forEntity(
                context,
                entityName,
              );
              return AppDataTable<Map<String, dynamic>>(
                columns: columns,
                data: const [],
                state: AppDataTableState.error,
                errorMessage: errorMessage,
              );
            },
          ),
          withProviders: true,
        );

        expect(
          find.text(errorMessage),
          findsOneWidget,
          reason: '$entityName: should show error message',
        );
      }
    });
  });

  group('AppDataTable - Column Generation', () {
    testWidgets('generates correct number of columns for all entities', (
      tester,
    ) async {
      for (final entityName in EntityTestRegistry.allEntityNames) {
        final metadata = EntityTestRegistry.get(entityName);
        final testData = entityName.testDataList(count: 1);

        late List<TableColumn<Map<String, dynamic>>> columns;

        await pumpTestWidget(
          tester,
          Builder(
            builder: (context) {
              columns = MetadataTableColumnFactory.forEntity(
                context,
                entityName,
              );
              return AppDataTable<Map<String, dynamic>>(
                columns: columns,
                data: testData,
              );
            },
          ),
          withProviders: true,
        );

        // Use displayColumns if configured, otherwise all fields minus system fields
        final int expectedCount;
        if (metadata.displayColumns?.isNotEmpty ?? false) {
          expectedCount = metadata.displayColumns!.length;
        } else {
          expectedCount = metadata.fields.keys
              .where((f) => !{'id', 'created_at', 'updated_at'}.contains(f))
              .length;
        }

        expect(
          columns.length,
          equals(expectedCount),
          reason: '$entityName: should have $expectedCount columns',
        );
      }
    });

    testWidgets('column ids match field names for all entities', (
      tester,
    ) async {
      for (final entityName in EntityTestRegistry.allEntityNames) {
        final metadata = EntityTestRegistry.get(entityName);
        final testData = entityName.testDataList(count: 1);

        late List<TableColumn<Map<String, dynamic>>> columns;

        await pumpTestWidget(
          tester,
          Builder(
            builder: (context) {
              columns = MetadataTableColumnFactory.forEntity(
                context,
                entityName,
              );
              return AppDataTable<Map<String, dynamic>>(
                columns: columns,
                data: testData,
              );
            },
          ),
          withProviders: true,
        );

        // All column ids should be valid field names
        for (final column in columns) {
          expect(
            metadata.fields.containsKey(column.id),
            isTrue,
            reason: '$entityName: Column ${column.id} not found in fields',
          );
        }
      }
    });
  });
}
