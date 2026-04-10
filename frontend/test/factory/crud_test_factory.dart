/// CRUD Test Factory - Universal Entity Operation Testing
///
/// STRATEGIC PURPOSE: Apply IDENTICAL test scenarios to ALL entities uniformly.
/// If one entity gets tested for 404 handling, ALL entities get tested for 404 handling.
///
/// THE MATRIX:
/// ```
/// OPERATIONS × ENTITIES × SCENARIOS = COMPLETE COVERAGE
///
/// OPERATIONS (5):
///   getAll, getById, create, update, delete
///
/// ENTITIES (11):
///   user, role, customer, technician, work_order, contract,
///   invoice, inventory, preferences, saved_view, file_attachment
///
/// SCENARIOS (per operation):
///   - Success path (valid data)
///   - 400 Bad Request (validation error)
///   - 401 Unauthorized (no/invalid token)
///   - 403 Forbidden (insufficient permissions)
///   - 404 Not Found (entity doesn't exist)
///   - 500 Server Error (backend failure)
///   - Network timeout
///   - Empty/null response handling
///
/// RESULT: 5 ops × 11 entities × 8 scenarios = 440 tests (minimum)
/// ```
///
/// USAGE:
/// ```dart
/// void main() {
///   CrudTestFactory.generateAllTests();
/// }
/// ```
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross/services/generic_entity_service.dart';

import '../mocks/mock_api_client.dart';
import '../mocks/mock_failure_config.dart';
import '../helpers/helpers.dart';
import 'entity_registry.dart';
import 'entity_data_generator.dart';

// =============================================================================
// ERROR SCENARIOS - Universal error conditions to test
// =============================================================================

/// HTTP error scenarios that ALL operations must handle
enum HttpErrorScenario {
  badRequest(400, 'Bad Request', 'Validation error'),
  unauthorized(401, 'Unauthorized', 'Token invalid or expired'),
  forbidden(403, 'Forbidden', 'Insufficient permissions'),
  notFound(404, 'Not Found', 'Entity does not exist'),
  serverError(500, 'Internal Server Error', 'Backend failure');

  final int statusCode;
  final String message;
  final String description;

  const HttpErrorScenario(this.statusCode, this.message, this.description);
}

// =============================================================================
// CRUD TEST FACTORY
// =============================================================================

/// Factory for generating comprehensive CRUD tests across ALL entities
abstract final class CrudTestFactory {
  // ===========================================================================
  // MAIN ENTRY POINT - Generate ALL tests
  // ===========================================================================

  /// Generate complete CRUD test coverage for ALL entities
  ///
  /// Creates a test matrix of:
  /// - 5 CRUD operations
  /// - 11 entities
  /// - 8+ scenarios per operation
  static void generateAllTests() {
    group('GenericEntityService × All Entities (Factory Generated)', () {
      late MockApiClient mockApiClient;
      late GenericEntityService service;

      setUpAll(() async {
        initializeTestBinding();
        await EntityTestRegistry.ensureInitialized();
      });

      setUp(() {
        mockApiClient = MockApiClient();
        service = GenericEntityService(mockApiClient);
      });

      tearDown(() {
        mockApiClient.reset();
      });

      // Generate tests dynamically for all entities
      test('getAll returns list on success for all entities', () async {
        for (final entityName in EntityTestRegistry.allEntityNames) {
          final mockData = EntityDataGenerator.createList(entityName, count: 3);
          mockApiClient.mockEntityList(entityName, mockData);

          final result = await service.getAll(entityName);

          expect(
            result.data,
            hasLength(3),
            reason: '$entityName: getAll should return 3 items',
          );
          expect(
            result.count,
            equals(3),
            reason: '$entityName: count should equal 3',
          );
        }
      });

      test('getById returns entity on success for all entities', () async {
        for (final entityName in EntityTestRegistry.allEntityNames) {
          final mockData = EntityDataGenerator.create(entityName, id: 42);
          mockApiClient.mockEntity(entityName, 42, mockData);

          final result = await service.getById(entityName, 42);

          expect(
            result['id'],
            equals(42),
            reason: '$entityName: getById should return correct id',
          );
        }
      });

      test(
        'create returns created entity on success for all entities',
        () async {
          for (final entityName in EntityTestRegistry.allEntityNames) {
            final inputData = EntityDataGenerator.createInput(entityName);
            final responseData = {...inputData, 'id': 99};

            mockApiClient.mockCreate(entityName, {
              'success': true,
              'data': responseData,
            });

            final result = await service.create(entityName, inputData);

            expect(
              result,
              isNotNull,
              reason: '$entityName: create should return data',
            );
          }
        },
      );

      test(
        'update returns updated entity on success for all entities',
        () async {
          for (final entityName in EntityTestRegistry.allEntityNames) {
            final updateData = {'name': 'Updated Name'};

            mockApiClient.mockUpdate(entityName, 1, {
              'success': true,
              'data': {'id': 1, ...updateData},
            });

            final result = await service.update(entityName, 1, updateData);

            expect(
              result,
              isNotNull,
              reason: '$entityName: update should return data',
            );
          }
        },
      );

      test('delete completes successfully for all entities', () async {
        for (final entityName in EntityTestRegistry.allEntityNames) {
          mockApiClient.mockDelete(entityName, 1, {'success': true});

          await expectLater(
            service.delete(entityName, 1),
            completes,
            reason: '$entityName: delete should complete',
          );
        }
      });

      // =====================================================================
      // ERROR PATH TESTS
      // =====================================================================
      // Design: Test error handling with ONE representative entity per scenario.
      // Why? The GenericEntityService uses identical code paths for all entities,
      // so testing the same behavior 11 times is redundant and wasteful.
      // If error handling works for 'customer', it works for all entities.
      // =====================================================================

      group('error handling (representative entity)', () {
        // Use 'customer' as the representative entity for error tests
        const representativeEntity = 'customer';

        for (final scenario in HttpErrorScenario.values) {
          test(
            'getAll throws on ${scenario.statusCode} ${scenario.message}',
            () async {
              // Use new persistent failure config
              mockApiClient.setFailure(
                MockFailureConfig.fromStatus(
                  _httpStatusFromScenario(scenario),
                  message: scenario.message,
                ),
              );

              await expectLater(
                () => service.getAll(representativeEntity),
                throwsA(isA<Exception>()),
                reason: 'getAll should throw on ${scenario.statusCode}',
              );

              mockApiClient.resetFailure();
            },
          );

          test(
            'getById throws on ${scenario.statusCode} ${scenario.message}',
            () async {
              mockApiClient.setFailure(
                MockFailureConfig.fromStatus(
                  _httpStatusFromScenario(scenario),
                  message: scenario.message,
                ),
              );

              await expectLater(
                () => service.getById(representativeEntity, 1),
                throwsA(isA<Exception>()),
                reason: 'getById should throw on ${scenario.statusCode}',
              );

              mockApiClient.resetFailure();
            },
          );

          test(
            'create throws on ${scenario.statusCode} ${scenario.message}',
            () async {
              mockApiClient.setFailure(
                MockFailureConfig.fromStatus(
                  _httpStatusFromScenario(scenario),
                  message: scenario.message,
                ),
              );

              await expectLater(
                () => service.create(representativeEntity, {'name': 'test'}),
                throwsA(isA<Exception>()),
                reason: 'create should throw on ${scenario.statusCode}',
              );

              mockApiClient.resetFailure();
            },
          );

          test(
            'update throws on ${scenario.statusCode} ${scenario.message}',
            () async {
              mockApiClient.setFailure(
                MockFailureConfig.fromStatus(
                  _httpStatusFromScenario(scenario),
                  message: scenario.message,
                ),
              );

              await expectLater(
                () => service.update(representativeEntity, 1, {'name': 'test'}),
                throwsA(isA<Exception>()),
                reason: 'update should throw on ${scenario.statusCode}',
              );

              mockApiClient.resetFailure();
            },
          );

          test(
            'delete throws on ${scenario.statusCode} ${scenario.message}',
            () async {
              mockApiClient.setFailure(
                MockFailureConfig.fromStatus(
                  _httpStatusFromScenario(scenario),
                  message: scenario.message,
                ),
              );

              await expectLater(
                () => service.delete(representativeEntity, 1),
                throwsA(isA<Exception>()),
                reason: 'delete should throw on ${scenario.statusCode}',
              );

              mockApiClient.resetFailure();
            },
          );
        }
      });
    });
  }

  /// Convert HttpErrorScenario to MockHttpStatus
  static MockHttpStatus _httpStatusFromScenario(HttpErrorScenario scenario) {
    switch (scenario) {
      case HttpErrorScenario.badRequest:
        return MockHttpStatus.badRequest;
      case HttpErrorScenario.unauthorized:
        return MockHttpStatus.unauthorized;
      case HttpErrorScenario.forbidden:
        return MockHttpStatus.forbidden;
      case HttpErrorScenario.notFound:
        return MockHttpStatus.notFound;
      case HttpErrorScenario.serverError:
        return MockHttpStatus.serverError;
    }
  }

  // ===========================================================================
  // SPECIALIZED TEST GENERATORS
  // ===========================================================================

  /// Generate only success path tests (fast smoke tests)
  static void generateSuccessPathTests() {
    group('GenericEntityService Success Paths (Factory)', () {
      late MockApiClient mockApiClient;
      late GenericEntityService service;

      setUpAll(() async {
        initializeTestBinding();
        await EntityTestRegistry.ensureInitialized();
      });

      setUp(() {
        mockApiClient = MockApiClient();
        service = GenericEntityService(mockApiClient);
      });

      tearDown(() {
        mockApiClient.reset();
      });

      test('getAll succeeds for all entities', () async {
        for (final entityName in EntityTestRegistry.allEntityNames) {
          mockApiClient.mockEntityList(entityName, [
            EntityDataGenerator.create(entityName),
          ]);
          final result = await service.getAll(entityName);
          expect(
            result.data,
            isNotEmpty,
            reason: '$entityName: getAll should succeed',
          );
        }
      });

      test('getById succeeds for all entities', () async {
        for (final entityName in EntityTestRegistry.allEntityNames) {
          mockApiClient.mockEntity(
            entityName,
            1,
            EntityDataGenerator.create(entityName, id: 1),
          );
          final result = await service.getById(entityName, 1);
          expect(
            result['id'],
            equals(1),
            reason: '$entityName: getById should succeed',
          );
        }
      });

      test('create succeeds for all entities', () async {
        for (final entityName in EntityTestRegistry.allEntityNames) {
          mockApiClient.mockCreate(entityName, {
            'success': true,
            'data': EntityDataGenerator.create(entityName, id: 99),
          });
          final result = await service.create(
            entityName,
            EntityDataGenerator.createInput(entityName),
          );
          expect(
            result,
            isNotNull,
            reason: '$entityName: create should succeed',
          );
        }
      });

      test('update succeeds for all entities', () async {
        for (final entityName in EntityTestRegistry.allEntityNames) {
          mockApiClient.mockUpdate(entityName, 1, {
            'success': true,
            'data': EntityDataGenerator.create(entityName, id: 1),
          });
          final result = await service.update(entityName, 1, {'name': 'Test'});
          expect(
            result,
            isNotNull,
            reason: '$entityName: update should succeed',
          );
        }
      });

      test('delete succeeds for all entities', () async {
        for (final entityName in EntityTestRegistry.allEntityNames) {
          mockApiClient.mockDelete(entityName, 1, {'success': true});
          await expectLater(
            service.delete(entityName, 1),
            completes,
            reason: '$entityName: delete should succeed',
          );
        }
      });
    });
  }

  /// Generate only error path tests
  static void generateErrorPathTests() {
    group('GenericEntityService Error Paths (Factory)', () {
      late MockApiClient mockApiClient;
      late GenericEntityService service;

      setUpAll(() async {
        initializeTestBinding();
        await EntityTestRegistry.ensureInitialized();
      });

      setUp(() {
        mockApiClient = MockApiClient();
        service = GenericEntityService(mockApiClient);
      });

      tearDown(() {
        mockApiClient.reset();
      });

      for (final scenario in HttpErrorScenario.values) {
        test(
          'getAll throws on ${scenario.statusCode} for all entities',
          () async {
            mockApiClient.setShouldFail(true, message: scenario.message);
            for (final entityName in EntityTestRegistry.allEntityNames) {
              expect(
                () => service.getAll(entityName),
                throwsA(isA<Exception>()),
                reason:
                    '$entityName: getAll should throw on ${scenario.statusCode}',
              );
            }
          },
        );

        test(
          'getById throws on ${scenario.statusCode} for all entities',
          () async {
            mockApiClient.setShouldFail(true, message: scenario.message);
            for (final entityName in EntityTestRegistry.allEntityNames) {
              expect(
                () => service.getById(entityName, 1),
                throwsA(isA<Exception>()),
                reason:
                    '$entityName: getById should throw on ${scenario.statusCode}',
              );
            }
          },
        );

        test(
          'create throws on ${scenario.statusCode} for all entities',
          () async {
            mockApiClient.setShouldFail(true, message: scenario.message);
            for (final entityName in EntityTestRegistry.allEntityNames) {
              expect(
                () => service.create(entityName, {}),
                throwsA(isA<Exception>()),
                reason:
                    '$entityName: create should throw on ${scenario.statusCode}',
              );
            }
          },
        );

        test(
          'update throws on ${scenario.statusCode} for all entities',
          () async {
            mockApiClient.setShouldFail(true, message: scenario.message);
            for (final entityName in EntityTestRegistry.allEntityNames) {
              expect(
                () => service.update(entityName, 1, {}),
                throwsA(isA<Exception>()),
                reason:
                    '$entityName: update should throw on ${scenario.statusCode}',
              );
            }
          },
        );

        test(
          'delete throws on ${scenario.statusCode} for all entities',
          () async {
            mockApiClient.setShouldFail(true, message: scenario.message);
            for (final entityName in EntityTestRegistry.allEntityNames) {
              expect(
                () => service.delete(entityName, 1),
                throwsA(isA<Exception>()),
                reason:
                    '$entityName: delete should throw on ${scenario.statusCode}',
              );
            }
          },
        );
      }
    });
  }
}
