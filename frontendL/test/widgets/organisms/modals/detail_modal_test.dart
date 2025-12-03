import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/molecules/forms/forms.dart';
import 'package:tross_app/widgets/organisms/modals/detail_modal.dart';
import 'package:tross_app/widgets/organisms/modals/generic_modal.dart';
import 'package:tross_app/widgets/molecules/details/detail_panel.dart';

// Test model
class TestModel {
  final String name;
  final int age;

  const TestModel({required this.name, required this.age});
}

void main() {
  group('DetailModal Composition Tests', () {
    late TestModel testValue;
    late List<FieldConfig<TestModel, dynamic>> testFields;

    setUp(() {
      testValue = const TestModel(name: 'John', age: 30);

      testFields = [
        FieldConfig<TestModel, String>(
          fieldType: FieldType.text,
          label: 'Name',
          getValue: (model) => model.name,
          setValue: (model, value) => testValue,
        ),
        FieldConfig<TestModel, int>(
          fieldType: FieldType.number,
          label: 'Age',
          getValue: (model) => model.age,
          setValue: (model, value) => testValue,
          isInteger: true,
        ),
      ];
    });

    testWidgets('mounts GenericModal organism', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DetailModal<TestModel>(
              title: 'User Details',
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
            body: DetailModal<TestModel>(
              title: 'User Details',
              value: testValue,
              fields: testFields,
            ),
          ),
        ),
      );

      expect(find.text('User Details'), findsOneWidget);
    });

    testWidgets('mounts DetailPanel with fields', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DetailModal<TestModel>(
              title: 'User Details',
              value: testValue,
              fields: testFields,
            ),
          ),
        ),
      );

      expect(find.byType(DetailPanel<TestModel>), findsOneWidget);
    });

    testWidgets('displays default close button', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DetailModal<TestModel>(
              title: 'User Details',
              value: testValue,
              fields: testFields,
            ),
          ),
        ),
      );

      expect(find.text('Close'), findsOneWidget);
    });

    testWidgets('displays custom actions when provided', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DetailModal<TestModel>(
              title: 'User Details',
              value: testValue,
              fields: testFields,
              actions: [
                TextButton(onPressed: () {}, child: const Text('Edit')),
              ],
            ),
          ),
        ),
      );

      expect(find.text('Edit'), findsOneWidget);
      expect(
        find.text('Close'),
        findsNothing,
      ); // Custom actions replace default
    });

    testWidgets('static show() method displays modal', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (context) {
              return ElevatedButton(
                onPressed: () {
                  DetailModal.show<TestModel>(
                    context: context,
                    title: 'User Details',
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

      expect(find.byType(DetailModal<TestModel>), findsOneWidget);
    });
  });
}
