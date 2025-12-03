/// Database Health Model Tests
///
/// Tests for database health data models covering:
/// - JSON serialization/deserialization
/// - Status parsing
/// - Helper methods
/// - Edge cases
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/models/database_health.dart';

void main() {
  group('DatabaseHealth Model', () {
    group('JSON Serialization', () {
      test('fromJson creates valid instance', () {
        final json = {
          'name': 'Test DB',
          'status': 'healthy',
          'responseTime': 50,
          'connectionCount': 10,
          'maxConnections': 100,
          'lastChecked': '2025-10-22T12:00:00.000Z',
          'errorMessage': null,
        };

        final db = DatabaseHealth.fromJson(json);

        expect(db.name, equals('Test DB'));
        expect(db.status, equals(HealthStatus.healthy));
        expect(db.responseTime, equals(50));
        expect(db.connectionCount, equals(10));
        expect(db.maxConnections, equals(100));
        expect(db.lastChecked, equals('2025-10-22T12:00:00.000Z'));
        expect(db.errorMessage, isNull);
      });

      test('fromJson with error message', () {
        final json = {
          'name': 'Failed DB',
          'status': 'critical',
          'responseTime': 5000,
          'connectionCount': 0,
          'maxConnections': 100,
          'lastChecked': '2025-10-22T12:00:00.000Z',
          'errorMessage': 'Connection timeout',
        };

        final db = DatabaseHealth.fromJson(json);

        expect(db.errorMessage, equals('Connection timeout'));
      });

      test('toJson creates valid map', () {
        final db = DatabaseHealth(
          name: 'Test DB',
          status: HealthStatus.healthy,
          responseTime: 50,
          connectionCount: 10,
          maxConnections: 100,
          lastChecked: '2025-10-22T12:00:00.000Z',
        );

        final json = db.toJson();

        expect(json['name'], equals('Test DB'));
        expect(json['status'], equals('healthy'));
        expect(json['responseTime'], equals(50));
        expect(json['connectionCount'], equals(10));
        expect(json['maxConnections'], equals(100));
        expect(json['lastChecked'], equals('2025-10-22T12:00:00.000Z'));
      });

      test('roundtrip serialization preserves data', () {
        final original = DatabaseHealth(
          name: 'Test DB',
          status: HealthStatus.degraded,
          responseTime: 250,
          connectionCount: 50,
          maxConnections: 100,
          lastChecked: '2025-10-22T12:00:00.000Z',
          errorMessage: 'Slow response',
        );

        final json = original.toJson();
        final restored = DatabaseHealth.fromJson(json);

        expect(restored.name, equals(original.name));
        expect(restored.status, equals(original.status));
        expect(restored.responseTime, equals(original.responseTime));
        expect(restored.connectionCount, equals(original.connectionCount));
        expect(restored.maxConnections, equals(original.maxConnections));
        expect(restored.lastChecked, equals(original.lastChecked));
        expect(restored.errorMessage, equals(original.errorMessage));
      });
    });

    group('Status Parsing', () {
      test('parses "healthy" status', () {
        final json = {
          'name': 'Test',
          'status': 'healthy',
          'responseTime': 50,
          'connectionCount': 10,
          'maxConnections': 100,
          'lastChecked': '2025-10-22T12:00:00.000Z',
        };

        final db = DatabaseHealth.fromJson(json);
        expect(db.status, equals(HealthStatus.healthy));
      });

      test('parses "degraded" status', () {
        final json = {
          'name': 'Test',
          'status': 'degraded',
          'responseTime': 250,
          'connectionCount': 10,
          'maxConnections': 100,
          'lastChecked': '2025-10-22T12:00:00.000Z',
        };

        final db = DatabaseHealth.fromJson(json);
        expect(db.status, equals(HealthStatus.degraded));
      });

      test('parses "critical" status', () {
        final json = {
          'name': 'Test',
          'status': 'critical',
          'responseTime': 5000,
          'connectionCount': 0,
          'maxConnections': 100,
          'lastChecked': '2025-10-22T12:00:00.000Z',
        };

        final db = DatabaseHealth.fromJson(json);
        expect(db.status, equals(HealthStatus.critical));
      });

      test('parses unknown status as unknown', () {
        final json = {
          'name': 'Test',
          'status': 'invalid',
          'responseTime': 0,
          'connectionCount': 0,
          'maxConnections': 100,
          'lastChecked': '2025-10-22T12:00:00.000Z',
        };

        final db = DatabaseHealth.fromJson(json);
        expect(db.status, equals(HealthStatus.unknown));
      });

      test('status parsing is case-insensitive', () {
        final json = {
          'name': 'Test',
          'status': 'HEALTHY',
          'responseTime': 50,
          'connectionCount': 10,
          'maxConnections': 100,
          'lastChecked': '2025-10-22T12:00:00.000Z',
        };

        final db = DatabaseHealth.fromJson(json);
        expect(db.status, equals(HealthStatus.healthy));
      });
    });

    group('Helper Methods', () {
      test('lastCheckedDateTime parses ISO 8601 string', () {
        final db = DatabaseHealth(
          name: 'Test',
          status: HealthStatus.healthy,
          responseTime: 50,
          connectionCount: 10,
          maxConnections: 100,
          lastChecked: '2025-10-22T12:30:45.000Z',
        );

        final dateTime = db.lastCheckedDateTime;
        expect(dateTime.year, equals(2025));
        expect(dateTime.month, equals(10));
        expect(dateTime.day, equals(22));
        expect(dateTime.hour, equals(12));
        expect(dateTime.minute, equals(30));
        expect(dateTime.second, equals(45));
      });

      test('responseTimeDuration converts milliseconds', () {
        final db = DatabaseHealth(
          name: 'Test',
          status: HealthStatus.healthy,
          responseTime: 1500,
          connectionCount: 10,
          maxConnections: 100,
          lastChecked: '2025-10-22T12:00:00.000Z',
        );

        expect(db.responseTimeDuration.inMilliseconds, equals(1500));
        expect(db.responseTimeDuration.inSeconds, equals(1));
      });

      test('connectionUsage calculates percentage correctly', () {
        final db = DatabaseHealth(
          name: 'Test',
          status: HealthStatus.healthy,
          responseTime: 50,
          connectionCount: 75,
          maxConnections: 100,
          lastChecked: '2025-10-22T12:00:00.000Z',
        );

        expect(db.connectionUsage, equals(0.75));
      });

      test('connectionUsage handles zero max connections', () {
        final db = DatabaseHealth(
          name: 'Test',
          status: HealthStatus.healthy,
          responseTime: 50,
          connectionCount: 0,
          maxConnections: 0,
          lastChecked: '2025-10-22T12:00:00.000Z',
        );

        expect(db.connectionUsage, equals(0.0));
      });

      test('connectionUsage handles 100% usage', () {
        final db = DatabaseHealth(
          name: 'Test',
          status: HealthStatus.critical,
          responseTime: 50,
          connectionCount: 100,
          maxConnections: 100,
          lastChecked: '2025-10-22T12:00:00.000Z',
        );

        expect(db.connectionUsage, equals(1.0));
      });
    });

    group('Equality and HashCode', () {
      test('identical instances are equal', () {
        final db1 = DatabaseHealth(
          name: 'Test',
          status: HealthStatus.healthy,
          responseTime: 50,
          connectionCount: 10,
          maxConnections: 100,
          lastChecked: '2025-10-22T12:00:00.000Z',
        );

        final db2 = DatabaseHealth(
          name: 'Test',
          status: HealthStatus.healthy,
          responseTime: 50,
          connectionCount: 10,
          maxConnections: 100,
          lastChecked: '2025-10-22T12:00:00.000Z',
        );

        expect(db1, equals(db2));
        expect(db1.hashCode, equals(db2.hashCode));
      });

      test('different instances are not equal', () {
        final db1 = DatabaseHealth(
          name: 'Test1',
          status: HealthStatus.healthy,
          responseTime: 50,
          connectionCount: 10,
          maxConnections: 100,
          lastChecked: '2025-10-22T12:00:00.000Z',
        );

        final db2 = DatabaseHealth(
          name: 'Test2',
          status: HealthStatus.healthy,
          responseTime: 50,
          connectionCount: 10,
          maxConnections: 100,
          lastChecked: '2025-10-22T12:00:00.000Z',
        );

        expect(db1, isNot(equals(db2)));
      });
    });
  });

  group('DatabasesHealthResponse Model', () {
    group('JSON Serialization', () {
      test('fromJson creates valid instance', () {
        final json = {
          'databases': [
            {
              'name': 'DB1',
              'status': 'healthy',
              'responseTime': 50,
              'connectionCount': 10,
              'maxConnections': 100,
              'lastChecked': '2025-10-22T12:00:00.000Z',
              'errorMessage': null,
            },
            {
              'name': 'DB2',
              'status': 'degraded',
              'responseTime': 250,
              'connectionCount': 80,
              'maxConnections': 100,
              'lastChecked': '2025-10-22T12:00:00.000Z',
              'errorMessage': 'High connections',
            },
          ],
          'timestamp': '2025-10-22T12:00:00.000Z',
        };

        final response = DatabasesHealthResponse.fromJson(json);

        expect(response.databases.length, equals(2));
        expect(response.databases[0].name, equals('DB1'));
        expect(response.databases[1].name, equals('DB2'));
        expect(response.timestamp, equals('2025-10-22T12:00:00.000Z'));
      });

      test('toJson creates valid map', () {
        final response = DatabasesHealthResponse(
          databases: [
            DatabaseHealth(
              name: 'DB1',
              status: HealthStatus.healthy,
              responseTime: 50,
              connectionCount: 10,
              maxConnections: 100,
              lastChecked: '2025-10-22T12:00:00.000Z',
            ),
          ],
          timestamp: '2025-10-22T12:00:00.000Z',
        );

        final json = response.toJson();

        expect(json['databases'], isA<List>());
        expect((json['databases'] as List).length, equals(1));
        expect(json['timestamp'], equals('2025-10-22T12:00:00.000Z'));
      });
    });

    group('Overall Status', () {
      test('returns healthy when all databases are healthy', () {
        final response = DatabasesHealthResponse(
          databases: [
            DatabaseHealth(
              name: 'DB1',
              status: HealthStatus.healthy,
              responseTime: 50,
              connectionCount: 10,
              maxConnections: 100,
              lastChecked: '2025-10-22T12:00:00.000Z',
            ),
            DatabaseHealth(
              name: 'DB2',
              status: HealthStatus.healthy,
              responseTime: 60,
              connectionCount: 15,
              maxConnections: 100,
              lastChecked: '2025-10-22T12:00:00.000Z',
            ),
          ],
          timestamp: '2025-10-22T12:00:00.000Z',
        );

        expect(response.overallStatus, equals(HealthStatus.healthy));
      });

      test('returns degraded when any database is degraded', () {
        final response = DatabasesHealthResponse(
          databases: [
            DatabaseHealth(
              name: 'DB1',
              status: HealthStatus.healthy,
              responseTime: 50,
              connectionCount: 10,
              maxConnections: 100,
              lastChecked: '2025-10-22T12:00:00.000Z',
            ),
            DatabaseHealth(
              name: 'DB2',
              status: HealthStatus.degraded,
              responseTime: 250,
              connectionCount: 80,
              maxConnections: 100,
              lastChecked: '2025-10-22T12:00:00.000Z',
            ),
          ],
          timestamp: '2025-10-22T12:00:00.000Z',
        );

        expect(response.overallStatus, equals(HealthStatus.degraded));
      });

      test('returns critical when any database is critical', () {
        final response = DatabasesHealthResponse(
          databases: [
            DatabaseHealth(
              name: 'DB1',
              status: HealthStatus.healthy,
              responseTime: 50,
              connectionCount: 10,
              maxConnections: 100,
              lastChecked: '2025-10-22T12:00:00.000Z',
            ),
            DatabaseHealth(
              name: 'DB2',
              status: HealthStatus.critical,
              responseTime: 5000,
              connectionCount: 0,
              maxConnections: 100,
              lastChecked: '2025-10-22T12:00:00.000Z',
            ),
          ],
          timestamp: '2025-10-22T12:00:00.000Z',
        );

        expect(response.overallStatus, equals(HealthStatus.critical));
      });

      test('critical takes precedence over degraded', () {
        final response = DatabasesHealthResponse(
          databases: [
            DatabaseHealth(
              name: 'DB1',
              status: HealthStatus.degraded,
              responseTime: 250,
              connectionCount: 80,
              maxConnections: 100,
              lastChecked: '2025-10-22T12:00:00.000Z',
            ),
            DatabaseHealth(
              name: 'DB2',
              status: HealthStatus.critical,
              responseTime: 5000,
              connectionCount: 0,
              maxConnections: 100,
              lastChecked: '2025-10-22T12:00:00.000Z',
            ),
          ],
          timestamp: '2025-10-22T12:00:00.000Z',
        );

        expect(response.overallStatus, equals(HealthStatus.critical));
      });

      test('returns unknown for empty database list', () {
        final response = DatabasesHealthResponse(
          databases: [],
          timestamp: '2025-10-22T12:00:00.000Z',
        );

        expect(response.overallStatus, equals(HealthStatus.unknown));
      });
    });
  });
}
