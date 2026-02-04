/// Provider State Machine Tests (Strategy 4)
///
/// Mass-gain pattern: Test state transitions and listener notifications
/// across ALL providers using a consistent pattern.
///
/// Coverage targets:
/// - EditableFormNotifier (state transitions)
/// - AppProvider (connectivity states)
/// - AuthProvider (auth states)
/// - PreferencesProvider (loading states)
library;

import 'package:flutter_test/flutter_test.dart';

import 'package:tross/providers/editable_form_notifier.dart';

void main() {
  group('Strategy 4: Provider State Machine Tests', () {
    group('EditableFormNotifier - State Transitions', () {
      test('initial state is idle with no dirty fields', () {
        final notifier = EditableFormNotifier(
          initialValues: {'name': 'John', 'age': 30},
        );

        expect(notifier.isDirty, false);
        expect(notifier.saveState, SaveState.idle);
        expect(notifier.changeCount, 0);
        expect(notifier.isSaving, false);
      });

      test('updateField transitions to dirty state', () {
        final notifier = EditableFormNotifier(initialValues: {'name': 'John'});

        expect(notifier.isDirty, false);
        notifier.updateField('name', 'Jane');
        expect(notifier.isDirty, true);
        expect(notifier.isFieldDirty('name'), true);
      });

      test('reverting field value clears dirty state', () {
        final notifier = EditableFormNotifier(initialValues: {'name': 'John'});

        notifier.updateField('name', 'Jane');
        expect(notifier.isDirty, true);

        notifier.updateField('name', 'John');
        expect(notifier.isDirty, false);
      });

      test('changeCount tracks number of modified fields', () {
        final notifier = EditableFormNotifier(
          initialValues: {'name': 'John', 'age': 30, 'city': 'NYC'},
        );

        expect(notifier.changeCount, 0);

        notifier.updateField('name', 'Jane');
        expect(notifier.changeCount, 1);

        notifier.updateField('age', 31);
        expect(notifier.changeCount, 2);

        notifier.updateField('name', 'John'); // revert
        expect(notifier.changeCount, 1);
      });

      test('changedFields returns only modified fields', () {
        final notifier = EditableFormNotifier(
          initialValues: {'name': 'John', 'age': 30},
        );

        notifier.updateField('age', 31);
        final changes = notifier.changedFields;

        expect(changes.length, 1);
        expect(changes['age'], 31);
        expect(changes.containsKey('name'), false);
      });

      test('getValue returns current value', () {
        final notifier = EditableFormNotifier(initialValues: {'name': 'John'});

        expect(notifier.getValue('name'), 'John');
        notifier.updateField('name', 'Jane');
        expect(notifier.getValue('name'), 'Jane');
      });

      test('getOriginalValue returns original value', () {
        final notifier = EditableFormNotifier(initialValues: {'name': 'John'});

        notifier.updateField('name', 'Jane');
        expect(notifier.getOriginalValue('name'), 'John');
      });

      test('currentValues returns immutable copy', () {
        final notifier = EditableFormNotifier(initialValues: {'name': 'John'});

        final values = notifier.currentValues;
        expect(values['name'], 'John');
        expect(() => values['name'] = 'Jane', throwsUnsupportedError);
      });

      test('originalValues returns immutable copy', () {
        final notifier = EditableFormNotifier(initialValues: {'name': 'John'});

        final values = notifier.originalValues;
        expect(() => values['name'] = 'Jane', throwsUnsupportedError);
      });
    });

    group('EditableFormNotifier - Save/Discard Operations', () {
      test('discard reverts all changes', () {
        final notifier = EditableFormNotifier(
          initialValues: {'name': 'John', 'age': 30},
        );

        notifier.updateField('name', 'Jane');
        notifier.updateField('age', 31);
        expect(notifier.isDirty, true);

        notifier.discard();
        expect(notifier.isDirty, false);
        expect(notifier.getValue('name'), 'John');
        expect(notifier.getValue('age'), 30);
      });

      test('save transitions through saving state', () async {
        final notifier = EditableFormNotifier(
          initialValues: {'name': 'John'},
          onSave: (_) async {
            await Future.delayed(const Duration(milliseconds: 10));
          },
        );

        notifier.updateField('name', 'Jane');
        expect(notifier.saveState, SaveState.idle);

        final saveResult = notifier.save();
        expect(notifier.saveState, SaveState.saving);
        expect(notifier.isSaving, true);

        await saveResult;
        expect(notifier.saveState, SaveState.success);
      });

      test('save updates original values on success', () async {
        final notifier = EditableFormNotifier(
          initialValues: {'name': 'John'},
          onSave: (_) async {},
        );

        notifier.updateField('name', 'Jane');
        await notifier.save();

        expect(notifier.getOriginalValue('name'), 'Jane');
        expect(notifier.isDirty, false);
      });

      test('save returns true when not dirty', () async {
        final notifier = EditableFormNotifier(initialValues: {'name': 'John'});

        final result = await notifier.save();
        expect(result, true);
      });

      test('save sets error state on failure', () async {
        final notifier = EditableFormNotifier(
          initialValues: {'name': 'John'},
          onSave: (_) async {
            throw Exception('Save failed');
          },
        );

        notifier.updateField('name', 'Jane');
        final result = await notifier.save();

        expect(result, false);
        expect(notifier.saveState, SaveState.error);
        expect(notifier.saveError, contains('Save failed'));
      });

      test('updateFields updates multiple fields efficiently', () {
        final notifier = EditableFormNotifier(
          initialValues: {'name': 'John', 'age': 30, 'city': 'NYC'},
        );

        notifier.updateFields({'name': 'Jane', 'age': 31});

        expect(notifier.getValue('name'), 'Jane');
        expect(notifier.getValue('age'), 31);
        expect(notifier.getValue('city'), 'NYC');
        expect(notifier.changeCount, 2);
      });

      test('setCurrent replaces entire current state', () {
        final notifier = EditableFormNotifier(
          initialValues: {'name': 'John', 'age': 30},
        );

        notifier.setCurrent({'name': 'Jane', 'age': 31, 'city': 'LA'});

        expect(notifier.getValue('name'), 'Jane');
        expect(notifier.getValue('city'), 'LA');
        expect(notifier.isDirty, true);
      });
    });

    group('EditableFormNotifier - Listener Notifications', () {
      test('notifies listeners on field update', () {
        final notifier = EditableFormNotifier(initialValues: {'name': 'John'});
        int notifyCount = 0;
        notifier.addListener(() => notifyCount++);

        notifier.updateField('name', 'Jane');
        expect(notifyCount, 1);
      });

      test('does not notify when value unchanged', () {
        final notifier = EditableFormNotifier(initialValues: {'name': 'John'});
        int notifyCount = 0;
        notifier.addListener(() => notifyCount++);

        notifier.updateField('name', 'John'); // same value
        expect(notifyCount, 0);
      });

      test('notifies on discard', () {
        final notifier = EditableFormNotifier(initialValues: {'name': 'John'});
        int notifyCount = 0;

        notifier.updateField('name', 'Jane');
        notifier.addListener(() => notifyCount++);

        notifier.discard();
        expect(notifyCount, 1);
      });

      test('notifies on save state changes', () async {
        final notifier = EditableFormNotifier(
          initialValues: {'name': 'John'},
          onSave: (_) async {},
        );
        int notifyCount = 0;
        notifier.addListener(() => notifyCount++);

        notifier.updateField('name', 'Jane');
        await notifier.save();

        // Should notify: on updateField (1), saving start (2), save success (3)
        expect(notifyCount, greaterThanOrEqualTo(3));
      });
    });
  });
}
