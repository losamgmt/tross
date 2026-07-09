/// Accessibility (semantics) tests for GenericFormField.
///
/// The input atoms deliberately render no label of their own, so
/// GenericFormField wraps the composed field in MergeSemantics to give every
/// generated form field an accessible name (and required state) for screen
/// readers.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross/widgets/molecules/forms/field_config.dart';
import 'package:tross/widgets/organisms/forms/form_field.dart';

Future<void> _pumpField(
  WidgetTester tester,
  FieldConfig<Map<String, dynamic>, dynamic> config,
) {
  return tester.pumpWidget(
    MaterialApp(
      home: Scaffold(
        body: GenericFormField<Map<String, dynamic>, dynamic>(
          config: config,
          value: const <String, dynamic>{},
          onChanged: (_) {},
        ),
      ),
    ),
  );
}

void main() {
  group('GenericFormField accessibility semantics', () {
    testWidgets('text field exposes its label to screen readers', (
      tester,
    ) async {
      final handle = tester.ensureSemantics();

      await _pumpField(
        tester,
        FieldConfig<Map<String, dynamic>, String>(
          fieldType: FieldType.text,
          label: 'Email Address',
          getValue: (m) => m['email'] as String? ?? '',
          setValue: (m, v) => {...m, 'email': v},
        ),
      );

      expect(find.bySemanticsLabel(RegExp('Email Address')), findsOneWidget);

      handle.dispose();
    });

    testWidgets(
      'required field announces "required" instead of the "*" glyph',
      (tester) async {
        final handle = tester.ensureSemantics();

        await _pumpField(
          tester,
          FieldConfig<Map<String, dynamic>, String>(
            fieldType: FieldType.text,
            label: 'Email Address',
            required: true,
            getValue: (m) => m['email'] as String? ?? '',
            setValue: (m, v) => {...m, 'email': v},
          ),
        );

        expect(find.bySemanticsLabel(RegExp('required')), findsOneWidget);
        // The raw asterisk is excluded from the semantics tree.
        expect(find.bySemanticsLabel('*'), findsNothing);

        handle.dispose();
      },
    );

    testWidgets('optional field does not announce "required"', (tester) async {
      final handle = tester.ensureSemantics();

      await _pumpField(
        tester,
        FieldConfig<Map<String, dynamic>, String>(
          fieldType: FieldType.text,
          label: 'Nickname',
          getValue: (m) => m['nickname'] as String? ?? '',
          setValue: (m, v) => {...m, 'nickname': v},
        ),
      );

      expect(find.bySemanticsLabel(RegExp('required')), findsNothing);

      handle.dispose();
    });

    testWidgets('boolean toggle field exposes its label', (tester) async {
      final handle = tester.ensureSemantics();

      await _pumpField(
        tester,
        FieldConfig<Map<String, dynamic>, bool>(
          fieldType: FieldType.boolean,
          label: 'Is Active',
          getValue: (m) => m['is_active'] as bool? ?? false,
          setValue: (m, v) => {...m, 'is_active': v},
        ),
      );

      expect(find.bySemanticsLabel(RegExp('Is Active')), findsOneWidget);

      handle.dispose();
    });
  });
}
