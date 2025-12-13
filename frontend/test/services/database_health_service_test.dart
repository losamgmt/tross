/// Tests for DatabaseHealthService
///
/// **BEHAVIORAL FOCUS:**
/// - Abstract interface defines contract
/// - ApiDatabaseHealthService makes HTTP calls correctly
/// - Handles various HTTP response codes
/// - Logs errors appropriately
library;

import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:tross_app/services/database_health_service.dart';
import 'package:tross_app/models/database_health.dart';

void main() {
  group('DatabaseHealthService', () {
    group('interface contract', () {
      test('ApiDatabaseHealthService implements DatabaseHealthService', () {
        final service = ApiDatabaseHealthService(
          apiBaseUrl: 'http://localhost:3001',
          authToken: 'test-token',
        );

        expect(service, isA<DatabaseHealthService>());
      });
    });

    group('ApiDatabaseHealthService', () {
      late ApiDatabaseHealthService service;

      group('constructor', () {
        test('accepts required parameters', () {
          final service = ApiDatabaseHealthService(
            apiBaseUrl: 'http://localhost:3001',
            authToken: 'my-token',
          );

          expect(service, isNotNull);
        });

        test('accepts optional http client', () {
          final mockClient = MockClient((request) async {
            return http.Response('{}', 200);
          });

          final service = ApiDatabaseHealthService(
            apiBaseUrl: 'http://localhost:3001',
            authToken: 'token',
            client: mockClient,
          );

          expect(service, isNotNull);
        });
      });

      group('fetchHealth', () {
        test('calls correct endpoint', () async {
          String? capturedUrl;

          final mockClient = MockClient((request) async {
            capturedUrl = request.url.toString();
            return http.Response(
              jsonEncode({
                'databases': [],
                'timestamp': '2025-01-15T10:00:00Z',
              }),
              200,
            );
          });

          service = ApiDatabaseHealthService(
            apiBaseUrl: 'http://api.example.com',
            authToken: 'token',
            client: mockClient,
          );

          await service.fetchHealth();

          expect(capturedUrl, 'http://api.example.com/api/health/databases');
        });

        test('includes authorization header', () async {
          String? capturedAuthHeader;

          final mockClient = MockClient((request) async {
            capturedAuthHeader = request.headers['Authorization'];
            return http.Response(
              jsonEncode({
                'databases': [],
                'timestamp': '2025-01-15T10:00:00Z',
              }),
              200,
            );
          });

          service = ApiDatabaseHealthService(
            apiBaseUrl: 'http://localhost:3001',
            authToken: 'secret-token-123',
            client: mockClient,
          );

          await service.fetchHealth();

          expect(capturedAuthHeader, 'Bearer secret-token-123');
        });

        test('includes content-type header', () async {
          String? capturedContentType;

          final mockClient = MockClient((request) async {
            capturedContentType = request.headers['Content-Type'];
            return http.Response(
              jsonEncode({
                'databases': [],
                'timestamp': '2025-01-15T10:00:00Z',
              }),
              200,
            );
          });

          service = ApiDatabaseHealthService(
            apiBaseUrl: 'http://localhost:3001',
            authToken: 'token',
            client: mockClient,
          );

          await service.fetchHealth();

          expect(capturedContentType, 'application/json');
        });

        test('includes cache-control header', () async {
          String? capturedCacheControl;

          final mockClient = MockClient((request) async {
            capturedCacheControl = request.headers['Cache-Control'];
            return http.Response(
              jsonEncode({
                'databases': [],
                'timestamp': '2025-01-15T10:00:00Z',
              }),
              200,
            );
          });

          service = ApiDatabaseHealthService(
            apiBaseUrl: 'http://localhost:3001',
            authToken: 'token',
            client: mockClient,
          );

          await service.fetchHealth();

          expect(capturedCacheControl, 'no-cache');
        });

        test(
          'parses successful response into DatabasesHealthResponse',
          () async {
            final mockClient = MockClient((request) async {
              return http.Response(
                jsonEncode({
                  'databases': [
                    {
                      'name': 'primary',
                      'status': 'healthy',
                      'responseTime': 15,
                      'connectionCount': 5,
                      'maxConnections': 100,
                      'lastChecked': '2025-01-15T10:00:00Z',
                    },
                  ],
                  'timestamp': '2025-01-15T10:00:00Z',
                }),
                200,
              );
            });

            service = ApiDatabaseHealthService(
              apiBaseUrl: 'http://localhost:3001',
              authToken: 'token',
              client: mockClient,
            );

            final result = await service.fetchHealth();

            expect(result, isA<DatabasesHealthResponse>());
          },
        );

        test('throws on 401 unauthorized', () async {
          final mockClient = MockClient((request) async {
            return http.Response('Unauthorized', 401);
          });

          service = ApiDatabaseHealthService(
            apiBaseUrl: 'http://localhost:3001',
            authToken: 'expired-token',
            client: mockClient,
          );

          expect(
            () => service.fetchHealth(),
            throwsA(
              isA<Exception>().having(
                (e) => e.toString(),
                'message',
                contains('Authentication'),
              ),
            ),
          );
        });

        test('throws on 403 forbidden', () async {
          final mockClient = MockClient((request) async {
            return http.Response('Forbidden', 403);
          });

          service = ApiDatabaseHealthService(
            apiBaseUrl: 'http://localhost:3001',
            authToken: 'non-admin-token',
            client: mockClient,
          );

          expect(
            () => service.fetchHealth(),
            throwsA(
              isA<Exception>().having(
                (e) => e.toString(),
                'message',
                contains('Admin'),
              ),
            ),
          );
        });

        test('throws on 304 cache issue', () async {
          final mockClient = MockClient((request) async {
            return http.Response('', 304);
          });

          service = ApiDatabaseHealthService(
            apiBaseUrl: 'http://localhost:3001',
            authToken: 'token',
            client: mockClient,
          );

          expect(
            () => service.fetchHealth(),
            throwsA(
              isA<Exception>().having(
                (e) => e.toString(),
                'message',
                contains('304'),
              ),
            ),
          );
        });

        test('throws on 500 server error', () async {
          final mockClient = MockClient((request) async {
            return http.Response('Internal Server Error', 500);
          });

          service = ApiDatabaseHealthService(
            apiBaseUrl: 'http://localhost:3001',
            authToken: 'token',
            client: mockClient,
          );

          expect(
            () => service.fetchHealth(),
            throwsA(
              isA<Exception>().having(
                (e) => e.toString(),
                'message',
                contains('500'),
              ),
            ),
          );
        });

        test('rethrows network errors', () async {
          final mockClient = MockClient((request) async {
            throw Exception('Network unreachable');
          });

          service = ApiDatabaseHealthService(
            apiBaseUrl: 'http://localhost:3001',
            authToken: 'token',
            client: mockClient,
          );

          expect(
            () => service.fetchHealth(),
            throwsA(
              isA<Exception>().having(
                (e) => e.toString(),
                'message',
                contains('Network unreachable'),
              ),
            ),
          );
        });
      });
    });
  });
}
