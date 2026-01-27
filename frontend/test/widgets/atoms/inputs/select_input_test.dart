// SelectInput Widget Tests
//
// **BEHAVIORAL FOCUS:**
// - Tests what the user experiences, not implementation details
// - Uses SelectInput widget finder, not internal DropdownMenu
// - Validates selection, display, and interaction behaviors

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/atoms/inputs/select_input.dart';

// Test enum
enum TestRole { admin, user, guest }

// Test class
class TestUser {
  final String id;
  final String name;

  TestUser(this.id, this.name);

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TestUser && runtimeType == other.runtimeType && id == other.id;

  @override
  int get hashCode => id.hashCode;
}

void main() {
  group('SelectInput', () {
    group('Rendering', () {
      testWidgets('renders with selected value displayed', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: SelectInput<TestRole>(
                value: TestRole.admin,
                items: TestRole.values,
                displayText: (role) => role.name,
                onChanged: (_) {},
              ),
            ),
          ),
        );

        // Behavioral: User should see their selected value
        expect(find.text('admin'), findsOneWidget);
      });

      testWidgets('renders placeholder when value is null', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: SelectInput<TestRole>(
                value: null,
                items: TestRole.values,
                displayText: (role) => role.name,
                onChanged: (_) {},
                placeholder: 'Choose a role',
              ),
            ),
          ),
        );

        expect(find.text('Choose a role'), findsOneWidget);
      });

      testWidgets('displays helper text when provided', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: SelectInput<TestRole>(
                value: null,
                items: TestRole.values,
                displayText: (role) => role.name,
                onChanged: (_) {},
                helperText: 'Select a user role',
              ),
            ),
          ),
        );

        expect(find.text('Select a user role'), findsOneWidget);
      });

      testWidgets('displays error text when provided', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: SelectInput<TestRole>(
                value: null,
                items: TestRole.values,
                displayText: (role) => role.name,
                onChanged: (_) {},
                errorText: 'Role is required',
              ),
            ),
          ),
        );

        expect(find.text('Role is required'), findsOneWidget);
      });

      testWidgets('shows prefix icon when provided', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: SelectInput<TestRole>(
                value: null,
                items: TestRole.values,
                displayText: (role) => role.name,
                onChanged: (_) {},
                prefixIcon: Icons.person,
              ),
            ),
          ),
        );

        expect(find.byIcon(Icons.person), findsOneWidget);
      });

      testWidgets('shows suffix icon when provided', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: SelectInput<TestRole>(
                value: null,
                items: TestRole.values,
                displayText: (role) => role.name,
                onChanged: (_) {},
                suffixIcon: Icons.shield,
              ),
            ),
          ),
        );

        expect(find.byIcon(Icons.shield), findsOneWidget);
      });
    });

    group('Selection Behavior', () {
      testWidgets('displays all items when dropdown is opened', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: SelectInput<TestRole>(
                value: TestRole.admin,
                items: TestRole.values,
                displayText: (role) => role.name,
                onChanged: (_) {},
              ),
            ),
          ),
        );

        // Tap to open dropdown (find by SelectInput type)
        await tester.tap(find.byType(SelectInput<TestRole>));
        await tester.pumpAndSettle();

        // Should show all enum values in the dropdown menu
        expect(find.text('admin'), findsWidgets);
        expect(find.text('user'), findsOneWidget);
        expect(find.text('guest'), findsOneWidget);
      });

      testWidgets('calls onChanged when item is selected', (tester) async {
        TestRole? selectedRole;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: SelectInput<TestRole>(
                value: TestRole.admin,
                items: TestRole.values,
                displayText: (role) => role.name,
                onChanged: (role) => selectedRole = role,
              ),
            ),
          ),
        );

        // Open dropdown
        await tester.tap(find.byType(SelectInput<TestRole>));
        await tester.pumpAndSettle();

        // Select 'user' from the menu
        await tester.tap(find.text('user').last);
        await tester.pumpAndSettle();

        expect(selectedRole, TestRole.user);
      });

      testWidgets('updates display when value changes externally', (
        tester,
      ) async {
        TestRole? value = TestRole.admin;

        await tester.pumpWidget(
          StatefulBuilder(
            builder: (context, setState) {
              return MaterialApp(
                home: Scaffold(
                  body: Column(
                    children: [
                      SelectInput<TestRole>(
                        value: value,
                        items: TestRole.values,
                        displayText: (role) => role.name,
                        onChanged: (newValue) {
                          setState(() => value = newValue);
                        },
                      ),
                      ElevatedButton(
                        onPressed: () {
                          setState(() => value = TestRole.guest);
                        },
                        child: const Text('Set to Guest'),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        );

        expect(find.text('admin'), findsOneWidget);

        await tester.tap(find.text('Set to Guest'));
        await tester.pumpAndSettle();

        expect(find.text('guest'), findsOneWidget);
      });
    });

    group('Empty Selection', () {
      testWidgets('shows empty option when allowEmpty is true', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: SelectInput<TestRole>(
                value: null,
                items: TestRole.values,
                displayText: (role) => role.name,
                onChanged: (_) {},
                allowEmpty: true,
              ),
            ),
          ),
        );

        // Open dropdown
        await tester.tap(find.byType(SelectInput<TestRole>));
        await tester.pumpAndSettle();

        // Should show empty option
        expect(find.text('-- Select --'), findsWidgets);
      });

      testWidgets('uses custom empty text when provided', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: SelectInput<TestRole>(
                value: null,
                items: TestRole.values,
                displayText: (role) => role.name,
                onChanged: (_) {},
                allowEmpty: true,
                emptyText: 'None',
              ),
            ),
          ),
        );

        // Open dropdown
        await tester.tap(find.byType(SelectInput<TestRole>));
        await tester.pumpAndSettle();

        expect(find.text('None'), findsWidgets);
      });

      testWidgets('can select null value when allowEmpty is true', (
        tester,
      ) async {
        TestRole? selectedRole = TestRole.admin;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: SelectInput<TestRole>(
                value: selectedRole,
                items: TestRole.values,
                displayText: (role) => role.name,
                onChanged: (role) => selectedRole = role,
                allowEmpty: true,
              ),
            ),
          ),
        );

        // Open dropdown
        await tester.tap(find.byType(SelectInput<TestRole>));
        await tester.pumpAndSettle();

        // Select empty option
        await tester.tap(find.text('-- Select --').last);
        await tester.pumpAndSettle();

        expect(selectedRole, null);
      });
    });

    group('Disabled State', () {
      testWidgets('does not open dropdown when disabled', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: SelectInput<TestRole>(
                value: TestRole.admin,
                items: TestRole.values,
                displayText: (role) => role.name,
                onChanged: (_) {},
                enabled: false,
              ),
            ),
          ),
        );

        // Try to open dropdown
        await tester.tap(find.byType(SelectInput<TestRole>));
        await tester.pumpAndSettle();

        // Should NOT show other options (dropdown should not open)
        expect(find.text('user'), findsNothing);
        expect(find.text('guest'), findsNothing);
      });
    });

    group('Custom Objects', () {
      testWidgets('works with custom objects', (tester) async {
        final user1 = TestUser('1', 'Alice');
        final user2 = TestUser('2', 'Bob');
        final users = [user1, user2];

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: SelectInput<TestUser>(
                value: user1,
                items: users,
                displayText: (user) => user.name,
                onChanged: (_) {},
              ),
            ),
          ),
        );

        expect(find.text('Alice'), findsOneWidget);
      });

      testWidgets('uses custom displayText function', (tester) async {
        final user1 = TestUser('1', 'Alice');
        final user2 = TestUser('2', 'Bob');
        final users = [user1, user2];

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: SelectInput<TestUser>(
                value: user1,
                items: users,
                displayText: (user) => '${user.name} (${user.id})',
                onChanged: (_) {},
              ),
            ),
          ),
        );

        expect(find.text('Alice (1)'), findsOneWidget);

        // Open dropdown
        await tester.tap(find.byType(SelectInput<TestUser>));
        await tester.pumpAndSettle();

        expect(find.text('Bob (2)'), findsOneWidget);
      });
    });

    group('Keyboard Filtering (Material 3 DropdownMenu)', () {
      testWidgets('filters items when text is entered', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: SelectInput<TestRole>(
                value: null,
                items: TestRole.values,
                displayText: (role) => role.name,
                onChanged: (_) {},
              ),
            ),
          ),
        );

        // DropdownMenu has a TextField for filtering
        // Tap to focus
        await tester.tap(find.byType(SelectInput<TestRole>));
        await tester.pumpAndSettle();

        // Type to filter
        await tester.enterText(find.byType(TextField), 'adm');
        await tester.pumpAndSettle();

        // Should filter to show 'admin' only in the visible menu items
        expect(find.text('admin'), findsWidgets);
      });
    });
  });
}
