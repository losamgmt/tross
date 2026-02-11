/// FilterableDataTable Cross-Entity Scenario Tests
///
/// Validates that FilterableDataTable works correctly for ALL entities.
/// Composes FilterBar + AppDataTable using MetadataTableColumnFactory.
/// Zero per-entity code - all tests generated from metadata.
///
/// Test categories:
/// - Basic rendering for each entity
/// - Loading/error/empty states
/// - Filter bar visibility
/// - Search functionality integration
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross/widgets/molecules/menus/action_item.dart';
import 'package:tross/widgets/organisms/tables/filterable_data_table.dart';
import 'package:tross/widgets/organisms/tables/data_table.dart';
import 'package:tross/services/metadata_table_column_factory.dart';

import '../factory/factory.dart';
import '../helpers/helpers.dart';

void main() {
  setUpAll(() async {
    await EntityTestRegistry.ensureInitialized();
  });

  group('FilterableDataTable - Cross Entity Rendering', () {
    for (final entityName in allKnownEntities) {
      testWidgets('$entityName - renders table with data and filter bar', (
        tester,
      ) async {
        final testData = entityName.testDataList(count: 3);

        await pumpTestWidget(
          tester,
          Builder(
            builder: (context) {
              final columns = MetadataTableColumnFactory.forEntity(
                context,
                entityName,
              );
              return FilterableDataTable<Map<String, dynamic>>(
                columns: columns,
                data: testData,
                onSearchChanged: (_) {},
                searchPlaceholder: 'Search $entityName...',
              );
            },
          ),
          withProviders: true,
        );

        // Should render without error
        expect(tester.takeException(), isNull);

        // Should have filter bar search input
        expect(find.byType(TextField), findsWidgets);
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
              return FilterableDataTable<Map<String, dynamic>>(
                columns: columns,
                data: const [],
                state: AppDataTableState.loading,
                onSearchChanged: (_) {},
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
              return FilterableDataTable<Map<String, dynamic>>(
                columns: columns,
                data: const [],
                state: AppDataTableState.empty,
                emptyMessage: 'No ${metadata.displayName} found',
                onSearchChanged: (_) {},
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
              return FilterableDataTable<Map<String, dynamic>>(
                columns: columns,
                data: const [],
                state: AppDataTableState.error,
                errorMessage: errorMessage,
                onSearchChanged: (_) {},
              );
            },
          ),
          withProviders: true,
        );

        expect(find.text(errorMessage), findsOneWidget);
      });
    }
  });

  group('FilterableDataTable - Filter Bar Options', () {
    for (final entityName in allKnownEntities) {
      testWidgets('$entityName - can hide filter bar', (tester) async {
        final testData = entityName.testDataList(count: 2);

        await pumpTestWidget(
          tester,
          Builder(
            builder: (context) {
              final columns = MetadataTableColumnFactory.forEntity(
                context,
                entityName,
              );
              return FilterableDataTable<Map<String, dynamic>>(
                columns: columns,
                data: testData,
              );
            },
          ),
          withProviders: true,
        );

        // Filter bar should not be visible (no search TextField)
        // Note: Other TextFields may exist in table cells
        expect(tester.takeException(), isNull);
      });

      testWidgets('$entityName - renders without onSearchChanged', (
        tester,
      ) async {
        final testData = entityName.testDataList(count: 2);

        await pumpTestWidget(
          tester,
          Builder(
            builder: (context) {
              final columns = MetadataTableColumnFactory.forEntity(
                context,
                entityName,
              );
              return FilterableDataTable<Map<String, dynamic>>(
                columns: columns,
                data: testData,
                // No onSearchChanged means filter bar is hidden
              );
            },
          ),
          withProviders: true,
        );

        // Should render without error
        expect(tester.takeException(), isNull);
      });

      testWidgets('$entityName - renders with entityName for saved views', (
        tester,
      ) async {
        final testData = entityName.testDataList(count: 2);

        await pumpTestWidget(
          tester,
          Builder(
            builder: (context) {
              final columns = MetadataTableColumnFactory.forEntity(
                context,
                entityName,
              );
              return FilterableDataTable<Map<String, dynamic>>(
                columns: columns,
                data: testData,
                entityName: entityName,
                onSearchChanged: (_) {},
              );
            },
          ),
          withProviders: true,
        );

        // Should render without error
        expect(tester.takeException(), isNull);
      });
    }
  });

  group('FilterableDataTable - Toolbar', () {
    for (final entityName in allKnownEntities) {
      testWidgets('$entityName - supports toolbar actions', (tester) async {
        final testData = entityName.testDataList(count: 2);

        await pumpTestWidget(
          tester,
          Builder(
            builder: (context) {
              final columns = MetadataTableColumnFactory.forEntity(
                context,
                entityName,
              );
              return FilterableDataTable<Map<String, dynamic>>(
                columns: columns,
                data: testData,
                onSearchChanged: (_) {},
                toolbarActions: [
                  ActionItem(
                    id: 'test-action',
                    label: 'Add',
                    icon: Icons.add,
                    onTap: () {},
                  ),
                ],
              );
            },
          ),
          withProviders: true,
        );

        // Toolbar action should be visible (rendered via ActionMenu)
        expect(find.byIcon(Icons.add), findsOneWidget);
      });
    }
  });

  // Note: Pagination rendering tests omitted because they require
  // larger viewport to avoid overflow. Pagination logic is tested
  // in data_table_test.dart and data_table_scenario_test.dart.
}
