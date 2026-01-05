/// Enum Parity Tests
///
/// Validates that enum values in EntityMetadata match the canonical definitions
/// in validation-rules.json. This catches drift when backend adds/removes enum
/// values without updating the frontend.
///
/// Zero per-entity code: all assertions are generated from metadata + config.
library;

import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/services/entity_metadata.dart';

import '../factory/factory.dart';

void main() {
  late Map<String, dynamic> validationRules;

  setUpAll(() async {
    await EntityTestRegistry.ensureInitialized();

    // Load validation-rules.json from assets
    final jsonString = await rootBundle.loadString(
      'assets/config/validation-rules.json',
    );
    validationRules = json.decode(jsonString) as Map<String, dynamic>;
  });

  group('Enum Parity', () {
    /// Maps entity status field names to validation-rules.json field keys.
    /// This is the ONLY mapping needed - everything else is data-driven.
    const statusFieldMappings = <String, String>{
      'user': 'user_status',
      'role': 'role_status',
      'customer': 'customer_status',
      'technician': 'technician_status',
      'work_order': 'work_order_status',
      'invoice': 'invoice_status',
      'contract': 'contract_status',
      'inventory': 'inventory_status',
    };

    test('status enum values match validation-rules.json for all entities', () {
      for (final entry in statusFieldMappings.entries) {
        final entityName = entry.key;
        final validationKey = entry.value;

        // Get entity metadata
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
        expect(
          statusField.enumValues,
          isNotNull,
          reason: '$entityName.status should have enumValues',
        );

        // Get validation rules definition
        final fields = validationRules['fields'] as Map<String, dynamic>?;
        expect(
          fields,
          isNotNull,
          reason: 'validation-rules.json should have fields section',
        );

        final validationField = fields![validationKey] as Map<String, dynamic>?;
        expect(
          validationField,
          isNotNull,
          reason: 'validation-rules.json should define $validationKey',
        );

        final validationValues = (validationField!['enum'] as List<dynamic>?)
            ?.cast<String>()
            .toSet();
        expect(
          validationValues,
          isNotNull,
          reason: '$validationKey should have enum values',
        );

        // Compare values
        final metadataValues = statusField.enumValues!.toSet();

        expect(
          metadataValues,
          equals(validationValues),
          reason:
              '$entityName.status values should match $validationKey. '
              'Metadata: $metadataValues, Validation: $validationValues',
        );
      }
    });

    test('work_order.priority matches validation-rules.json if defined', () {
      final metadata = EntityTestRegistry.get('work_order');
      final priorityField = metadata.fields['priority'];

      // Skip if work_order doesn't have priority field or isn't enum type
      if (priorityField == null || priorityField.type != FieldType.enumType) {
        return;
      }

      final fields = validationRules['fields'] as Map<String, dynamic>?;
      final priorityValidation = fields?['priority'] as Map<String, dynamic>?;

      if (priorityValidation != null && priorityValidation['enum'] != null) {
        final validationValues = (priorityValidation['enum'] as List<dynamic>)
            .cast<String>()
            .toSet();
        final metadataValues = priorityField.enumValues?.toSet() ?? <String>{};

        expect(
          metadataValues,
          equals(validationValues),
          reason:
              'work_order.priority values should match validation-rules.json',
        );
      }
    });

    // NOTE: Tests for enum field non-empty and default validity are in
    // field_parity_test.dart (internal consistency). This file tests
    // VALUE PARITY with validation-rules.json (external config matching).

    test('all enum values follow snake_case convention (backend parity)', () {
      // Backend validation-rules.json uses snake_case for all enum values
      for (final entityName in EntityTestRegistry.allEntityNames) {
        final metadata = EntityTestRegistry.get(entityName);
        final enumFields = metadata.fields.entries
            .where((e) => e.value.type == FieldType.enumType)
            .toList();

        for (final field in enumFields) {
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
  });
}
