/// Tests for TableCustomizationMenu molecule
///
/// **BEHAVIORAL FOCUS:**
/// - Displays menu with density options
/// - Displays column visibility toggles
/// - Handles saved views section
/// - Callbacks work correctly for all actions
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/molecules/menus/table_customization_menu.dart';
import 'package:tross_app/config/table_column.dart';
import 'package:tross_app/config/table_config.dart';
import 'package:tross_app/services/saved_view_service.dart';

import '../../../helpers/test_helpers.dart';

void main() {
  // Test data factories
  List<TableColumn<Map<String, dynamic>>> createTestColumns() {
    return [
      TableColumn<Map<String, dynamic>>(
        id: 'name',
        label: 'Name',
        cellBuilder: (item) => Text(item['name'] as String? ?? ''),
      ),
      TableColumn<Map<String, dynamic>>(
        id: 'status',
        label: 'Status',
        cellBuilder: (item) => Text(item['status'] as String? ?? ''),
      ),
      TableColumn<Map<String, dynamic>>(
        id: 'date',
        label: 'Date',
        cellBuilder: (item) => Text(item['date'] as String? ?? ''),
      ),
    ];
  }

  SavedView createTestView({
    int id = 1,
    String viewName = 'My View',
    bool isDefault = false,
    List<String> hiddenColumns = const [],
    String density = 'standard',
  }) {
    return SavedView(
      id: id,
      userId: 1,
      entityName: 'work_order',
      viewName: viewName,
      settings: SavedViewSettings(
        hiddenColumns: hiddenColumns,
        density: density,
      ),
      isDefault: isDefault,
      createdAt: DateTime(2024, 1, 1),
      updatedAt: DateTime(2024, 1, 1),
    );
  }

  group('TableCustomizationMenu', () {
    group('basic display', () {
      testWidgets('shows tune icon button', (tester) async {
        await tester.pumpTestWidget(
          TableCustomizationMenu<Map<String, dynamic>>(
            columns: createTestColumns(),
            hiddenColumnIds: {},
            density: TableDensity.standard,
            onHiddenColumnsChanged: (_) {},
            onDensityChanged: (_) {},
          ),
        );

        expect(find.byIcon(Icons.tune), findsOneWidget);
      });

      testWidgets('has tooltip "Customize table"', (tester) async {
        await tester.pumpTestWidget(
          TableCustomizationMenu<Map<String, dynamic>>(
            columns: createTestColumns(),
            hiddenColumnIds: {},
            density: TableDensity.standard,
            onHiddenColumnsChanged: (_) {},
            onDensityChanged: (_) {},
          ),
        );

        expect(
          find.byWidgetPredicate(
            (w) => w is Tooltip && w.message == 'Customize table',
          ),
          findsOneWidget,
        );
      });
    });

    group('menu opens', () {
      testWidgets('shows density section when opened', (tester) async {
        await tester.pumpTestWidget(
          TableCustomizationMenu<Map<String, dynamic>>(
            columns: createTestColumns(),
            hiddenColumnIds: {},
            density: TableDensity.standard,
            onHiddenColumnsChanged: (_) {},
            onDensityChanged: (_) {},
          ),
        );

        await tester.tap(find.byIcon(Icons.tune));
        await tester.pumpAndSettle();

        expect(find.text('DENSITY'), findsOneWidget);
      });

      testWidgets('shows all density options', (tester) async {
        await tester.pumpTestWidget(
          TableCustomizationMenu<Map<String, dynamic>>(
            columns: createTestColumns(),
            hiddenColumnIds: {},
            density: TableDensity.standard,
            onHiddenColumnsChanged: (_) {},
            onDensityChanged: (_) {},
          ),
        );

        await tester.tap(find.byIcon(Icons.tune));
        await tester.pumpAndSettle();

        expect(find.text('Compact'), findsOneWidget);
        expect(find.text('Standard'), findsOneWidget);
        expect(find.text('Comfortable'), findsOneWidget);
      });

      testWidgets('shows columns section when opened', (tester) async {
        await tester.pumpTestWidget(
          TableCustomizationMenu<Map<String, dynamic>>(
            columns: createTestColumns(),
            hiddenColumnIds: {},
            density: TableDensity.standard,
            onHiddenColumnsChanged: (_) {},
            onDensityChanged: (_) {},
          ),
        );

        await tester.tap(find.byIcon(Icons.tune));
        await tester.pumpAndSettle();

        expect(find.text('COLUMNS'), findsOneWidget);
      });

      testWidgets('shows all column labels', (tester) async {
        await tester.pumpTestWidget(
          TableCustomizationMenu<Map<String, dynamic>>(
            columns: createTestColumns(),
            hiddenColumnIds: {},
            density: TableDensity.standard,
            onHiddenColumnsChanged: (_) {},
            onDensityChanged: (_) {},
          ),
        );

        await tester.tap(find.byIcon(Icons.tune));
        await tester.pumpAndSettle();

        expect(find.text('Name'), findsOneWidget);
        expect(find.text('Status'), findsOneWidget);
        expect(find.text('Date'), findsOneWidget);
      });
    });

    group('density selection', () {
      testWidgets('current density shows checked radio', (tester) async {
        await tester.pumpTestWidget(
          TableCustomizationMenu<Map<String, dynamic>>(
            columns: createTestColumns(),
            hiddenColumnIds: {},
            density: TableDensity.compact,
            onHiddenColumnsChanged: (_) {},
            onDensityChanged: (_) {},
          ),
        );

        await tester.tap(find.byIcon(Icons.tune));
        await tester.pumpAndSettle();

        // Should show radio_button_checked for the selected density
        expect(find.byIcon(Icons.radio_button_checked), findsOneWidget);
      });

      testWidgets('calls onDensityChanged when density tapped', (tester) async {
        TableDensity? selectedDensity;

        await tester.pumpTestWidget(
          TableCustomizationMenu<Map<String, dynamic>>(
            columns: createTestColumns(),
            hiddenColumnIds: {},
            density: TableDensity.standard,
            onHiddenColumnsChanged: (_) {},
            onDensityChanged: (d) => selectedDensity = d,
          ),
        );

        await tester.tap(find.byIcon(Icons.tune));
        await tester.pumpAndSettle();

        await tester.tap(find.text('Compact'));
        await tester.pumpAndSettle();

        expect(selectedDensity, TableDensity.compact);
      });
    });

    group('column visibility', () {
      testWidgets('shows visibility icon for visible columns', (tester) async {
        await tester.pumpTestWidget(
          TableCustomizationMenu<Map<String, dynamic>>(
            columns: createTestColumns(),
            hiddenColumnIds: {},
            density: TableDensity.standard,
            onHiddenColumnsChanged: (_) {},
            onDensityChanged: (_) {},
          ),
        );

        await tester.tap(find.byIcon(Icons.tune));
        await tester.pumpAndSettle();

        expect(find.byIcon(Icons.visibility_outlined), findsNWidgets(3));
      });

      testWidgets('shows visibility_off icon for hidden columns', (
        tester,
      ) async {
        await tester.pumpTestWidget(
          TableCustomizationMenu<Map<String, dynamic>>(
            columns: createTestColumns(),
            hiddenColumnIds: {'status'},
            density: TableDensity.standard,
            onHiddenColumnsChanged: (_) {},
            onDensityChanged: (_) {},
          ),
        );

        await tester.tap(find.byIcon(Icons.tune));
        await tester.pumpAndSettle();

        expect(find.byIcon(Icons.visibility_outlined), findsNWidgets(2));
        expect(find.byIcon(Icons.visibility_off_outlined), findsOneWidget);
      });

      testWidgets('calls onHiddenColumnsChanged when column tapped', (
        tester,
      ) async {
        Set<String>? updatedHidden;

        await tester.pumpTestWidget(
          TableCustomizationMenu<Map<String, dynamic>>(
            columns: createTestColumns(),
            hiddenColumnIds: {},
            density: TableDensity.standard,
            onHiddenColumnsChanged: (h) => updatedHidden = h,
            onDensityChanged: (_) {},
          ),
        );

        await tester.tap(find.byIcon(Icons.tune));
        await tester.pumpAndSettle();

        // Tap on "Name" column to hide it
        await tester.tap(find.text('Name'));
        await tester.pumpAndSettle();

        expect(updatedHidden, contains('name'));
      });

      testWidgets('Show all button clears hidden columns', (tester) async {
        Set<String>? updatedHidden;

        await tester.pumpTestWidget(
          TableCustomizationMenu<Map<String, dynamic>>(
            columns: createTestColumns(),
            hiddenColumnIds: {'name', 'status'},
            density: TableDensity.standard,
            onHiddenColumnsChanged: (h) => updatedHidden = h,
            onDensityChanged: (_) {},
          ),
        );

        await tester.tap(find.byIcon(Icons.tune));
        await tester.pumpAndSettle();

        await tester.tap(find.text('Show all'));
        await tester.pumpAndSettle();

        expect(updatedHidden, isEmpty);
      });
    });

    group('saved views section', () {
      testWidgets('shows saved views section when entityName provided', (
        tester,
      ) async {
        await tester.pumpTestWidget(
          TableCustomizationMenu<Map<String, dynamic>>(
            columns: createTestColumns(),
            hiddenColumnIds: {},
            density: TableDensity.standard,
            onHiddenColumnsChanged: (_) {},
            onDensityChanged: (_) {},
            entityName: 'work_order',
          ),
        );

        await tester.tap(find.byIcon(Icons.tune));
        await tester.pumpAndSettle();

        expect(find.text('SAVED VIEWS'), findsOneWidget);
      });

      testWidgets('hides saved views section when entityName is null', (
        tester,
      ) async {
        await tester.pumpTestWidget(
          TableCustomizationMenu<Map<String, dynamic>>(
            columns: createTestColumns(),
            hiddenColumnIds: {},
            density: TableDensity.standard,
            onHiddenColumnsChanged: (_) {},
            onDensityChanged: (_) {},
            entityName: null,
          ),
        );

        await tester.tap(find.byIcon(Icons.tune));
        await tester.pumpAndSettle();

        expect(find.text('SAVED VIEWS'), findsNothing);
      });

      testWidgets('shows save and load options', (tester) async {
        await tester.pumpTestWidget(
          TableCustomizationMenu<Map<String, dynamic>>(
            columns: createTestColumns(),
            hiddenColumnIds: {},
            density: TableDensity.standard,
            onHiddenColumnsChanged: (_) {},
            onDensityChanged: (_) {},
            entityName: 'work_order',
          ),
        );

        await tester.tap(find.byIcon(Icons.tune));
        await tester.pumpAndSettle();

        expect(find.text('Save current view...'), findsOneWidget);
        expect(find.text('Load saved view...'), findsOneWidget);
      });
    });

    group('LoadViewDialog', () {
      testWidgets('shows loading indicator when loading', (tester) async {
        await tester.pumpTestWidget(
          const LoadViewDialog(views: null, loading: true, onLoad: _noOpLoad),
        );

        expect(find.byType(CircularProgressIndicator), findsOneWidget);
      });

      testWidgets('shows empty state when no views', (tester) async {
        await tester.pumpTestWidget(
          const LoadViewDialog(views: [], loading: false, onLoad: _noOpLoad),
        );

        expect(find.text('No saved views'), findsOneWidget);
      });

      testWidgets('shows views list when views provided', (tester) async {
        await tester.pumpTestWidget(
          LoadViewDialog(
            views: [
              createTestView(id: 1, viewName: 'View One'),
              createTestView(id: 2, viewName: 'View Two'),
            ],
            loading: false,
            onLoad: _noOpLoad,
          ),
        );

        expect(find.text('View One'), findsOneWidget);
        expect(find.text('View Two'), findsOneWidget);
      });

      testWidgets('shows star icon for default view', (tester) async {
        await tester.pumpTestWidget(
          LoadViewDialog(
            views: [
              createTestView(id: 1, viewName: 'Default View', isDefault: true),
            ],
            loading: false,
            onLoad: _noOpLoad,
          ),
        );

        expect(find.byIcon(Icons.star), findsOneWidget);
      });

      testWidgets('calls onLoad when view tapped', (tester) async {
        SavedViewSettings? loadedSettings;

        await tester.pumpTestWidget(
          LoadViewDialog(
            views: [
              createTestView(
                id: 1,
                viewName: 'My View',
                hiddenColumns: ['name'],
                density: 'compact',
              ),
            ],
            loading: false,
            onLoad: (settings) => loadedSettings = settings,
          ),
        );

        await tester.tap(find.text('My View'));
        await tester.pumpAndSettle();

        expect(loadedSettings?.hiddenColumns, contains('name'));
        expect(loadedSettings?.density, 'compact');
      });

      testWidgets('shows delete button and calls onDelete', (tester) async {
        SavedView? deletedView;

        await tester.pumpTestWidget(
          LoadViewDialog(
            views: [createTestView(id: 42, viewName: 'To Delete')],
            loading: false,
            onLoad: _noOpLoad,
            onDelete: (view) => deletedView = view,
          ),
        );

        await tester.tap(find.byIcon(Icons.delete_outline));
        await tester.pumpAndSettle();

        expect(deletedView?.id, 42);
      });

      testWidgets('has cancel button', (tester) async {
        await tester.pumpTestWidget(
          LoadViewDialog(
            views: [createTestView()],
            loading: false,
            onLoad: _noOpLoad,
          ),
        );

        expect(find.text('Cancel'), findsOneWidget);
      });
    });
  });
}

// Helper for tests that don't need the callback
void _noOpLoad(SavedViewSettings settings) {}
