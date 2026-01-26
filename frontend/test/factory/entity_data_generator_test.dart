/// Entity Data Generator Tests
///
/// Verifies the factory generates valid data for ALL entities.
/// Meta-test: validates the test infrastructure itself.
///
/// If these tests fail, the generative test infrastructure is broken.
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/models/field_definition.dart';
import '../factory/factory.dart';

void main() {
  setUpAll(() async {
    await EntityTestRegistry.ensureInitialized();
  });

  group('EntityTestRegistry', () {
    test('discovers all entities from metadata', () {
      final entities = EntityTestRegistry.allEntityNames;

      expect(entities, isNotEmpty);
      expect(entities, contains('user'));
      expect(entities, contains('role'));
      expect(entities, contains('customer'));
    });

    test('provides metadata for each discovered entity', () {
      for (final entityName in EntityTestRegistry.allEntityNames) {
        final metadata = EntityTestRegistry.get(entityName);

        expect(metadata.name, equals(entityName));
        expect(metadata.tableName, isNotEmpty);
        expect(metadata.primaryKey, isNotEmpty);
      }
    });

    test('identifies entities with foreign keys', () {
      final fkEntities = EntityTestRegistry.entitiesWithForeignKeys.toList();

      expect(fkEntities, contains('user')); // user has role_id FK
    });

    test('identifies entities with enum fields', () {
      final enumEntities = EntityTestRegistry.entitiesWithEnums.toList();

      expect(enumEntities, isNotEmpty);
    });

    test('returns field definitions for specific fields', () {
      final emailField = EntityTestRegistry.getField('user', 'email');

      expect(emailField, isNotNull);
      expect(emailField!.type, equals(FieldType.email));
    });

    test('returns required fields for entities', () {
      final required = EntityTestRegistry.getRequiredFields('role');

      expect(required, contains('name'));
    });

    test('exposes initialization state', () {
      expect(EntityTestRegistry.isInitialized, isTrue);
    });
  });

  group('EntityDataGenerator', () {
    group('create', () {
      test('generates data for all entities without error', () {
        for (final entityName in EntityTestRegistry.allEntityNames) {
          expect(
            () => EntityDataGenerator.create(entityName),
            returnsNormally,
            reason: 'Failed to generate data for $entityName',
          );
        }
      });

      test('generates unique IDs across calls', () {
        final user1 = EntityDataGenerator.create('user');
        final user2 = EntityDataGenerator.create('user');

        expect(user1['id'], isNot(equals(user2['id'])));
      });

      test('respects explicit ID override', () {
        final user = EntityDataGenerator.create('user', id: 999);

        expect(user['id'], equals(999));
      });

      test('respects field overrides', () {
        final user = EntityDataGenerator.create(
          'user',
          overrides: {'email': 'custom@test.com', 'first_name': 'Custom'},
        );

        expect(user['email'], equals('custom@test.com'));
        expect(user['first_name'], equals('Custom'));
      });

      test('seed produces reproducible output', () {
        final user1 = EntityDataGenerator.create('user', seed: 123, id: 1);
        final user2 = EntityDataGenerator.create('user', seed: 123, id: 1);

        expect(user1, equals(user2));
      });

      test('populates all metadata fields', () {
        for (final entityName in EntityTestRegistry.allEntityNames) {
          final data = EntityDataGenerator.create(entityName);
          final metadata = EntityTestRegistry.get(entityName);

          for (final fieldName in metadata.fieldNames) {
            expect(
              data.containsKey(fieldName),
              isTrue,
              reason: '$entityName should have field $fieldName',
            );
          }
        }
      });

      test('generates correct types for each field', () {
        for (final entityName in EntityTestRegistry.allEntityNames) {
          final data = EntityDataGenerator.create(entityName);
          final metadata = EntityTestRegistry.get(entityName);

          for (final entry in metadata.fields.entries) {
            final value = data[entry.key];
            if (value == null) continue;

            final isCorrectType = _isCorrectType(entry.value.type, value);

            expect(
              isCorrectType,
              isTrue,
              reason:
                  '$entityName.${entry.key}: expected ${entry.value.type}, '
                  'got ${value.runtimeType}',
            );
          }
        }
      });
    });

    group('createMinimal', () {
      test('includes only required fields plus id', () {
        final minimal = EntityDataGenerator.createMinimal('user');
        final metadata = EntityTestRegistry.get('user');

        expect(minimal.containsKey('id'), isTrue);

        for (final field in metadata.requiredFields) {
          expect(
            minimal.containsKey(field),
            isTrue,
            reason: 'Minimal should include required field: $field',
          );
        }
      });

      test('has fewer fields than full create', () {
        final minimal = EntityDataGenerator.createMinimal('role');
        final full = EntityDataGenerator.create('role');

        expect(minimal.keys.length, lessThanOrEqualTo(full.keys.length));
      });
    });

    group('createList', () {
      test('generates requested count', () {
        final users = EntityDataGenerator.createList('user', count: 5);

        expect(users.length, equals(5));
      });

      test('generates unique IDs for each item', () {
        final users = EntityDataGenerator.createList('user', count: 3);
        final ids = users.map((u) => u['id']).toSet();

        expect(ids.length, equals(3));
      });

      test('applies shared overrides to all items', () {
        final users = EntityDataGenerator.createList(
          'user',
          count: 3,
          sharedOverrides: {'role_id': 5},
        );

        for (final user in users) {
          expect(user['role_id'], equals(5));
        }
      });
    });

    group('createMissingField', () {
      test('removes specified field', () {
        final user = EntityDataGenerator.createMissingField('user', 'email');

        expect(user.containsKey('email'), isFalse);
        expect(user.containsKey('id'), isTrue);
      });
    });

    group('createInvalidField', () {
      test('sets specified invalid value', () {
        final user = EntityDataGenerator.createInvalidField(
          'user',
          'email',
          'not-an-email',
        );

        expect(user['email'], equals('not-an-email'));
      });
    });

    group('enum field generation', () {
      test('generates valid enum values from metadata', () {
        for (final entityName in EntityTestRegistry.entitiesWithEnums) {
          final data = EntityDataGenerator.create(entityName);
          final metadata = EntityTestRegistry.get(entityName);

          for (final entry in metadata.fields.entries) {
            final field = entry.value;
            if (field.type == FieldType.enumType && field.enumValues != null) {
              final value = data[entry.key];
              if (value != null) {
                expect(
                  field.enumValues!.contains(value),
                  isTrue,
                  reason:
                      '$entityName.${entry.key}: "$value" not in ${field.enumValues}',
                );
              }
            }
          }
        }
      });
    });

    group('email field generation', () {
      test('generates valid email format', () {
        final user = EntityDataGenerator.create('user');

        expect(user['email'], contains('@'));
        expect(user['email'], contains('.com'));
      });
    });

    group('foreign key generation', () {
      test('generates integer FK values', () {
        for (final entityName in EntityTestRegistry.entitiesWithForeignKeys) {
          final data = EntityDataGenerator.create(entityName);
          final metadata = EntityTestRegistry.get(entityName);

          for (final entry in metadata.fields.entries) {
            if (entry.value.isForeignKey) {
              expect(
                data[entry.key],
                isA<int>(),
                reason: '$entityName.${entry.key} FK should be int',
              );
            }
          }
        }
      });
    });
  });

  group('TestDataGeneration extension', () {
    test('testData generates entity data', () {
      final user = 'user'.testData();

      expect(user['id'], isNotNull);
      expect(user['email'], isNotNull);
    });

    test('testData accepts overrides', () {
      final user = 'user'.testData(overrides: {'email': 'ext@test.com'});

      expect(user['email'], equals('ext@test.com'));
    });

    test('testDataList generates list', () {
      final users = 'user'.testDataList(count: 3);

      expect(users.length, equals(3));
    });
  });
}

/// Helper to verify type matches field type
bool _isCorrectType(FieldType type, dynamic value) {
  return switch (type) {
    FieldType.integer ||
    FieldType.foreignKey ||
    FieldType.currency => value is int,
    FieldType.string ||
    FieldType.text ||
    FieldType.email ||
    FieldType.phone ||
    FieldType.uuid ||
    FieldType.enumType => value is String,
    FieldType.boolean => value is bool,
    FieldType.decimal => value is double || value is int,
    FieldType.timestamp || FieldType.date => value is String,
    FieldType.jsonb => value is Map || value is List,
  };
}
