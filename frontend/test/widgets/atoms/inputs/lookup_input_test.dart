// LookupInput Widget Tests
//
// **BEHAVIORAL FOCUS:**
// - Tests search-based lookup functionality
// - Validates debounced search behavior
// - Tests selection and clear behaviors

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross/widgets/atoms/inputs/lookup_input.dart';

// Test data class
class TestCustomer {
  final int id;
  final String name;
  final String email;

  TestCustomer({required this.id, required this.name, required this.email});

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TestCustomer &&
          runtimeType == other.runtimeType &&
          id == other.id;

  @override
  int get hashCode => id.hashCode;
}

void main() {
  // Customers for testing
  final testCustomers = [
    TestCustomer(id: 1, name: 'Alice Smith', email: 'alice@example.com'),
    TestCustomer(id: 2, name: 'Bob Jones', email: 'bob@example.com'),
    TestCustomer(id: 3, name: 'Charlie Brown', email: 'charlie@example.com'),
  ];

  // Fast mock search function (minimal delay for testing)
  Future<List<TestCustomer>> mockSearch(String query) async {
    // Very short delay - enough to be async but fast enough for testing
    await Future.delayed(const Duration(milliseconds: 10));
    return testCustomers
        .where((c) => c.name.toLowerCase().contains(query.toLowerCase()))
        .toList();
  }

  group('LookupInput', () {
    group('Rendering', () {
      testWidgets('renders with placeholder text', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: LookupInput<TestCustomer>(
                value: null,
                searchItems: mockSearch,
                displayText: (c) => c.name,
                onChanged: (_) {},
                placeholder: 'Search customers...',
              ),
            ),
          ),
        );

        expect(find.text('Search customers...'), findsOneWidget);
      });

      testWidgets('displays helper text when provided', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: LookupInput<TestCustomer>(
                value: null,
                searchItems: mockSearch,
                displayText: (c) => c.name,
                onChanged: (_) {},
                helperText: 'Start typing to search',
              ),
            ),
          ),
        );

        expect(find.text('Start typing to search'), findsOneWidget);
      });

      testWidgets('displays error text when provided', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: LookupInput<TestCustomer>(
                value: null,
                searchItems: mockSearch,
                displayText: (c) => c.name,
                onChanged: (_) {},
                errorText: 'Customer is required',
              ),
            ),
          ),
        );

        expect(find.text('Customer is required'), findsOneWidget);
      });

      testWidgets('shows prefix icon when provided', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: LookupInput<TestCustomer>(
                value: null,
                searchItems: mockSearch,
                displayText: (c) => c.name,
                onChanged: (_) {},
                prefixIcon: Icons.person_search,
              ),
            ),
          ),
        );

        expect(find.byIcon(Icons.person_search), findsOneWidget);
      });
    });

    group('Search Behavior', () {
      testWidgets('does not search when text is below minSearchLength', (
        tester,
      ) async {
        int searchCalls = 0;
        Future<List<TestCustomer>> trackedSearch(String query) async {
          searchCalls++;
          return mockSearch(query);
        }

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: LookupInput<TestCustomer>(
                value: null,
                searchItems: trackedSearch,
                displayText: (c) => c.name,
                onChanged: (_) {},
                minSearchLength: 2,
                debounceDuration: const Duration(milliseconds: 50),
              ),
            ),
          ),
        );

        // Type just 1 character
        await tester.enterText(find.byType(TextField), 'A');
        await tester.pump(const Duration(milliseconds: 100));

        // Should NOT have called search (below minSearchLength)
        expect(searchCalls, 0);
      });

      testWidgets('searches after minSearchLength characters', (tester) async {
        int searchCalls = 0;
        Future<List<TestCustomer>> trackedSearch(String query) async {
          searchCalls++;
          await Future.delayed(const Duration(milliseconds: 5));
          return testCustomers
              .where((c) => c.name.toLowerCase().contains(query.toLowerCase()))
              .toList();
        }

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: LookupInput<TestCustomer>(
                value: null,
                searchItems: trackedSearch,
                displayText: (c) => c.name,
                onChanged: (_) {},
                minSearchLength: 2,
                debounceDuration: const Duration(milliseconds: 20),
              ),
            ),
          ),
        );

        // Type 2+ characters
        await tester.enterText(find.byType(TextField), 'Al');
        // Wait for debounce timer + search + frame
        await tester.pump(const Duration(milliseconds: 50));
        await tester.pump(const Duration(milliseconds: 50));
        await tester.pump();

        // Should have called search
        expect(searchCalls, greaterThan(0));
      });

      testWidgets('shows search results in dropdown', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: LookupInput<TestCustomer>(
                value: null,
                searchItems: mockSearch,
                displayText: (c) => c.name,
                onChanged: (_) {},
                minSearchLength: 2,
                debounceDuration: const Duration(milliseconds: 20),
              ),
            ),
          ),
        );

        // Type enough characters to trigger search
        await tester.enterText(find.byType(TextField), 'Ali');

        // Wait for debounce + async search + rebuild cycle
        await tester.pump(const Duration(milliseconds: 50));
        await tester.pump(const Duration(milliseconds: 50));
        await tester.pump();

        // Should show Alice in results
        expect(find.text('Alice Smith'), findsWidgets);
      });
    });

    group('Selection Behavior', () {
      testWidgets('calls onChanged when item is selected', (tester) async {
        TestCustomer? selectedCustomer;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: LookupInput<TestCustomer>(
                value: null,
                searchItems: mockSearch,
                displayText: (c) => c.name,
                onChanged: (c) => selectedCustomer = c,
                minSearchLength: 2,
                debounceDuration: const Duration(milliseconds: 20),
              ),
            ),
          ),
        );

        // Type to trigger search
        await tester.enterText(find.byType(TextField), 'Ali');

        // Wait for async search cycle
        await tester.pump(const Duration(milliseconds: 50));
        await tester.pump(const Duration(milliseconds: 50));
        await tester.pump();

        // Tap on Alice Smith in the dropdown
        await tester.tap(find.text('Alice Smith').last);
        await tester.pump();

        // Should have called onChanged with Alice
        expect(selectedCustomer, isNotNull);
        expect(selectedCustomer!.name, 'Alice Smith');
      });

      testWidgets('displays selected value in text field', (tester) async {
        final alice = TestCustomer(
          id: 1,
          name: 'Alice Smith',
          email: 'alice@example.com',
        );

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: LookupInput<TestCustomer>(
                value: alice,
                searchItems: mockSearch,
                displayText: (c) => c.name,
                onChanged: (_) {},
              ),
            ),
          ),
        );

        // Should display the selected customer's name
        expect(find.text('Alice Smith'), findsOneWidget);
      });
    });

    group('Clear Behavior', () {
      testWidgets('shows clear button when text is entered', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: LookupInput<TestCustomer>(
                value: null,
                searchItems: mockSearch,
                displayText: (c) => c.name,
                onChanged: (_) {},
                allowClear: true,
              ),
            ),
          ),
        );

        // Type something to make clear button appear
        await tester.enterText(find.byType(TextField), 'Alice');
        await tester.pumpAndSettle();

        expect(find.byIcon(Icons.clear), findsOneWidget);
      });

      testWidgets('clears text when clear button is tapped', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: LookupInput<TestCustomer>(
                value: null,
                searchItems: mockSearch,
                displayText: (c) => c.name,
                onChanged: (_) {},
                allowClear: true,
              ),
            ),
          ),
        );

        // Type something first
        await tester.enterText(find.byType(TextField), 'Alice');
        await tester.pumpAndSettle();

        // Find and tap clear button
        await tester.tap(find.byIcon(Icons.clear));
        await tester.pumpAndSettle();

        // Text should be cleared
        final textField = tester.widget<TextField>(find.byType(TextField));
        expect(textField.controller?.text, '');
      });
    });

    group('Disabled State', () {
      testWidgets('does not allow input when disabled', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: LookupInput<TestCustomer>(
                value: null,
                searchItems: mockSearch,
                displayText: (c) => c.name,
                onChanged: (_) {},
                enabled: false,
              ),
            ),
          ),
        );

        final textField = tester.widget<TextField>(find.byType(TextField));
        expect(textField.enabled, false);
      });
    });
  });
}
