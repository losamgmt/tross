import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/molecules/details/details.dart';
import 'package:tross_app/widgets/molecules/forms/forms.dart';

// Test model
class TestModel {
  final String name;
  final int age;
  final bool active;

  const TestModel({
    required this.name,
    required this.age,
    required this.active,
  });

  TestModel copyWith({String? name, int? age, bool? active}) {
    return TestModel(
      name: name ?? this.name,
      age: age ?? this.age,
      active: active ?? this.active,
    );
  }
}

void main() {
  group('DetailPanel - SRP: Read-Only Field Rendering', () {
    late TestModel testValue;
    late List<FieldConfig<TestModel, dynamic>> testFields;

    setUp(() {
      testValue = const TestModel(name: 'John', age: 30, active: true);

      testFields = [
        FieldConfig<TestModel, String>(
          fieldType: FieldType.text,
          label: 'Name',
          getValue: (model) => model.name,
          setValue: (model, value) => model.copyWith(name: value as String?),
        ),
        FieldConfig<TestModel, int>(
          fieldType: FieldType.number,
          label: 'Age',
          getValue: (model) => model.age,
          setValue: (model, value) => model.copyWith(age: value as int?),
          isInteger: true,
        ),
        FieldConfig<TestModel, bool>(
          fieldType: FieldType.boolean,
          label: 'Active',
          getValue: (model) => model.active,
          setValue: (model, value) => model.copyWith(active: value as bool?),
        ),
      ];
    });

    testWidgets('renders all fields from config', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: DetailPanel<TestModel>(
                value: testValue,
                fields: testFields,
              ),
            ),
          ),
        ),
      );

      expect(
        find.byType(DetailFieldDisplay<TestModel, dynamic>),
        findsNWidgets(3),
      );
    });

    testWidgets('displays field labels', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: DetailPanel<TestModel>(
                value: testValue,
                fields: testFields,
              ),
            ),
          ),
        ),
      );

      expect(find.text('Name'), findsOneWidget);
      expect(find.text('Age'), findsOneWidget);
      expect(find.text('Active'), findsOneWidget);
    });

    testWidgets('displays field values', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: DetailPanel<TestModel>(
                value: testValue,
                fields: testFields,
              ),
            ),
          ),
        ),
      );

      expect(find.text('John'), findsOneWidget);
      expect(find.text('30'), findsOneWidget);
      expect(find.text('Yes'), findsOneWidget); // Boolean true -> 'Yes'
    });

    testWidgets('handles empty fields list', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: DetailPanel<TestModel>(value: testValue, fields: []),
            ),
          ),
        ),
      );

      expect(find.byType(DetailFieldDisplay), findsNothing);
    });

    testWidgets('uses custom spacing when provided', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: DetailPanel<TestModel>(
                value: testValue,
                fields: testFields,
                spacing: 24.0,
              ),
            ),
          ),
        ),
      );

      // Find SizedBox widgets used for spacing
      final sizedBoxes = tester.widgetList<SizedBox>(
        find.byWidgetPredicate(
          (widget) => widget is SizedBox && widget.height == 24.0,
        ),
      );

      // Should have spacing between fields (n-1 spacers for n fields)
      expect(sizedBoxes.length, 2);
    });
  });
}
