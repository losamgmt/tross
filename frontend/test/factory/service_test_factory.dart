/// Service Test Factory - Pattern-Based Test Generation
///
/// STRATEGIC APPROACH: Instead of writing individual per-service tests,
/// define service contracts and auto-generate error path tests.
///
/// PATTERNS IDENTIFIED:
/// 1. **ApiClient + TokenProvider Services**: StatsService, FileService,
///    AuditLogService, ExportService - all share:
///    - Constructor: Service(apiClient, [tokenProvider])
///    - Auth check: Throws when no token
///    - 403 handling: Graceful degradation (return empty/zero)
///    - 500 handling: Throw exception
///
/// 2. **Response Contracts**:
///    - Count endpoints: Return 0 on 403
///    - List endpoints: Return [] on 403
///    - Sum endpoints: Return 0.0 on 403
///    - All: Throw on 500
///
/// USAGE:
/// ```dart
/// import 'service_test_factory.dart';
///
/// void main() {
///   ServiceTestFactory.generateErrorPathTests(
///     serviceName: 'StatsService',
///     createService: (api, token) => StatsService(api, token),
///     endpoints: [
///       EndpointContract.count('/stats/work_order', onForbidden: 0),
///       EndpointContract.list('/stats/work_order/grouped/status', onForbidden: []),
///       EndpointContract.sum('/stats/invoice/sum/total', onForbidden: 0.0),
///     ],
///   );
/// }
/// ```
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/services/api/api_client.dart';

import '../mocks/mock_api_client.dart';
import '../mocks/mock_token_provider.dart';
import '../helpers/helpers.dart';
import 'entity_registry.dart';

// =============================================================================
// ENDPOINT CONTRACTS - Define expected behavior per endpoint type
// =============================================================================

/// Defines the expected behavior of an endpoint under various conditions
class EndpointContract {
  final String path;
  final String method;
  final String description;

  /// What to return/do when 403 Forbidden (null = throw)
  final dynamic onForbidden;

  /// What to return/do when 404 Not Found (null = throw)
  final dynamic onNotFound;

  /// What to return/do when 500 Server Error (null = throw)
  final dynamic onServerError;

  /// Success response body to mock
  final Map<String, dynamic> successResponse;

  /// Expected success result transformer
  final dynamic Function(dynamic response)? extractResult;

  const EndpointContract({
    required this.path,
    this.method = 'GET',
    required this.description,
    this.onForbidden,
    this.onNotFound,
    this.onServerError,
    required this.successResponse,
    this.extractResult,
  });

  /// Factory for count endpoints (return 0 on 403)
  factory EndpointContract.count(String path, {String? description}) {
    return EndpointContract(
      path: path,
      description: description ?? 'count $path',
      onForbidden: 0,
      onNotFound: null, // throw
      onServerError: null, // throw
      successResponse: {
        'success': true,
        'data': {'count': 42},
      },
    );
  }

  /// Factory for list endpoints (return [] on 403)
  factory EndpointContract.list(String path, {String? description}) {
    return EndpointContract(
      path: path,
      description: description ?? 'list $path',
      onForbidden: <dynamic>[],
      onNotFound: null,
      onServerError: null,
      successResponse: {'success': true, 'data': []},
    );
  }

  /// Factory for sum endpoints (return 0.0 on 403)
  factory EndpointContract.sum(String path, {String? description}) {
    return EndpointContract(
      path: path,
      description: description ?? 'sum $path',
      onForbidden: 0.0,
      onNotFound: null,
      onServerError: null,
      successResponse: {
        'success': true,
        'data': {'sum': 0.0},
      },
    );
  }

  /// Factory for fetch endpoints (throw on all errors)
  factory EndpointContract.fetch(
    String path, {
    String? description,
    required Map<String, dynamic> successResponse,
  }) {
    return EndpointContract(
      path: path,
      description: description ?? 'fetch $path',
      onForbidden: null, // throw
      onNotFound: null,
      onServerError: null,
      successResponse: successResponse,
    );
  }

  /// Factory for mutation endpoints (POST/PUT/DELETE - throw on all errors)
  factory EndpointContract.mutation(
    String path, {
    String method = 'POST',
    String? description,
    required Map<String, dynamic> successResponse,
  }) {
    return EndpointContract(
      path: path,
      method: method,
      description: description ?? '$method $path',
      onForbidden: null,
      onNotFound: null,
      onServerError: null,
      successResponse: successResponse,
    );
  }

  /// Whether this endpoint gracefully handles 403
  bool get handles403 => onForbidden != null;

  /// Whether this endpoint gracefully handles 404
  bool get handles404 => onNotFound != null;

  /// Whether this endpoint gracefully handles 500
  bool get handles500 => onServerError != null;
}

// =============================================================================
// SERVICE CONTRACT - Define a service's complete API surface
// =============================================================================

/// Defines a complete service contract for test generation
class ServiceContract<T> {
  final String serviceName;
  final T Function(MockApiClient api, MockTokenProvider token) createService;
  final List<EndpointTest<T>> endpoints;

  const ServiceContract({
    required this.serviceName,
    required this.createService,
    required this.endpoints,
  });
}

/// A single endpoint test definition
class EndpointTest<T> {
  final EndpointContract contract;
  final Future<dynamic> Function(T service) invoke;

  const EndpointTest({required this.contract, required this.invoke});
}

// =============================================================================
// SERVICE TEST FACTORY - Generate tests from contracts
// =============================================================================

/// Factory for generating standardized service tests
abstract final class ServiceTestFactory {
  /// Generate all error path tests for a service
  ///
  /// This creates test groups for:
  /// - Authentication (throws when no token)
  /// - 403 Forbidden handling
  /// - 404 Not Found handling
  /// - 500 Server Error handling
  static void generateErrorPathTests<T>({
    required String serviceName,
    required T Function(MockApiClient, MockTokenProvider) createService,
    required List<EndpointTest<T>> endpoints,
  }) {
    group('$serviceName Error Paths (Generated)', () {
      late MockApiClient mockApiClient;
      late MockTokenProvider mockTokenProvider;
      late T service;

      setUpAll(() async {
        initializeTestBinding();
        await EntityTestRegistry.ensureInitialized();
      });

      setUp(() {
        mockApiClient = MockApiClient();
        mockTokenProvider = MockTokenProvider('test-token');
        service = createService(mockApiClient, mockTokenProvider);
      });

      tearDown(() {
        mockApiClient.reset();
      });

      // -----------------------------------------------------------------------
      // AUTHENTICATION TESTS
      // -----------------------------------------------------------------------
      group('Authentication', () {
        for (final endpoint in endpoints) {
          test(
            '${endpoint.contract.description} throws when not authenticated',
            () async {
              // Arrange
              final unauthProvider = MockTokenProvider.unauthenticated();
              final unauthService = createService(
                mockApiClient,
                unauthProvider,
              );

              // Act & Assert
              expect(
                () => endpoint.invoke(unauthService),
                throwsA(
                  isA<Exception>().having(
                    (e) => e.toString(),
                    'message',
                    contains('Not authenticated'),
                  ),
                ),
              );
            },
          );
        }
      });

      // -----------------------------------------------------------------------
      // 403 FORBIDDEN TESTS
      // -----------------------------------------------------------------------
      group('403 Forbidden', () {
        for (final endpoint in endpoints) {
          if (endpoint.contract.handles403) {
            test(
              '${endpoint.contract.description} returns ${endpoint.contract.onForbidden} on 403',
              () async {
                // Arrange
                mockApiClient.mockStatusCode(endpoint.contract.path, 403, {
                  'error': 'Forbidden',
                });

                // Act
                final result = await endpoint.invoke(service);

                // Assert
                expect(result, equals(endpoint.contract.onForbidden));
              },
            );
          } else {
            test('${endpoint.contract.description} throws on 403', () async {
              // Arrange
              mockApiClient.mockStatusCode(endpoint.contract.path, 403, {
                'error': 'Forbidden',
              });

              // Act & Assert
              expect(() => endpoint.invoke(service), throwsA(isA<Exception>()));
            });
          }
        }
      });

      // -----------------------------------------------------------------------
      // 500 SERVER ERROR TESTS
      // -----------------------------------------------------------------------
      group('500 Server Error', () {
        for (final endpoint in endpoints) {
          if (endpoint.contract.handles500) {
            test(
              '${endpoint.contract.description} returns ${endpoint.contract.onServerError} on 500',
              () async {
                // Arrange
                mockApiClient.mockStatusCode(endpoint.contract.path, 500, {
                  'error': 'Internal Server Error',
                });

                // Act
                final result = await endpoint.invoke(service);

                // Assert
                expect(result, equals(endpoint.contract.onServerError));
              },
            );
          } else {
            test('${endpoint.contract.description} throws on 500', () async {
              // Arrange
              mockApiClient.mockStatusCode(endpoint.contract.path, 500, {
                'error': 'Internal Server Error',
              });

              // Act & Assert
              expect(() => endpoint.invoke(service), throwsA(isA<Exception>()));
            });
          }
        }
      });

      // -----------------------------------------------------------------------
      // SUCCESS PATH TESTS
      // -----------------------------------------------------------------------
      group('Success Paths', () {
        for (final endpoint in endpoints) {
          test(
            '${endpoint.contract.description} succeeds with valid response',
            () async {
              // Arrange
              mockApiClient.mockResponse(
                endpoint.contract.path,
                endpoint.contract.successResponse,
              );

              // Act
              final result = await endpoint.invoke(service);

              // Assert
              expect(result, isNotNull);
            },
          );
        }
      });
    });
  }

  /// Generate DI construction tests for any service
  static void generateConstructionTests<T>({
    required String serviceName,
    required T Function(ApiClient) createWithApiClient,
    T Function(ApiClient, dynamic)? createWithTokenProvider,
  }) {
    group('$serviceName Construction (Generated)', () {
      late MockApiClient mockApiClient;

      setUp(() {
        mockApiClient = MockApiClient();
      });

      test('constructs with ApiClient', () {
        final service = createWithApiClient(mockApiClient);
        expect(service, isNotNull);
        expect(service, isA<T>());
      });

      if (createWithTokenProvider != null) {
        test('constructs with ApiClient and TokenProvider', () {
          final mockTokenProvider = MockTokenProvider('test');
          final service = createWithTokenProvider(
            mockApiClient,
            mockTokenProvider,
          );
          expect(service, isNotNull);
          expect(service, isA<T>());
        });

        test('constructs with ApiClient and unauthenticated TokenProvider', () {
          final unauthProvider = MockTokenProvider.unauthenticated();
          final service = createWithTokenProvider(
            mockApiClient,
            unauthProvider,
          );
          expect(service, isNotNull);
        });
      }
    });
  }
}

// =============================================================================
// COMMON SERVICE TEST MIXIN - Shared behavior for all API services
// =============================================================================

/// Mixin providing common test helpers for API-based services
mixin ApiServiceTestHelpers {
  late MockApiClient mockApiClient;
  late MockTokenProvider mockTokenProvider;

  void setUpApiMocks() {
    mockApiClient = MockApiClient();
    mockTokenProvider = MockTokenProvider('test-token');
  }

  void tearDownApiMocks() {
    mockApiClient.reset();
  }

  MockTokenProvider get unauthenticatedProvider =>
      MockTokenProvider.unauthenticated();

  /// Configure mock to return specific status code for endpoint
  void mockStatus(
    String endpoint,
    int statusCode, [
    Map<String, dynamic>? body,
  ]) {
    mockApiClient.mockStatusCode(endpoint, statusCode, body);
  }

  /// Configure mock to return success response
  void mockSuccess(String endpoint, Map<String, dynamic> body) {
    mockApiClient.mockResponse(endpoint, body);
  }

  /// Verify endpoint was called
  bool wasEndpointCalled(String endpoint) {
    return mockApiClient.wasCalled(endpoint);
  }
}
