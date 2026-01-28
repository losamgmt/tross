/// Permission Parity Tests
///
/// Validates that frontend ResourceType enum covers all resources defined in
/// permissions.json, and that permission structures are consistent.
/// This catches drift when backend adds new resources without frontend update.
///
/// Zero per-entity code: all assertions are generated from config.
library;

import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/models/permission.dart';

import '../factory/factory.dart';

void main() {
  late Map<String, dynamic> permissionsConfig;
  late Set<String> backendResources;

  setUpAll(() async {
    await EntityTestRegistry.ensureInitialized();

    // Load permissions.json from assets
    final jsonString = await rootBundle.loadString(
      'assets/config/permissions.json',
    );
    permissionsConfig = json.decode(jsonString) as Map<String, dynamic>;

    // Extract resource names from permissions.json
    final resources = permissionsConfig['resources'] as Map<String, dynamic>?;
    backendResources = resources?.keys.toSet() ?? <String>{};
  });

  group('Permission Parity', () {
    test('ResourceType covers all permissions.json resources', () {
      final frontendResources = ResourceType.values
          .map((r) => r.toBackendString())
          .toSet();

      for (final backendResource in backendResources) {
        expect(
          frontendResources.contains(backendResource),
          isTrue,
          reason:
              'ResourceType should include "$backendResource" from permissions.json',
        );
      }
    });

    test('no orphan ResourceType values (not in permissions.json)', () {
      // Only check real resources - parentDerived is a special marker
      final frontendResources = ResourceType.realResources
          .map((r) => r.toBackendString())
          .toSet();

      for (final frontendResource in frontendResources) {
        expect(
          backendResources.contains(frontendResource),
          isTrue,
          reason:
              'ResourceType "$frontendResource" not found in permissions.json. '
              'Remove from ResourceType or add to permissions.json.',
        );
      }
    });

    test(
      'all ResourceType values convert to valid snake_case backend strings',
      () {
        // Only check real resources - parentDerived uses underscore prefix intentionally
        for (final resource in ResourceType.realResources) {
          final backendString = resource.toBackendString();

          expect(
            backendString,
            isNotEmpty,
            reason: '$resource should have backend string',
          );
          expect(
            RegExp(r'^[a-z][a-z0-9_]*$').hasMatch(backendString),
            isTrue,
            reason:
                '$resource backend string "$backendString" should be snake_case',
          );
        }
      },
    );

    test('ResourceType.fromString round-trips correctly', () {
      for (final resource in ResourceType.values) {
        final backendString = resource.toBackendString();
        final parsed = ResourceType.fromString(backendString);

        expect(
          parsed,
          equals(resource),
          reason: 'fromString("$backendString") should return $resource',
        );
      }
    });

    test('ResourceType.fromString handles camelCase and snake_case input', () {
      final testCases = <String, ResourceType>{
        'workOrders': ResourceType.workOrders,
        'work_orders': ResourceType.workOrders,
        'auditLogs': ResourceType.auditLogs,
        'audit_logs': ResourceType.auditLogs,
        'savedViews': ResourceType.savedViews,
        'saved_views': ResourceType.savedViews,
        'adminPanel': ResourceType.adminPanel,
        'admin_panel': ResourceType.adminPanel,
        'systemSettings': ResourceType.systemSettings,
        'system_settings': ResourceType.systemSettings,
      };

      for (final entry in testCases.entries) {
        final parsed = ResourceType.fromString(entry.key);
        expect(
          parsed,
          equals(entry.value),
          reason: 'fromString("${entry.key}") should return ${entry.value}',
        );
      }
    });

    test('UserRole covers all permissions.json roles', () {
      final roles = permissionsConfig['roles'] as Map<String, dynamic>?;
      final backendRoles = roles?.keys.toSet() ?? <String>{};
      final frontendRoles = UserRole.values.map((r) => r.name).toSet();

      for (final backendRole in backendRoles) {
        expect(
          frontendRoles.contains(backendRole),
          isTrue,
          reason:
              'UserRole should include "$backendRole" from permissions.json',
        );
      }
    });

    test('UserRole priorities match permissions.json', () {
      final roles = permissionsConfig['roles'] as Map<String, dynamic>?;

      if (roles == null) return;

      for (final entry in roles.entries) {
        final roleName = entry.key;
        final roleConfig = entry.value as Map<String, dynamic>;
        final expectedPriority = roleConfig['priority'] as int?;

        if (expectedPriority == null) continue;

        final userRole = UserRole.fromString(roleName);
        expect(userRole, isNotNull, reason: 'UserRole should have $roleName');
        expect(
          userRole!.priority,
          equals(expectedPriority),
          reason: 'UserRole.$roleName priority should be $expectedPriority',
        );
      }
    });

    test('UserRole.fromString is case-insensitive', () {
      for (final role in UserRole.values) {
        final parsed = UserRole.fromString(role.name);
        expect(
          parsed,
          equals(role),
          reason: 'fromString should work for ${role.name}',
        );

        // Also test uppercase
        final upperParsed = UserRole.fromString(role.name.toUpperCase());
        expect(
          upperParsed,
          equals(role),
          reason: 'fromString should be case-insensitive',
        );
      }
    });

    test('all entity rlsResources exist in permissions.json', () {
      // Uses metadata.rlsResource directly - no hardcoded mapping needed
      for (final entityName in EntityTestRegistry.allEntityNames) {
        final metadata = EntityTestRegistry.get(entityName);
        final rlsResource = metadata.rlsResource;

        // Skip entities with parentDerived - they inherit permissions from parent
        if (!rlsResource.isRealResource) continue;

        final rlsResourceString = rlsResource.toBackendString();

        expect(
          backendResources.contains(rlsResourceString),
          isTrue,
          reason:
              'Entity "$entityName" rlsResource "$rlsResourceString" '
              'should exist in permissions.json',
        );
      }
    });

    test('all resources have required CRUD permissions', () {
      final resources = permissionsConfig['resources'] as Map<String, dynamic>?;
      if (resources == null) return;

      const requiredOps = ['create', 'read', 'update', 'delete'];

      for (final entry in resources.entries) {
        final resourceName = entry.key;
        final resourceConfig = entry.value as Map<String, dynamic>;
        final permissions =
            resourceConfig['permissions'] as Map<String, dynamic>?;

        expect(
          permissions,
          isNotNull,
          reason: 'Resource "$resourceName" should have permissions',
        );

        for (final op in requiredOps) {
          expect(
            permissions!.containsKey(op),
            isTrue,
            reason: 'Resource "$resourceName" should have "$op" permission',
          );

          final opConfig = permissions[op] as Map<String, dynamic>?;

          // minimumRole can be null for disabled operations (system-only, not available via API)
          final isDisabled = opConfig?['disabled'] == true;
          if (!isDisabled) {
            expect(
              opConfig?['minimumRole'],
              isNotNull,
              reason:
                  '$resourceName.$op should have minimumRole (unless disabled)',
            );
          }
          expect(
            opConfig?['minimumPriority'],
            isNotNull,
            reason: '$resourceName.$op should have minimumPriority',
          );
        }
      }
    });

    test('all resources have rowLevelSecurity for all roles', () {
      final resources = permissionsConfig['resources'] as Map<String, dynamic>?;
      if (resources == null) return;

      for (final entry in resources.entries) {
        final resourceName = entry.key;
        final resourceConfig = entry.value as Map<String, dynamic>;

        expect(
          resourceConfig.containsKey('rowLevelSecurity'),
          isTrue,
          reason: 'Resource "$resourceName" should have rowLevelSecurity',
        );

        final rls = resourceConfig['rowLevelSecurity'] as Map<String, dynamic>?;
        expect(
          rls,
          isNotNull,
          reason: '$resourceName rowLevelSecurity should not be null',
        );

        // Every role should have RLS defined
        for (final role in UserRole.values) {
          expect(
            rls!.containsKey(role.name),
            isTrue,
            reason: '$resourceName rowLevelSecurity should define ${role.name}',
          );
        }
      }
    });
  });
}
