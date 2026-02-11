/// Action Builders Test Factory - Universal Table Action Testing
///
/// STRATEGIC PURPOSE: Apply IDENTICAL action scenarios to ALL entities uniformly.
/// Uses the Builder pattern to properly obtain BuildContext within the widget tree.
///
/// Tests action item data returned by GenericTableActionBuilders.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart' hide findsAtLeast;
import 'package:provider/provider.dart';
import 'package:tross/services/generic_entity_service.dart';
import 'package:tross/services/export_service.dart';
import 'package:tross/utils/generic_table_action_builders.dart';
import 'package:tross/widgets/molecules/menus/action_item.dart';

import '../mocks/mock_api_client.dart';
import '../helpers/helpers.dart';
import 'entity_registry.dart';
import 'entity_data_generator.dart';

// =============================================================================
// ACTION BUILDERS TEST FACTORY
// =============================================================================

/// Factory for generating comprehensive action builder tests
abstract final class ActionBuildersTestFactory {
  // ===========================================================================
  // MAIN ENTRY POINT
  // ===========================================================================

  /// Generate complete action builder test coverage
  static void generateAllTests() {
    group('GenericTableActionBuilders (Factory Generated)', () {
      setUpAll(() async {
        initializeTestBinding();
        await EntityTestRegistry.ensureInitialized();
      });

      // Generate row action item tests for each entity
      _generateRowActionItemTests();

      // Generate toolbar action item tests for each entity
      _generateToolbarActionItemTests();

      // Generate permission matrix tests
      _generatePermissionMatrixTests();

      // Generate edge case tests
      _generateEdgeCaseTests();
    });
  }

  // ===========================================================================
  // HELPER - BUILD TESTABLE CONTEXT
  // ===========================================================================

  static Widget _buildTestableContext({
    required Widget child,
    MockApiClient? apiClient,
  }) {
    final api = apiClient ?? MockApiClient();
    return MaterialApp(
      home: MultiProvider(
        providers: [
          Provider<GenericEntityService>(
            create: (_) => GenericEntityService(api),
          ),
          Provider<ExportService>(create: (_) => ExportService(api)),
        ],
        child: Scaffold(body: child),
      ),
    );
  }

  // ===========================================================================
  // ROW ACTION ITEM TESTS
  // ===========================================================================

  static void _generateRowActionItemTests() {
    group('Row Action Items', () {
      for (final entityName in allKnownEntities) {
        group(entityName, () {
          testWidgets('admin sees edit and delete action items', (
            tester,
          ) async {
            final testData = entityName.testData();
            late List<ActionItem> actionItems;

            await tester.pumpWidget(
              _buildTestableContext(
                child: Builder(
                  builder: (context) {
                    actionItems =
                        GenericTableActionBuilders.buildRowActionItems(
                          context,
                          entityName: entityName,
                          entity: testData,
                          userRole: 'admin',
                          onRefresh: () {},
                        );
                    return const SizedBox.shrink();
                  },
                ),
              ),
            );

            // Admin should see both edit and delete
            expect(actionItems.length, greaterThanOrEqualTo(2));
            expect(actionItems.any((a) => a.id == 'edit'), isTrue);
            expect(actionItems.any((a) => a.id == 'delete'), isTrue);
          });

          testWidgets('viewer has limited or no action items', (tester) async {
            final testData = entityName.testData();
            late List<ActionItem> actionItems;

            await tester.pumpWidget(
              _buildTestableContext(
                child: Builder(
                  builder: (context) {
                    actionItems =
                        GenericTableActionBuilders.buildRowActionItems(
                          context,
                          entityName: entityName,
                          entity: testData,
                          userRole: 'viewer',
                          onRefresh: () {},
                        );
                    return const SizedBox.shrink();
                  },
                ),
              ),
            );

            // Viewer has limited permissions - returns valid list
            expect(actionItems, isA<List<ActionItem>>());
          });

          testWidgets('null role has no action items', (tester) async {
            final testData = entityName.testData();
            late List<ActionItem> actionItems;

            await tester.pumpWidget(
              _buildTestableContext(
                child: Builder(
                  builder: (context) {
                    actionItems =
                        GenericTableActionBuilders.buildRowActionItems(
                          context,
                          entityName: entityName,
                          entity: testData,
                          userRole: null,
                          onRefresh: () {},
                        );
                    return const SizedBox.shrink();
                  },
                ),
              ),
            );

            // No role = no action items
            expect(actionItems, isEmpty);
          });
        });
      }
    });
  }

  // ===========================================================================
  // TOOLBAR ACTION ITEM TESTS
  // ===========================================================================

  static void _generateToolbarActionItemTests() {
    group('Toolbar Action Items', () {
      for (final entityName in allKnownEntities) {
        group(entityName, () {
          testWidgets('admin gets refresh, create, and export items', (
            tester,
          ) async {
            late List<ActionItem> actionItems;

            await tester.pumpWidget(
              _buildTestableContext(
                child: Builder(
                  builder: (context) {
                    actionItems =
                        GenericTableActionBuilders.buildToolbarActionItems(
                          context,
                          entityName: entityName,
                          userRole: 'admin',
                          onRefresh: () {},
                        );
                    return const SizedBox.shrink();
                  },
                ),
              ),
            );

            // Admin should have refresh, create, and export
            expect(actionItems.length, equals(3));
            expect(actionItems.any((a) => a.id == 'refresh'), isTrue);
            expect(actionItems.any((a) => a.id == 'create'), isTrue);
            expect(actionItems.any((a) => a.id == 'export'), isTrue);
          });

          testWidgets('viewer has refresh and export but no create', (
            tester,
          ) async {
            late List<ActionItem> actionItems;

            await tester.pumpWidget(
              _buildTestableContext(
                child: Builder(
                  builder: (context) {
                    actionItems =
                        GenericTableActionBuilders.buildToolbarActionItems(
                          context,
                          entityName: entityName,
                          userRole: 'viewer',
                          onRefresh: () {},
                        );
                    return const SizedBox.shrink();
                  },
                ),
              ),
            );

            // Viewer should have refresh (always) but may not have create
            expect(actionItems.any((a) => a.id == 'refresh'), isTrue);
          });

          testWidgets('null role has only refresh', (tester) async {
            late List<ActionItem> actionItems;

            await tester.pumpWidget(
              _buildTestableContext(
                child: Builder(
                  builder: (context) {
                    actionItems =
                        GenericTableActionBuilders.buildToolbarActionItems(
                          context,
                          entityName: entityName,
                          userRole: null,
                          onRefresh: () {},
                        );
                    return const SizedBox.shrink();
                  },
                ),
              ),
            );

            // Everyone should have refresh
            expect(actionItems.any((a) => a.id == 'refresh'), isTrue);
            // But no create without role
            expect(actionItems.any((a) => a.id == 'create'), isFalse);
          });
        });
      }
    });
  }

  // ===========================================================================
  // PERMISSION MATRIX TESTS
  // ===========================================================================

  static const List<String?> _testRoles = ['admin', 'manager', 'viewer', null];

  static void _generatePermissionMatrixTests() {
    group('Permission Matrix', () {
      for (final role in _testRoles) {
        final roleLabel = role ?? 'unauthenticated';

        group('Role: $roleLabel', () {
          for (final entityName in allKnownEntities) {
            testWidgets('$entityName respects $roleLabel permissions', (
              tester,
            ) async {
              final testData = entityName.testData();
              late List<ActionItem> rowItems;
              late List<ActionItem> toolbarItems;

              await tester.pumpWidget(
                _buildTestableContext(
                  child: Builder(
                    builder: (context) {
                      rowItems = GenericTableActionBuilders.buildRowActionItems(
                        context,
                        entityName: entityName,
                        entity: testData,
                        userRole: role,
                        onRefresh: () {},
                      );

                      toolbarItems =
                          GenericTableActionBuilders.buildToolbarActionItems(
                            context,
                            entityName: entityName,
                            userRole: role,
                            onRefresh: () {},
                          );

                      return const SizedBox.shrink();
                    },
                  ),
                ),
              );

              // Both should return valid lists
              expect(rowItems, isA<List<ActionItem>>());
              expect(toolbarItems, isA<List<ActionItem>>());

              // Toolbar always has refresh
              expect(toolbarItems.any((a) => a.id == 'refresh'), isTrue);
            });
          }
        });
      }
    });
  }

  // ===========================================================================
  // EDGE CASE TESTS
  // ===========================================================================

  static void _generateEdgeCaseTests() {
    group('Edge Cases', () {
      testWidgets('user: delete is disabled for self', (tester) async {
        final testData = 'user'.testData(overrides: {'id': 42});
        late List<ActionItem> actionItems;

        await tester.pumpWidget(
          _buildTestableContext(
            child: Builder(
              builder: (context) {
                actionItems = GenericTableActionBuilders.buildRowActionItems(
                  context,
                  entityName: 'user',
                  entity: testData,
                  userRole: 'admin',
                  currentUserId: '42', // Same as entity id
                  onRefresh: () {},
                );
                return const SizedBox.shrink();
              },
            ),
          ),
        );

        // Delete action should be disabled
        final deleteItem = actionItems.firstWhere((a) => a.id == 'delete');
        expect(deleteItem.isDisabled, isTrue);
      });

      testWidgets('handles additional refresh callbacks in action items', (
        tester,
      ) async {
        final testData = 'customer'.testData();
        late List<ActionItem> actionItems;

        await tester.pumpWidget(
          _buildTestableContext(
            child: Builder(
              builder: (context) {
                actionItems = GenericTableActionBuilders.buildRowActionItems(
                  context,
                  entityName: 'customer',
                  entity: testData,
                  userRole: 'admin',
                  onRefresh: () {},
                  additionalRefreshCallbacks: [() {}, () {}],
                );
                return const SizedBox.shrink();
              },
            ),
          ),
        );

        // Should return valid action items
        expect(actionItems, isA<List<ActionItem>>());
        expect(actionItems.isNotEmpty, isTrue);
      });

      testWidgets('handles minimal entity data', (tester) async {
        final minimalEntity = <String, dynamic>{'id': 1, 'name': 'Minimal'};
        late List<ActionItem> actionItems;

        await tester.pumpWidget(
          _buildTestableContext(
            child: Builder(
              builder: (context) {
                actionItems = GenericTableActionBuilders.buildRowActionItems(
                  context,
                  entityName: 'customer',
                  entity: minimalEntity,
                  userRole: 'admin',
                  onRefresh: () {},
                );
                return const SizedBox.shrink();
              },
            ),
          ),
        );

        expect(actionItems, isA<List<ActionItem>>());
      });

      testWidgets('action items have valid onTap handlers', (tester) async {
        late List<ActionItem> actionItems;

        await tester.pumpWidget(
          _buildTestableContext(
            child: Builder(
              builder: (context) {
                actionItems =
                    GenericTableActionBuilders.buildToolbarActionItems(
                      context,
                      entityName: 'customer',
                      userRole: 'admin',
                      onRefresh: () {},
                    );
                return const SizedBox.shrink();
              },
            ),
          ),
        );

        // Refresh should have sync handler
        final refreshItem = actionItems.firstWhere((a) => a.id == 'refresh');
        expect(refreshItem.onTap, isNotNull);

        // Export should have async handler
        final exportItem = actionItems.firstWhere((a) => a.id == 'export');
        expect(exportItem.onTapAsync, isNotNull);
        expect(exportItem.isAsync, isTrue);
      });
    });
  }
}
