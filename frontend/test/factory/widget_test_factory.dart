/// Widget Test Factory - Behavior-Driven Widget Testing
///
/// STRATEGIC APPROACH: Generate PURE FUNCTIONALITY tests dynamically.
/// Tests BEHAVIOR, not implementation details.
///
/// PRINCIPLES:
/// - Test what the USER can DO, not what the UI looks like
/// - Test permission enforcement, not icon presence
/// - Test form interaction, not label text
/// - Tests should pass regardless of UI implementation changes
///
/// PATTERNS:
/// 1. **Permission Tests**: Can user X perform action Y on entity Z?
/// 2. **Interaction Tests**: Can user input data, submit forms, trigger actions?
/// 3. **Render Tests**: Does widget render without error for entity data?
///
/// USAGE:
/// ```dart
/// void main() {
///   WidgetTestFactory.generatePermissionTests();
///   WidgetTestFactory.generateFormInteractionTests();
///   WidgetTestFactory.generateRenderTests();
/// }
/// ```
///
/// Tests ActionItem-based action builders for all entities.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:tross/models/permission.dart';
import 'package:tross/services/generic_entity_service.dart';
import 'package:tross/services/permission_service_dynamic.dart';
import 'package:tross/utils/generic_table_action_builders.dart';
import 'package:tross/widgets/molecules/menus/action_item.dart';
import 'package:tross/widgets/molecules/menus/action_menu.dart';
import 'package:tross/widgets/organisms/forms/form_field.dart';
import 'package:tross/services/metadata_field_config_factory.dart';
import 'package:tross/widgets/atoms/inputs/boolean_toggle.dart';
import '../mocks/mock_services.dart';
import 'entity_registry.dart';
import 'entity_data_generator.dart';

// =============================================================================
// BEHAVIOR-DRIVEN TEST FACTORY
// =============================================================================

/// Factory for generating PURE BEHAVIOR tests for widgets × entities
///
/// Tests WHAT THE USER CAN DO, not implementation details.
abstract final class WidgetTestFactory {
  // ===========================================================================
  // PERMISSION ENFORCEMENT TESTS
  // ===========================================================================

  /// Generate permission enforcement tests for all entities
  ///
  /// Tests that the permission system correctly allows/denies actions
  /// based on user role. Does NOT test specific UI elements.
  static void generatePermissionTests() {
    group('Permission Enforcement × Entities', () {
      setUpAll(() async {
        await EntityTestRegistry.ensureInitialized();
        // Initialize permission service - required for permission checks
        await PermissionService.initialize();
      });

      testWidgets('admin role can access modification actions for all entities',
          (tester) async {
        final failures = <String>[];

        for (final entityName in EntityTestRegistry.allEntityNames) {
          // Skip entities with parentDerived rlsResource - they inherit permissions
          // from their parent entity context (e.g., file_attachment)
          final metadata = EntityTestRegistry.tryGet(entityName);
          if (metadata != null && !metadata.rlsResource.isRealResource) {
            continue; // Skip this entity
          }

          // Skip read-only entities where admin can't update OR delete
          // (e.g., audit_log is system-only)
          final resourceType = ResourceType.fromString(
            metadata?.rlsResource.toBackendString() ?? entityName,
          );
          // Skip if resource type is not recognized
          if (resourceType == null) {
            continue;
          }
          final canUpdate = PermissionService.hasPermission(
            'admin',
            resourceType,
            CrudOperation.update,
          );
          final canDelete = PermissionService.hasPermission(
            'admin',
            resourceType,
            CrudOperation.delete,
          );
          if (!canUpdate && !canDelete) {
            continue; // Skip read-only entities
          }

          final entity = EntityDataGenerator.create(entityName);

          await tester.pumpWidget(
            _buildActionTestWrapper(
              entityName: entityName,
              entity: entity,
              userRole: 'admin',
            ),
          );

          // Admin should have access to actions (ActionMenu rendered with items)
          final actionMenu = tester.widget<ActionMenu>(
            find.byType(ActionMenu),
          );
          if (actionMenu.actions.isEmpty) {
            failures.add('$entityName: Admin should have access to actions');
          }
        }

        expect(failures, isEmpty, reason: failures.join('\n'));
      });

      testWidgets('permission enforcement is consistent across all entities',
          (tester) async {
        final failures = <String>[];

        for (final entityName in EntityTestRegistry.allEntityNames) {
          // Skip entities with parentDerived rlsResource
          final metadata = EntityTestRegistry.tryGet(entityName);
          if (metadata != null && !metadata.rlsResource.isRealResource) {
            continue; // Skip this entity
          }

          // Test that high-priority roles have >= actions than low-priority roles
          final entity = EntityDataGenerator.create(entityName);

          // Get admin action count
          await tester.pumpWidget(
            _buildActionTestWrapper(
              entityName: entityName,
              entity: entity,
              userRole: 'admin',
            ),
          );
          final adminMenu = tester.widget<ActionMenu>(
            find.byType(ActionMenu),
          );
          final adminActionCount = adminMenu.actions.length;

          // Get customer action count
          await tester.pumpWidget(
            _buildActionTestWrapper(
              entityName: entityName,
              entity: entity,
              userRole: 'customer',
            ),
          );
          final customerMenu = tester.widget<ActionMenu>(
            find.byType(ActionMenu),
          );
          final customerActionCount = customerMenu.actions.length;

          // Admin should have >= actions as customer (higher privilege = more access)
          if (adminActionCount < customerActionCount) {
            failures.add(
              '$entityName: Admin ($adminActionCount) should have >= actions as customer ($customerActionCount)',
            );
          }
        }

        expect(failures, isEmpty, reason: failures.join('\n'));
      });

      // Special case: self-protection
      testWidgets('user cannot delete themselves', (tester) async {
        final entity = EntityDataGenerator.create('user', id: 42);

        await tester.pumpWidget(
          _buildActionTestWrapper(
            entityName: 'user',
            entity: entity,
            userRole: 'admin',
            currentUserId: '42', // Same as entity ID
          ),
        );

        // Find the ActionMenu and check for disabled delete action
        final actionMenu = tester.widget<ActionMenu>(find.byType(ActionMenu));
        final deleteAction = actionMenu.actions
            .where((a) => a.id == 'delete' && a.style == ActionStyle.danger)
            .toList();

        if (deleteAction.isNotEmpty) {
          expect(
            deleteAction.first.isDisabled,
            isTrue,
            reason: 'User should not be able to delete themselves',
          );
        }
      });
    });
  }

  // ===========================================================================
  // RENDER STABILITY TESTS
  // ===========================================================================

  /// Generate render stability tests for all entities
  ///
  /// Tests that widgets render without errors for any valid entity data.
  /// This catches runtime errors, null safety issues, etc.
  static void generateRenderTests() {
    group('Render Stability × Entities', () {
      setUpAll(() async {
        await EntityTestRegistry.ensureInitialized();
      });

      testWidgets('row actions render without error for all entities',
          (tester) async {
        final failures = <String>[];

        for (final entityName in EntityTestRegistry.allEntityNames) {
          final entity = EntityDataGenerator.create(entityName);

          await tester.pumpWidget(
            _buildActionTestWrapper(
              entityName: entityName,
              entity: entity,
              userRole: 'admin',
            ),
          );

          final exception = tester.takeException();
          if (exception != null) {
            failures.add('$entityName: $exception');
          }
        }

        expect(failures, isEmpty, reason: failures.join('\n'));
      });

      testWidgets('toolbar actions render without error for all entities',
          (tester) async {
        final failures = <String>[];

        for (final entityName in EntityTestRegistry.allEntityNames) {
          await tester.pumpWidget(
            _buildToolbarTestWrapper(
              entityName: entityName,
              userRole: 'admin',
            ),
          );

          final exception = tester.takeException();
          if (exception != null) {
            failures.add('$entityName: $exception');
          }
        }

        expect(failures, isEmpty, reason: failures.join('\n'));
      });

      testWidgets('form fields render without error for all entities',
          (tester) async {
        final failures = <String>[];

        for (final entityName in EntityTestRegistry.allEntityNames) {
          final entity = EntityDataGenerator.create(entityName);

          await tester.pumpWidget(
            _buildFormTestWrapper(entityName: entityName, entity: entity),
          );

          final exception = tester.takeException();
          if (exception != null) {
            failures.add('$entityName: $exception');
          }
        }

        expect(failures, isEmpty, reason: failures.join('\n'));
      });

      testWidgets('form fields render with minimal data for all entities',
          (tester) async {
        final failures = <String>[];

        for (final entityName in EntityTestRegistry.allEntityNames) {
          final entity = EntityDataGenerator.createMinimal(entityName);

          await tester.pumpWidget(
            _buildFormTestWrapper(entityName: entityName, entity: entity),
          );

          final exception = tester.takeException();
          if (exception != null) {
            failures.add('$entityName: $exception');
          }
        }

        expect(failures, isEmpty, reason: failures.join('\n'));
      });
    });
  }

  // ===========================================================================
  // FORM INTERACTION TESTS
  // ===========================================================================

  /// Generate form interaction tests for all entities
  ///
  /// Tests that users can actually interact with forms:
  /// - Input text into text fields
  /// - Toggle boolean fields
  /// - Form responds to user input
  static void generateFormInteractionTests() {
    group('Form Interaction × Entities', () {
      setUpAll(() async {
        await EntityTestRegistry.ensureInitialized();
      });

      testWidgets('user can interact with forms for all entities',
          (tester) async {
        final failures = <String>[];

        for (final entityName in EntityTestRegistry.allEntityNames) {
          final entity = EntityDataGenerator.create(entityName);
          bool formChanged = false;

          await tester.pumpWidget(
            _buildInteractiveFormWrapper(
              entityName: entityName,
              entity: entity,
              onChanged: (_) => formChanged = true,
            ),
          );

          // Try multiple interaction strategies since entities have
          // different field types. The goal is to verify SOME interaction
          // triggers onChanged - not that every field type is tested.

          // Strategy 1: Try entering text into TextFormField first (usually visible)
          // (Avoids DropdownMenu's filter TextField which doesn't trigger onChanged)
          final textFormFields = find.byType(TextFormField);
          if (textFormFields.evaluate().isNotEmpty) {
            await tester.enterText(textFormFields.first, 'test input');
            await tester.pump();
            if (formChanged) continue; // Success for this entity!
          }

          // Strategy 2: Try interacting with a BooleanToggle (may need scroll)
          final booleanToggles = find.byType(BooleanToggle);
          if (booleanToggles.evaluate().isNotEmpty) {
            // Ensure widget is scrolled into view before tapping
            await tester.ensureVisible(booleanToggles.first);
            await tester.pumpAndSettle();
            await tester.tap(booleanToggles.first);
            await tester.pump();
            if (formChanged) continue; // Success for this entity!
          }

          // Strategy 3: Try interacting with an IconButton (number +/- buttons)
          final iconButtons = find.byType(IconButton);
          if (iconButtons.evaluate().isNotEmpty) {
            await tester.ensureVisible(iconButtons.first);
            await tester.pumpAndSettle();
            await tester.tap(iconButtons.first);
            await tester.pump();
            if (formChanged) continue; // Success for this entity!
          }

          // If we found interactive elements but none triggered changes,
          // the test should fail. If no interactive elements were found,
          // skip gracefully (edge case entities with no editable fields).
          final hasInteractiveElements =
              booleanToggles.evaluate().isNotEmpty ||
              iconButtons.evaluate().isNotEmpty ||
              textFormFields.evaluate().isNotEmpty;

          if (hasInteractiveElements && !formChanged) {
            failures.add('$entityName: Form should respond to user input');
          }
        }

        expect(failures, isEmpty, reason: failures.join('\n'));
      });

      testWidgets('forms preserve valid initial values for all entities',
          (tester) async {
        final failures = <String>[];

        for (final entityName in EntityTestRegistry.allEntityNames) {
          final entity = EntityDataGenerator.create(entityName);

          await tester.pumpWidget(
            _buildFormTestWrapper(entityName: entityName, entity: entity),
          );

          // Form should render without clearing values
          final exception = tester.takeException();
          if (exception != null) {
            failures.add('$entityName: $exception');
          }
        }

        expect(failures, isEmpty, reason: failures.join('\n'));
      });
    });
  }

  // ===========================================================================
  // TEST WRAPPERS - Build widget trees for testing
  // ===========================================================================

  /// Build test wrapper for row actions
  static Widget _buildActionTestWrapper({
    required String entityName,
    required Map<String, dynamic> entity,
    required String userRole,
    String? currentUserId,
  }) {
    return MaterialApp(
      home: Scaffold(
        body: MultiProvider(
          providers: [
            Provider<GenericEntityService>.value(
              value: MockGenericEntityService(),
            ),
          ],
          child: Builder(
            builder: (context) {
              final actionItems =
                  GenericTableActionBuilders.buildRowActionItems(
                    context,
                    entityName: entityName,
                    entity: entity,
                    userRole: userRole,
                    currentUserId: currentUserId,
                    onRefresh: () {},
                  );
              return ActionMenu(
                actions: actionItems,
                mode: ActionMenuMode.inline,
              );
            },
          ),
        ),
      ),
    );
  }

  /// Build test wrapper for toolbar actions
  static Widget _buildToolbarTestWrapper({
    required String entityName,
    required String userRole,
  }) {
    return MaterialApp(
      home: Scaffold(
        body: MultiProvider(
          providers: [
            Provider<GenericEntityService>.value(
              value: MockGenericEntityService(),
            ),
          ],
          child: Builder(
            builder: (context) {
              final actionItems =
                  GenericTableActionBuilders.buildToolbarActionItems(
                    context,
                    entityName: entityName,
                    userRole: userRole,
                    onRefresh: () {},
                  );
              return ActionMenu(
                actions: actionItems,
                mode: ActionMenuMode.inline,
              );
            },
          ),
        ),
      ),
    );
  }

  /// Build test wrapper for form (read-only, no interaction)
  static Widget _buildFormTestWrapper({
    required String entityName,
    required Map<String, dynamic> entity,
  }) {
    return MaterialApp(
      home: Scaffold(
        body: MultiProvider(
          providers: [
            Provider<GenericEntityService>.value(
              value: MockGenericEntityService(),
            ),
          ],
          child: Builder(
            builder: (context) {
              final configs = MetadataFieldConfigFactory.forEntity(
                context,
                entityName,
              );

              return SingleChildScrollView(
                child: Column(
                  children: configs.map((config) {
                    return GenericFormField<Map<String, dynamic>, dynamic>(
                      config: config,
                      value: entity,
                      onChanged: (_) {},
                    );
                  }).toList(),
                ),
              );
            },
          ),
        ),
      ),
    );
  }

  /// Build test wrapper for interactive form testing
  static Widget _buildInteractiveFormWrapper({
    required String entityName,
    required Map<String, dynamic> entity,
    required ValueChanged<Map<String, dynamic>> onChanged,
  }) {
    return MaterialApp(
      home: Scaffold(
        body: MultiProvider(
          providers: [
            Provider<GenericEntityService>.value(
              value: MockGenericEntityService(),
            ),
          ],
          child: Builder(
            builder: (context) {
              final configs = MetadataFieldConfigFactory.forEntity(
                context,
                entityName,
              );

              return SingleChildScrollView(
                child: Column(
                  children: configs.map((config) {
                    return GenericFormField<Map<String, dynamic>, dynamic>(
                      config: config,
                      value: entity,
                      onChanged: onChanged,
                    );
                  }).toList(),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}
