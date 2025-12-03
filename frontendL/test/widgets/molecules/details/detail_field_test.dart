import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/molecules/details/details.dart';
import 'package:tross_app/widgets/molecules/forms/forms.dart';

// Test model
class TestModel {
  final String name;
  final int age;
  final bool active;
  final DateTime? createdAt;

  const TestModel({
    required this.name,
    required this.age,
    required this.active,
    this.createdAt,
  });

  TestModel copyWith({
    String? name,
    int? age,
    bool? active,
    DateTime? createdAt,
  }) {
    return TestModel(
      name: name ?? this.name,
      age: age ?? this.age,
      active: active ?? this.active,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}

void main() {
  group('DetailFieldDisplay', () {
    late TestModel testValue;

    setUp(() {
      testValue = TestModel(
        name: 'John Doe',
        age: 30,
        active: true,
        createdAt: DateTime(2024, 1, 15),
      );
    });

    testWidgets('renders text field display', (tester) async {
      final config = FieldConfig<TestModel, String>(
        fieldType: FieldType.text,
        label: 'Name',
        getValue: (model) => model.name,
        setValue: (model, value) => model.copyWith(name: value as String?),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DetailFieldDisplay<TestModel, String>(
              config: config,
              value: testValue,
            ),
          ),
        ),
      );

      expect(find.text('Name'), findsOneWidget);
      expect(find.text('John Doe'), findsOneWidget);
    });

    testWidgets('renders number field display', (tester) async {
      final config = FieldConfig<TestModel, int>(
        fieldType: FieldType.number,
        label: 'Age',
        getValue: (model) => model.age,
        setValue: (model, value) => model.copyWith(age: value as int?),
        isInteger: true,
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DetailFieldDisplay<TestModel, int>(
              config: config,
              value: testValue,
            ),
          ),
        ),
      );

      expect(find.text('Age'), findsOneWidget);
      expect(find.text('30'), findsOneWidget);
    });

    testWidgets('renders boolean field display', (tester) async {
      final config = FieldConfig<TestModel, bool>(
        fieldType: FieldType.boolean,
        label: 'Active',
        getValue: (model) => model.active,
        setValue: (model, value) => model.copyWith(active: value as bool?),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DetailFieldDisplay<TestModel, bool>(
              config: config,
              value: testValue,
            ),
          ),
        ),
      );

      expect(find.text('Active'), findsOneWidget);
      expect(find.text('Yes'), findsOneWidget);
    });

    testWidgets('renders date field display', (tester) async {
      final config = FieldConfig<TestModel, DateTime>(
        fieldType: FieldType.date,
        label: 'Created',
        getValue: (model) => model.createdAt!,
        setValue: (model, value) =>
            model.copyWith(createdAt: value as DateTime?),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DetailFieldDisplay<TestModel, DateTime>(
              config: config,
              value: testValue,
            ),
          ),
        ),
      );

      expect(find.text('Created'), findsOneWidget);
      expect(find.textContaining('2024'), findsOneWidget);
    });

    testWidgets('renders select field display', (tester) async {
      final config = FieldConfig<TestModel, String>(
        fieldType: FieldType.select,
        label: 'Status',
        getValue: (model) => model.active ? 'Active' : 'Inactive',
        setValue: (model, value) => model,
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DetailFieldDisplay<TestModel, String>(
              config: config,
              value: testValue,
            ),
          ),
        ),
      );

      expect(find.text('Status'), findsOneWidget);
      expect(find.text('Active'), findsOneWidget);
    });

    testWidgets('renders textArea field as text display', (tester) async {
      final config = FieldConfig<TestModel, String>(
        fieldType: FieldType.textArea,
        label: 'Description',
        getValue: (model) => model.name,
        setValue: (model, value) => model.copyWith(name: value as String?),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DetailFieldDisplay<TestModel, String>(
              config: config,
              value: testValue,
            ),
          ),
        ),
      );

      expect(find.text('Description'), findsOneWidget);
      expect(find.text('John Doe'), findsOneWidget);
    });

    testWidgets('shows icon when provided', (tester) async {
      final config = FieldConfig<TestModel, String>(
        fieldType: FieldType.text,
        label: 'Name',
        getValue: (model) => model.name,
        setValue: (model, value) => model.copyWith(name: value as String?),
        icon: Icons.person,
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DetailFieldDisplay<TestModel, String>(
              config: config,
              value: testValue,
            ),
          ),
        ),
      );

      expect(find.byIcon(Icons.person), findsOneWidget);
    });

    testWidgets('handles null values gracefully', (tester) async {
      final nullModel = TestModel(
        name: 'Test',
        age: 25,
        active: false,
        createdAt: null,
      );

      final config = FieldConfig<TestModel, DateTime?>(
        fieldType: FieldType.date,
        label: 'Created',
        getValue: (model) => model.createdAt,
        setValue: (model, value) =>
            model.copyWith(createdAt: value as DateTime?),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DetailFieldDisplay<TestModel, DateTime?>(
              config: config,
              value: nullModel,
            ),
          ),
        ),
      );

      expect(find.text('Created'), findsOneWidget);
      // Should show empty state (typically '--')
      expect(find.text('--'), findsOneWidget);
    });
  });
}
