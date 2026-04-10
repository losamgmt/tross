/// Metadata Parity Tests
///
/// Validates that frontend EntityMetadata matches backend configuration.
/// Tests validate STRUCTURAL CONTRACTS, not specific entity counts.
/// The synced JSON IS the source of truth - no hardcoded lists.
///
/// Zero per-entity code: all assertions are generated from metadata.
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross/services/entity_metadata.dart';

import '../factory/factory.dart';

void main() {
  setUpAll(() async {
    await EntityTestRegistry.ensureInitialized();
  });

  group('Metadata Parity', () {
    test('core business entities are registered', () {
      // Smoke test: verify essential entities exist
      // These are the minimum required for the app to function
      for (final entity in coreBusinessEntities) {
        expect(
          EntityTestRegistry.has(entity),
          isTrue,
          reason: 'Core entity "$entity" must be registered',
        );
      }
    });

    test('registry has entities loaded', () {
      // Verify sync worked - we should have entities
      expect(
        EntityTestRegistry.allEntityNames.length,
        greaterThan(0),
        reason: 'Registry should have at least one entity',
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
              fieldMeta.references,
              isNotNull,
              reason: '$entityName.$fieldName: ForeignKey must have references',
            );
            expect(
              EntityTestRegistry.has(fieldMeta.references!),
              isTrue,
              reason:
                  '$entityName.$fieldName references unknown entity: '
                  '${fieldMeta.references}',
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

    // SSOT Compliance: Validate that deprecated allKnownEntities stays in sync
    // until fully migrated to EntityTestRegistry.allEntityNames
    test('allKnownEntities matches EntityTestRegistry.allEntityNames', () {
      final fromJson = EntityTestRegistry.allEntityNames.toList()..sort();
      final fromConst = allKnownEntities.toList()..sort();

      expect(
        fromConst,
        equals(fromJson),
        reason:
            'allKnownEntities is out of sync with entity_metadata.json.\n'
            'Missing from const: ${fromJson.where((e) => !fromConst.contains(e)).toList()}\n'
            'Extra in const: ${fromConst.where((e) => !fromJson.contains(e)).toList()}',
      );
    });

    // NOTE: Tests for EntityTestRegistry helper methods (entitiesWithForeignKeys,
    // entitiesWithEnums) are intentionally omitted. Those are implementation
    // details of our test infrastructure, not production metadata contracts.
  });
}
