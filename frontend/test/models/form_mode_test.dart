/// FormMode Model Tests
///
/// Tests the FormMode enum and its extensions.
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/models/form_mode.dart';

void main() {
  group('FormMode', () {
    test('has all expected modes', () {
      expect(
        FormMode.values,
        containsAll([FormMode.create, FormMode.edit, FormMode.view]),
      );
    });
  });

  group('FormModeExtension', () {
    group('actionLabel', () {
      test('create returns "Create"', () {
        expect(FormMode.create.actionLabel, equals('Create'));
      });

      test('edit returns "Save"', () {
        expect(FormMode.edit.actionLabel, equals('Save'));
      });

      test('view returns "Close"', () {
        expect(FormMode.view.actionLabel, equals('Close'));
      });
    });

    group('titlePrefix', () {
      test('create returns "Create"', () {
        expect(FormMode.create.titlePrefix, equals('Create'));
      });

      test('edit returns "Edit"', () {
        expect(FormMode.edit.titlePrefix, equals('Edit'));
      });

      test('view returns "View"', () {
        expect(FormMode.view.titlePrefix, equals('View'));
      });
    });

    group('isEditable', () {
      test('create is editable', () {
        expect(FormMode.create.isEditable, isTrue);
      });

      test('edit is editable', () {
        expect(FormMode.edit.isEditable, isTrue);
      });

      test('view is not editable', () {
        expect(FormMode.view.isEditable, isFalse);
      });
    });

    group('mode checks', () {
      test('isCreate', () {
        expect(FormMode.create.isCreate, isTrue);
        expect(FormMode.edit.isCreate, isFalse);
        expect(FormMode.view.isCreate, isFalse);
      });

      test('isEdit', () {
        expect(FormMode.create.isEdit, isFalse);
        expect(FormMode.edit.isEdit, isTrue);
        expect(FormMode.view.isEdit, isFalse);
      });

      test('isView', () {
        expect(FormMode.create.isView, isFalse);
        expect(FormMode.edit.isView, isFalse);
        expect(FormMode.view.isView, isTrue);
      });
    });
  });
}
