/// Tests for MasterDetailLayout template
///
/// Verifies:
/// - Wide/narrow layout switching at 900px (AppBreakpoints.masterDetailBreakpoint)
/// - Master panel rendering
/// - Detail panel rendering
/// - Selection behavior
/// - Back navigation on narrow
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/templates/master_detail_layout.dart';

void main() {
  group('MasterDetailLayout', () {
    // Test data
    final testItems = ['Item A', 'Item B', 'Item C'];

    // Helper to set viewport size for LayoutBuilder tests
    Future<void> setViewportSize(WidgetTester tester, Size size) async {
      tester.view.physicalSize = size;
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
    }

    Widget buildLayout({
      List<String>? items,
      String? selectedItem,
      ValueChanged<String>? onItemSelected,
      VoidCallback? onBack,
    }) {
      return MaterialApp(
        home: Scaffold(
          body: MasterDetailLayout<String>(
            masterTitle: 'Test Items',
            items: items ?? testItems,
            selectedItem: selectedItem,
            onItemSelected: onItemSelected ?? (_) {},
            masterItemBuilder: (item, isSelected) =>
                ListTile(title: Text(item), selected: isSelected),
            detailBuilder: (item) => Center(child: Text('Detail: $item')),
            emptyMasterMessage: 'No items',
            emptyDetailMessage: 'Select an item',
            onBack: onBack,
          ),
        ),
      );
    }

    group('Wide Layout (≥900px)', () {
      testWidgets('shows master and detail side by side', (tester) async {
        await setViewportSize(tester, const Size(1200, 800));
        await tester.pumpWidget(buildLayout(selectedItem: 'Item A'));

        // Both master title and detail content visible
        expect(find.text('Test Items'), findsOneWidget);
        expect(find.text('Detail: Item A'), findsOneWidget);

        // All master items visible
        expect(find.text('Item A'), findsWidgets); // In master list
        expect(find.text('Item B'), findsOneWidget);
        expect(find.text('Item C'), findsOneWidget);
      });

      testWidgets('shows empty detail when no selection', (tester) async {
        await setViewportSize(tester, const Size(1200, 800));
        await tester.pumpWidget(buildLayout(selectedItem: null));

        expect(find.text('Test Items'), findsOneWidget);
        expect(find.text('Select an item'), findsOneWidget);
      });

      testWidgets('calls onItemSelected when item tapped', (tester) async {
        await setViewportSize(tester, const Size(1200, 800));
        String? selected;
        await tester.pumpWidget(
          buildLayout(onItemSelected: (item) => selected = item),
        );

        await tester.tap(find.text('Item B'));
        await tester.pump();

        expect(selected, equals('Item B'));
      });
    });

    group('Narrow Layout (<900px)', () {
      testWidgets('shows master list when no selection', (tester) async {
        await setViewportSize(tester, const Size(600, 800));
        await tester.pumpWidget(buildLayout(selectedItem: null));

        // Master visible
        expect(find.text('Test Items'), findsOneWidget);
        expect(find.text('Item A'), findsOneWidget);

        // Detail not visible
        expect(find.text('Select an item'), findsNothing);
      });

      testWidgets('shows detail panel when item selected', (tester) async {
        await setViewportSize(tester, const Size(600, 800));
        await tester.pumpWidget(
          buildLayout(selectedItem: 'Item B', onBack: () {}),
        );

        // Detail visible
        expect(find.text('Detail: Item B'), findsOneWidget);

        // Back button visible
        expect(find.byIcon(Icons.arrow_back), findsOneWidget);

        // Master not visible
        expect(find.text('Test Items'), findsNothing);
      });

      testWidgets('calls onBack when back button tapped', (tester) async {
        await setViewportSize(tester, const Size(600, 800));
        bool backCalled = false;
        await tester.pumpWidget(
          buildLayout(selectedItem: 'Item A', onBack: () => backCalled = true),
        );

        await tester.tap(find.byIcon(Icons.arrow_back));
        await tester.pump();

        expect(backCalled, isTrue);
      });
    });

    group('Empty States', () {
      testWidgets('shows empty master message when no items', (tester) async {
        await setViewportSize(tester, const Size(1200, 800));
        await tester.pumpWidget(buildLayout(items: []));

        expect(find.text('No items'), findsOneWidget);
      });

      testWidgets('shows empty detail message on wide when no selection', (
        tester,
      ) async {
        await setViewportSize(tester, const Size(1200, 800));
        await tester.pumpWidget(buildLayout(selectedItem: null));

        // In wide mode, empty detail message is visible
        expect(find.text('Select an item'), findsOneWidget);
      });
    });

    group('MasterListTile', () {
      testWidgets('renders with title and icon', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: MasterListTile(
                title: 'Test Title',
                icon: Icons.person,
                isSelected: false,
              ),
            ),
          ),
        );

        expect(find.text('Test Title'), findsOneWidget);
        expect(find.byIcon(Icons.person), findsOneWidget);
      });

      testWidgets('highlights when selected', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: MasterListTile(title: 'Selected Item', isSelected: true),
            ),
          ),
        );

        // The text should have bold styling when selected
        final textWidget = tester.widget<Text>(find.text('Selected Item'));
        expect(textWidget.style?.fontWeight, equals(FontWeight.bold));
      });

      testWidgets('shows subtitle when provided', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: MasterListTile(
                title: 'Main Title',
                subtitle: 'Subtitle text',
                isSelected: false,
              ),
            ),
          ),
        );

        expect(find.text('Main Title'), findsOneWidget);
        expect(find.text('Subtitle text'), findsOneWidget);
      });
    });

    group('Responsive Breakpoint', () {
      testWidgets('narrow layout below 900px shows only master', (
        tester,
      ) async {
        await setViewportSize(tester, const Size(899, 800));
        await tester.pumpWidget(buildLayout(selectedItem: null));

        // In narrow mode with no selection, only master visible
        expect(find.text('Test Items'), findsOneWidget);
        // Detail empty message NOT visible in narrow mode
        expect(find.text('Select an item'), findsNothing);
      });

      testWidgets('wide layout at 900px+ shows both panels', (tester) async {
        await setViewportSize(tester, const Size(900, 800));
        await tester.pumpWidget(buildLayout(selectedItem: null));

        // In wide mode, both panels visible
        expect(find.text('Test Items'), findsOneWidget);
        expect(find.text('Select an item'), findsOneWidget);
      });
    });
  });
}
