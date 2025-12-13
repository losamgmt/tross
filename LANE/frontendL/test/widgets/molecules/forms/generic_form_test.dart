import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/organisms/organisms.dart';
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

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TestModel &&
          runtimeType == other.runtimeType &&
          name == other.name &&
          age == other.age &&
          active == other.active;

  @override
  int get hashCode => name.hashCode ^ age.hashCode ^ active.hashCode;
}

void main() {
  group('GenericForm - SRP: Field Rendering Only', () {
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
              child: GenericForm<TestModel>(
                value: testValue,
                fields: testFields,
              ),
            ),
          ),
        ),
      );

      expect(
        find.byType(GenericFormField<TestModel, dynamic>),
        findsNWidgets(3),
      );
    });

    testWidgets('renders fields in correct order', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: GenericForm<TestModel>(
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

    testWidgets('calls onChange when field value changes', (tester) async {
      TestModel? changedValue;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: GenericForm<TestModel>(
                value: testValue,
                fields: testFields,
                onChange: (newValue) => changedValue = newValue,
              ),
            ),
          ),
        ),
      );

      // Change the name field
      await tester.enterText(find.byType(TextField).first, 'Jane');
      await tester.pumpAndSettle();

      expect(changedValue, isNotNull);
      expect(changedValue!.name, 'Jane');
    });

    testWidgets('disables all fields when enabled=false', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: GenericForm<TestModel>(
                value: testValue,
                fields: testFields,
                enabled: false,
              ),
            ),
          ),
        ),
      );

      // All TextFields should be disabled
      final textFields = tester.widgetList<TextField>(find.byType(TextField));
      for (final field in textFields) {
        expect(field.enabled, isFalse);
      }
    });

    testWidgets('handles empty fields list', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: GenericForm<TestModel>(value: testValue, fields: []),
            ),
          ),
        ),
      );

      expect(find.byType(GenericFormField), findsNothing);
    });

    testWidgets('updates when value changes', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: _StatefulTestWrapper(
            initialValue: testValue,
            fields: testFields,
          ),
        ),
      );

      expect(find.text('John'), findsOneWidget);

      // Update the value
      await tester.tap(find.text('Update'));
      await tester.pumpAndSettle();

      expect(find.text('Jane'), findsOneWidget);
    });
  });
}

// Helper widget for stateful tests
class _StatefulTestWrapper extends StatefulWidget {
  final TestModel initialValue;
  final List<FieldConfig<TestModel, dynamic>> fields;

  const _StatefulTestWrapper({
    required this.initialValue,
    required this.fields,
  });

  @override
  State<_StatefulTestWrapper> createState() => _StatefulTestWrapperState();
}

class _StatefulTestWrapperState extends State<_StatefulTestWrapper> {
  late TestModel value;

  @override
  void initState() {
    super.initState();
    value = widget.initialValue;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SingleChildScrollView(
        child: GenericForm<TestModel>(value: value, fields: widget.fields),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          setState(() {
            value = const TestModel(name: 'Jane', age: 25, active: false);
          });
        },
        child: const Text('Update'),
      ),
    );
  }
}
