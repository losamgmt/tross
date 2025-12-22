/// Tests for FilterDropdown Atom
///
/// Verifies:
/// - Basic rendering with items
/// - Display text transformation
/// - Label prefix display
/// - "All" option behavior
/// - Selection changes
/// - Compact mode
/// - Enabled/disabled states
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/atoms/inputs/filter_dropdown.dart';

void main() {
  group('FilterDropdown Atom', () {
    group('Basic Rendering', () {
      testWidgets('displays selected value', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: FilterDropdown<String>(
                value: 'Active',
                items: const ['Active', 'Inactive', 'Pending'],
                onChanged: (_) {},
              ),
            ),
          ),
        );

        expect(find.text('Active'), findsOneWidget);
      });

      testWidgets('displays "All" when value is null', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: FilterDropdown<String>(
                value: null,
                items: const ['Active', 'Inactive'],
                onChanged: (_) {},
              ),
            ),
          ),
        );

        expect(find.text('All'), findsOneWidget);
      });

      testWidgets('displays custom allOptionText', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: FilterDropdown<String>(
                value: null,
                items: const ['Active', 'Inactive'],
                onChanged: (_) {},
                allOptionText: 'All Statuses',
              ),
            ),
          ),
        );

        expect(find.text('All Statuses'), findsOneWidget);
      });

      testWidgets('displays dropdown arrow icon', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: FilterDropdown<String>(
                value: 'Active',
                items: const ['Active', 'Inactive'],
                onChanged: (_) {},
              ),
            ),
          ),
        );

        expect(find.byIcon(Icons.arrow_drop_down), findsOneWidget);
      });
    });

    group('Label Prefix', () {
      testWidgets('displays label when provided', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: FilterDropdown<String>(
                value: 'Active',
                items: const ['Active', 'Inactive'],
                onChanged: (_) {},
                label: 'Status',
              ),
            ),
          ),
        );

        expect(find.text('Status:'), findsOneWidget);
        expect(find.text('Active'), findsOneWidget);
      });

      testWidgets('no label when not provided', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: FilterDropdown<String>(
                value: 'Active',
                items: const ['Active', 'Inactive'],
                onChanged: (_) {},
              ),
            ),
          ),
        );

        expect(find.textContaining(':'), findsNothing);
      });
    });

    group('Display Text', () {
      testWidgets('uses toString by default', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: FilterDropdown<int>(
                value: 42,
                items: const [42, 100, 200],
                onChanged: (_) {},
              ),
            ),
          ),
        );

        expect(find.text('42'), findsOneWidget);
      });

      testWidgets('uses custom displayText function', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: FilterDropdown<String>(
                value: 'active',
                items: const ['active', 'inactive'],
                onChanged: (_) {},
                displayText: (s) => s.toUpperCase(),
              ),
            ),
          ),
        );

        expect(find.text('ACTIVE'), findsOneWidget);
      });
    });

    group('Dropdown Menu', () {
      testWidgets('opens menu on tap', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: FilterDropdown<String>(
                value: 'Active',
                items: const ['Active', 'Inactive', 'Pending'],
                onChanged: (_) {},
              ),
            ),
          ),
        );

        await tester.tap(find.byType(FilterDropdown<String>));
        await tester.pumpAndSettle();

        // Menu should show all items
        expect(find.text('All'), findsOneWidget);
        expect(find.text('Inactive'), findsOneWidget);
        expect(find.text('Pending'), findsOneWidget);
      });

      testWidgets('calls onChanged when item selected', (tester) async {
        String? selectedValue = 'Active';

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: StatefulBuilder(
                builder: (context, setState) => FilterDropdown<String>(
                  value: selectedValue,
                  items: const ['Active', 'Inactive', 'Pending'],
                  onChanged: (value) => setState(() => selectedValue = value),
                ),
              ),
            ),
          ),
        );

        await tester.tap(find.byType(FilterDropdown<String>));
        await tester.pumpAndSettle();

        await tester.tap(find.text('Inactive').last);
        await tester.pumpAndSettle();

        expect(selectedValue, 'Inactive');
      });

      testWidgets('selecting "All" returns null', (tester) async {
        String? selectedValue = 'Active';

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: StatefulBuilder(
                builder: (context, setState) => FilterDropdown<String>(
                  value: selectedValue,
                  items: const ['Active', 'Inactive'],
                  onChanged: (value) => setState(() => selectedValue = value),
                ),
              ),
            ),
          ),
        );

        await tester.tap(find.byType(FilterDropdown<String>));
        await tester.pumpAndSettle();

        await tester.tap(find.text('All').last);
        await tester.pumpAndSettle();

        expect(selectedValue, isNull);
      });

      testWidgets('hides "All" option when showAllOption=false', (
        tester,
      ) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: FilterDropdown<String>(
                value: 'Active',
                items: const ['Active', 'Inactive'],
                onChanged: (_) {},
                showAllOption: false,
              ),
            ),
          ),
        );

        await tester.tap(find.byType(FilterDropdown<String>));
        await tester.pumpAndSettle();

        // Should not find "All" in menu (only the displayed value before open)
        expect(find.text('All'), findsNothing);
      });
    });

    group('Compact Mode', () {
      testWidgets('standard mode uses larger arrow icon', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: FilterDropdown<String>(
                value: 'Active',
                items: const ['Active', 'Inactive'],
                onChanged: (_) {},
                compact: false,
              ),
            ),
          ),
        );

        final icon = tester.widget<Icon>(find.byIcon(Icons.arrow_drop_down));
        expect(icon.size, 20);
      });

      testWidgets('compact mode uses smaller arrow icon', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: FilterDropdown<String>(
                value: 'Active',
                items: const ['Active', 'Inactive'],
                onChanged: (_) {},
                compact: true,
              ),
            ),
          ),
        );

        final icon = tester.widget<Icon>(find.byIcon(Icons.arrow_drop_down));
        expect(icon.size, 18);
      });
    });

    group('Enabled/Disabled States', () {
      testWidgets('enabled dropdown is tappable', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: FilterDropdown<String>(
                value: 'Active',
                items: const ['Active', 'Inactive'],
                onChanged: (_) {},
                enabled: true,
              ),
            ),
          ),
        );

        await tester.tap(find.byType(FilterDropdown<String>));
        await tester.pumpAndSettle();

        // Menu should open (we can find menu items)
        expect(find.text('Inactive'), findsOneWidget);
      });

      testWidgets('disabled dropdown does not open menu', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: FilterDropdown<String>(
                value: 'Active',
                items: const ['Active', 'Inactive'],
                onChanged: (_) {},
                enabled: false,
              ),
            ),
          ),
        );

        await tester.tap(find.byType(FilterDropdown<String>));
        await tester.pumpAndSettle();

        // Menu should NOT open - only the original "Active" visible
        expect(find.text('Inactive'), findsNothing);
      });
    });

    group('Styling', () {
      testWidgets('has border decoration', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: FilterDropdown<String>(
                value: 'Active',
                items: const ['Active', 'Inactive'],
                onChanged: (_) {},
              ),
            ),
          ),
        );

        final container = tester.widget<Container>(find.byType(Container));
        final decoration = container.decoration as BoxDecoration;
        expect(decoration.border, isNotNull);
      });

      testWidgets('row uses min main axis size', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: FilterDropdown<String>(
                value: 'Active',
                items: const ['Active', 'Inactive'],
                onChanged: (_) {},
              ),
            ),
          ),
        );

        final row = tester.widget<Row>(find.byType(Row));
        expect(row.mainAxisSize, MainAxisSize.min);
      });
    });

    group('Generic Types', () {
      testWidgets('works with enum types', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: FilterDropdown<_TestStatus>(
                value: _TestStatus.active,
                items: _TestStatus.values,
                onChanged: (_) {},
                displayText: (s) => s.name.toUpperCase(),
              ),
            ),
          ),
        );

        expect(find.text('ACTIVE'), findsOneWidget);
      });

      testWidgets('works with int types', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: FilterDropdown<int>(
                value: 10,
                items: const [10, 25, 50, 100],
                onChanged: (_) {},
                label: 'Page Size',
              ),
            ),
          ),
        );

        expect(find.text('Page Size:'), findsOneWidget);
        expect(find.text('10'), findsOneWidget);
      });
    });
  });
}

enum _TestStatus { active, inactive, pending }
