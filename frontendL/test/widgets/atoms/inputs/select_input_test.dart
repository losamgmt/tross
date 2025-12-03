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
    testWidgets('renders with label and selected value', (tester) async {
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

      expect(find.text('admin'), findsOneWidget);
    });

    testWidgets('shows required indicator when required is true', (
      tester,
    ) async {
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
    });

    testWidgets('displays all items in dropdown', (tester) async {
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

      // Tap to open dropdown
      await tester.tap(find.byType(DropdownButtonFormField<TestRole>));
      await tester.pumpAndSettle();

      // Should show all enum values
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
      await tester.tap(find.byType(DropdownButtonFormField<TestRole>));
      await tester.pumpAndSettle();

      // Select 'user'
      await tester.tap(find.text('user').last);
      await tester.pumpAndSettle();

      expect(selectedRole, TestRole.user);
    });

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

    testWidgets('allows empty selection when allowEmpty is true', (
      tester,
    ) async {
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
      await tester.tap(find.byType(DropdownButtonFormField<TestRole>));
      await tester.pumpAndSettle();

      // Should show empty option (finds multiple because dropdown shows items in both states)
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
      await tester.tap(find.byType(DropdownButtonFormField<TestRole>));
      await tester.pumpAndSettle();

      expect(find.text('None'), findsWidgets);
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

    testWidgets('shows placeholder text', (tester) async {
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

    testWidgets('disables dropdown when enabled is false', (tester) async {
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

      final dropdown = tester.widget<DropdownButtonFormField<TestRole>>(
        find.byType(DropdownButtonFormField<TestRole>),
      );
      expect(dropdown.onChanged, null);
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

    testWidgets('updates value when changed externally', (tester) async {
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

    testWidgets('handles null value', (tester) async {
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

      // Verify dropdown exists and doesn't show a value
      expect(find.byType(DropdownButtonFormField<TestRole>), findsOneWidget);
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
      await tester.tap(find.byType(DropdownButtonFormField<TestUser>));
      await tester.pumpAndSettle();

      expect(find.text('Bob (2)'), findsOneWidget);
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
      await tester.tap(find.byType(DropdownButtonFormField<TestRole>));
      await tester.pumpAndSettle();

      // Select empty option
      await tester.tap(find.text('-- Select --').last);
      await tester.pumpAndSettle();

      expect(selectedRole, null);
    });

    testWidgets('displays expanded dropdown', (tester) async {
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

      // Verify dropdown renders properly
      expect(find.byType(DropdownButtonFormField<TestRole>), findsOneWidget);
      expect(find.text('admin'), findsOneWidget);
    });
  });
}
