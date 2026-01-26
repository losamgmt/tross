/// Enum Consistency Tests
///
/// Validates enum field consistency across all entities:
/// - All enum values follow snake_case convention (backend parity)
/// - Exception: *_state and *_country fields use uppercase ISO codes
/// - Enum fields have non-empty values
/// - HUMAN entities have aligned status enums
///
/// All assertions are generated from entity-metadata.json (SSOT).
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/services/entity_metadata.dart';

import '../factory/factory.dart';

/// Fields that use uppercase ISO codes instead of snake_case
bool _isIsoCodeField(String fieldName) {
  return fieldName.endsWith('_state') || fieldName.endsWith('_country');
}

void main() {
  setUpAll(() async {
    await EntityTestRegistry.ensureInitialized();
  });

  group('Enum Consistency', () {
    test('all enum values follow snake_case convention (backend parity)', () {
      // Backend uses snake_case for all enum values
      // Exception: *_state and *_country fields use uppercase ISO codes (AL, CA, US, etc.)
      for (final entityName in EntityTestRegistry.allEntityNames) {
        final metadata = EntityTestRegistry.get(entityName);
        final enumFields = metadata.fields.entries
            .where((e) => e.value.type == FieldType.enumType)
            .toList();

        for (final field in enumFields) {
          // Skip ISO code fields - they use uppercase by design
          if (_isIsoCodeField(field.key)) continue;

          for (final value in field.value.enumValues!) {
            expect(
              RegExp(r'^[a-z][a-z0-9_]*$').hasMatch(value),
              isTrue,
              reason:
                  '$entityName.${field.key}: Enum value "$value" should be snake_case',
            );
          }
        }
      }
    });

    test('ISO code fields use uppercase values', () {
      // State/country fields should use uppercase ISO codes (AL, CA, US, etc.)
      for (final entityName in EntityTestRegistry.allEntityNames) {
        final metadata = EntityTestRegistry.get(entityName);
        final isoFields = metadata.fields.entries
            .where(
              (e) =>
                  e.value.type == FieldType.enumType && _isIsoCodeField(e.key),
            )
            .toList();

        for (final field in isoFields) {
          for (final value in field.value.enumValues!) {
            expect(
              RegExp(r'^[A-Z]{2}$').hasMatch(value),
              isTrue,
              reason:
                  '$entityName.${field.key}: ISO code "$value" should be 2 uppercase letters',
            );
          }
        }
      }
    });

    test('all enum fields have non-empty values', () {
      for (final entityName in EntityTestRegistry.allEntityNames) {
        final metadata = EntityTestRegistry.get(entityName);
        final enumFields = metadata.fields.entries
            .where((e) => e.value.type == FieldType.enumType)
            .toList();

        for (final field in enumFields) {
          expect(
            field.value.enumValues,
            isNotNull,
            reason: '$entityName.${field.key} should have enumValues',
          );
          expect(
            field.value.enumValues!.isNotEmpty,
            isTrue,
            reason: '$entityName.${field.key} enumValues should not be empty',
          );
        }
      }
    });

    test('HUMAN entities have aligned status enums', () {
      // User, Customer, and Technician should have identical status values
      const humanEntities = ['user', 'customer', 'technician'];
      final statusValues = <String, Set<String>>{};

      for (final entityName in humanEntities) {
        final metadata = EntityTestRegistry.get(entityName);
        final statusField = metadata.fields['status'];

        expect(
          statusField,
          isNotNull,
          reason: '$entityName should have a status field',
        );
        expect(
          statusField!.type,
          equals(FieldType.enumType),
          reason: '$entityName.status should be enum type',
        );

        statusValues[entityName] = statusField.enumValues!.toSet();
      }

      // All HUMAN entities should have the same status values
      final userStatus = statusValues['user']!;
      for (final entityName in humanEntities) {
        expect(
          statusValues[entityName],
          equals(userStatus),
          reason:
              '$entityName.status should match user.status for HUMAN entity parity. '
              'Expected: $userStatus, Got: ${statusValues[entityName]}',
        );
      }
    });
  });
}
