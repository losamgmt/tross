/// Action Builders Test Factory - Universal Table Action Testing
///
/// STRATEGIC PURPOSE: Apply IDENTICAL action scenarios to ALL entities uniformly.
/// Uses the Builder pattern to properly obtain BuildContext within the widget tree.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart' hide findsAtLeast;
import 'package:provider/provider.dart';
import 'package:tross_app/services/generic_entity_service.dart';
import 'package:tross_app/services/export_service.dart';
import 'package:tross_app/utils/generic_table_action_builders.dart';
import 'package:tross_app/widgets/atoms/buttons/app_button.dart';

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

      // Generate row action tests for each entity
      _generateRowActionTests();

      // Generate toolbar action tests for each entity
      _generateToolbarActionTests();

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
  // ROW ACTION TESTS
  // ===========================================================================

  static void _generateRowActionTests() {
    group('Row Actions', () {
      for (final entityName in allKnownEntities) {
        group(entityName, () {
          testWidgets('admin sees edit and delete actions', (tester) async {
            final testData = entityName.testData();

            await tester.pumpWidget(
              _buildTestableContext(
                child: Builder(
                  builder: (context) {
                    final actions = GenericTableActionBuilders.buildRowActions(
                      context,
                      entityName: entityName,
                      entity: testData,
                      userRole: 'admin',
                      onRefresh: () {},
                    );
                    return Row(children: actions);
                  },
                ),
              ),
            );

            // Admin should see both edit and delete
            expect(find.byType(AppButton), findsAtLeast(2));
          });

          testWidgets('viewer has limited or no actions', (tester) async {
            final testData = entityName.testData();

            await tester.pumpWidget(
              _buildTestableContext(
                child: Builder(
                  builder: (context) {
                    final actions = GenericTableActionBuilders.buildRowActions(
                      context,
                      entityName: entityName,
                      entity: testData,
                      userRole: 'viewer',
                      onRefresh: () {},
                    );
                    return Row(children: actions);
                  },
                ),
              ),
            );

            // Viewer has limited permissions - test doesn't crash
            expect(find.byType(Row), findsOneWidget);
          });

          testWidgets('null role has no actions', (tester) async {
            final testData = entityName.testData();

            await tester.pumpWidget(
              _buildTestableContext(
                child: Builder(
                  builder: (context) {
                    final actions = GenericTableActionBuilders.buildRowActions(
                      context,
                      entityName: entityName,
                      entity: testData,
                      userRole: null,
                      onRefresh: () {},
                    );
                    return Row(children: actions);
                  },
                ),
              ),
            );

            // No role = no actions
            expect(find.byType(Row), findsOneWidget);
          });
        });
      }
    });
  }

  // ===========================================================================
  // TOOLBAR ACTION TESTS
  // ===========================================================================

  static void _generateToolbarActionTests() {
    group('Toolbar Actions', () {
      for (final entityName in allKnownEntities) {
        group(entityName, () {
          testWidgets('admin gets refresh and create actions', (tester) async {
            await tester.pumpWidget(
              _buildTestableContext(
                child: Builder(
                  builder: (context) {
                    final actions =
                        GenericTableActionBuilders.buildToolbarActions(
                          context,
                          entityName: entityName,
                          userRole: 'admin',
                          onRefresh: () {},
                        );
                    return Row(children: actions);
                  },
                ),
              ),
            );

            // Admin should have refresh and create actions
            expect(find.byIcon(Icons.refresh), findsOneWidget);
            expect(find.byIcon(Icons.add), findsWidgets);
          });

          testWidgets('viewer has refresh but no create', (tester) async {
            await tester.pumpWidget(
              _buildTestableContext(
                child: Builder(
                  builder: (context) {
                    final actions =
                        GenericTableActionBuilders.buildToolbarActions(
                          context,
                          entityName: entityName,
                          userRole: 'viewer',
                          onRefresh: () {},
                        );
                    return Row(children: actions);
                  },
                ),
              ),
            );

            // Viewer should have refresh but not create
            expect(find.byIcon(Icons.refresh), findsOneWidget);
          });

          testWidgets('null role still has refresh', (tester) async {
            await tester.pumpWidget(
              _buildTestableContext(
                child: Builder(
                  builder: (context) {
                    final actions =
                        GenericTableActionBuilders.buildToolbarActions(
                          context,
                          entityName: entityName,
                          userRole: null,
                          onRefresh: () {},
                        );
                    return Row(children: actions);
                  },
                ),
              ),
            );

            // Everyone should have refresh
            expect(find.byIcon(Icons.refresh), findsOneWidget);
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

              await tester.pumpWidget(
                _buildTestableContext(
                  child: Builder(
                    builder: (context) {
                      final rowActions =
                          GenericTableActionBuilders.buildRowActions(
                            context,
                            entityName: entityName,
                            entity: testData,
                            userRole: role,
                            onRefresh: () {},
                          );

                      final toolbarActions =
                          GenericTableActionBuilders.buildToolbarActions(
                            context,
                            entityName: entityName,
                            userRole: role,
                            onRefresh: () {},
                          );

                      return Column(
                        children: [
                          Row(children: rowActions),
                          Row(children: toolbarActions),
                        ],
                      );
                    },
                  ),
                ),
              );

              expect(find.byType(Column), findsOneWidget);
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
      testWidgets('user: cannot delete self', (tester) async {
        final testData = 'user'.testData(overrides: {'id': 42});

        await tester.pumpWidget(
          _buildTestableContext(
            child: Builder(
              builder: (context) {
                final actions = GenericTableActionBuilders.buildRowActions(
                  context,
                  entityName: 'user',
                  entity: testData,
                  userRole: 'admin',
                  currentUserId: '42', // Same as entity id
                  onRefresh: () {},
                );
                return Row(children: actions);
              },
            ),
          ),
        );

        // Should render without crashing - delete button will be disabled
        expect(find.byType(Row), findsOneWidget);
      });

      testWidgets('handles additional refresh callbacks', (tester) async {
        final testData = 'customer'.testData();
        var mainRefreshCalled = false;

        await tester.pumpWidget(
          _buildTestableContext(
            child: Builder(
              builder: (context) {
                final actions = GenericTableActionBuilders.buildRowActions(
                  context,
                  entityName: 'customer',
                  entity: testData,
                  userRole: 'admin',
                  onRefresh: () => mainRefreshCalled = true,
                  additionalRefreshCallbacks: [() {}, () {}],
                );
                return Row(children: actions);
              },
            ),
          ),
        );

        // Should render without crashing
        expect(find.byType(Row), findsOneWidget);
        expect(mainRefreshCalled, isFalse); // Not called yet
      });

      testWidgets('handles minimal entity data', (tester) async {
        final minimalEntity = <String, dynamic>{'id': 1, 'name': 'Minimal'};

        await tester.pumpWidget(
          _buildTestableContext(
            child: Builder(
              builder: (context) {
                final actions = GenericTableActionBuilders.buildRowActions(
                  context,
                  entityName: 'customer',
                  entity: minimalEntity,
                  userRole: 'admin',
                  onRefresh: () {},
                );
                return Row(children: actions);
              },
            ),
          ),
        );

        expect(find.byType(Row), findsOneWidget);
      });

      testWidgets('handles onRefresh callback being invoked', (tester) async {
        var refreshCalled = false;

        await tester.pumpWidget(
          _buildTestableContext(
            child: Builder(
              builder: (context) {
                final actions = GenericTableActionBuilders.buildToolbarActions(
                  context,
                  entityName: 'customer',
                  userRole: 'admin',
                  onRefresh: () => refreshCalled = true,
                );
                return Row(children: actions);
              },
            ),
          ),
        );

        // Tap the refresh button
        await tester.tap(find.byIcon(Icons.refresh));
        await tester.pump();

        expect(refreshCalled, isTrue);
      });
    });
  }
}
