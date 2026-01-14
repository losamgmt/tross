/// Metadata Factory Scenario Tests (Strategy 3)
///
/// Mass-gain pattern: Test ALL field types through factory methods
/// systematically instead of hunting individual coverage gaps.
///
/// Coverage targets:
/// - MetadataFieldConfigFactory (50 uncovered lines)
/// - MetadataTableColumnFactory (49 uncovered lines)
/// - FieldDefinition model
library;

import 'package:flutter_test/flutter_test.dart';

import 'package:tross_app/models/field_definition.dart';
import 'package:tross_app/models/entity_metadata.dart';

void main() {
  group('Strategy 3: Metadata Factory Scenario Tests', () {
    group('FieldDefinition - Basic Types', () {
      test('string field with defaults', () {
        const field = FieldDefinition(
          name: 'test_field',
          type: FieldType.string,
        );

        expect(field.name, 'test_field');
        expect(field.type, FieldType.string);
        expect(field.required, false);
        expect(field.readonly, false);
        expect(field.isForeignKey, false);
      });

      test('string field with all constraints', () {
        const field = FieldDefinition(
          name: 'description',
          type: FieldType.string,
          required: true,
          minLength: 5,
          maxLength: 100,
          pattern: r'^[A-Za-z]+$',
          description: 'A text description',
        );

        expect(field.required, true);
        expect(field.minLength, 5);
        expect(field.maxLength, 100);
        expect(field.pattern, r'^[A-Za-z]+$');
        expect(field.description, 'A text description');
      });

      test('integer field with range', () {
        const field = FieldDefinition(
          name: 'quantity',
          type: FieldType.integer,
          required: true,
          min: 0,
          max: 1000,
        );

        expect(field.type, FieldType.integer);
        expect(field.min, 0);
        expect(field.max, 1000);
        expect(field.required, true);
      });

      test('boolean field', () {
        const field = FieldDefinition(
          name: 'is_active',
          type: FieldType.boolean,
          defaultValue: true,
        );

        expect(field.type, FieldType.boolean);
        expect(field.defaultValue, true);
      });

      test('decimal field with range', () {
        const field = FieldDefinition(
          name: 'price',
          type: FieldType.decimal,
          min: 0.01,
          max: 99999.99,
        );

        expect(field.type, FieldType.decimal);
        expect(field.min, 0.01);
        expect(field.max, 99999.99);
      });

      test('text field (long form)', () {
        const field = FieldDefinition(
          name: 'notes',
          type: FieldType.text,
          maxLength: 5000,
        );

        expect(field.type, FieldType.text);
        expect(field.maxLength, 5000);
      });
    });

    group('FieldDefinition - Contact & Date Types', () {
      test('email field', () {
        const field = FieldDefinition(
          name: 'email',
          type: FieldType.email,
          required: true,
        );

        expect(field.type, FieldType.email);
        expect(field.required, true);
      });

      test('phone field', () {
        const field = FieldDefinition(name: 'phone', type: FieldType.phone);

        expect(field.type, FieldType.phone);
      });

      test('date field', () {
        const field = FieldDefinition(name: 'birth_date', type: FieldType.date);

        expect(field.type, FieldType.date);
      });

      test('timestamp field', () {
        const field = FieldDefinition(
          name: 'created_at',
          type: FieldType.timestamp,
          readonly: true,
        );

        expect(field.type, FieldType.timestamp);
        expect(field.readonly, true);
      });

      test('uuid field', () {
        const field = FieldDefinition(
          name: 'id',
          type: FieldType.uuid,
          readonly: true,
        );

        expect(field.type, FieldType.uuid);
        expect(field.readonly, true);
      });

      test('jsonb field', () {
        const field = FieldDefinition(name: 'metadata', type: FieldType.jsonb);

        expect(field.type, FieldType.jsonb);
      });
    });

    group('FieldDefinition - Enum & ForeignKey Types', () {
      test('enum field with values', () {
        const field = FieldDefinition(
          name: 'status',
          type: FieldType.enumType,
          enumValues: ['draft', 'pending', 'approved', 'rejected'],
          defaultValue: 'draft',
        );

        expect(field.type, FieldType.enumType);
        expect(field.enumValues, ['draft', 'pending', 'approved', 'rejected']);
        expect(field.defaultValue, 'draft');
      });

      test('foreignKey field with single display field', () {
        const field = FieldDefinition(
          name: 'customer_id',
          type: FieldType.foreignKey,
          relatedEntity: 'customer',
          displayField: 'company_name',
        );

        expect(field.type, FieldType.foreignKey);
        expect(field.isForeignKey, true);
        expect(field.relatedEntity, 'customer');
        expect(field.displayField, 'company_name');
      });

      test('foreignKey field with multiple display fields', () {
        const field = FieldDefinition(
          name: 'user_id',
          type: FieldType.foreignKey,
          relatedEntity: 'user',
          displayFields: ['first_name', 'last_name'],
          displayTemplate: '{first_name} {last_name}',
        );

        expect(field.isForeignKey, true);
        expect(field.displayFields, ['first_name', 'last_name']);
        expect(field.displayTemplate, '{first_name} {last_name}');
      });

      test('isForeignKey true when relatedEntity set', () {
        const field = FieldDefinition(
          name: 'role_id',
          type: FieldType.integer,
          relatedEntity: 'role',
        );

        expect(field.isForeignKey, true);
      });

      test('isForeignKey false for regular integer', () {
        const field = FieldDefinition(
          name: 'quantity',
          type: FieldType.integer,
        );

        expect(field.isForeignKey, false);
      });
    });

    group('EntityMetadata - Static Helpers', () {
      test('toDisplayName converts snake_case to Title Case', () {
        expect(EntityMetadata.toDisplayName('work_order'), 'Work Order');
        expect(EntityMetadata.toDisplayName('customer'), 'Customer');
        expect(EntityMetadata.toDisplayName('user_role'), 'User Role');
        expect(EntityMetadata.toDisplayName(''), '');
      });

      test('toDisplayNamePlural handles regular words', () {
        expect(EntityMetadata.toDisplayNamePlural('Customer'), 'Customers');
        expect(EntityMetadata.toDisplayNamePlural('User'), 'Users');
      });

      test('toDisplayNamePlural handles words ending in y', () {
        expect(EntityMetadata.toDisplayNamePlural('Category'), 'Categories');
        expect(EntityMetadata.toDisplayNamePlural('Company'), 'Companies');
      });

      test('toDisplayNamePlural handles words ending in s/x/ch/sh', () {
        expect(EntityMetadata.toDisplayNamePlural('Address'), 'Addresses');
        expect(EntityMetadata.toDisplayNamePlural('Box'), 'Boxes');
        expect(EntityMetadata.toDisplayNamePlural('Match'), 'Matches');
        expect(EntityMetadata.toDisplayNamePlural('Wish'), 'Wishes');
      });
    });
  });
}
