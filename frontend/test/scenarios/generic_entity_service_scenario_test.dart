/// GenericEntityService Scenario Tests
///
/// Factory-generated tests for the core CRUD service.
/// Tests every entity through the same generic service to ensure
/// consistent behavior across all entity types.
///
/// @ServiceTestContract
/// ✓ Construction
/// ✓ API Contract
/// ✓ Success Scenarios (per-entity CRUD)
/// ✓ Error Handling
/// ✓ Data Transformation
///
/// ZERO per-entity code - all tests generated from EntityTestRegistry.
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross/services/generic_entity_service.dart';

import '../factory/factory.dart';
import '../mocks/mock_api_client.dart';
import '../helpers/helpers.dart';

void main() {
  late MockApiClient mockApiClient;
  late GenericEntityService service;

  setUpAll(() async {
    await EntityTestRegistry.ensureInitialized();
  });

  setUp(() {
    mockApiClient = MockApiClient();
    service = GenericEntityService(mockApiClient);
  });

  tearDown(() {
    mockApiClient.reset();
  });

  // ===========================================================================
  // CONSTRUCTION TESTS
  // ===========================================================================

  serviceConstructionTests(() => GenericEntityService(mockApiClient));

  // ===========================================================================
  // API CONTRACT TESTS
  // ===========================================================================

  group('API Contract', () {
    verifyMethodSignature<
      Future<EntityListResult> Function(
        String, {
        int page,
        int limit,
        String? search,
        Map<String, dynamic>? filters,
        String? sortBy,
        String sortOrder,
      })
    >('getAll', () => service.getAll);

    verifyMethodSignature<Future<Map<String, dynamic>> Function(String, int)>(
      'getById',
      () => service.getById,
    );

    verifyMethodSignature<
      Future<Map<String, dynamic>> Function(String, Map<String, dynamic>)
    >('create', () => service.create);

    verifyMethodSignature<
      Future<Map<String, dynamic>> Function(String, int, Map<String, dynamic>)
    >('update', () => service.update);

    verifyMethodSignature<Future<void> Function(String, int)>(
      'delete',
      () => service.delete,
    );
  });

  // ===========================================================================
  // ENTITY CRUD SCENARIOS (Generated for all entities)
  // ===========================================================================

  group('Entity CRUD Scenarios', () {
    for (final entityName in allKnownEntities) {
      group(entityName, () {
        // =====================================================================
        // getAll
        // =====================================================================

        test('getAll calls correct endpoint', () async {
          final testData = entityName.testDataList(count: 3);
          mockApiClient.mockEntityList(entityName, testData);

          final result = await service.getAll(entityName);

          expect(mockApiClient.wasCalled('fetchEntities $entityName'), isTrue);
          expect(result.data, hasLength(3));
          expect(result.count, equals(3));
        });

        test('getAll returns EntityListResult with pagination', () async {
          final testData = entityName.testDataList(count: 10);
          mockApiClient.mockEntityList(
            entityName,
            testData,
            total: 100,
            hasNext: true,
          );

          final result = await service.getAll(entityName);

          expect(result, isA<EntityListResult>());
          expect(result.hasMore, isTrue);
          expect(result.total, equals(100));
        });

        test('getAll passes search parameter', () async {
          // Default empty response is correctly typed
          await service.getAll(entityName, search: 'test query');

          expect(mockApiClient.wasCalled('fetchEntities $entityName'), isTrue);
        });

        test('getAll handles empty result', () async {
          // Default empty response is correctly typed
          final result = await service.getAll(entityName);

          expect(result.data, isEmpty);
          expect(result.count, equals(0));
        });

        // =====================================================================
        // getById
        // =====================================================================

        test('getById calls correct endpoint', () async {
          final testData = entityName.testData(overrides: {'id': 42});
          mockApiClient.mockEntity(entityName, 42, testData);

          final result = await service.getById(entityName, 42);

          expect(mockApiClient.wasCalled('fetchEntity $entityName/42'), isTrue);
          expect(result['id'], equals(42));
        });

        test('getById returns entity data', () async {
          final testData = entityName.testData(overrides: {'id': 99});
          mockApiClient.mockEntity(entityName, 99, testData);

          final result = await service.getById(entityName, 99);

          expect(result, isA<Map<String, dynamic>>());
          expect(result['id'], equals(99));
        });

        // =====================================================================
        // create
        // =====================================================================

        test('create calls correct endpoint', () async {
          final createData = entityName.testData();
          createData.remove('id'); // Remove id for create
          mockApiClient.mockCreate(entityName, {'id': 1, ...createData});

          await service.create(entityName, createData);

          expect(mockApiClient.wasCalled('createEntity $entityName'), isTrue);
        });

        test('create returns created entity with id', () async {
          final createData = entityName.testData();
          createData.remove('id');
          mockApiClient.mockCreate(entityName, {'id': 123, ...createData});

          final result = await service.create(entityName, createData);

          expect(result['id'], equals(123));
        });

        // =====================================================================
        // update
        // =====================================================================

        test('update calls correct endpoint', () async {
          final updateData = {'is_active': false};
          mockApiClient.mockUpdate(entityName, 42, {'id': 42, ...updateData});

          await service.update(entityName, 42, updateData);

          expect(
            mockApiClient.wasCalled('updateEntity $entityName/42'),
            isTrue,
          );
        });

        test('update returns updated entity', () async {
          // Use a field that all entities have - id is always present
          final expectedResult = entityName.testData(overrides: {'id': 42});
          mockApiClient.mockUpdate(entityName, 42, expectedResult);

          final result = await service.update(entityName, 42, {'id': 42});

          expect(result['id'], equals(42));
        });

        // =====================================================================
        // delete
        // =====================================================================

        test('delete calls correct endpoint', () async {
          await service.delete(entityName, 42);

          expect(
            mockApiClient.wasCalled('deleteEntity $entityName/42'),
            isTrue,
          );
        });

        test('delete completes without error', () async {
          expect(() => service.delete(entityName, 99), returnsNormally);
        });
      });
    }
  });

  // ===========================================================================
  // ERROR HANDLING (Cross-entity)
  // ===========================================================================

  group('Error Handling', () {
    // Test with first entity - errors are entity-agnostic
    final testEntity = allKnownEntities.first;

    test('getAll rethrows API errors', () async {
      mockApiClient.setShouldFail(true, message: 'Network error');

      expect(() => service.getAll(testEntity), throwsException);
    });

    test('getById rethrows API errors', () async {
      mockApiClient.setShouldFail(true, message: 'Not found');

      expect(() => service.getById(testEntity, 999), throwsException);
    });

    test('create rethrows API errors', () async {
      mockApiClient.setShouldFail(true, message: 'Validation failed');

      expect(() => service.create(testEntity, {}), throwsException);
    });

    test('update rethrows API errors', () async {
      mockApiClient.setShouldFail(true, message: 'Conflict');

      expect(() => service.update(testEntity, 1, {}), throwsException);
    });

    test('delete rethrows API errors', () async {
      mockApiClient.setShouldFail(true, message: 'Forbidden');

      expect(() => service.delete(testEntity, 1), throwsException);
    });
  });

  // ===========================================================================
  // DATA TRANSFORMATION
  // ===========================================================================

  group('Data Transformation', () {
    final testEntity = allKnownEntities.first;

    test('EntityListResult correctly parses pagination', () async {
      mockApiClient.mockEntityList(
        testEntity,
        [
          {'id': 1},
          {'id': 2},
        ],
        page: 2,
        limit: 10,
        total: 25,
        hasNext: true,
      );

      final result = await service.getAll(testEntity);

      expect(result.data, hasLength(2));
      expect(result.count, equals(2));
      expect(result.page, equals(2));
      expect(result.total, equals(25));
      expect(result.hasMore, isTrue);
    });

    test('EntityListResult handles default pagination', () async {
      mockApiClient.mockEntityList(testEntity, [
        {'id': 1},
      ]);

      final result = await service.getAll(testEntity);

      expect(result.data, hasLength(1));
      expect(result.count, equals(1));
      expect(result.page, equals(1)); // Default
      expect(result.hasMore, isFalse);
    });

    test('EntityListResult handles empty list', () async {
      // Uses default empty response - no explicit mock needed
      final result = await service.getAll(testEntity);

      expect(result.data, isEmpty);
      expect(result.count, equals(0));
    });
  });

  // ===========================================================================
  // ENTITY-SPECIFIC DATA VALIDATION
  // ===========================================================================

  group('Entity Data Integrity', () {
    for (final entityName in allKnownEntities) {
      test('$entityName test data includes required id field', () {
        final data = entityName.testData();
        expect(data['id'], isNotNull);
      });

      test('$entityName test data generates unique ids in list', () {
        final dataList = entityName.testDataList(count: 5);
        final ids = dataList.map((d) => d['id']).toSet();
        expect(ids.length, equals(5), reason: 'All IDs should be unique');
      });
    }
  });
}
