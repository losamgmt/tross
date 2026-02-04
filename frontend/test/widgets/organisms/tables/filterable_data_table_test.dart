/// Tests for FilterableDataTable Organism
///
/// Verifies:
/// - Composes FilterBar + AppDataTable
/// - Filter bar visibility
/// - Search functionality passthrough
/// - Filter dropdowns
/// - Table rendering
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross/widgets/organisms/tables/filterable_data_table.dart';
import 'package:tross/widgets/organisms/tables/data_table.dart';
import 'package:tross/widgets/molecules/forms/filter_bar.dart';
import 'package:tross/widgets/atoms/inputs/search_input.dart';
import 'package:tross/config/table_column.dart';

void main() {
  // Test data
  final testColumns = [
    TableColumn<Map<String, dynamic>>.text(
      id: 'name',
      label: 'Name',
      getText: (item) => item['name'] as String,
    ),
    TableColumn<Map<String, dynamic>>.text(
      id: 'status',
      label: 'Status',
      getText: (item) => item['status'] as String,
    ),
  ];

  final testData = [
    {'name': 'Alice', 'status': 'Active'},
    {'name': 'Bob', 'status': 'Inactive'},
  ];

  group('FilterableDataTable Organism', () {
    group('Composition', () {
      testWidgets('renders FilterBar and AppDataTable', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: FilterableDataTable<Map<String, dynamic>>(
                columns: testColumns,
                data: testData,
                onSearchChanged: (_) {},
              ),
            ),
          ),
        );

        expect(find.byType(FilterBar), findsOneWidget);
        expect(find.byType(AppDataTable<Map<String, dynamic>>), findsOneWidget);
      });

      testWidgets('hides FilterBar when showFilterBar is false', (
        tester,
      ) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: FilterableDataTable<Map<String, dynamic>>(
                columns: testColumns,
                data: testData,
                showFilterBar: false,
              ),
            ),
          ),
        );

        expect(find.byType(FilterBar), findsNothing);
        expect(find.byType(AppDataTable<Map<String, dynamic>>), findsOneWidget);
      });
    });

    group('Search Functionality', () {
      testWidgets('renders search input', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: FilterableDataTable<Map<String, dynamic>>(
                columns: testColumns,
                data: testData,
                searchPlaceholder: 'Search users...',
                onSearchChanged: (_) {},
              ),
            ),
          ),
        );

        expect(find.byType(SearchInput), findsOneWidget);
      });

      testWidgets('calls onSearchChanged when typing', (tester) async {
        String? searchValue;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: FilterableDataTable<Map<String, dynamic>>(
                columns: testColumns,
                data: testData,
                onSearchChanged: (value) => searchValue = value,
              ),
            ),
          ),
        );

        await tester.enterText(find.byType(TextField).first, 'Alice');
        await tester.pump();

        expect(searchValue, 'Alice');
      });
    });

    group('Filters', () {
      testWidgets('renders filter dropdowns', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: FilterableDataTable<Map<String, dynamic>>(
                columns: testColumns,
                data: testData,
                filters: [
                  FilterConfig<String>(
                    value: null,
                    items: const ['Active', 'Inactive'],
                    onChanged: (_) {},
                    label: 'Status',
                  ),
                ],
              ),
            ),
          ),
        );

        // Should find the filter label
        expect(find.text('Status'), findsOneWidget);
      });
    });

    group('Table Data', () {
      testWidgets('renders table data', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: FilterableDataTable<Map<String, dynamic>>(
                columns: testColumns,
                data: testData,
              ),
            ),
          ),
        );

        expect(find.text('Alice'), findsOneWidget);
        expect(find.text('Bob'), findsOneWidget);
      });

      testWidgets('renders column headers', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: FilterableDataTable<Map<String, dynamic>>(
                columns: testColumns,
                data: testData,
              ),
            ),
          ),
        );

        expect(find.text('Name'), findsOneWidget);
        expect(find.text('Status'), findsOneWidget);
      });
    });

    group('Table State', () {
      testWidgets('shows loading state', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: FilterableDataTable<Map<String, dynamic>>(
                columns: testColumns,
                data: const [],
                state: AppDataTableState.loading,
              ),
            ),
          ),
        );

        expect(find.byType(CircularProgressIndicator), findsOneWidget);
      });

      testWidgets('shows empty state', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: FilterableDataTable<Map<String, dynamic>>(
                columns: testColumns,
                data: const [],
                state: AppDataTableState.empty,
                emptyMessage: 'No users found',
              ),
            ),
          ),
        );

        expect(find.text('No users found'), findsOneWidget);
      });
    });

    group('Filter Bar Enabled State', () {
      testWidgets('disables filter bar when filterBarEnabled is false', (
        tester,
      ) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: FilterableDataTable<Map<String, dynamic>>(
                columns: testColumns,
                data: testData,
                filterBarEnabled: false,
                onSearchChanged: (_) {},
              ),
            ),
          ),
        );

        // The FilterBar should still be visible but disabled
        expect(find.byType(FilterBar), findsOneWidget);

        // Search input should be disabled
        final searchInput = tester.widget<TextField>(
          find.byType(TextField).first,
        );
        expect(searchInput.enabled, isFalse);
      });
    });
  });
}
