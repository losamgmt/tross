import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/utils/helpers/input_type_helpers.dart';

void main() {
  group('InputTypeHelpers', () {
    group('getKeyboardType', () {
      test('returns emailAddress for email type', () {
        expect(
          InputTypeHelpers.getKeyboardType(TextFieldType.email),
          TextInputType.emailAddress,
        );
      });

      test('returns phone for phone type', () {
        expect(
          InputTypeHelpers.getKeyboardType(TextFieldType.phone),
          TextInputType.phone,
        );
      });

      test('returns url for url type', () {
        expect(
          InputTypeHelpers.getKeyboardType(TextFieldType.url),
          TextInputType.url,
        );
      });

      test('returns text for text type', () {
        expect(
          InputTypeHelpers.getKeyboardType(TextFieldType.text),
          TextInputType.text,
        );
      });

      test('returns text for password type', () {
        expect(
          InputTypeHelpers.getKeyboardType(TextFieldType.password),
          TextInputType.text,
        );
      });
    });

    group('TextFieldType enum', () {
      test('has all expected values', () {
        expect(TextFieldType.values.length, 5);
        expect(TextFieldType.values, contains(TextFieldType.text));
        expect(TextFieldType.values, contains(TextFieldType.email));
        expect(TextFieldType.values, contains(TextFieldType.password));
        expect(TextFieldType.values, contains(TextFieldType.url));
        expect(TextFieldType.values, contains(TextFieldType.phone));
      });
    });
  });
}
