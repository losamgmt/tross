/// Test-friendly ApiClient wrapper
///
/// Provides an injectable interface for ApiClient that can be mocked in tests.
/// This solves the problem of ApiClient using static methods (which can't be mocked).
///
/// Usage in tests:
/// ```dart
/// final mockClient = MockHttpClient();
/// final testApiClient = TestApiClient(httpClient: mockClient);
///
/// when(mockClient.get(any, headers: anyNamed('headers')))
///   .thenAnswer((_) async => http.Response('{"data": "test"}', 200));
/// ```
library;

import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:tross_app/config/app_config.dart';

/// Injectable ApiClient for testing
class TestApiClient {
  final http.Client httpClient;
  final String? testToken;

  TestApiClient({http.Client? httpClient, this.testToken})
    : httpClient = httpClient ?? http.Client();

  /// GET request
  Future<Map<String, dynamic>> get(
    String endpoint, {
    Map<String, String>? queryParameters,
    String? token,
  }) async {
    final authToken = token ?? testToken ?? 'test-token';

    // Build URI with query parameters
    String finalEndpoint = endpoint;
    if (queryParameters != null && queryParameters.isNotEmpty) {
      final queryString = queryParameters.entries
          .map((e) => '${e.key}=${Uri.encodeComponent(e.value)}')
          .join('&');
      finalEndpoint = '$endpoint?$queryString';
    }

    final uri = Uri.parse('${AppConfig.baseUrl}$finalEndpoint');
    final headers = {
      'Authorization': 'Bearer $authToken',
      'Content-Type': 'application/json',
    };

    final response = await httpClient.get(uri, headers: headers);
    return _parseResponse(response);
  }

  /// POST request
  Future<Map<String, dynamic>> post(
    String endpoint, {
    Map<String, dynamic>? body,
    String? token,
  }) async {
    final authToken = token ?? testToken ?? 'test-token';
    final uri = Uri.parse('${AppConfig.baseUrl}$endpoint');
    final headers = {
      'Authorization': 'Bearer $authToken',
      'Content-Type': 'application/json',
    };

    final response = await httpClient.post(
      uri,
      headers: headers,
      body: body != null ? json.encode(body) : null,
    );

    return _parseResponse(response);
  }

  /// PUT request
  Future<Map<String, dynamic>> put(
    String endpoint, {
    Map<String, dynamic>? body,
    String? token,
  }) async {
    final authToken = token ?? testToken ?? 'test-token';
    final uri = Uri.parse('${AppConfig.baseUrl}$endpoint');
    final headers = {
      'Authorization': 'Bearer $authToken',
      'Content-Type': 'application/json',
    };

    final response = await httpClient.put(
      uri,
      headers: headers,
      body: body != null ? json.encode(body) : null,
    );

    return _parseResponse(response);
  }

  /// DELETE request
  Future<Map<String, dynamic>> delete(String endpoint, {String? token}) async {
    final authToken = token ?? testToken ?? 'test-token';
    final uri = Uri.parse('${AppConfig.baseUrl}$endpoint');
    final headers = {
      'Authorization': 'Bearer $authToken',
      'Content-Type': 'application/json',
    };

    final response = await httpClient.delete(uri, headers: headers);
    return _parseResponse(response);
  }

  /// Parse HTTP response to JSON
  Map<String, dynamic> _parseResponse(http.Response response) {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.body.isEmpty) {
        return {};
      }
      return json.decode(response.body) as Map<String, dynamic>;
    } else {
      throw Exception('HTTP ${response.statusCode}: ${response.reasonPhrase}');
    }
  }

  void close() {
    httpClient.close();
  }
}
