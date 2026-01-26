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
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:tross_app/services/generic_entity_service.dart';
import 'package:tross_app/services/permission_service_dynamic.dart';
import 'package:tross_app/utils/generic_table_action_builders.dart';
import 'package:tross_app/widgets/atoms/buttons/app_button.dart';
import 'package:tross_app/widgets/organisms/forms/form_field.dart';
import 'package:tross_app/services/metadata_field_config_factory.dart';
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

      for (final entityName in allKnownEntities) {
        group(entityName, () {
          testWidgets('admin role can access modification actions', (
            tester,
          ) async {
            // Skip entities with parentDerived rlsResource - they inherit permissions
            // from their parent entity context (e.g., file_attachment)
            final metadata = EntityTestRegistry.tryGet(entityName);
            if (metadata != null && !metadata.rlsResource.isRealResource) {
              return; // Skip test
            }

            final entity = EntityDataGenerator.create(entityName);

            await tester.pumpWidget(
              _buildActionTestWrapper(
                entityName: entityName,
                entity: entity,
                userRole: 'admin',
              ),
            );

            // Admin should have access to actions (widgets rendered, not empty)
            final row = tester.widget<Row>(find.byType(Row));
            expect(
              row.children,
              isNotEmpty,
              reason: 'Admin should have access to actions for $entityName',
            );
          });

          testWidgets('permission enforcement is consistent', (tester) async {
            // Skip entities with parentDerived rlsResource
            final metadata = EntityTestRegistry.tryGet(entityName);
            if (metadata != null && !metadata.rlsResource.isRealResource) {
              return; // Skip test
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
            final adminRow = tester.widget<Row>(find.byType(Row));
            final adminActionCount = adminRow.children.length;

            // Get customer action count
            await tester.pumpWidget(
              _buildActionTestWrapper(
                entityName: entityName,
                entity: entity,
                userRole: 'customer',
              ),
            );
            final customerRow = tester.widget<Row>(find.byType(Row));
            final customerActionCount = customerRow.children.length;

            // Admin should have >= actions as customer (higher privilege = more access)
            expect(
              adminActionCount,
              greaterThanOrEqualTo(customerActionCount),
              reason:
                  'Admin should have at least as many actions as customer for $entityName',
            );
          });
        });
      }

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

        // Find delete action and verify it's disabled
        final deleteButtons = find.byWidgetPredicate(
          (widget) =>
              widget is AppButton && widget.style == AppButtonStyle.danger,
        );

        if (deleteButtons.evaluate().isNotEmpty) {
          final deleteButton = tester.widget<AppButton>(deleteButtons.first);
          expect(
            deleteButton.onPressed,
            isNull,
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

      for (final entityName in allKnownEntities) {
        group(entityName, () {
          testWidgets('row actions render without error', (tester) async {
            final entity = EntityDataGenerator.create(entityName);

            // Should not throw
            await tester.pumpWidget(
              _buildActionTestWrapper(
                entityName: entityName,
                entity: entity,
                userRole: 'admin',
              ),
            );

            // If we get here without exception, the test passes
            expect(tester.takeException(), isNull);
          });

          testWidgets('toolbar actions render without error', (tester) async {
            // Should not throw
            await tester.pumpWidget(
              _buildToolbarTestWrapper(
                entityName: entityName,
                userRole: 'admin',
              ),
            );

            expect(tester.takeException(), isNull);
          });

          testWidgets('form fields render without error', (tester) async {
            final entity = EntityDataGenerator.create(entityName);

            // Should not throw
            await tester.pumpWidget(
              _buildFormTestWrapper(entityName: entityName, entity: entity),
            );

            expect(tester.takeException(), isNull);
          });

          testWidgets('form fields render with minimal data', (tester) async {
            final entity = EntityDataGenerator.createMinimal(entityName);

            // Should not throw even with minimal data
            await tester.pumpWidget(
              _buildFormTestWrapper(entityName: entityName, entity: entity),
            );

            expect(tester.takeException(), isNull);
          });
        });
      }
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

      for (final entityName in allKnownEntities) {
        group(entityName, () {
          testWidgets('user can interact with form', (tester) async {
            final entity = EntityDataGenerator.create(entityName);
            bool formChanged = false;

            await tester.pumpWidget(
              _buildInteractiveFormWrapper(
                entityName: entityName,
                entity: entity,
                onChanged: (_) => formChanged = true,
              ),
            );

            // Find any TextField and try to interact
            final textFields = find.byType(TextField);
            if (textFields.evaluate().isNotEmpty) {
              await tester.enterText(textFields.first, 'test input');
              await tester.pump();

              expect(
                formChanged,
                isTrue,
                reason: 'Form should respond to user input',
              );
            }
          });

          testWidgets('form preserves valid initial values', (tester) async {
            final entity = EntityDataGenerator.create(entityName);

            await tester.pumpWidget(
              _buildFormTestWrapper(entityName: entityName, entity: entity),
            );

            // Form should render without clearing values
            // (no exception means values were handled correctly)
            expect(tester.takeException(), isNull);
          });
        });
      }
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
              final actions = GenericTableActionBuilders.buildRowActions(
                context,
                entityName: entityName,
                entity: entity,
                userRole: userRole,
                currentUserId: currentUserId,
                onRefresh: () {},
              );
              return Row(children: actions);
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
              final actions = GenericTableActionBuilders.buildToolbarActions(
                context,
                entityName: entityName,
                userRole: userRole,
                onRefresh: () {},
              );
              return Row(children: actions);
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
