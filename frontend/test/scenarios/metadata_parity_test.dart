/// Metadata Parity Tests
///
/// Validates that frontend EntityMetadata matches backend configuration.
/// These are "drift detection" tests - they catch when backend adds/removes
/// entities without updating the frontend sync.
///
/// Zero per-entity code: all assertions are generated from metadata.
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/services/entity_metadata.dart';

import '../factory/factory.dart';

/// Expected entities - uses shared constant from factory
final _expectedEntities = allKnownEntities.toSet();

void main() {
  setUpAll(() async {
    await EntityTestRegistry.ensureInitialized();
  });

  group('Metadata Parity', () {
    test('all expected entities are registered', () {
      final registeredEntities = EntityTestRegistry.allEntityNames.toSet();

      for (final expected in _expectedEntities) {
        expect(
          registeredEntities.contains(expected),
          isTrue,
          reason:
              'Entity "$expected" should be registered in EntityMetadataRegistry',
        );
      }
    });

    test('no unexpected entities are registered', () {
      // This test catches orphan entities (removed from backend but still in frontend)
      final registeredEntities = EntityTestRegistry.allEntityNames.toSet();
      final unexpectedEntities = registeredEntities.difference(
        _expectedEntities,
      );

      expect(
        unexpectedEntities,
        isEmpty,
        reason:
            'Unexpected entities found: $unexpectedEntities. '
            'Update expected list if these are intentional additions.',
      );
    });

    test('entity count matches expected', () {
      expect(
        EntityTestRegistry.allEntityNames.length,
        equals(_expectedEntities.length),
        reason: 'Expected ${_expectedEntities.length} entities in registry',
      );
    });

    test('all entities have required structural properties', () {
      for (final entityName in EntityTestRegistry.allEntityNames) {
        final metadata = EntityTestRegistry.get(entityName);

        // Every entity must have these fundamental properties
        expect(metadata.name, isNotEmpty, reason: '$entityName: name required');
        expect(
          metadata.tableName,
          isNotEmpty,
          reason: '$entityName: tableName required',
        );
        expect(
          metadata.primaryKey,
          isNotEmpty,
          reason: '$entityName: primaryKey required',
        );
        expect(
          metadata.displayName,
          isNotEmpty,
          reason: '$entityName: displayName required',
        );
        expect(
          metadata.displayNamePlural,
          isNotEmpty,
          reason: '$entityName: displayNamePlural required',
        );

        // Fields map cannot be empty
        expect(
          metadata.fields,
          isNotEmpty,
          reason: '$entityName: fields map cannot be empty',
        );

        // Primary key must exist in fields
        expect(
          metadata.fields.containsKey(metadata.primaryKey),
          isTrue,
          reason:
              '$entityName: Primary key "${metadata.primaryKey}" must exist in fields',
        );
      }
    });

    test('all entities have valid field types', () {
      for (final entityName in EntityTestRegistry.allEntityNames) {
        final metadata = EntityTestRegistry.get(entityName);

        for (final entry in metadata.fields.entries) {
          final fieldName = entry.key;
          final fieldMeta = entry.value;

          // Every field must have a valid type
          expect(
            FieldType.values.contains(fieldMeta.type),
            isTrue,
            reason:
                '$entityName.$fieldName has unknown type: ${fieldMeta.type}',
          );
        }
      }
    });

    test('all foreign keys reference valid entities', () {
      for (final entityName in EntityTestRegistry.allEntityNames) {
        final metadata = EntityTestRegistry.get(entityName);

        for (final entry in metadata.fields.entries) {
          final fieldName = entry.key;
          final fieldMeta = entry.value;

          if (fieldMeta.type == FieldType.foreignKey) {
            expect(
              fieldMeta.relatedEntity,
              isNotNull,
              reason:
                  '$entityName.$fieldName: ForeignKey must have relatedEntity',
            );
            expect(
              EntityTestRegistry.has(fieldMeta.relatedEntity!),
              isTrue,
              reason:
                  '$entityName.$fieldName references unknown entity: '
                  '${fieldMeta.relatedEntity}',
            );
          }
        }
      }
    });

    test('all enum fields have valid values', () {
      for (final entityName in EntityTestRegistry.allEntityNames) {
        final metadata = EntityTestRegistry.get(entityName);

        for (final entry in metadata.fields.entries) {
          final fieldName = entry.key;
          final fieldMeta = entry.value;

          if (fieldMeta.type == FieldType.enumType) {
            expect(
              fieldMeta.enumValues,
              isNotNull,
              reason: '$entityName.$fieldName: Enum must have enumValues list',
            );
            expect(
              fieldMeta.enumValues,
              isNotEmpty,
              reason: '$entityName.$fieldName: enumValues cannot be empty',
            );
          }
        }
      }
    });

    // NOTE: Tests for EntityTestRegistry helper methods (entitiesWithForeignKeys,
    // entitiesWithEnums) are intentionally omitted. Those are implementation
    // details of our test infrastructure, not production metadata contracts.
  });
}
