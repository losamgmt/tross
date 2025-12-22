/// Tests for FilterBar Molecule
///
/// Verifies:
/// - Basic rendering with search input
/// - Filter dropdown rendering
/// - Search value changes
/// - Filter value changes
/// - Compact mode
/// - Trailing widget support
/// - Enabled/disabled states
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/molecules/forms/filter_bar.dart';
import 'package:tross_app/widgets/atoms/inputs/search_input.dart';
import 'package:tross_app/widgets/atoms/inputs/filter_dropdown.dart';

void main() {
  group('FilterBar Molecule', () {
    group('Basic Rendering', () {
      testWidgets('displays search input by default', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: FilterBar(onSearchChanged: (_) {})),
          ),
        );

        expect(find.byType(SearchInput), findsOneWidget);
      });

      testWidgets('hides search when showSearch is false', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: FilterBar(onSearchChanged: (_) {}, showSearch: false),
            ),
          ),
        );

        expect(find.byType(SearchInput), findsNothing);
      });

      testWidgets('displays search placeholder', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: FilterBar(
                onSearchChanged: (_) {},
                searchPlaceholder: 'Search users...',
              ),
            ),
          ),
        );

        expect(find.text('Search users...'), findsOneWidget);
      });

      testWidgets('displays current search value', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: FilterBar(
                searchValue: 'existing query',
                onSearchChanged: (_) {},
              ),
            ),
          ),
        );

        expect(find.text('existing query'), findsOneWidget);
      });
    });

    group('Filter Dropdowns', () {
      testWidgets('displays filter dropdowns', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: FilterBar(
                onSearchChanged: (_) {},
                filters: [
                  FilterConfig<String>(
                    value: 'Active',
                    items: const ['Active', 'Inactive'],
                    onChanged: (_) {},
                    label: 'Status',
                  ),
                ],
              ),
            ),
          ),
        );

        expect(find.byType(FilterDropdown<String>), findsOneWidget);
        expect(find.text('Status:'), findsOneWidget);
        expect(find.text('Active'), findsOneWidget);
      });

      testWidgets('displays multiple filter dropdowns', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: FilterBar(
                onSearchChanged: (_) {},
                filters: [
                  FilterConfig<String>(
                    value: null,
                    items: const ['Active', 'Inactive'],
                    onChanged: (_) {},
                    label: 'Status',
                  ),
                  FilterConfig<String>(
                    value: null,
                    items: const ['Admin', 'User'],
                    onChanged: (_) {},
                    label: 'Role',
                  ),
                ],
              ),
            ),
          ),
        );

        expect(find.byType(FilterDropdown<String>), findsNWidgets(2));
        expect(find.text('Status:'), findsOneWidget);
        expect(find.text('Role:'), findsOneWidget);
      });

      testWidgets('filter shows "All" when value is null', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: FilterBar(
                onSearchChanged: (_) {},
                filters: [
                  FilterConfig<String>(
                    value: null,
                    items: const ['Active', 'Inactive'],
                    onChanged: (_) {},
                  ),
                ],
              ),
            ),
          ),
        );

        expect(find.text('All'), findsOneWidget);
      });
    });

    group('Search Interaction', () {
      testWidgets('calls onSearchChanged when typing', (tester) async {
        String capturedValue = '';

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: FilterBar(
                onSearchChanged: (value) => capturedValue = value,
              ),
            ),
          ),
        );

        await tester.enterText(find.byType(TextField), 'test query');
        expect(capturedValue, 'test query');
      });

      testWidgets('calls onSearchSubmitted when Enter pressed', (tester) async {
        String? submittedValue;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: FilterBar(
                onSearchChanged: (_) {},
                onSearchSubmitted: (value) => submittedValue = value,
              ),
            ),
          ),
        );

        await tester.enterText(find.byType(TextField), 'search term');
        await tester.testTextInput.receiveAction(TextInputAction.done);
        await tester.pump();

        expect(submittedValue, 'search term');
      });
    });

    group('Filter Interaction', () {
      testWidgets('calls filter onChanged when selection changes', (
        tester,
      ) async {
        String? selectedValue = 'Active';

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: StatefulBuilder(
                builder: (context, setState) => FilterBar(
                  onSearchChanged: (_) {},
                  filters: [
                    FilterConfig<String>(
                      value: selectedValue,
                      items: const ['Active', 'Inactive', 'Pending'],
                      onChanged: (v) => setState(() => selectedValue = v),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );

        // Open dropdown
        await tester.tap(find.byType(FilterDropdown<String>));
        await tester.pumpAndSettle();

        // Select "Inactive"
        await tester.tap(find.text('Inactive').last);
        await tester.pumpAndSettle();

        expect(selectedValue, 'Inactive');
      });
    });

    group('Trailing Widget', () {
      testWidgets('displays trailing widget', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: FilterBar(
                onSearchChanged: (_) {},
                trailing: ElevatedButton(
                  onPressed: () {},
                  child: const Text('Add New'),
                ),
              ),
            ),
          ),
        );

        expect(find.text('Add New'), findsOneWidget);
        expect(find.byType(ElevatedButton), findsOneWidget);
      });
    });

    group('Compact Mode', () {
      testWidgets('passes compact to SearchInput', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: FilterBar(onSearchChanged: (_) {}, compact: true),
            ),
          ),
        );

        final searchInput = tester.widget<SearchInput>(
          find.byType(SearchInput),
        );
        expect(searchInput.compact, true);
      });

      testWidgets('passes compact to FilterDropdown', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: FilterBar(
                onSearchChanged: (_) {},
                compact: true,
                filters: [
                  FilterConfig<String>(
                    value: null,
                    items: const ['A', 'B'],
                    onChanged: (_) {},
                  ),
                ],
              ),
            ),
          ),
        );

        final filterDropdown = tester.widget<FilterDropdown<String>>(
          find.byType(FilterDropdown<String>),
        );
        expect(filterDropdown.compact, true);
      });
    });

    group('Enabled/Disabled States', () {
      testWidgets('disables search when enabled is false', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: FilterBar(onSearchChanged: (_) {}, enabled: false),
            ),
          ),
        );

        final searchInput = tester.widget<SearchInput>(
          find.byType(SearchInput),
        );
        expect(searchInput.enabled, false);
      });

      testWidgets('disables filters when enabled is false', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: FilterBar(
                onSearchChanged: (_) {},
                enabled: false,
                filters: [
                  FilterConfig<String>(
                    value: null,
                    items: const ['A', 'B'],
                    onChanged: (_) {},
                  ),
                ],
              ),
            ),
          ),
        );

        final filterDropdown = tester.widget<FilterDropdown<String>>(
          find.byType(FilterDropdown<String>),
        );
        expect(filterDropdown.enabled, false);
      });
    });

    group('Layout', () {
      testWidgets('uses Wrap for responsive layout', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: FilterBar(onSearchChanged: (_) {})),
          ),
        );

        expect(find.byType(Wrap), findsOneWidget);
      });
    });
  });
}
