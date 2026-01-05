/// Field Parity Tests
///
/// Validates that field definitions in EntityMetadata are internally consistent
/// and follow expected patterns. These tests catch schema drift and ensure
/// all field metadata is complete.
///
/// Zero per-entity code: all assertions are generated from metadata.
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/services/entity_metadata.dart';

import '../factory/factory.dart';

void main() {
  setUpAll(() async {
    await EntityTestRegistry.ensureInitialized();
  });

  group('Field Parity', () {
    test('required fields exist in fields map for all entities', () {
      for (final entityName in EntityTestRegistry.allEntityNames) {
        final metadata = EntityTestRegistry.get(entityName);
        final requiredFields = EntityTestRegistry.getRequiredFields(entityName);

        for (final fieldName in requiredFields) {
          expect(
            metadata.fields.containsKey(fieldName),
            isTrue,
            reason:
                '$entityName: Required field "$fieldName" not found in fields map',
          );
        }
      }
    });

    test('all entities have id field of valid primary key type', () {
      // Valid PK types:
      // - integer: standard auto-increment ID
      // - foreignKey: shared PK pattern (e.g., preferences.id = users.id)
      const validPkTypes = {FieldType.integer, FieldType.foreignKey};

      for (final entityName in EntityTestRegistry.allEntityNames) {
        final metadata = EntityTestRegistry.get(entityName);

        expect(
          metadata.fields.containsKey('id'),
          isTrue,
          reason: '$entityName should have an id field',
        );

        final idField = metadata.fields['id']!;

        expect(
          validPkTypes.contains(idField.type),
          isTrue,
          reason:
              '$entityName.id should be integer or foreignKey type, '
              'got ${idField.type}',
        );

        expect(
          idField.readonly,
          isTrue,
          reason: '$entityName.id should be readonly',
        );
      }
    });

    test('timestamp fields created_at/updated_at are readonly', () {
      for (final entityName in EntityTestRegistry.allEntityNames) {
        final metadata = EntityTestRegistry.get(entityName);

        for (final entry in metadata.fields.entries) {
          if (entry.value.type == FieldType.timestamp) {
            // created_at and updated_at should be readonly
            if (entry.key == 'created_at' || entry.key == 'updated_at') {
              expect(
                entry.value.readonly,
                isTrue,
                reason: '$entityName.${entry.key} timestamp should be readonly',
              );
            }
          }
        }
      }
    });

    test('email fields have email type', () {
      for (final entityName in EntityTestRegistry.allEntityNames) {
        final metadata = EntityTestRegistry.get(entityName);

        for (final entry in metadata.fields.entries) {
          if (entry.key == 'email') {
            expect(
              entry.value.type,
              equals(FieldType.email),
              reason: '$entityName.email should have email type',
            );
          }
        }
      }
    });

    test('phone fields have phone type', () {
      for (final entityName in EntityTestRegistry.allEntityNames) {
        final metadata = EntityTestRegistry.get(entityName);

        for (final entry in metadata.fields.entries) {
          if (entry.key == 'phone') {
            expect(
              entry.value.type,
              equals(FieldType.phone),
              reason: '$entityName.phone should have phone type',
            );
          }
        }
      }
    });

    test('foreign keys have valid related entity and display field', () {
      for (final entityName in EntityTestRegistry.allEntityNames) {
        final metadata = EntityTestRegistry.get(entityName);
        final foreignKeyFields = metadata.fields.entries
            .where((e) => e.value.type == FieldType.foreignKey)
            .toList();

        for (final fk in foreignKeyFields) {
          expect(
            fk.value.relatedEntity,
            isNotNull,
            reason:
                '$entityName.${fk.key}: Foreign key must have relatedEntity',
          );
          expect(
            EntityTestRegistry.has(fk.value.relatedEntity!),
            isTrue,
            reason:
                '$entityName.${fk.key}: Related entity "${fk.value.relatedEntity}" must exist',
          );

          // If displayField is specified, it must exist in related entity
          if (fk.value.displayField != null) {
            final relatedMetadata = EntityTestRegistry.get(
              fk.value.relatedEntity!,
            );
            expect(
              relatedMetadata.fields.containsKey(fk.value.displayField),
              isTrue,
              reason:
                  '$entityName.${fk.key}: Display field "${fk.value.displayField}" '
                  'must exist in ${fk.value.relatedEntity}',
            );
          }
        }
      }
    });

    test('enum fields have non-empty unique values', () {
      for (final entityName in EntityTestRegistry.allEntityNames) {
        final metadata = EntityTestRegistry.get(entityName);
        final enumFields = metadata.fields.entries
            .where((e) => e.value.type == FieldType.enumType)
            .toList();

        for (final enumField in enumFields) {
          expect(
            enumField.value.enumValues,
            isNotNull,
            reason:
                '$entityName.${enumField.key}: Enum field must have enumValues',
          );
          expect(
            enumField.value.enumValues!.isNotEmpty,
            isTrue,
            reason:
                '$entityName.${enumField.key}: Enum field enumValues cannot be empty',
          );

          // Verify uniqueness
          final values = enumField.value.enumValues!;
          final uniqueValues = values.toSet();
          expect(
            uniqueValues.length,
            equals(values.length),
            reason: '$entityName.${enumField.key}: Enum values must be unique',
          );
        }
      }
    });

    test('enum field defaults are valid values', () {
      for (final entityName in EntityTestRegistry.allEntityNames) {
        final metadata = EntityTestRegistry.get(entityName);
        final enumFields = metadata.fields.entries
            .where((e) => e.value.type == FieldType.enumType)
            .toList();

        for (final enumField in enumFields) {
          if (enumField.value.defaultValue != null) {
            expect(
              enumField.value.enumValues!.contains(
                enumField.value.defaultValue,
              ),
              isTrue,
              reason:
                  '$entityName.${enumField.key}: Default value '
                  '"${enumField.value.defaultValue}" must be in enumValues list',
            );
          }
        }
      }
    });

    test('string fields have reasonable maxLength', () {
      for (final entityName in EntityTestRegistry.allEntityNames) {
        final metadata = EntityTestRegistry.get(entityName);

        for (final entry in metadata.fields.entries) {
          if (entry.value.type == FieldType.string) {
            // maxLength is optional but should be reasonable if present
            if (entry.value.maxLength != null) {
              expect(
                entry.value.maxLength! > 0,
                isTrue,
                reason: '$entityName.${entry.key}: maxLength must be positive',
              );
              expect(
                entry.value.maxLength! <= 10000,
                isTrue,
                reason:
                    '$entityName.${entry.key}: maxLength seems unreasonably large',
              );
            }
          }
        }
      }
    });

    test('integer fields have valid min/max when specified', () {
      for (final entityName in EntityTestRegistry.allEntityNames) {
        final metadata = EntityTestRegistry.get(entityName);

        for (final entry in metadata.fields.entries) {
          if (entry.value.type == FieldType.integer) {
            if (entry.value.min != null && entry.value.max != null) {
              expect(
                entry.value.min! <= entry.value.max!,
                isTrue,
                reason: '$entityName.${entry.key}: min must be <= max',
              );
            }
          }
        }
      }
    });
  });
}
