/// EditableFormNotifier Tests
///
/// Tests observable BEHAVIOR:
/// - isDirty changes when fields are modified
/// - changeCount tracks number of modified fields
/// - save() calls callback with changed fields
/// - discard() reverts to original values
/// - reset() loads new values
///
/// NO implementation details:
/// - ❌ Internal map structure inspection
/// - ❌ Timer implementation details
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/providers/editable_form_notifier.dart';

void main() {
  group('EditableFormNotifier', () {
    // =========================================================================
    // Initial State
    // =========================================================================
    group('Initial State', () {
      test('starts clean with empty initial values', () {
        final notifier = EditableFormNotifier();

        expect(notifier.isDirty, isFalse);
        expect(notifier.changeCount, 0);
        expect(notifier.changedFields, isEmpty);
        expect(notifier.saveState, SaveState.idle);
      });

      test('starts clean with provided initial values', () {
        final notifier = EditableFormNotifier(
          initialValues: {'name': 'John', 'age': 30},
        );

        expect(notifier.isDirty, isFalse);
        expect(notifier.changeCount, 0);
        expect(notifier.getValue('name'), 'John');
        expect(notifier.getValue('age'), 30);
      });

      test('original values are accessible', () {
        final notifier = EditableFormNotifier(initialValues: {'name': 'John'});

        expect(notifier.getOriginalValue('name'), 'John');
        expect(notifier.originalValues, {'name': 'John'});
      });
    });

    // =========================================================================
    // Dirty State Detection
    // =========================================================================
    group('Dirty State Detection', () {
      test('becomes dirty when field value changes', () {
        final notifier = EditableFormNotifier(initialValues: {'name': 'John'});

        notifier.updateField('name', 'Jane');

        expect(notifier.isDirty, isTrue);
        expect(notifier.changeCount, 1);
      });

      test('becomes clean when field reverts to original', () {
        final notifier = EditableFormNotifier(initialValues: {'name': 'John'});

        notifier.updateField('name', 'Jane');
        expect(notifier.isDirty, isTrue);

        notifier.updateField('name', 'John');
        expect(notifier.isDirty, isFalse);
        expect(notifier.changeCount, 0);
      });

      test('tracks multiple changed fields', () {
        final notifier = EditableFormNotifier(
          initialValues: {'name': 'John', 'email': 'john@example.com'},
        );

        notifier.updateField('name', 'Jane');
        notifier.updateField('email', 'jane@example.com');

        expect(notifier.changeCount, 2);
        expect(notifier.changedFieldNames, containsAll(['name', 'email']));
      });

      test('isFieldDirty checks individual field', () {
        final notifier = EditableFormNotifier(
          initialValues: {'name': 'John', 'email': 'john@example.com'},
        );

        notifier.updateField('name', 'Jane');

        expect(notifier.isFieldDirty('name'), isTrue);
        expect(notifier.isFieldDirty('email'), isFalse);
      });

      test('does not notify if same value set', () {
        final notifier = EditableFormNotifier(initialValues: {'name': 'John'});

        int notifyCount = 0;
        notifier.addListener(() => notifyCount++);

        notifier.updateField('name', 'John'); // Same value
        expect(notifyCount, 0);

        notifier.updateField('name', 'Jane'); // Different value
        expect(notifyCount, 1);
      });

      test('handles null values correctly', () {
        final notifier = EditableFormNotifier(initialValues: {'name': null});

        expect(notifier.isDirty, isFalse);

        notifier.updateField('name', 'John');
        expect(notifier.isDirty, isTrue);

        notifier.updateField('name', null);
        expect(notifier.isDirty, isFalse);
      });

      test('handles list values correctly', () {
        final notifier = EditableFormNotifier(
          initialValues: {
            'tags': ['a', 'b'],
          },
        );

        expect(notifier.isDirty, isFalse);

        notifier.updateField('tags', ['a', 'b', 'c']);
        expect(notifier.isDirty, isTrue);

        notifier.updateField('tags', ['a', 'b']);
        expect(notifier.isDirty, isFalse);
      });

      test('handles new fields not in original', () {
        final notifier = EditableFormNotifier(initialValues: {'name': 'John'});

        notifier.updateField('newField', 'value');

        expect(notifier.isDirty, isTrue);
        expect(notifier.changeCount, 1);
        expect(notifier.changedFields, {'newField': 'value'});
      });
    });

    // =========================================================================
    // Batch Updates
    // =========================================================================
    group('Batch Updates', () {
      test('updateFields updates multiple fields at once', () {
        final notifier = EditableFormNotifier(
          initialValues: {'name': 'John', 'email': 'john@example.com'},
        );

        notifier.updateFields({'name': 'Jane', 'email': 'jane@example.com'});

        expect(notifier.getValue('name'), 'Jane');
        expect(notifier.getValue('email'), 'jane@example.com');
        expect(notifier.changeCount, 2);
      });

      test('updateFields notifies only once', () {
        final notifier = EditableFormNotifier(
          initialValues: {'name': 'John', 'email': 'john@example.com'},
        );

        int notifyCount = 0;
        notifier.addListener(() => notifyCount++);

        notifier.updateFields({'name': 'Jane', 'email': 'jane@example.com'});

        expect(notifyCount, 1);
      });

      test('updateFields skips unchanged values', () {
        final notifier = EditableFormNotifier(
          initialValues: {'name': 'John', 'email': 'john@example.com'},
        );

        int notifyCount = 0;
        notifier.addListener(() => notifyCount++);

        // Only name actually changes
        notifier.updateFields({'name': 'Jane', 'email': 'john@example.com'});

        expect(notifyCount, 1);
        expect(notifier.changeCount, 1); // Only name changed
      });

      test('setCurrent replaces entire current state', () {
        final notifier = EditableFormNotifier(
          initialValues: {'name': 'John', 'email': 'john@example.com'},
        );

        notifier.setCurrent({
          'name': 'Jane',
          'email': 'jane@example.com',
          'age': 30,
        });

        expect(notifier.getValue('name'), 'Jane');
        expect(notifier.getValue('email'), 'jane@example.com');
        expect(notifier.getValue('age'), 30);
        expect(notifier.isDirty, isTrue);
      });

      test('setCurrent notifies listeners', () {
        final notifier = EditableFormNotifier(initialValues: {'name': 'John'});

        int notifyCount = 0;
        notifier.addListener(() => notifyCount++);

        notifier.setCurrent({'name': 'Jane'});

        expect(notifyCount, 1);
      });

      test('setCurrent skips notification if identical', () {
        final notifier = EditableFormNotifier(
          initialValues: {'name': 'John', 'email': 'john@example.com'},
        );

        int notifyCount = 0;
        notifier.addListener(() => notifyCount++);

        // Set to identical values
        notifier.setCurrent({'name': 'John', 'email': 'john@example.com'});

        expect(notifyCount, 0);
      });

      test('setCurrent computes dirty correctly after multiple sets', () {
        final notifier = EditableFormNotifier(initialValues: {'name': 'John'});

        // Change it
        notifier.setCurrent({'name': 'Jane'});
        expect(notifier.isDirty, isTrue);

        // Change it back to original
        notifier.setCurrent({'name': 'John'});
        expect(notifier.isDirty, isFalse);
      });
    });

    // =========================================================================
    // Save Operation
    // =========================================================================
    group('Save Operation', () {
      test('save calls callback with changed fields', () async {
        Map<String, dynamic>? savedChanges;

        final notifier = EditableFormNotifier(
          initialValues: {'name': 'John'},
          onSave: (changes) async {
            savedChanges = changes;
          },
        );

        notifier.updateField('name', 'Jane');
        await notifier.save();

        expect(savedChanges, {'name': 'Jane'});
      });

      test('save updates saveState through lifecycle', () async {
        final states = <SaveState>[];

        final notifier = EditableFormNotifier(
          initialValues: {'name': 'John'},
          onSave: (changes) async {
            await Future.delayed(const Duration(milliseconds: 10));
          },
        );

        notifier.addListener(() => states.add(notifier.saveState));

        notifier.updateField('name', 'Jane');
        final saveFuture = notifier.save();

        expect(states.last, SaveState.saving);

        await saveFuture;

        expect(states.last, SaveState.success);
      });

      test('save updates original after success', () async {
        final notifier = EditableFormNotifier(
          initialValues: {'name': 'John'},
          onSave: (changes) async {},
        );

        notifier.updateField('name', 'Jane');
        await notifier.save();

        expect(notifier.isDirty, isFalse);
        expect(notifier.getOriginalValue('name'), 'Jane');
      });

      test('save returns true on success', () async {
        final notifier = EditableFormNotifier(
          initialValues: {'name': 'John'},
          onSave: (changes) async {},
        );

        notifier.updateField('name', 'Jane');
        final result = await notifier.save();

        expect(result, isTrue);
      });

      test('save returns true immediately if not dirty', () async {
        final notifier = EditableFormNotifier(
          initialValues: {'name': 'John'},
          onSave: (changes) async {
            fail('Should not be called');
          },
        );

        final result = await notifier.save();

        expect(result, isTrue);
      });

      test('save handles error from callback', () async {
        final notifier = EditableFormNotifier(
          initialValues: {'name': 'John'},
          onSave: (changes) async {
            throw Exception('Network error');
          },
        );

        notifier.updateField('name', 'Jane');
        final result = await notifier.save();

        expect(result, isFalse);
        expect(notifier.saveState, SaveState.error);
        expect(notifier.saveError, contains('Network error'));
        // Original should not be updated on failure
        expect(notifier.getOriginalValue('name'), 'John');
        expect(notifier.isDirty, isTrue);
      });

      test('save does not run concurrently', () async {
        int callCount = 0;

        final notifier = EditableFormNotifier(
          initialValues: {'name': 'John'},
          onSave: (changes) async {
            callCount++;
            await Future.delayed(const Duration(milliseconds: 50));
          },
        );

        notifier.updateField('name', 'Jane');

        // Fire two saves concurrently
        final save1 = notifier.save();
        final save2 = notifier.save();

        await Future.wait([save1, save2]);

        expect(callCount, 1); // Only first should run
      });
    });

    // =========================================================================
    // Discard Operation
    // =========================================================================
    group('Discard Operation', () {
      test('discard reverts to original values', () {
        final notifier = EditableFormNotifier(
          initialValues: {'name': 'John', 'email': 'john@example.com'},
        );

        notifier.updateField('name', 'Jane');
        notifier.updateField('email', 'jane@example.com');

        notifier.discard();

        expect(notifier.isDirty, isFalse);
        expect(notifier.getValue('name'), 'John');
        expect(notifier.getValue('email'), 'john@example.com');
      });

      test('discard clears error state', () async {
        final notifier = EditableFormNotifier(
          initialValues: {'name': 'John'},
          onSave: (changes) async {
            throw Exception('Error');
          },
        );

        notifier.updateField('name', 'Jane');
        await notifier.save();

        expect(notifier.saveState, SaveState.error);

        notifier.discard();

        expect(notifier.saveState, SaveState.idle);
        expect(notifier.saveError, isNull);
      });

      test('discard does nothing if not dirty', () {
        final notifier = EditableFormNotifier(initialValues: {'name': 'John'});

        int notifyCount = 0;
        notifier.addListener(() => notifyCount++);

        notifier.discard();

        expect(notifyCount, 0);
      });
    });

    // =========================================================================
    // Reset Operation
    // =========================================================================
    group('Reset Operation', () {
      test('reset loads new values as original', () {
        final notifier = EditableFormNotifier(initialValues: {'name': 'John'});

        notifier.updateField('name', 'Jane');

        notifier.reset({'name': 'Bob', 'email': 'bob@example.com'});

        expect(notifier.isDirty, isFalse);
        expect(notifier.getValue('name'), 'Bob');
        expect(notifier.getValue('email'), 'bob@example.com');
        expect(notifier.getOriginalValue('name'), 'Bob');
      });

      test('reset clears error state', () async {
        final notifier = EditableFormNotifier(
          initialValues: {'name': 'John'},
          onSave: (changes) async {
            throw Exception('Error');
          },
        );

        notifier.updateField('name', 'Jane');
        await notifier.save();

        notifier.reset({'name': 'Bob'});

        expect(notifier.saveState, SaveState.idle);
        expect(notifier.saveError, isNull);
      });
    });

    // =========================================================================
    // Error Handling
    // =========================================================================
    group('Error Handling', () {
      test('clearError resets error state', () async {
        final notifier = EditableFormNotifier(
          initialValues: {'name': 'John'},
          onSave: (changes) async {
            throw Exception('Error');
          },
        );

        notifier.updateField('name', 'Jane');
        await notifier.save();

        notifier.clearError();

        expect(notifier.saveState, SaveState.idle);
        expect(notifier.saveError, isNull);
      });

      test('clearError does nothing if no error', () {
        final notifier = EditableFormNotifier(initialValues: {'name': 'John'});

        int notifyCount = 0;
        notifier.addListener(() => notifyCount++);

        notifier.clearError();

        expect(notifyCount, 0);
      });
    });

    // =========================================================================
    // Immutability
    // =========================================================================
    group('Immutability', () {
      test('currentValues returns unmodifiable copy', () {
        final notifier = EditableFormNotifier(initialValues: {'name': 'John'});

        final values = notifier.currentValues;

        expect(() => values['name'] = 'Jane', throwsA(isA<UnsupportedError>()));
      });

      test('originalValues returns unmodifiable copy', () {
        final notifier = EditableFormNotifier(initialValues: {'name': 'John'});

        final values = notifier.originalValues;

        expect(() => values['name'] = 'Jane', throwsA(isA<UnsupportedError>()));
      });

      test('changedFields returns mutable copy', () {
        final notifier = EditableFormNotifier(initialValues: {'name': 'John'});

        notifier.updateField('name', 'Jane');
        final changes = notifier.changedFields;

        // Modifying the returned map should not affect internal state
        changes['name'] = 'Bob';

        expect(notifier.getValue('name'), 'Jane'); // Unchanged
      });
    });
  });
}
