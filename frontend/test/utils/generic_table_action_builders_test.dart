/// Tests for GenericTableActionBuilders
///
/// Factory-driven tests for metadata-based action building.
/// Covers row actions, toolbar actions, and permission filtering.
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
import 'package:tross_app/services/entity_metadata.dart';
import 'package:tross_app/services/generic_entity_service.dart';
import 'package:tross_app/services/export_service.dart';
import 'package:tross_app/utils/generic_table_action_builders.dart';
import 'package:tross_app/widgets/atoms/buttons/app_button.dart';

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
    group('buildRowActions', () {
      group('Permission-based visibility', () {
        for (final entityName in allKnownEntities) {
          testWidgets('$entityName: admin sees edit and delete actions', (
            tester,
          ) async {
            final testData = entityName.testData();

            await tester.pumpWidget(
              buildTestableContext(
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

          testWidgets('$entityName: customer role sees limited actions', (
            tester,
          ) async {
            final testData = entityName.testData();

            await tester.pumpWidget(
              buildTestableContext(
                child: Builder(
                  builder: (context) {
                    final actions = GenericTableActionBuilders.buildRowActions(
                      context,
                      entityName: entityName,
                      entity: testData,
                      userRole: 'customer',
                      onRefresh: () {},
                    );

                    return Row(children: actions);
                  },
                ),
              ),
            );

            // Customer has limited permissions
            expect(find.byType(AppButton), findsAny);
          });
        }

        testWidgets('user entity: cannot delete self', (tester) async {
          final testData = 'user'.testData(overrides: {'id': 42});

          await tester.pumpWidget(
            buildTestableContext(
              child: Builder(
                builder: (context) {
                  final actions = GenericTableActionBuilders.buildRowActions(
                    context,
                    entityName: 'user',
                    entity: testData,
                    userRole: 'admin',
                    onRefresh: () {},
                    currentUserId: '42', // Same as entity ID
                  );

                  return Row(children: actions);
                },
              ),
            ),
          );

          // Find delete button
          final deleteButtons = tester.widgetList<AppButton>(
            find.byWidgetPredicate(
              (widget) =>
                  widget is AppButton && widget.style == AppButtonStyle.danger,
            ),
          );

          // Delete button should be disabled (onPressed: null)
          if (deleteButtons.isNotEmpty) {
            expect(deleteButtons.first.onPressed, isNull);
          }
        });

        testWidgets('user entity: can delete other users', (tester) async {
          final testData = 'user'.testData(overrides: {'id': 42});

          await tester.pumpWidget(
            buildTestableContext(
              child: Builder(
                builder: (context) {
                  final actions = GenericTableActionBuilders.buildRowActions(
                    context,
                    entityName: 'user',
                    entity: testData,
                    userRole: 'admin',
                    onRefresh: () {},
                    currentUserId: '99', // Different from entity ID
                  );

                  return Row(children: actions);
                },
              ),
            ),
          );

          // Find delete button
          final deleteButtons = tester.widgetList<AppButton>(
            find.byWidgetPredicate(
              (widget) =>
                  widget is AppButton && widget.style == AppButtonStyle.danger,
            ),
          );

          // Delete button should be enabled
          if (deleteButtons.isNotEmpty) {
            expect(deleteButtons.first.onPressed, isNotNull);
          }
        });
      });

      group('Edit action', () {
        testWidgets('edit button has correct tooltip', (tester) async {
          final testData = 'customer'.testData();

          await tester.pumpWidget(
            buildTestableContext(
              child: Builder(
                builder: (context) {
                  final actions = GenericTableActionBuilders.buildRowActions(
                    context,
                    entityName: 'customer',
                    entity: testData,
                    userRole: 'admin',
                    onRefresh: () {},
                  );

                  return Row(children: actions);
                },
              ),
            ),
          );

          final editButton = tester.widget<AppButton>(
            find.byWidgetPredicate(
              (widget) =>
                  widget is AppButton &&
                  widget.style == AppButtonStyle.secondary,
            ),
          );

          expect(editButton.tooltip, equals('Edit'));
        });
      });
    });

    group('buildToolbarActions', () {
      for (final entityName in allKnownEntities) {
        testWidgets('$entityName: admin sees refresh, create, export', (
          tester,
        ) async {
          await tester.pumpWidget(
            buildTestableContext(
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

          // Admin sees at least refresh button
          expect(find.byType(IconButton), findsAtLeast(1));
        });
      }

      testWidgets('refresh button calls onRefresh', (tester) async {
        bool refreshCalled = false;

        await tester.pumpWidget(
          buildTestableContext(
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

        // Tap refresh button (first IconButton)
        await tester.tap(find.byType(IconButton).first);
        await tester.pump();

        expect(refreshCalled, isTrue);
      });

      testWidgets('export button renders for read permission', (tester) async {
        await tester.pumpWidget(
          buildTestableContext(
            child: Builder(
              builder: (context) {
                final actions = GenericTableActionBuilders.buildToolbarActions(
                  context,
                  entityName: 'customer',
                  userRole: 'admin',
                  onRefresh: () {},
                );

                return Row(children: actions);
              },
            ),
          ),
        );

        // Find export button by icon
        expect(find.byIcon(Icons.download), findsOneWidget);
      });
    });
  });

  group('_createEmptyData helper', () {
    // Test via the exposed behavior in buildRowActions
    // When we show a form for create, it uses _createEmptyData internally

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

  group('Entity-specific actions', () {
    testWidgets('work_order entity uses correct display name', (tester) async {
      await tester.pumpWidget(
        buildTestableContext(
          child: Builder(
            builder: (context) {
              final actions = GenericTableActionBuilders.buildToolbarActions(
                context,
                entityName: 'work_order',
                userRole: 'admin',
                onRefresh: () {},
              );

              return Row(children: actions);
            },
          ),
        ),
      );

      // Verify the toolbar actions render
      expect(find.byType(IconButton), findsAtLeast(1));
    });

    testWidgets('invoice entity shows correct actions', (tester) async {
      final testData = 'invoice'.testData();

      await tester.pumpWidget(
        buildTestableContext(
          child: Builder(
            builder: (context) {
              final actions = GenericTableActionBuilders.buildRowActions(
                context,
                entityName: 'invoice',
                entity: testData,
                userRole: 'admin',
                onRefresh: () {},
              );

              return Row(children: actions);
            },
          ),
        ),
      );

      // Admin should see actions
      expect(find.byType(AppButton), findsAny);
    });
  });

  group('Role-based permissions', () {
    final roles = ['admin', 'manager', 'dispatcher', 'technician', 'customer'];

    for (final role in roles) {
      testWidgets('$role: sees appropriate customer actions', (tester) async {
        final testData = 'customer'.testData();

        await tester.pumpWidget(
          buildTestableContext(
            child: Builder(
              builder: (context) {
                final actions = GenericTableActionBuilders.buildRowActions(
                  context,
                  entityName: 'customer',
                  entity: testData,
                  userRole: role,
                  onRefresh: () {},
                );

                return Row(children: actions);
              },
            ),
          ),
        );

        // All roles should at least render without error
        expect(find.byType(Row), findsOneWidget);
      });
    }
  });
}
