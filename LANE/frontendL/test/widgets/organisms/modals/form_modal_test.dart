import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/organisms/organisms.dart';
import 'package:tross_app/widgets/molecules/forms/forms.dart';
import 'package:tross_app/widgets/organisms/modals/form_modal.dart';
import 'package:tross_app/widgets/organisms/modals/generic_modal.dart';

// Test model
class TestModel {
  final String name;
  final int age;

  const TestModel({required this.name, required this.age});

  TestModel copyWith({String? name, int? age}) {
    return TestModel(name: name ?? this.name, age: age ?? this.age);
  }
}

void main() {
  group('FormModal Composition Tests', () {
    late TestModel testValue;
    late List<FieldConfig<TestModel, dynamic>> testFields;

    setUp(() {
      testValue = const TestModel(name: 'John', age: 30);

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
      ];
    });

    testWidgets('mounts GenericModal organism', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: FormModal<TestModel>(
              title: 'Edit User',
              value: testValue,
              fields: testFields,
            ),
          ),
        ),
      );

      expect(find.byType(GenericModal), findsOneWidget);
    });

    testWidgets('passes title to GenericModal', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: FormModal<TestModel>(
              title: 'Edit User',
              value: testValue,
              fields: testFields,
            ),
          ),
        ),
      );

      expect(find.text('Edit User'), findsOneWidget);
    });

    testWidgets('mounts GenericForm with fields', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: FormModal<TestModel>(
              title: 'Edit User',
              value: testValue,
              fields: testFields,
            ),
          ),
        ),
      );

      expect(find.byType(GenericForm<TestModel>), findsOneWidget);
    });

    testWidgets('displays save and cancel buttons', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: FormModal<TestModel>(
              title: 'Edit User',
              value: testValue,
              fields: testFields,
            ),
          ),
        ),
      );

      expect(find.text('Save'), findsOneWidget);
      expect(find.text('Cancel'), findsOneWidget);
    });

    testWidgets('displays custom button text', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: FormModal<TestModel>(
              title: 'Edit User',
              value: testValue,
              fields: testFields,
              saveButtonText: 'Update',
              cancelButtonText: 'Discard',
            ),
          ),
        ),
      );

      expect(find.text('Update'), findsOneWidget);
      expect(find.text('Discard'), findsOneWidget);
    });

    testWidgets('calls onSave when save button pressed', (tester) async {
      bool saveCalled = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: FormModal<TestModel>(
              title: 'Edit User',
              value: testValue,
              fields: testFields,
              onSave: (value) async => saveCalled = true,
            ),
          ),
        ),
      );

      await tester.tap(find.text('Save'));
      await tester.pumpAndSettle();

      expect(saveCalled, isTrue);
    });

    testWidgets('calls onCancel when cancel button pressed', (tester) async {
      bool cancelCalled = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: FormModal<TestModel>(
              title: 'Edit User',
              value: testValue,
              fields: testFields,
              onCancel: () => cancelCalled = true,
            ),
          ),
        ),
      );

      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();

      expect(cancelCalled, isTrue);
    });

    testWidgets('shows loading indicator when saving', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: FormModal<TestModel>(
              title: 'Edit User',
              value: testValue,
              fields: testFields,
              onSave: (value) async {
                await Future.delayed(const Duration(milliseconds: 100));
              },
            ),
          ),
        ),
      );

      await tester.tap(find.text('Save'));
      await tester.pump(); // Start the async operation

      expect(find.byType(CircularProgressIndicator), findsOneWidget);

      // Wait for the async operation to complete
      await tester.pumpAndSettle();
    });

    testWidgets('static show() method displays modal', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (context) {
              return ElevatedButton(
                onPressed: () {
                  FormModal.show<TestModel>(
                    context: context,
                    title: 'Edit User',
                    value: testValue,
                    fields: testFields,
                  );
                },
                child: const Text('Show Modal'),
              );
            },
          ),
        ),
      );

      await tester.tap(find.text('Show Modal'));
      await tester.pumpAndSettle();

      expect(find.byType(FormModal<TestModel>), findsOneWidget);
    });
  });
}
