/// Centralized Mock Setup for Service Tests
///
/// Provides pre-configured mock responses for common API patterns.
/// This ensures consistency across all service tests.
///
/// Usage:
/// ```dart
/// final mockClient = MockClient();
/// final mockSetup = MockSetup(mockClient);
///
/// // Setup successful response
/// mockSetup.setupGetSuccess('/api/roles', [
///   {'id': 1, 'name': 'Admin'},
///   {'id': 2, 'name': 'User'},
/// ]);
///
/// // Setup error response
/// mockSetup.setupError('/api/roles/999', 404, 'Not found');
/// ```
library;

import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:mockito/mockito.dart';
import 'package:tross_app/config/app_config.dart';
import '../mocks/http_client_mock.mocks.dart';

export '../mocks/http_client_mock.mocks.dart';
export 'package:mockito/mockito.dart';

class MockSetup {
  final MockClient mockClient;

  MockSetup(this.mockClient);

  /// Setup successful GET response
  void setupGetSuccess(String endpoint, dynamic responseData) {
    final uri = Uri.parse('${AppConfig.baseUrl}$endpoint');

    when(mockClient.get(uri, headers: anyNamed('headers'))).thenAnswer(
      (_) async => http.Response(
        json.encode(responseData),
        200,
        headers: {'content-type': 'application/json'},
      ),
    );
  }

  /// Setup successful POST response
  void setupPostSuccess(
    String endpoint,
    dynamic responseData, {
    Map<String, dynamic>? expectedBody,
  }) {
    final uri = Uri.parse('${AppConfig.baseUrl}$endpoint');

    final invocation = when(
      mockClient.post(
        uri,
        headers: anyNamed('headers'),
        body: expectedBody != null
            ? json.encode(expectedBody)
            : anyNamed('body'),
      ),
    );

    invocation.thenAnswer(
      (_) async => http.Response(
        json.encode(responseData),
        201,
        headers: {'content-type': 'application/json'},
      ),
    );
  }

  /// Setup successful PUT response
  void setupPutSuccess(
    String endpoint,
    dynamic responseData, {
    Map<String, dynamic>? expectedBody,
  }) {
    final uri = Uri.parse('${AppConfig.baseUrl}$endpoint');

    final invocation = when(
      mockClient.put(
        uri,
        headers: anyNamed('headers'),
        body: expectedBody != null
            ? json.encode(expectedBody)
            : anyNamed('body'),
      ),
    );

    invocation.thenAnswer(
      (_) async => http.Response(
        json.encode(responseData),
        200,
        headers: {'content-type': 'application/json'},
      ),
    );
  }

  /// Setup successful DELETE response
  void setupDeleteSuccess(String endpoint, {String? message}) {
    final uri = Uri.parse('${AppConfig.baseUrl}$endpoint');

    when(mockClient.delete(uri, headers: anyNamed('headers'))).thenAnswer(
      (_) async => http.Response(
        json.encode({'message': message ?? 'Deleted successfully'}),
        200,
        headers: {'content-type': 'application/json'},
      ),
    );
  }

  /// Setup error response for any method
  void setupError(String endpoint, int statusCode, String message) {
    final uri = Uri.parse('${AppConfig.baseUrl}$endpoint');
    final errorResponse = http.Response(
      json.encode({'error': message}),
      statusCode,
      headers: {'content-type': 'application/json'},
    );

    when(
      mockClient.get(uri, headers: anyNamed('headers')),
    ).thenAnswer((_) async => errorResponse);
    when(
      mockClient.post(
        uri,
        headers: anyNamed('headers'),
        body: anyNamed('body'),
      ),
    ).thenAnswer((_) async => errorResponse);
    when(
      mockClient.put(uri, headers: anyNamed('headers'), body: anyNamed('body')),
    ).thenAnswer((_) async => errorResponse);
    when(
      mockClient.delete(uri, headers: anyNamed('headers')),
    ).thenAnswer((_) async => errorResponse);
  }

  /// Setup exception (network error, timeout, etc)
  void setupException(String endpoint, Exception exception) {
    final uri = Uri.parse('${AppConfig.baseUrl}$endpoint');

    when(
      mockClient.get(uri, headers: anyNamed('headers')),
    ).thenThrow(exception);
    when(
      mockClient.post(
        uri,
        headers: anyNamed('headers'),
        body: anyNamed('body'),
      ),
    ).thenThrow(exception);
    when(
      mockClient.put(uri, headers: anyNamed('headers'), body: anyNamed('body')),
    ).thenThrow(exception);
    when(
      mockClient.delete(uri, headers: anyNamed('headers')),
    ).thenThrow(exception);
  }

  /// Verify GET was called with expected parameters
  void verifyGetCalled(String endpoint, {int times = 1}) {
    final uri = Uri.parse('${AppConfig.baseUrl}$endpoint');
    verify(mockClient.get(uri, headers: anyNamed('headers'))).called(times);
  }

  /// Verify POST was called with expected body
  void verifyPostCalled(
    String endpoint,
    Map<String, dynamic> expectedBody, {
    int times = 1,
  }) {
    final uri = Uri.parse('${AppConfig.baseUrl}$endpoint');
    verify(
      mockClient.post(
        uri,
        headers: anyNamed('headers'),
        body: json.encode(expectedBody),
      ),
    ).called(times);
  }

  /// Verify PUT was called with expected body
  void verifyPutCalled(
    String endpoint,
    Map<String, dynamic> expectedBody, {
    int times = 1,
  }) {
    final uri = Uri.parse('${AppConfig.baseUrl}$endpoint');
    verify(
      mockClient.put(
        uri,
        headers: anyNamed('headers'),
        body: json.encode(expectedBody),
      ),
    ).called(times);
  }

  /// Verify DELETE was called
  void verifyDeleteCalled(String endpoint, {int times = 1}) {
    final uri = Uri.parse('${AppConfig.baseUrl}$endpoint');
    verify(mockClient.delete(uri, headers: anyNamed('headers'))).called(times);
  }

  /// Reset all mock interactions
  void resetMocks() {
    reset(mockClient);
  }
}
