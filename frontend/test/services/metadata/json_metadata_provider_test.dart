/// JsonMetadataProvider Unit Tests
///
/// Tests the metadata provider's ability to:
/// - Load and parse permissions.json
/// - Load and parse validation-rules.json
/// - Load and parse entity-metadata.json
/// - Return typed data structures
/// - Handle caching correctly
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/services/metadata/metadata.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late JsonMetadataProvider provider;

  setUp(() {
    provider = JsonMetadataProvider();
    provider.clearCache();
  });

  group('JsonMetadataProvider', () {
    // =========================================================================
    // Provider Properties
    // =========================================================================
    group('Provider Properties', () {
      test('isEditable returns false for JSON provider', () {
        expect(provider.isEditable, isFalse);
      });

      test('providerName identifies the implementation', () {
        expect(provider.providerName, 'JsonMetadataProvider');
      });
    });

    // =========================================================================
    // Permission Metadata
    // =========================================================================
    group('Permission Metadata', () {
      test('getRoles returns list of role names', () async {
        final roles = await provider.getRoles();

        expect(roles, isA<List<String>>());
        expect(roles, isNotEmpty);
        expect(roles, contains('admin'));
      });

      test('getRoleSummaries returns sorted by priority descending', () async {
        final summaries = await provider.getRoleSummaries();

        expect(summaries, isA<List<RoleSummary>>());
        expect(summaries, isNotEmpty);

        // First role should have highest priority
        if (summaries.length > 1) {
          expect(
            summaries.first.priority,
            greaterThanOrEqualTo(summaries.last.priority),
          );
        }
      });

      test('getRoleSummaries includes priority and description', () async {
        final summaries = await provider.getRoleSummaries();
        final admin = summaries.firstWhere((r) => r.name == 'admin');

        expect(admin.priority, isA<int>());
        expect(admin.priority, greaterThan(0));
        expect(admin.description, isA<String>());
        expect(admin.description, isNotEmpty);
      });

      test('getResources returns list of resource names', () async {
        final resources = await provider.getResources();

        expect(resources, isA<List<String>>());
        expect(resources, isNotEmpty);
        expect(resources, contains('users'));
      });

      test(
        'getResourceSummaries includes description and operations',
        () async {
          final summaries = await provider.getResourceSummaries();

          expect(summaries, isNotEmpty);
          final userResource = summaries.firstWhere((r) => r.name == 'users');
          expect(userResource.description, isNotEmpty);
          expect(userResource.operations, contains('read'));
        },
      );

      test('getPermissionMatrix returns matrix for valid resource', () async {
        final matrix = await provider.getPermissionMatrix('users');

        expect(matrix, isNotNull);
        expect(matrix!.entity, 'users');
        expect(matrix.roles, isNotEmpty);
        expect(matrix.operations, isNotEmpty);
        expect(matrix.permissions, isNotEmpty);
      });

      test('getPermissionMatrix returns null for unknown resource', () async {
        final matrix = await provider.getPermissionMatrix(
          'nonexistent_resource',
        );

        expect(matrix, isNull);
      });

      test('PermissionMatrix.hasPermission checks role×operation', () async {
        final matrix = await provider.getPermissionMatrix('users');

        expect(matrix, isNotNull);
        // Admin should have all permissions
        expect(matrix!.hasPermission('admin', 'read'), isTrue);
        expect(matrix.hasPermission('admin', 'create'), isTrue);
      });

      test('getAllPermissionMatrices returns map of all resources', () async {
        final matrices = await provider.getAllPermissionMatrices();

        expect(matrices, isA<Map<String, PermissionMatrix>>());
        expect(matrices, isNotEmpty);
        expect(matrices.containsKey('users'), isTrue);
      });

      test('getRawPermissions returns full JSON structure', () async {
        final raw = await provider.getRawPermissions();

        expect(raw, isA<Map<String, dynamic>>());
        expect(raw.containsKey('roles'), isTrue);
        expect(raw.containsKey('resources'), isTrue);
      });
    });

    // =========================================================================
    // Validation Metadata
    // =========================================================================
    group('Validation Metadata', () {
      test('getValidationFields returns list of field names', () async {
        final fields = await provider.getValidationFields();

        expect(fields, isA<List<String>>());
        expect(fields, isNotEmpty);
        expect(fields, contains('email'));
      });

      test('getFieldValidation returns validation for valid field', () async {
        final validation = await provider.getFieldValidation('email');

        expect(validation, isNotNull);
        expect(validation!.fieldName, 'email');
        expect(validation.type, 'string');
        expect(validation.required, isTrue);
      });

      test('getFieldValidation returns null for unknown field', () async {
        final validation = await provider.getFieldValidation(
          'nonexistent_field',
        );

        expect(validation, isNull);
      });

      test('FieldValidation.toDisplayMap formats for display', () async {
        final validation = await provider.getFieldValidation('email');

        expect(validation, isNotNull);
        final displayMap = validation!.toDisplayMap();

        expect(displayMap, isA<Map<String, String>>());
        expect(displayMap.containsKey('Type'), isTrue);
        expect(displayMap.containsKey('Required'), isTrue);
      });

      test('getAllFieldValidations returns map of all fields', () async {
        final validations = await provider.getAllFieldValidations();

        expect(validations, isA<Map<String, FieldValidation>>());
        expect(validations, isNotEmpty);
        expect(validations.containsKey('email'), isTrue);
      });

      test('getRawValidation returns full JSON structure', () async {
        final raw = await provider.getRawValidation();

        expect(raw, isA<Map<String, dynamic>>());
        expect(raw.containsKey('fields'), isTrue);
      });
    });

    // =========================================================================
    // Entity Metadata
    // =========================================================================
    group('Entity Metadata', () {
      test('getEntityNames returns list of entity names', () async {
        final entities = await provider.getEntityNames();

        expect(entities, isA<List<String>>());
        expect(entities, isNotEmpty);
        // Should filter out schema metadata keys
        expect(entities, isNot(contains(r'$schema')));
        expect(entities, isNot(contains('title')));
      });

      test('getRawEntityMetadata returns full JSON structure', () async {
        final raw = await provider.getRawEntityMetadata();

        expect(raw, isA<Map<String, dynamic>>());
        // Should contain at least one entity
        expect(raw.keys.where((k) => !k.startsWith(r'$')), isNotEmpty);
      });
    });

    // =========================================================================
    // Caching
    // =========================================================================
    group('Caching', () {
      test('clearCache resets cached data', () async {
        // Load data first
        await provider.getRoles();

        // Clear and reload
        provider.clearCache();

        // Should still work (reloads from source)
        final roles = await provider.getRoles();
        expect(roles, isNotEmpty);
      });

      test('reload refreshes all data', () async {
        // Load data first
        await provider.getRoles();

        // Reload all
        await provider.reload();

        // Should still work
        final roles = await provider.getRoles();
        expect(roles, isNotEmpty);
      });
    });
  });

  // ===========================================================================
  // Metadata Types Unit Tests
  // ===========================================================================
  group('Metadata Types', () {
    group('PermissionMatrix', () {
      test('hasPermission returns correct values', () {
        const matrix = PermissionMatrix(
          entity: 'test',
          roles: ['admin', 'user'],
          operations: ['read', 'write'],
          permissions: {
            'admin': {'read': true, 'write': true},
            'user': {'read': true, 'write': false},
          },
        );

        expect(matrix.hasPermission('admin', 'read'), isTrue);
        expect(matrix.hasPermission('admin', 'write'), isTrue);
        expect(matrix.hasPermission('user', 'read'), isTrue);
        expect(matrix.hasPermission('user', 'write'), isFalse);
        expect(matrix.hasPermission('unknown', 'read'), isFalse);
        expect(matrix.hasPermission('admin', 'unknown'), isFalse);
      });
    });

    group('EntityValidationRules', () {
      test('getField returns correct validation', () {
        const rules = EntityValidationRules(
          entity: 'test',
          fields: {
            'email': FieldValidation(
              fieldName: 'email',
              type: 'string',
              required: true,
            ),
            'name': FieldValidation(fieldName: 'name', type: 'string'),
          },
        );

        expect(rules.getField('email')?.required, isTrue);
        expect(rules.getField('name')?.required, isFalse);
        expect(rules.getField('unknown'), isNull);
      });

      test('requiredFields returns only required field names', () {
        const rules = EntityValidationRules(
          entity: 'test',
          fields: {
            'email': FieldValidation(
              fieldName: 'email',
              type: 'string',
              required: true,
            ),
            'name': FieldValidation(fieldName: 'name', type: 'string'),
            'phone': FieldValidation(
              fieldName: 'phone',
              type: 'string',
              required: true,
            ),
          },
        );

        final required = rules.requiredFields;
        expect(required, contains('email'));
        expect(required, contains('phone'));
        expect(required, isNot(contains('name')));
      });
    });

    group('FieldValidation', () {
      test('toDisplayMap includes all set properties', () {
        const validation = FieldValidation(
          fieldName: 'test',
          type: 'string',
          required: true,
          minLength: 5,
          maxLength: 100,
          pattern: r'^[a-z]+$',
          trim: true,
        );

        final display = validation.toDisplayMap();
        expect(display['Type'], 'string');
        expect(display['Required'], 'Yes');
        expect(display['Min Length'], '5');
        expect(display['Max Length'], '100');
        expect(display['Pattern'], r'^[a-z]+$');
        expect(display['Trim'], 'Yes');
      });

      test('toDisplayMap excludes unset properties', () {
        const validation = FieldValidation(fieldName: 'test', type: 'string');

        final display = validation.toDisplayMap();
        expect(display.containsKey('Min Length'), isFalse);
        expect(display.containsKey('Max Length'), isFalse);
        expect(display.containsKey('Pattern'), isFalse);
      });
    });

    group('RoleSummary', () {
      test('fromJson parses correctly', () {
        final summary = RoleSummary.fromJson('admin', {
          'priority': 5,
          'description': 'Full access',
        });

        expect(summary.name, 'admin');
        expect(summary.priority, 5);
        expect(summary.description, 'Full access');
      });
    });
  });
}
