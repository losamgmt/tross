import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/atoms/display/select_field_display.dart';

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
  group('SelectFieldDisplay', () {
    testWidgets('renders with label and enum value', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SelectFieldDisplay<TestRole>(
              value: TestRole.admin,
              displayText: (role) => role.name,
            ),
          ),
        ),
      );

      expect(find.text('admin'), findsOneWidget);
    });

    testWidgets('renders with custom object', (tester) async {
      final user = TestUser('1', 'Alice');

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SelectFieldDisplay<TestUser>(
              value: user,
              displayText: (u) => u.name,
            ),
          ),
        ),
      );

      expect(find.text('Alice'), findsOneWidget);
    });

    testWidgets('displays empty text when value is null', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SelectFieldDisplay<TestRole>(
              value: null,
              displayText: (role) => role.name,
            ),
          ),
        ),
      );

      expect(find.text('--'), findsOneWidget);
    });

    testWidgets('uses custom empty text when provided', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SelectFieldDisplay<TestRole>(
              value: null,
              displayText: (role) => role.name,
              emptyText: 'Not assigned',
            ),
          ),
        ),
      );

      expect(find.text('Not assigned'), findsOneWidget);
    });

    testWidgets('displays icon when provided', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SelectFieldDisplay<TestRole>(
              value: TestRole.admin,
              displayText: (role) => role.name,
              icon: Icons.person,
            ),
          ),
        ),
      );

      expect(find.byIcon(Icons.person), findsOneWidget);
    });

    testWidgets('applies custom value style', (tester) async {
      const customStyle = TextStyle(
        color: Colors.purple,
        fontWeight: FontWeight.bold,
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SelectFieldDisplay<TestRole>(
              value: TestRole.admin,
              displayText: (role) => role.name,
              valueStyle: customStyle,
            ),
          ),
        ),
      );

      final textWidget = tester.widget<Text>(find.text('admin'));
      expect(textWidget.style?.color, Colors.purple);
      expect(textWidget.style?.fontWeight, FontWeight.bold);
    });

    testWidgets('uses custom displayText function', (tester) async {
      final user = TestUser('123', 'Bob');

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SelectFieldDisplay<TestUser>(
              value: user,
              displayText: (u) => '${u.name} (ID: ${u.id})',
            ),
          ),
        ),
      );

      expect(find.text('Bob (ID: 123)'), findsOneWidget);
    });

    testWidgets('handles different enum values', (tester) async {
      for (final role in TestRole.values) {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: SelectFieldDisplay<TestRole>(
                value: role,
                displayText: (r) => r.name,
              ),
            ),
          ),
        );

        expect(find.text(role.name), findsOneWidget);

        await tester.pumpWidget(Container());
      }
    });

    testWidgets('updates when value changes', (tester) async {
      TestRole? value = TestRole.user;

      await tester.pumpWidget(
        StatefulBuilder(
          builder: (context, setState) {
            return MaterialApp(
              home: Scaffold(
                body: Column(
                  children: [
                    SelectFieldDisplay<TestRole>(
                      value: value,
                      displayText: (role) => role.name,
                    ),
                    ElevatedButton(
                      onPressed: () {
                        setState(() => value = TestRole.admin);
                      },
                      child: const Text('Promote'),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      );

      expect(find.text('user'), findsOneWidget);

      await tester.tap(find.text('Promote'));
      await tester.pump();

      expect(find.text('admin'), findsOneWidget);
      expect(find.text('user'), findsNothing);
    });

    testWidgets('updates from value to null', (tester) async {
      TestRole? value = TestRole.guest;

      await tester.pumpWidget(
        StatefulBuilder(
          builder: (context, setState) {
            return MaterialApp(
              home: Scaffold(
                body: Column(
                  children: [
                    SelectFieldDisplay<TestRole>(
                      value: value,
                      displayText: (role) => role.name,
                    ),
                    ElevatedButton(
                      onPressed: () {
                        setState(() => value = null);
                      },
                      child: const Text('Clear'),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      );

      expect(find.text('guest'), findsOneWidget);

      await tester.tap(find.text('Clear'));
      await tester.pump();

      expect(find.text('--'), findsOneWidget);
    });

    testWidgets('handles complex displayText transformations', (tester) async {
      final user = TestUser('456', 'Charlie');

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SelectFieldDisplay<TestUser>(
              value: user,
              displayText: (u) => u.name.toUpperCase(),
            ),
          ),
        ),
      );

      expect(find.text('CHARLIE'), findsOneWidget);
    });

    testWidgets('combines icon and custom styling', (tester) async {
      const customStyle = TextStyle(fontSize: 16);

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SelectFieldDisplay<TestRole>(
              value: TestRole.admin,
              displayText: (role) => role.name.toUpperCase(),
              icon: Icons.shield,
              valueStyle: customStyle,
            ),
          ),
        ),
      );

      expect(find.byIcon(Icons.shield), findsOneWidget);
      expect(find.text('ADMIN'), findsOneWidget);

      final textWidget = tester.widget<Text>(find.text('ADMIN'));
      expect(textWidget.style?.fontSize, 16);
    });

    testWidgets('handles long text values', (tester) async {
      final user = TestUser('1', 'A Very Long Username That Might Wrap');

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SelectFieldDisplay<TestUser>(
              value: user,
              displayText: (u) => u.name,
            ),
          ),
        ),
      );

      expect(find.text('A Very Long Username That Might Wrap'), findsOneWidget);
    });

    testWidgets('works with nullable generic type', (tester) async {
      TestRole? nullableRole = TestRole.admin;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SelectFieldDisplay<TestRole>(
              value: nullableRole,
              displayText: (role) => role.name,
            ),
          ),
        ),
      );

      expect(find.text('admin'), findsOneWidget);
    });
  });
}
