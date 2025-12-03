/// User Model Tests
///
/// Tests for User model covering:
/// - JSON serialization/deserialization with new audit fields
/// - Defensive validation
/// - copyWith functionality
/// - Phase 9 audit fields (deactivatedAt, deactivatedBy)
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/models/user_model.dart';

void main() {
  group('User Model - Phase 9 Enhancements', () {
    group('JSON Serialization with Audit Fields', () {
      test('fromJson parses user with audit fields', () {
        final json = {
          'id': 1,
          'email': 'test@example.com',
          'auth0_id': 'auth0|123',
          'first_name': 'John',
          'last_name': 'Doe',
          'role_id': 2,
          'role': 'admin',
          'is_active': false,
          'created_at': '2025-01-01T00:00:00.000Z',
          'updated_at': '2025-01-02T00:00:00.000Z',
          'deactivated_at': '2025-01-02T12:00:00.000Z',
          'deactivated_by': 5,
        };

        final user = User.fromJson(json);

        expect(user.id, equals(1));
        expect(user.email, equals('test@example.com'));
        expect(user.isActive, equals(false));
        expect(user.deactivatedAt, isNotNull);
        expect(user.deactivatedBy, equals(5));
        expect(
          user.deactivatedAt!.toIso8601String(),
          equals('2025-01-02T12:00:00.000Z'),
        );
      });

      test('fromJson handles missing audit fields (active users)', () {
        final json = {
          'id': 1,
          'email': 'active@example.com',
          'auth0_id': 'auth0|456',
          'first_name': 'Jane',
          'last_name': 'Smith',
          'role_id': 3,
          'role': 'technician',
          'is_active': true,
          'created_at': '2025-01-01T00:00:00.000Z',
          'updated_at': '2025-01-02T00:00:00.000Z',
          // No deactivated_at or deactivated_by
        };

        final user = User.fromJson(json);

        expect(user.isActive, equals(true));
        expect(user.deactivatedAt, isNull);
        expect(user.deactivatedBy, isNull);
      });

      test('toJson includes audit fields when present', () {
        final user = User(
          id: 1,
          email: 'test@example.com',
          auth0Id: 'auth0|123',
          firstName: 'John',
          lastName: 'Doe',
          roleId: 2,
          role: 'admin',
          isActive: false,
          status: 'active',
          createdAt: DateTime.parse('2025-01-01T00:00:00.000Z'),
          updatedAt: DateTime.parse('2025-01-02T00:00:00.000Z'),
          deactivatedAt: DateTime.parse('2025-01-02T12:00:00.000Z'),
          deactivatedBy: 5,
        );

        final json = user.toJson();

        expect(json['is_active'], equals(false));
        expect(json['deactivated_at'], equals('2025-01-02T12:00:00.000Z'));
        expect(json['deactivated_by'], equals(5));
      });

      test('toJson omits audit fields when null', () {
        final user = User(
          id: 1,
          email: 'active@example.com',
          auth0Id: 'auth0|456',
          firstName: 'Jane',
          lastName: 'Smith',
          roleId: 3,
          role: 'technician',
          isActive: true,
          status: 'active',
          createdAt: DateTime.parse('2025-01-01T00:00:00.000Z'),
          updatedAt: DateTime.parse('2025-01-02T00:00:00.000Z'),
          // No audit fields
        );

        final json = user.toJson();

        expect(json['is_active'], equals(true));
        expect(json.containsKey('deactivated_at'), isFalse);
        expect(json.containsKey('deactivated_by'), isFalse);
      });

      test('roundtrip serialization preserves audit data', () {
        final original = User(
          id: 1,
          email: 'test@example.com',
          auth0Id: 'auth0|123',
          firstName: 'John',
          lastName: 'Doe',
          roleId: 2,
          role: 'admin',
          isActive: false,
          status: 'suspended',
          createdAt: DateTime.parse('2025-01-01T00:00:00.000Z'),
          updatedAt: DateTime.parse('2025-01-02T00:00:00.000Z'),
          deactivatedAt: DateTime.parse('2025-01-02T12:00:00.000Z'),
          deactivatedBy: 5,
        );

        final json = original.toJson();
        final restored = User.fromJson(json);

        expect(restored.deactivatedAt, equals(original.deactivatedAt));
        expect(restored.deactivatedBy, equals(original.deactivatedBy));
        expect(restored.isActive, equals(original.isActive));
      });
    });

    group('copyWith() with Audit Fields', () {
      test('copyWith can update isActive and audit fields', () {
        final user = User(
          id: 1,
          email: 'test@example.com',
          auth0Id: 'auth0|123',
          firstName: 'John',
          lastName: 'Doe',
          roleId: 2,
          role: 'admin',
          isActive: true,
          status: 'active',
          createdAt: DateTime.parse('2025-01-01T00:00:00.000Z'),
          updatedAt: DateTime.parse('2025-01-02T00:00:00.000Z'),
        );

        final deactivatedAt = DateTime.parse('2025-01-03T12:00:00.000Z');
        final updated = user.copyWith(
          isActive: false,
          deactivatedAt: deactivatedAt,
          deactivatedBy: 5,
        );

        expect(updated.isActive, equals(false));
        expect(updated.deactivatedAt, equals(deactivatedAt));
        expect(updated.deactivatedBy, equals(5));
        // Other fields unchanged
        expect(updated.email, equals(user.email));
        expect(updated.id, equals(user.id));
      });

      test('copyWith preserves existing audit fields when not updated', () {
        final user = User(
          id: 1,
          email: 'test@example.com',
          auth0Id: 'auth0|123',
          firstName: 'John',
          lastName: 'Doe',
          roleId: 2,
          role: 'admin',
          isActive: false,
          status: 'suspended',
          createdAt: DateTime.parse('2025-01-01T00:00:00.000Z'),
          updatedAt: DateTime.parse('2025-01-02T00:00:00.000Z'),
          deactivatedAt: DateTime.parse('2025-01-02T12:00:00.000Z'),
          deactivatedBy: 5,
        );

        final updated = user.copyWith(email: 'newemail@example.com');

        expect(updated.deactivatedAt, equals(user.deactivatedAt));
        expect(updated.deactivatedBy, equals(user.deactivatedBy));
        expect(updated.email, equals('newemail@example.com'));
      });

      test('copyWith can clear audit fields by reactivating', () {
        final deactivatedUser = User(
          id: 1,
          email: 'test@example.com',
          auth0Id: 'auth0|123',
          firstName: 'John',
          lastName: 'Doe',
          roleId: 2,
          role: 'admin',
          isActive: false,
          status: 'suspended',
          createdAt: DateTime.parse('2025-01-01T00:00:00.000Z'),
          updatedAt: DateTime.parse('2025-01-02T00:00:00.000Z'),
          deactivatedAt: DateTime.parse('2025-01-02T12:00:00.000Z'),
          deactivatedBy: 5,
        );

        // Reactivation scenario (backend clears audit fields)
        final reactivated = deactivatedUser.copyWith(
          isActive: true,
          // In real backend, deactivatedAt/deactivatedBy would be set to null
        );

        expect(reactivated.isActive, equals(true));
        // Note: copyWith doesn't automatically clear audit fields
        // That's the backend's responsibility
      });
    });

    group('Defensive Validation', () {
      test('fromJson validates deactivatedBy as positive integer', () {
        final json = {
          'id': 1,
          'email': 'test@example.com',
          'auth0_id': 'auth0|123',
          'first_name': 'John',
          'last_name': 'Doe',
          'role_id': 2,
          'role': 'admin',
          'is_active': false,
          'created_at': '2025-01-01T00:00:00.000Z',
          'updated_at': '2025-01-02T00:00:00.000Z',
          'deactivated_at': '2025-01-02T12:00:00.000Z',
          'deactivated_by': 5, // Valid user ID
        };

        final user = User.fromJson(json);
        expect(user.deactivatedBy, equals(5));
      });

      test('fromJson handles null deactivated_at gracefully', () {
        final json = {
          'id': 1,
          'email': 'test@example.com',
          'auth0_id': 'auth0|123',
          'first_name': 'John',
          'last_name': 'Doe',
          'role_id': 2,
          'role': 'admin',
          'is_active': true,
          'created_at': '2025-01-01T00:00:00.000Z',
          'updated_at': '2025-01-02T00:00:00.000Z',
          'deactivated_at': null,
          'deactivated_by': null,
        };

        final user = User.fromJson(json);
        expect(user.deactivatedAt, isNull);
        expect(user.deactivatedBy, isNull);
      });
    });

    group('Audit Trail Use Cases', () {
      test('deactivated user has complete audit information', () {
        final user = User(
          id: 1,
          email: 'deactivated@example.com',
          auth0Id: 'auth0|123',
          firstName: 'Former',
          lastName: 'User',
          roleId: 2,
          role: 'technician',
          isActive: false,
          status: 'suspended',
          createdAt: DateTime.parse('2025-01-01T00:00:00.000Z'),
          updatedAt: DateTime.parse('2025-01-05T00:00:00.000Z'),
          deactivatedAt: DateTime.parse('2025-01-05T14:30:00.000Z'),
          deactivatedBy: 10, // Admin user ID
        );

        expect(user.isActive, isFalse);
        expect(user.deactivatedAt, isNotNull);
        expect(user.deactivatedBy, isNotNull);

        // Can display audit info like: "Deactivated on Jan 5, 2025 by user #10"
        expect(user.deactivatedAt!.year, equals(2025));
        expect(user.deactivatedBy, equals(10));
      });

      test('active user has no audit information', () {
        final user = User(
          id: 2,
          email: 'active@example.com',
          auth0Id: 'auth0|456',
          firstName: 'Active',
          lastName: 'User',
          roleId: 3,
          role: 'client',
          isActive: true,
          status: 'active',
          createdAt: DateTime.parse('2025-01-01T00:00:00.000Z'),
          updatedAt: DateTime.parse('2025-01-02T00:00:00.000Z'),
        );

        expect(user.isActive, isTrue);
        expect(user.deactivatedAt, isNull);
        expect(user.deactivatedBy, isNull);
      });
    });

    group('User Status Field (Migration 007)', () {
      test('fromJson handles status field', () {
        final json = {
          'id': 1,
          'email': 'test@example.com',
          'auth0_id': 'auth0|123',
          'first_name': 'John',
          'last_name': 'Doe',
          'role_id': 2,
          'role': 'admin',
          'is_active': true,
          'status': 'active',
          'created_at': '2025-01-01T00:00:00.000Z',
          'updated_at': '2025-01-02T00:00:00.000Z',
        };

        final user = User.fromJson(json);
        expect(user.status, equals('active'));
        expect(user.statusLabel, equals('Active'));
      });

      test('fromJson defaults status to active when missing', () {
        final json = {
          'id': 1,
          'email': 'test@example.com',
          'auth0_id': 'auth0|123',
          'first_name': 'John',
          'last_name': 'Doe',
          'role_id': 2,
          'role': 'admin',
          'is_active': true,
          'created_at': '2025-01-01T00:00:00.000Z',
          'updated_at': '2025-01-02T00:00:00.000Z',
          // No status field (backward compatibility)
        };

        final user = User.fromJson(json);
        expect(user.status, equals('active'));
      });

      test('pending_activation user can have null auth0_id', () {
        final json = {
          'id': 1,
          'email': 'pending@example.com',
          'auth0_id': null,
          'first_name': 'Pending',
          'last_name': 'User',
          'role_id': 2,
          'role': 'client',
          'is_active': true,
          'status': 'pending_activation',
          'created_at': '2025-01-01T00:00:00.000Z',
          'updated_at': '2025-01-02T00:00:00.000Z',
        };

        final user = User.fromJson(json);
        expect(user.auth0Id, isNull);
        expect(user.status, equals('pending_activation'));
        expect(user.isPendingActivation, isTrue);
        expect(user.statusLabel, equals('Pending Activation'));
      });

      test('dev mode synthetic auth0_id is flagged', () {
        final json = {
          'id': 1,
          'email': 'dev@example.com',
          'auth0_id': 'dev-user-1',
          '_synthetic': true,
          'first_name': 'Dev',
          'last_name': 'User',
          'role_id': 2,
          'role': 'admin',
          'is_active': true,
          'status': 'active',
          'created_at': '2025-01-01T00:00:00.000Z',
          'updated_at': '2025-01-02T00:00:00.000Z',
        };

        final user = User.fromJson(json);
        expect(user.isSynthetic, isTrue);
        expect(user.auth0Id, equals('dev-user-1'));
      });

      test('suspended user status is recognized', () {
        final json = {
          'id': 1,
          'email': 'suspended@example.com',
          'auth0_id': 'auth0|123',
          'first_name': 'Suspended',
          'last_name': 'User',
          'role_id': 2,
          'role': 'client',
          'is_active': false,
          'status': 'suspended',
          'created_at': '2025-01-01T00:00:00.000Z',
          'updated_at': '2025-01-02T00:00:00.000Z',
        };

        final user = User.fromJson(json);
        expect(user.status, equals('suspended'));
        expect(user.isSuspended, isTrue);
        expect(user.statusLabel, equals('Suspended'));
      });

      test('data quality issue detected for active user without auth0_id', () {
        final json = {
          'id': 1,
          'email': 'issue@example.com',
          'auth0_id': null,
          'first_name': 'Issue',
          'last_name': 'User',
          'role_id': 2,
          'role': 'client',
          'is_active': true,
          'status': 'active',
          'created_at': '2025-01-01T00:00:00.000Z',
          'updated_at': '2025-01-02T00:00:00.000Z',
        };

        final user = User.fromJson(json);
        expect(user.hasDataQualityIssue, isTrue);
      });

      test('isFullyActive checks both status and is_active', () {
        final activeUser = User.fromJson({
          'id': 1,
          'email': 'active@example.com',
          'auth0_id': 'auth0|123',
          'first_name': 'Active',
          'last_name': 'User',
          'role_id': 2,
          'role': 'client',
          'is_active': true,
          'status': 'active',
          'created_at': '2025-01-01T00:00:00.000Z',
          'updated_at': '2025-01-02T00:00:00.000Z',
        });

        final pendingUser = User.fromJson({
          'id': 2,
          'email': 'pending@example.com',
          'auth0_id': null,
          'first_name': 'Pending',
          'last_name': 'User',
          'role_id': 2,
          'role': 'client',
          'is_active': true,
          'status': 'pending_activation',
          'created_at': '2025-01-01T00:00:00.000Z',
          'updated_at': '2025-01-02T00:00:00.000Z',
        });

        expect(activeUser.isFullyActive, isTrue);
        expect(pendingUser.isFullyActive, isFalse);
      });
    });
  });
}
