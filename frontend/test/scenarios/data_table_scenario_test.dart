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
    for (final entityName in allKnownEntities) {
      testWidgets('$entityName - renders table with data', (tester) async {
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
        expect(find.byType(AppDataTable<Map<String, dynamic>>), findsOneWidget);

        // Should not show loading or error
        expect(find.byType(CircularProgressIndicator), findsNothing);
      });

      testWidgets('$entityName - shows loading state', (tester) async {
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

        expect(find.byType(CircularProgressIndicator), findsOneWidget);
      });

      testWidgets('$entityName - shows empty state', (tester) async {
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

        expect(find.textContaining('No'), findsWidgets);
      });

      testWidgets('$entityName - shows error state', (tester) async {
        const errorMessage = 'Failed to load data';

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

        expect(find.text(errorMessage), findsOneWidget);
      });
    }
  });

  group('AppDataTable - Column Generation', () {
    for (final entityName in allKnownEntities) {
      testWidgets('$entityName - generates correct number of columns', (
        tester,
      ) async {
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

        // Columns should be generated (minus system fields: created_at, updated_at)
        final expectedFields = metadata.fields.keys
            .where((f) => !{'created_at', 'updated_at'}.contains(f))
            .length;

        expect(columns.length, equals(expectedFields));
      });

      testWidgets('$entityName - column ids match field names', (tester) async {
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
            reason: 'Column ${column.id} not found in $entityName fields',
          );
        }
      });
    }
  });
}
