/// Role Model Tests
///
/// Tests for Role model covering:
/// - JSON serialization/deserialization with new audit fields
/// - Defensive validation
/// - copyWith functionality
/// - Phase 9 isActive field and audit trail
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/models/role_model.dart';

void main() {
  group('Role Model - Phase 9 Enhancements', () {
    group('JSON Serialization with isActive and Audit Fields', () {
      test('fromJson parses role with all new fields', () {
        final json = {
          'id': 1,
          'name': 'manager',
          'created_at': '2025-01-01T00:00:00.000Z',
          'updated_at': '2025-01-10T12:00:00.000Z',
          'priority': 3,
          'description': 'Manages technicians',
          'is_active': false,
          'deactivated_at': '2025-01-10T12:00:00.000Z',
          'deactivated_by': 5,
        };

        final role = Role.fromJson(json);

        expect(role.id, equals(1));
        expect(role.name, equals('manager'));
        expect(role.priority, equals(3));
        expect(role.description, equals('Manages technicians'));
        expect(role.isActive, equals(false));
        expect(role.deactivatedAt, isNotNull);
        expect(role.deactivatedBy, equals(5));
        expect(
          role.deactivatedAt!.toIso8601String(),
          equals('2025-01-10T12:00:00.000Z'),
        );
      });

      test('fromJson handles missing audit fields (active roles)', () {
        final json = {
          'id': 2,
          'name': 'technician',
          'created_at': '2025-01-01T00:00:00.000Z',
          'updated_at': '2025-01-01T00:00:00.000Z',
          'priority': 2,
          'description': 'Field technician',
          'is_active': true,
          // No deactivated_at or deactivated_by
        };

        final role = Role.fromJson(json);

        expect(role.isActive, equals(true));
        expect(role.deactivatedAt, isNull);
        expect(role.deactivatedBy, isNull);
      });

      test('fromJson defaults isActive to true when missing', () {
        final json = {
          'id': 3,
          'name': 'client',
          'created_at': '2025-01-01T00:00:00.000Z',
          'updated_at': '2025-01-01T00:00:00.000Z',
          'priority': 1,
          // No is_active field
        };

        final role = Role.fromJson(json);

        expect(role.isActive, equals(true)); // Default value
      });

      test('toJson includes isActive field', () {
        final role = Role(
          id: 1,
          name: 'admin',
          createdAt: DateTime.parse('2025-01-01T00:00:00.000Z'),
          updatedAt: DateTime.parse('2025-01-01T00:00:00.000Z'),
          priority: 5,
          description: 'System administrator',
          isActive: true,
        );

        final json = role.toJson();

        expect(json['is_active'], equals(true));
      });

      test('toJson includes audit fields when present', () {
        final role = Role(
          id: 1,
          name: 'manager',
          createdAt: DateTime.parse('2025-01-01T00:00:00.000Z'),
          updatedAt: DateTime.parse('2025-01-01T00:00:00.000Z'),
          priority: 3,
          description: 'Manager role',
          isActive: false,
          deactivatedAt: DateTime.parse('2025-01-10T12:00:00.000Z'),
          deactivatedBy: 5,
        );

        final json = role.toJson();

        expect(json['is_active'], equals(false));
        expect(json['deactivated_at'], equals('2025-01-10T12:00:00.000Z'));
        expect(json['deactivated_by'], equals(5));
      });

      test('toJson omits null audit fields', () {
        final role = Role(
          id: 1,
          name: 'admin',
          createdAt: DateTime.parse('2025-01-01T00:00:00.000Z'),
          updatedAt: DateTime.parse('2025-01-01T00:00:00.000Z'),
          priority: 5,
          isActive: true,
        );

        final json = role.toJson();

        expect(json['is_active'], equals(true));
        expect(json.containsKey('deactivated_at'), isFalse);
        expect(json.containsKey('deactivated_by'), isFalse);
      });

      test('roundtrip serialization preserves all fields', () {
        final original = Role(
          id: 1,
          name: 'dispatcher',
          createdAt: DateTime.parse('2025-01-01T00:00:00.000Z'),
          updatedAt: DateTime.parse('2025-01-01T00:00:00.000Z'),
          priority: 4,
          description: 'Dispatches work orders',
          isActive: false,
          deactivatedAt: DateTime.parse('2025-01-10T12:00:00.000Z'),
          deactivatedBy: 10,
        );

        final json = original.toJson();
        final restored = Role.fromJson(json);

        expect(restored.isActive, equals(original.isActive));
        expect(restored.deactivatedAt, equals(original.deactivatedAt));
        expect(restored.deactivatedBy, equals(original.deactivatedBy));
        expect(restored.priority, equals(original.priority));
        expect(restored.description, equals(original.description));
      });
    });

    group('copyWith() with New Fields', () {
      test('copyWith can update isActive', () {
        final role = Role(
          id: 1,
          name: 'manager',
          createdAt: DateTime.parse('2025-01-01T00:00:00.000Z'),
          updatedAt: DateTime.parse('2025-01-01T00:00:00.000Z'),
          priority: 3,
          isActive: true,
        );

        final updated = role.copyWith(isActive: false);

        expect(updated.isActive, equals(false));
        expect(updated.name, equals(role.name));
        expect(updated.id, equals(role.id));
      });

      test('copyWith can update audit fields', () {
        final role = Role(
          id: 1,
          name: 'manager',
          createdAt: DateTime.parse('2025-01-01T00:00:00.000Z'),
          updatedAt: DateTime.parse('2025-01-01T00:00:00.000Z'),
          isActive: true,
        );

        final deactivatedAt = DateTime.parse('2025-01-10T12:00:00.000Z');
        final updated = role.copyWith(
          isActive: false,
          deactivatedAt: deactivatedAt,
          deactivatedBy: 5,
        );

        expect(updated.isActive, equals(false));
        expect(updated.deactivatedAt, equals(deactivatedAt));
        expect(updated.deactivatedBy, equals(5));
      });

      test('copyWith preserves existing audit fields when not updated', () {
        final role = Role(
          id: 1,
          name: 'manager',
          createdAt: DateTime.parse('2025-01-01T00:00:00.000Z'),
          updatedAt: DateTime.parse('2025-01-01T00:00:00.000Z'),
          isActive: false,
          deactivatedAt: DateTime.parse('2025-01-10T12:00:00.000Z'),
          deactivatedBy: 5,
        );

        final updated = role.copyWith(description: 'Updated description');

        expect(updated.deactivatedAt, equals(role.deactivatedAt));
        expect(updated.deactivatedBy, equals(role.deactivatedBy));
        expect(updated.description, equals('Updated description'));
      });

      test('copyWith can update multiple fields simultaneously', () {
        final role = Role(
          id: 1,
          name: 'manager',
          createdAt: DateTime.parse('2025-01-01T00:00:00.000Z'),
          updatedAt: DateTime.parse('2025-01-01T00:00:00.000Z'),
          priority: 3,
          isActive: true,
        );

        final updated = role.copyWith(
          name: 'senior-manager',
          isActive: false,
          description: 'Senior management role',
          priority: 4,
        );

        expect(updated.name, equals('senior-manager'));
        expect(updated.isActive, equals(false));
        expect(updated.description, equals('Senior management role'));
        expect(updated.priority, equals(4));
      });
    });

    group('Defensive Validation', () {
      test('fromJson validates deactivatedBy as positive integer', () {
        final json = {
          'id': 1,
          'name': 'manager',
          'created_at': '2025-01-01T00:00:00.000Z',
          'updated_at': '2025-01-01T00:00:00.000Z',
          'is_active': false,
          'deactivated_by': 10,
        };

        final role = Role.fromJson(json);
        expect(role.deactivatedBy, equals(10));
      });

      test('fromJson handles null audit fields gracefully', () {
        final json = {
          'id': 1,
          'name': 'admin',
          'created_at': '2025-01-01T00:00:00.000Z',
          'updated_at': '2025-01-01T00:00:00.000Z',
          'is_active': true,
          'deactivated_at': null,
          'deactivated_by': null,
        };

        final role = Role.fromJson(json);
        expect(role.deactivatedAt, isNull);
        expect(role.deactivatedBy, isNull);
      });
    });

    group('toString() and Equality', () {
      test('toString includes isActive status', () {
        final role = Role(
          id: 1,
          name: 'admin',
          createdAt: DateTime.parse('2025-01-01T00:00:00.000Z'),
          updatedAt: DateTime.parse('2025-01-01T00:00:00.000Z'),
          priority: 5,
          description: 'Admin role',
          isActive: false,
        );

        final str = role.toString();
        expect(str, contains('isActive: false'));
      });

      test('equality includes isActive', () {
        final role1 = Role(
          id: 1,
          name: 'admin',
          createdAt: DateTime.parse('2025-01-01T00:00:00.000Z'),
          updatedAt: DateTime.parse('2025-01-01T00:00:00.000Z'),
          priority: 5,
          isActive: true,
        );

        final role2 = Role(
          id: 1,
          name: 'admin',
          createdAt: DateTime.parse('2025-01-01T00:00:00.000Z'),
          updatedAt: DateTime.parse('2025-01-01T00:00:00.000Z'),
          priority: 5,
          isActive: false,
        );

        expect(role1 == role2, isFalse); // Different isActive
      });

      test('hashCode includes isActive', () {
        final role1 = Role(
          id: 1,
          name: 'admin',
          createdAt: DateTime.parse('2025-01-01T00:00:00.000Z'),
          updatedAt: DateTime.parse('2025-01-01T00:00:00.000Z'),
          isActive: true,
        );

        final role2 = Role(
          id: 1,
          name: 'admin',
          createdAt: DateTime.parse('2025-01-01T00:00:00.000Z'),
          updatedAt: DateTime.parse('2025-01-01T00:00:00.000Z'),
          isActive: false,
        );

        expect(role1.hashCode == role2.hashCode, isFalse);
      });
    });

    group('Audit Trail Use Cases', () {
      test('deactivated role has complete audit information', () {
        final role = Role(
          id: 3,
          name: 'manager',
          createdAt: DateTime.parse('2025-01-01T00:00:00.000Z'),
          updatedAt: DateTime.parse('2025-01-10T14:30:00.000Z'),
          priority: 3,
          description: 'Deactivated manager role',
          isActive: false,
          deactivatedAt: DateTime.parse('2025-01-10T14:30:00.000Z'),
          deactivatedBy: 5,
        );

        expect(role.isActive, isFalse);
        expect(role.deactivatedAt, isNotNull);
        expect(role.deactivatedBy, isNotNull);

        // UI can show: "Deactivated on Jan 10, 2025 at 14:30 by user #5"
        expect(role.deactivatedAt!.year, equals(2025));
        expect(role.deactivatedBy, equals(5));
      });

      test('active role has no audit information', () {
        final role = Role(
          id: 1,
          name: 'admin',
          createdAt: DateTime.parse('2025-01-01T00:00:00.000Z'),
          updatedAt: DateTime.parse('2025-01-01T00:00:00.000Z'),
          priority: 5,
          isActive: true,
        );

        expect(role.isActive, isTrue);
        expect(role.deactivatedAt, isNull);
        expect(role.deactivatedBy, isNull);
      });

      test('protected roles can still be deactivated (with audit trail)', () {
        // Even protected roles (admin, client) track deactivation
        final role = Role(
          id: 1,
          name: 'admin',
          createdAt: DateTime.parse('2025-01-01T00:00:00.000Z'),
          updatedAt: DateTime.parse('2025-01-10T12:00:00.000Z'),
          priority: 5,
          isActive: false,
          deactivatedAt: DateTime.parse('2025-01-10T12:00:00.000Z'),
          deactivatedBy: 1, // Self-deactivation?
        );

        expect(role.isProtected, isTrue); // Still protected
        expect(role.isActive, isFalse); // But can be deactivated
        expect(role.deactivatedAt, isNotNull);
      });
    });

    group('Backward Compatibility', () {
      test('old JSON without isActive field works', () {
        final json = {
          'id': 1,
          'name': 'admin',
          'created_at': '2025-01-01T00:00:00.000Z',
          'updated_at': '2025-01-01T00:00:00.000Z',
          'priority': 5,
          'description': 'Admin role',
          // No is_active field (old backend response)
        };

        final role = Role.fromJson(json);
        expect(role.isActive, equals(true)); // Defaults to true
      });

      test('old code creating Role without isActive uses default', () {
        final role = Role(
          id: 1,
          name: 'admin',
          createdAt: DateTime.parse('2025-01-01T00:00:00.000Z'),
          updatedAt: DateTime.parse('2025-01-01T00:00:00.000Z'),
          priority: 5,
          // isActive not specified
        );

        expect(role.isActive, equals(true)); // Default value
      });
    });
  });
}
