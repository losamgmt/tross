/// Service Test Contract - Standardized Service Testing Infrastructure
///
/// ALL service tests MUST follow this contract to ensure consistency.
/// This contract prevents drift and ensures comprehensive test coverage.
///
/// REQUIRED TEST GROUPS:
/// 1. Construction - DI pattern verification
/// 2. API Contract - Method signatures exist
/// 3. Success Scenarios - Happy path behavior
/// 4. Error Handling - Graceful failure
/// 5. Edge Cases - Boundary conditions (optional)
///
/// USAGE:
/// ```dart
/// import '../templates/service_test_contract.dart';
/// import '../mocks/mock_api_client.dart';
///
/// void main() {
///   late MockApiClient mockApiClient;
///   late MyService service;
///
///   setUp(() {
///     mockApiClient = MockApiClient();
///     service = MyService(mockApiClient);
///   });
///
///   tearDown(() => mockApiClient.reset());
///
///   // Use contract helpers
///   serviceConstructionTests(() => service);
///
///   group('API Contract', () {
///     verifyMethodSignature<Future<List<Item>>>(
///       'getItems',
///       () => service.getItems,
///     );
///   });
///
///   group('Success Scenarios', () {
///     serviceSuccessTest(
///       'fetches items successfully',
///       arrange: () => mockApiClient.mockResponse('/items', mockData),
///       act: () => service.getItems(),
///       assert_: (result) => expect(result, isNotEmpty),
///     );
///   });
///
///   group('Error Handling', () {
///     serviceErrorTest(
///       'handles API failure gracefully',
///       arrange: () => mockApiClient.setShouldFail(true),
///       act: () => service.getItems(),
///       expectThrows: true,
///     );
///   });
/// }
/// ```
library;

import 'package:flutter_test/flutter_test.dart';

// =============================================================================
// CONSTRUCTION TESTS
// =============================================================================

/// Verifies a service can be constructed via DI
///
/// Call this in your test file to verify basic construction:
/// ```dart
/// serviceConstructionTests(() => MyService(mockApiClient));
/// ```
void serviceConstructionTests<T>(T Function() createService) {
  group('Construction', () {
    test('can be constructed with dependencies', () {
      final service = createService();
      expect(service, isNotNull);
      expect(service, isA<T>());
    });
  });
}

// =============================================================================
// API CONTRACT VERIFICATION
// =============================================================================

/// Verifies a method exists with the expected return type
///
/// ```dart
/// verifyMethodSignature<Future<List<Item>>>(
///   'getItems',
///   () => service.getItems,
/// );
/// ```
void verifyMethodSignature<T>(String methodName, T Function() getMethod) {
  test('$methodName exists with correct signature', () {
    final method = getMethod();
    expect(method, isNotNull);
  });
}

/// Verifies multiple methods exist on a service
///
/// ```dart
/// verifyServiceMethods({
///   'getAll': () => service.getAll,
///   'getById': () => service.getById,
///   'create': () => service.create,
/// });
/// ```
void verifyServiceMethods(Map<String, Function() Function()> methods) {
  for (final entry in methods.entries) {
    verifyMethodSignature(entry.key, entry.value);
  }
}

// =============================================================================
// SUCCESS SCENARIO HELPERS
// =============================================================================

/// Standard structure for success scenario tests
///
/// Follows Arrange-Act-Assert pattern with named parameters.
///
/// ```dart
/// serviceSuccessTest(
///   'fetches all items',
///   arrange: () => mockApiClient.mockResponse('/items', mockData),
///   act: () => service.getItems(),
///   assert_: (result) {
///     expect(result, isNotEmpty);
///     expect(result.first.id, equals(1));
///   },
/// );
/// ```
void serviceSuccessTest<T>(
  String description, {
  required void Function() arrange,
  required Future<T> Function() act,
  required void Function(T result) assert_,
}) {
  test(description, () async {
    // Arrange
    arrange();

    // Act
    final result = await act();

    // Assert
    assert_(result);
  });
}

/// Success test for void-returning operations
void serviceSuccessTestVoid(
  String description, {
  required void Function() arrange,
  required Future<void> Function() act,
  void Function()? assert_,
}) {
  test(description, () async {
    arrange();
    await act();
    assert_?.call();
  });
}

// =============================================================================
// ERROR HANDLING HELPERS
// =============================================================================

/// Standard structure for error handling tests
///
/// ```dart
/// serviceErrorTest(
///   'handles API failure',
///   arrange: () => mockApiClient.setShouldFail(true),
///   act: () => service.getItems(),
///   expectThrows: true,
/// );
/// ```
void serviceErrorTest<T>(
  String description, {
  required void Function() arrange,
  required Future<T> Function() act,
  bool expectThrows = true,
  Matcher? exceptionMatcher,
}) {
  test(description, () async {
    arrange();

    if (expectThrows) {
      expect(
        () => act(),
        exceptionMatcher != null ? throwsA(exceptionMatcher) : throwsException,
      );
    } else {
      // For graceful degradation tests
      final result = await act();
      expect(result, isNotNull);
    }
  });
}

/// Test for operations that return null/empty on failure
void serviceGracefulFailureTest<T>(
  String description, {
  required void Function() arrange,
  required Future<T?> Function() act,
  required void Function(T? result) assert_,
}) {
  test(description, () async {
    arrange();
    final result = await act();
    assert_(result);
  });
}

// =============================================================================
// EDGE CASE HELPERS
// =============================================================================

/// Test behavior with empty input
void serviceEmptyInputTest<T>(
  String description, {
  required Future<T> Function() act,
  required void Function(T result) assert_,
}) {
  test('handles empty input - $description', () async {
    final result = await act();
    assert_(result);
  });
}

/// Test behavior with null input
void serviceNullInputTest<T>(
  String description, {
  required Future<T?> Function() act,
  void Function(T? result)? assert_,
  bool expectThrows = false,
}) {
  test('handles null input - $description', () async {
    if (expectThrows) {
      expect(() => act(), throwsException);
    } else {
      final result = await act();
      assert_?.call(result);
    }
  });
}

// =============================================================================
// CALL VERIFICATION HELPERS
// =============================================================================

/// Verify an endpoint was called on the mock
///
/// Use with MockApiClient:
/// ```dart
/// verifyEndpointCalled(mockApiClient, 'GET /api/items');
/// ```
void verifyEndpointCalled(
  dynamic mockApiClient,
  String expectedCall, {
  String? description,
}) {
  // This works with MockApiClient.wasCalled() or callHistory
  if (mockApiClient.wasCalled != null) {
    expect(
      mockApiClient.wasCalled(expectedCall),
      isTrue,
      reason: description ?? 'Expected $expectedCall to be called',
    );
  }
}

// =============================================================================
// FULL SERVICE TEST SUITE BUILDER
// =============================================================================

/// Creates a complete service test suite following the contract
///
/// Use for services that follow standard patterns:
/// ```dart
/// buildServiceTestSuite<MyService>(
///   'MyService',
///   createService: () => MyService(mockApiClient),
///   createMock: () => MockApiClient(),
///   resetMock: (mock) => mock.reset(),
///   constructionTests: (service) { ... },
///   contractTests: (service) { ... },
///   successTests: (service, mock) { ... },
///   errorTests: (service, mock) { ... },
/// );
/// ```
void buildServiceTestSuite<T, M>({
  required String name,
  required T Function(M mock) createService,
  required M Function() createMock,
  required void Function(M mock) resetMock,
  void Function(T service)? constructionTests,
  void Function(T service)? contractTests,
  void Function(T service, M mock)? successTests,
  void Function(T service, M mock)? errorTests,
  void Function(T service, M mock)? edgeCaseTests,
}) {
  group(name, () {
    late M mock;
    late T service;

    setUp(() {
      mock = createMock();
      service = createService(mock);
    });

    tearDown(() {
      resetMock(mock);
    });

    if (constructionTests != null) {
      group('Construction', () => constructionTests(service));
    }

    if (contractTests != null) {
      group('API Contract', () => contractTests(service));
    }

    if (successTests != null) {
      group('Success Scenarios', () => successTests(service, mock));
    }

    if (errorTests != null) {
      group('Error Handling', () => errorTests(service, mock));
    }

    if (edgeCaseTests != null) {
      group('Edge Cases', () => edgeCaseTests(service, mock));
    }
  });
}

// =============================================================================
// DOCUMENTATION
// =============================================================================

/// Marker for documenting required test categories
///
/// Use in comments to document what's tested:
/// ```dart
/// // @ServiceTestContract
/// // ✓ Construction
/// // ✓ API Contract
/// // ✓ Success Scenarios
/// // ✓ Error Handling
/// // ○ Edge Cases (N/A for this service)
/// ```
const serviceTestContractMarker = '@ServiceTestContract';
