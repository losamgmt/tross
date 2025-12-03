/// Tests for Role Table Column Definitions
///
/// Verifies:
/// - Column structure is correct
/// - All required columns are present
/// - Column properties (sortable, width, etc.) are set appropriately
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/config/config.dart';

void main() {
  group('getRoleColumns', () {
    late List<dynamic> columns;

    setUp(() {
      columns = getRoleColumns();
    });

    test('returns correct number of columns', () {
      expect(columns.length, 7);
    });

    test('column IDs are unique and correct', () {
      final ids = columns.map((c) => c.id).toList();
      expect(ids, [
        'name',
        'id',
        'priority',
        'description',
        'status',
        'protected',
        'created',
      ]);
      expect(ids.toSet().length, ids.length); // All unique
    });

    test('all columns have labels', () {
      for (final column in columns) {
        expect(column.label, isNotEmpty);
      }
    });

    test('name column is configured correctly', () {
      final nameCol = columns.firstWhere((c) => c.id == 'name');
      expect(nameCol.sortable, true);
      expect(nameCol.width, 2);
      expect(nameCol.comparator, isNotNull);
      expect(nameCol.cellBuilder, isNotNull);
    });

    test('id column is configured correctly', () {
      final idCol = columns.firstWhere((c) => c.id == 'id');
      expect(idCol.sortable, true);
      expect(idCol.width, 0.8);
      expect(idCol.alignment, TextAlign.center);
      expect(idCol.comparator, isNotNull);
      expect(idCol.cellBuilder, isNotNull);
    });

    test('priority column is configured correctly', () {
      final priorityCol = columns.firstWhere((c) => c.id == 'priority');
      expect(priorityCol.sortable, true);
      expect(priorityCol.width, 1.0);
      expect(priorityCol.alignment, TextAlign.center);
      expect(priorityCol.comparator, isNotNull);
      expect(priorityCol.cellBuilder, isNotNull);
    });

    test('description column is configured correctly', () {
      final descCol = columns.firstWhere((c) => c.id == 'description');
      expect(descCol.sortable, false);
      expect(descCol.width, 2.5);
      expect(descCol.cellBuilder, isNotNull);
    });

    test('status column is configured correctly', () {
      final statusCol = columns.firstWhere((c) => c.id == 'status');
      expect(statusCol.sortable, true);
      expect(statusCol.width, 1.5);
      expect(statusCol.comparator, isNotNull);
      expect(statusCol.cellBuilder, isNotNull);
    });

    test('protected column is configured correctly', () {
      final protectedCol = columns.firstWhere((c) => c.id == 'protected');
      expect(protectedCol.sortable, true);
      expect(protectedCol.width, 1.2);
      expect(protectedCol.comparator, isNotNull);
      expect(protectedCol.cellBuilder, isNotNull);
    });

    test('created column is configured correctly', () {
      final createdCol = columns.firstWhere((c) => c.id == 'created');
      expect(createdCol.sortable, true);
      expect(createdCol.width, 1.5);
      expect(createdCol.comparator, isNotNull);
      expect(createdCol.cellBuilder, isNotNull);
    });

    test('onRoleUpdated callback parameter works', () {
      final columnsWithCallback = getRoleColumns(onRoleUpdated: () {});

      // Verify columns are created with callback
      expect(columnsWithCallback.length, 7);
    });
  });
}
