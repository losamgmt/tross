/// EntityMetadataRegistry Scenario Tests
///
/// Factory-driven tests that iterate over ALL entities to test
/// metadata access patterns and ensure consistency.
///
/// Coverage targets:
/// - EntityMetadataRegistry initialization
/// - get(), tryGet(), has(), entityNames accessors
/// - Default metadata generation for fallback
/// - All entity-specific metadata access
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/services/entity_metadata.dart';

import '../factory/factory.dart';

void main() {
  setUpAll(() async {
    await EntityTestRegistry.ensureInitialized();
  });

  group('EntityMetadataRegistry', () {
    group('Initialization', () {
      test('is initialized after ensureInitialized', () {
        expect(EntityTestRegistry.isInitialized, isTrue);
      });

      test('returns all known entities', () {
        final names = EntityMetadataRegistry.entityNames;
        expect(names, isNotEmpty);
        expect(names, containsAll(['user', 'role', 'customer']));
      });
    });

    group('Entity Access', () {
      test('get returns metadata for valid entity', () {
        final metadata = EntityMetadataRegistry.get('user');
        expect(metadata, isNotNull);
        expect(metadata.name, 'user');
      });

      test('get throws for unknown entity', () {
        expect(
          () => EntityMetadataRegistry.get('unknown_entity'),
          throwsArgumentError,
        );
      });

      test('tryGet returns metadata for valid entity', () {
        final metadata = EntityMetadataRegistry.tryGet('user');
        expect(metadata, isNotNull);
      });

      test('tryGet returns null for unknown entity', () {
        final metadata = EntityMetadataRegistry.tryGet('unknown_entity');
        expect(metadata, isNull);
      });

      test('has returns true for valid entity', () {
        expect(EntityMetadataRegistry.has('user'), isTrue);
      });

      test('has returns false for unknown entity', () {
        expect(EntityMetadataRegistry.has('unknown_entity'), isFalse);
      });
    });

    group('All Entities Have Required Properties', () {
      for (final entityName in allKnownEntities) {
        group(entityName, () {
          late EntityMetadata metadata;

          setUpAll(() {
            metadata = EntityTestRegistry.get(entityName);
          });

          test('has valid name', () {
            expect(metadata.name, equals(entityName));
          });

          test('has non-empty table name', () {
            expect(metadata.tableName, isNotEmpty);
          });

          test('has primary key', () {
            expect(metadata.primaryKey, isNotEmpty);
          });

          test('has identity field', () {
            expect(metadata.identityField, isNotEmpty);
          });

          test('has RLS resource', () {
            expect(metadata.rlsResource, isNotNull);
          });

          test('has display name', () {
            expect(metadata.displayName, isNotEmpty);
          });

          test('has plural display name', () {
            expect(metadata.displayNamePlural, isNotEmpty);
          });

          test('has field definitions', () {
            expect(metadata.fields, isNotEmpty);
          });

          test('has id field', () {
            expect(metadata.fields.containsKey('id'), isTrue);
          });

          test('has default sort config', () {
            expect(metadata.defaultSort, isNotNull);
            expect(metadata.defaultSort.field, isNotEmpty);
            expect(metadata.defaultSort.order, isNotEmpty);
          });
        });
      }
    });

    group('Field Definitions', () {
      for (final entityName in allKnownEntities) {
        test('$entityName fields have valid types', () {
          final metadata = EntityTestRegistry.get(entityName);

          for (final field in metadata.fields.values) {
            expect(field.name, isNotEmpty);
            expect(field.type, isNotNull);
          }
        });

        test('$entityName required fields exist in field definitions', () {
          final metadata = EntityTestRegistry.get(entityName);
          final fieldNames = metadata.fields.keys.toSet();

          for (final required in metadata.requiredFields) {
            expect(
              fieldNames.contains(required),
              isTrue,
              reason:
                  '$entityName: required field "$required" not in fields map',
            );
          }
        });

        test('$entityName searchable fields exist in field definitions', () {
          final metadata = EntityTestRegistry.get(entityName);
          final fieldNames = metadata.fields.keys.toSet();

          for (final searchable in metadata.searchableFields) {
            expect(
              fieldNames.contains(searchable),
              isTrue,
              reason: '$entityName: searchable field "$searchable" not found',
            );
          }
        });
      }
    });

    group('EntityTestRegistry Helpers', () {
      test('getFieldNames returns list of field names', () {
        final fields = EntityTestRegistry.getFieldNames('user');
        expect(fields, contains('id'));
        expect(fields, contains('email'));
      });

      test('getRequiredFields returns required field names', () {
        final required = EntityTestRegistry.getRequiredFields('user');
        expect(required, contains('email'));
      });

      test('getField returns specific field definition', () {
        final field = EntityTestRegistry.getField('user', 'email');
        expect(field, isNotNull);
        expect(field!.type, equals(FieldType.email));
      });

      test('getField returns null for unknown field', () {
        final field = EntityTestRegistry.getField('user', 'nonexistent');
        expect(field, isNull);
      });

      test('entitiesWithFieldType finds entities with email fields', () {
        final emailEntities = EntityTestRegistry.entitiesWithFieldType(
          FieldType.email,
        ).toList();
        expect(emailEntities, contains('user'));
        expect(emailEntities, contains('customer'));
      });

      test('entitiesWithForeignKeys finds entities with FK relationships', () {
        final fkEntities = EntityTestRegistry.entitiesWithForeignKeys.toList();
        expect(fkEntities, contains('user')); // has role_id
      });

      test('entitiesWithEnums finds entities with enum fields', () {
        final enumEntities = EntityTestRegistry.entitiesWithEnums.toList();
        // At least one entity should have enum fields
        expect(enumEntities, isNotEmpty);
      });
    });

    group('EntityMetadata Static Helpers', () {
      test('toDisplayName converts snake_case to Title Case', () {
        expect(EntityMetadata.toDisplayName('work_order'), 'Work Order');
        expect(EntityMetadata.toDisplayName('user'), 'User');
        expect(
          EntityMetadata.toDisplayName('file_attachment'),
          'File Attachment',
        );
      });

      test('toDisplayNamePlural adds s to most names', () {
        expect(EntityMetadata.toDisplayNamePlural('User'), 'Users');
        expect(EntityMetadata.toDisplayNamePlural('Customer'), 'Customers');
      });

      test('toDisplayNamePlural handles y ending', () {
        expect(EntityMetadata.toDisplayNamePlural('Category'), 'Categories');
      });
    });

    group('Field Type Properties', () {
      test('FieldType.email is identified correctly', () {
        final field = EntityTestRegistry.getField('user', 'email');
        expect(field!.type, equals(FieldType.email));
      });

      test('FieldType.integer is identified correctly', () {
        final field = EntityTestRegistry.getField('user', 'id');
        expect(field!.type, equals(FieldType.integer));
      });

      test('FieldType.boolean is identified correctly', () {
        final field = EntityTestRegistry.getField('user', 'is_active');
        expect(field!.type, equals(FieldType.boolean));
      });

      test('FieldType.timestamp is identified correctly', () {
        final field = EntityTestRegistry.getField('user', 'created_at');
        expect(field!.type, equals(FieldType.timestamp));
      });

      test('readonly fields are marked correctly', () {
        final idField = EntityTestRegistry.getField('user', 'id');
        expect(idField!.readonly, isTrue);
      });

      test('required fields are marked correctly', () {
        final emailField = EntityTestRegistry.getField('user', 'email');
        expect(emailField!.required, isTrue);
      });
    });
  });
}
