/// Validation Scenario Tests
///
/// Tests that widgets handle invalid, malformed, and edge-case data gracefully.
/// These are "robustness" tests - they verify widgets don't crash on bad input.
///
/// Test categories:
/// - Missing required fields
/// - Null values where non-null expected
/// - Wrong data types (string where int expected, etc.)
/// - Boundary values (empty strings, very long strings, negative numbers)
/// - Invalid enum values
///
/// Zero per-entity code - all scenarios generated from metadata constraints.
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/services/entity_metadata.dart';
import 'package:tross_app/widgets/organisms/cards/entity_detail_card.dart';

import '../factory/factory.dart';
import '../helpers/helpers.dart';

void main() {
  setUpAll(() async {
    await EntityTestRegistry.ensureInitialized();
  });

  group('EntityDetailCard - Missing Fields', () {
    for (final entityName in allKnownEntities) {
      testWidgets('$entityName - renders with missing optional fields', (
        tester,
      ) async {
        final minimalData = EntityDataGenerator.createMinimal(entityName);
        final metadata = EntityTestRegistry.get(entityName);

        await pumpTestWidget(
          tester,
          EntityDetailCard(
            entityName: entityName,
            entity: minimalData,
            title: metadata.displayName,
          ),
          withProviders: true,
        );

        expect(find.text(metadata.displayName), findsWidgets);
        expect(tester.takeException(), isNull);
      });

      testWidgets('$entityName - renders with null field values', (
        tester,
      ) async {
        final metadata = EntityTestRegistry.get(entityName);
        final dataWithNulls = <String, dynamic>{'id': 1};
        for (final field in metadata.fields.entries) {
          if (field.key != 'id') {
            dataWithNulls[field.key] = null;
          }
        }

        await pumpTestWidget(
          tester,
          EntityDetailCard(
            entityName: entityName,
            entity: dataWithNulls,
            title: metadata.displayName,
          ),
          withProviders: true,
        );

        expect(find.text(metadata.displayName), findsWidgets);
        expect(tester.takeException(), isNull);
      });
    }
  });

  group('EntityDetailCard - Type Mismatches', () {
    for (final entityName in allKnownEntities) {
      testWidgets('$entityName - handles string in integer field', (
        tester,
      ) async {
        final metadata = EntityTestRegistry.get(entityName);

        // Find first integer field (not id)
        final intField = metadata.fields.entries
            .where((e) => e.value.type == FieldType.integer && e.key != 'id')
            .firstOrNull;

        if (intField == null) return; // Skip if no int fields

        final badData = EntityDataGenerator.createInvalidField(
          entityName,
          intField.key,
          'not_a_number',
        );

        await pumpTestWidget(
          tester,
          EntityDetailCard(
            entityName: entityName,
            entity: badData,
            title: metadata.displayName,
          ),
          withProviders: true,
        );

        expect(find.text(metadata.displayName), findsWidgets);
        expect(tester.takeException(), isNull);
      });

      testWidgets('$entityName - handles integer in string field', (
        tester,
      ) async {
        final metadata = EntityTestRegistry.get(entityName);

        // Find first string field
        final stringField = metadata.fields.entries
            .where((e) => e.value.type == FieldType.string)
            .firstOrNull;

        if (stringField == null) return; // Skip if no string fields

        final badData = EntityDataGenerator.createInvalidField(
          entityName,
          stringField.key,
          12345,
        );

        await pumpTestWidget(
          tester,
          EntityDetailCard(
            entityName: entityName,
            entity: badData,
            title: metadata.displayName,
          ),
          withProviders: true,
        );

        expect(find.text(metadata.displayName), findsWidgets);
        expect(tester.takeException(), isNull);
      });
    }
  });

  group('EntityDetailCard - Boundary Values', () {
    for (final entityName in allKnownEntities) {
      testWidgets('$entityName - handles empty string values', (tester) async {
        final metadata = EntityTestRegistry.get(entityName);

        final stringField = metadata.fields.entries
            .where((e) => e.value.type == FieldType.string)
            .firstOrNull;

        if (stringField == null) return;

        final dataWithEmpty = EntityDataGenerator.createInvalidField(
          entityName,
          stringField.key,
          '',
        );

        await pumpTestWidget(
          tester,
          EntityDetailCard(
            entityName: entityName,
            entity: dataWithEmpty,
            title: metadata.displayName,
          ),
          withProviders: true,
        );

        expect(find.text(metadata.displayName), findsWidgets);
        expect(tester.takeException(), isNull);
      });

      testWidgets('$entityName - handles very long string values', (
        tester,
      ) async {
        final metadata = EntityTestRegistry.get(entityName);

        final stringField = metadata.fields.entries
            .where((e) => e.value.type == FieldType.string)
            .firstOrNull;

        if (stringField == null) return;

        final longString = 'x' * 1500;
        final dataWithLong = EntityDataGenerator.createInvalidField(
          entityName,
          stringField.key,
          longString,
        );

        await pumpTestWidget(
          tester,
          EntityDetailCard(
            entityName: entityName,
            entity: dataWithLong,
            title: metadata.displayName,
          ),
          withProviders: true,
        );

        expect(find.text(metadata.displayName), findsWidgets);
        expect(tester.takeException(), isNull);
      });

      testWidgets('$entityName - handles negative numbers', (tester) async {
        final metadata = EntityTestRegistry.get(entityName);

        // Find numeric field that isn't id (FKs are separate type, so just exclude id)
        final numericField = metadata.fields.entries
            .where(
              (e) =>
                  (e.value.type == FieldType.integer ||
                      e.value.type == FieldType.decimal) &&
                  e.key != 'id',
            )
            .firstOrNull;

        if (numericField == null) return;

        final dataWithNegative = EntityDataGenerator.createInvalidField(
          entityName,
          numericField.key,
          -999,
        );

        await pumpTestWidget(
          tester,
          EntityDetailCard(
            entityName: entityName,
            entity: dataWithNegative,
            title: metadata.displayName,
          ),
          withProviders: true,
        );

        expect(find.text(metadata.displayName), findsWidgets);
        expect(tester.takeException(), isNull);
      });
    }
  });

  group('EntityDetailCard - Invalid Enums', () {
    for (final entityName in allKnownEntities) {
      testWidgets('$entityName - handles invalid enum value', (tester) async {
        final metadata = EntityTestRegistry.get(entityName);

        final enumField = metadata.fields.entries
            .where((e) => e.value.type == FieldType.enumType)
            .firstOrNull;

        if (enumField == null) return; // Skip entities without enums

        final badData = EntityDataGenerator.createInvalidField(
          entityName,
          enumField.key,
          'COMPLETELY_INVALID_ENUM_VALUE',
        );

        await pumpTestWidget(
          tester,
          EntityDetailCard(
            entityName: entityName,
            entity: badData,
            title: metadata.displayName,
          ),
          withProviders: true,
        );

        expect(find.text(metadata.displayName), findsWidgets);
        expect(tester.takeException(), isNull);
      });
    }
  });

  group('EntityDetailCard - Special Characters', () {
    for (final entityName in allKnownEntities) {
      testWidgets('$entityName - handles special characters', (tester) async {
        final metadata = EntityTestRegistry.get(entityName);

        final stringField = metadata.fields.entries
            .where((e) => e.value.type == FieldType.string)
            .firstOrNull;

        if (stringField == null) return;

        const specialChars = '<script>alert("xss")</script>&<>"\'';
        final dataWithSpecial = EntityDataGenerator.createInvalidField(
          entityName,
          stringField.key,
          specialChars,
        );

        await pumpTestWidget(
          tester,
          EntityDetailCard(
            entityName: entityName,
            entity: dataWithSpecial,
            title: metadata.displayName,
          ),
          withProviders: true,
        );

        expect(find.text(metadata.displayName), findsWidgets);
        expect(tester.takeException(), isNull);
      });

      testWidgets('$entityName - handles unicode/emoji', (tester) async {
        final metadata = EntityTestRegistry.get(entityName);

        final stringField = metadata.fields.entries
            .where((e) => e.value.type == FieldType.string)
            .firstOrNull;

        if (stringField == null) return;

        const unicodeString = '测试 🎉 тест العربية';
        final dataWithUnicode = EntityDataGenerator.createInvalidField(
          entityName,
          stringField.key,
          unicodeString,
        );

        await pumpTestWidget(
          tester,
          EntityDetailCard(
            entityName: entityName,
            entity: dataWithUnicode,
            title: metadata.displayName,
          ),
          withProviders: true,
        );

        expect(find.text(metadata.displayName), findsWidgets);
        expect(tester.takeException(), isNull);
      });
    }
  });

  group('EntityDetailCard - Empty Entity', () {
    for (final entityName in allKnownEntities) {
      testWidgets('$entityName - handles empty map', (tester) async {
        final metadata = EntityTestRegistry.get(entityName);

        await pumpTestWidget(
          tester,
          EntityDetailCard(
            entityName: entityName,
            entity: <String, dynamic>{},
            title: metadata.displayName,
          ),
          withProviders: true,
        );

        expect(find.text(metadata.displayName), findsWidgets);
        expect(tester.takeException(), isNull);
      });

      testWidgets('$entityName - handles map with only id', (tester) async {
        final metadata = EntityTestRegistry.get(entityName);

        await pumpTestWidget(
          tester,
          EntityDetailCard(
            entityName: entityName,
            entity: {'id': 1},
            title: metadata.displayName,
          ),
          withProviders: true,
        );

        expect(find.text(metadata.displayName), findsWidgets);
        expect(tester.takeException(), isNull);
      });
    }
  });
}
