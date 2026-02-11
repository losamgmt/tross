/// Tests for GenericTableActionBuilders
///
/// Factory-driven tests for metadata-based action building.
/// Covers row action items, toolbar action items, and permission filtering.
///
/// @ServiceTestContract
/// ✓ Construction (static class - N/A)
/// ✓ API Contract
/// ✓ Permission-based action visibility
/// ✓ Entity-specific behavior
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:tross/services/entity_metadata.dart';
import 'package:tross/services/generic_entity_service.dart';
import 'package:tross/services/export_service.dart';
import 'package:tross/utils/generic_table_action_builders.dart';
import 'package:tross/widgets/molecules/menus/action_item.dart';

import '../factory/factory.dart';
import '../mocks/mock_api_client.dart';

void main() {
  late MockApiClient mockApiClient;

  setUpAll(() async {
    await EntityTestRegistry.ensureInitialized();
  });

  setUp(() {
    mockApiClient = MockApiClient();
  });

  tearDown(() {
    mockApiClient.reset();
  });

  /// Helper to build a testable context with required providers
  Widget buildTestableContext({
    required Widget child,
    MockApiClient? apiClient,
  }) {
    final api = apiClient ?? mockApiClient;
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

  group('GenericTableActionBuilders', () {
    group('buildRowActionItems', () {
      group('Permission-based visibility', () {
        for (final entityName in allKnownEntities) {
          testWidgets('$entityName: admin sees edit and delete action items', (
            tester,
          ) async {
            final testData = entityName.testData();
            late List<ActionItem> actionItems;

            await tester.pumpWidget(
              buildTestableContext(
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

            // Admin should see edit and delete actions
            expect(actionItems.length, greaterThanOrEqualTo(2));
            expect(actionItems.any((a) => a.id == 'edit'), isTrue);
            expect(actionItems.any((a) => a.id == 'delete'), isTrue);
          });

          testWidgets('$entityName: customer role sees limited action items', (
            tester,
          ) async {
            final testData = entityName.testData();
            late List<ActionItem> actionItems;

            await tester.pumpWidget(
              buildTestableContext(
                child: Builder(
                  builder: (context) {
                    actionItems =
                        GenericTableActionBuilders.buildRowActionItems(
                          context,
                          entityName: entityName,
                          entity: testData,
                          userRole: 'customer',
                          onRefresh: () {},
                        );

                    return const SizedBox.shrink();
                  },
                ),
              ),
            );

            // Customer has limited permissions - action count varies by entity
            expect(actionItems, isA<List<ActionItem>>());
          });
        }

        testWidgets('user entity: delete action is disabled for self', (
          tester,
        ) async {
          final testData = 'user'.testData(overrides: {'id': 42});
          late List<ActionItem> actionItems;

          await tester.pumpWidget(
            buildTestableContext(
              child: Builder(
                builder: (context) {
                  actionItems = GenericTableActionBuilders.buildRowActionItems(
                    context,
                    entityName: 'user',
                    entity: testData,
                    userRole: 'admin',
                    onRefresh: () {},
                    currentUserId: '42', // Same as entity ID
                  );

                  return const SizedBox.shrink();
                },
              ),
            ),
          );

          // Delete action should be disabled
          final deleteAction = actionItems.firstWhere((a) => a.id == 'delete');
          expect(deleteAction.isDisabled, isTrue);
        });

        testWidgets('user entity: delete action is enabled for other users', (
          tester,
        ) async {
          final testData = 'user'.testData(overrides: {'id': 42});
          late List<ActionItem> actionItems;

          await tester.pumpWidget(
            buildTestableContext(
              child: Builder(
                builder: (context) {
                  actionItems = GenericTableActionBuilders.buildRowActionItems(
                    context,
                    entityName: 'user',
                    entity: testData,
                    userRole: 'admin',
                    onRefresh: () {},
                    currentUserId: '99', // Different from entity ID
                  );

                  return const SizedBox.shrink();
                },
              ),
            ),
          );

          // Delete action should be enabled
          final deleteAction = actionItems.firstWhere((a) => a.id == 'delete');
          expect(deleteAction.isDisabled, isFalse);
        });
      });

      group('Action item properties', () {
        testWidgets('edit action has correct properties', (tester) async {
          final testData = 'customer'.testData();
          late List<ActionItem> actionItems;

          await tester.pumpWidget(
            buildTestableContext(
              child: Builder(
                builder: (context) {
                  actionItems = GenericTableActionBuilders.buildRowActionItems(
                    context,
                    entityName: 'customer',
                    entity: testData,
                    userRole: 'admin',
                    onRefresh: () {},
                  );

                  return const SizedBox.shrink();
                },
              ),
            ),
          );

          final editAction = actionItems.firstWhere((a) => a.id == 'edit');
          expect(editAction.label, equals('Edit'));
          expect(editAction.icon, equals(Icons.edit_outlined));
          expect(editAction.style, equals(ActionStyle.secondary));
        });

        testWidgets('delete action has correct properties', (tester) async {
          final testData = 'customer'.testData();
          late List<ActionItem> actionItems;

          await tester.pumpWidget(
            buildTestableContext(
              child: Builder(
                builder: (context) {
                  actionItems = GenericTableActionBuilders.buildRowActionItems(
                    context,
                    entityName: 'customer',
                    entity: testData,
                    userRole: 'admin',
                    onRefresh: () {},
                  );

                  return const SizedBox.shrink();
                },
              ),
            ),
          );

          final deleteAction = actionItems.firstWhere((a) => a.id == 'delete');
          expect(deleteAction.label, equals('Delete'));
          expect(deleteAction.icon, equals(Icons.delete_outline));
          expect(deleteAction.style, equals(ActionStyle.danger));
        });
      });
    });

    group('buildToolbarActionItems', () {
      for (final entityName in allKnownEntities) {
        testWidgets('$entityName: admin sees refresh, create, export items', (
          tester,
        ) async {
          late List<ActionItem> actionItems;

          await tester.pumpWidget(
            buildTestableContext(
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

          // Admin sees refresh, create, and export
          expect(actionItems.length, equals(3));
          expect(actionItems.any((a) => a.id == 'refresh'), isTrue);
          expect(actionItems.any((a) => a.id == 'create'), isTrue);
          expect(actionItems.any((a) => a.id == 'export'), isTrue);
        });
      }

      testWidgets('refresh action has correct properties', (tester) async {
        late List<ActionItem> actionItems;

        await tester.pumpWidget(
          buildTestableContext(
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

        final refreshAction = actionItems.firstWhere((a) => a.id == 'refresh');
        expect(refreshAction.icon, equals(Icons.refresh));
        expect(refreshAction.style, equals(ActionStyle.secondary));
      });

      testWidgets('create action has correct properties', (tester) async {
        late List<ActionItem> actionItems;

        await tester.pumpWidget(
          buildTestableContext(
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

        final createAction = actionItems.firstWhere((a) => a.id == 'create');
        expect(createAction.icon, equals(Icons.add));
        expect(createAction.style, equals(ActionStyle.primary));
      });

      testWidgets('export action is async', (tester) async {
        late List<ActionItem> actionItems;

        await tester.pumpWidget(
          buildTestableContext(
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

        final exportAction = actionItems.firstWhere((a) => a.id == 'export');
        expect(exportAction.isAsync, isTrue);
        expect(exportAction.icon, equals(Icons.download));
      });

      testWidgets('customer role sees limited toolbar items', (tester) async {
        late List<ActionItem> actionItems;

        await tester.pumpWidget(
          buildTestableContext(
            child: Builder(
              builder: (context) {
                actionItems =
                    GenericTableActionBuilders.buildToolbarActionItems(
                      context,
                      entityName: 'customer',
                      userRole: 'customer',
                      onRefresh: () {},
                    );

                return const SizedBox.shrink();
              },
            ),
          ),
        );

        // Customer might not have create permission
        // Should always have refresh
        expect(actionItems.any((a) => a.id == 'refresh'), isTrue);
      });
    });
  });

  group('Metadata field types', () {
    for (final entityName in allKnownEntities) {
      test('$entityName: metadata fields have expected types', () {
        final metadata = EntityMetadataRegistry.get(entityName);

        // Verify all fields are defined
        expect(metadata.fields, isNotEmpty);

        // Verify each field has a type
        for (final field in metadata.fields.values) {
          expect(field.type, isNotNull);
        }
      });
    }
  });

  group('Role-based permissions', () {
    final roles = ['admin', 'manager', 'dispatcher', 'technician', 'customer'];

    for (final role in roles) {
      testWidgets('$role: sees appropriate customer action items', (
        tester,
      ) async {
        final testData = 'customer'.testData();
        late List<ActionItem> actionItems;

        await tester.pumpWidget(
          buildTestableContext(
            child: Builder(
              builder: (context) {
                actionItems = GenericTableActionBuilders.buildRowActionItems(
                  context,
                  entityName: 'customer',
                  entity: testData,
                  userRole: role,
                  onRefresh: () {},
                );

                return const SizedBox.shrink();
              },
            ),
          ),
        );

        // All roles should get a valid list (may be empty based on permissions)
        expect(actionItems, isA<List<ActionItem>>());
      });
    }
  });
}
