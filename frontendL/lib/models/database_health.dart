/// Database Health Data Model
///
/// Models for database health monitoring data from /api/health/databases
/// Last synced: 2025-11-07 (Added defensive validation + moved HealthStatus enum)
///
/// DEFENSIVE: Validates all API response data with toSafe*() validators
/// Philosophy: Never trust external data - validate at every boundary
library;

import '../utils/validators.dart';

/// Health/Connection status states
///
/// Used for database health monitoring and any service health checks.
/// Moved from connection_status_badge.dart for proper separation of concerns
/// (model layer should not depend on widget layer).
enum HealthStatus {
  /// Service is fully operational
  healthy,

  /// Service is operational but degraded (slow, partial failure)
  degraded,

  /// Service is not operational
  critical,

  /// Status is unknown (loading, not yet checked)
  unknown,
}

/// Individual database health information
class DatabaseHealth {
  /// Database name
  final String name;

  /// Current health status
  final HealthStatus status;

  /// Response time in milliseconds
  final int responseTime;

  /// Current number of active connections
  final int connectionCount;

  /// Maximum allowed connections
  final int maxConnections;

  /// When the health check was last performed (ISO 8601)
  final String lastChecked;

  /// Error message if status is degraded or critical
  final String? errorMessage;

  const DatabaseHealth({
    required this.name,
    required this.status,
    required this.responseTime,
    required this.connectionCount,
    required this.maxConnections,
    required this.lastChecked,
    this.errorMessage,
  });

  /// Create from JSON
  ///
  /// DEFENSIVE: Validates all fields with toSafe*() to prevent runtime crashes
  /// Throws ArgumentError with clear field name if data is invalid
  factory DatabaseHealth.fromJson(Map<String, dynamic> json) {
    try {
      return DatabaseHealth(
        name: Validators.toSafeString(
          json['name'],
          'database_health.name',
          minLength: 1,
        )!,
        status: _parseStatus(
          Validators.toSafeString(json['status'], 'database_health.status')!,
        ),
        responseTime: Validators.toSafeInt(
          json['responseTime'],
          'database_health.responseTime',
          min: 0,
        )!,
        connectionCount: Validators.toSafeInt(
          json['connectionCount'],
          'database_health.connectionCount',
          min: 0,
        )!,
        maxConnections: Validators.toSafeInt(
          json['maxConnections'],
          'database_health.maxConnections',
          min: 1,
        )!,
        lastChecked: Validators.toSafeString(
          json['lastChecked'],
          'database_health.lastChecked',
        )!,
        errorMessage: json['errorMessage'] != null
            ? Validators.toSafeString(
                json['errorMessage'],
                'database_health.errorMessage',
              )
            : null,
      );
    } catch (e) {
      // Re-throw with context for debugging
      throw ArgumentError(
        'Failed to parse DatabaseHealth from JSON: $e\nJSON: $json',
      );
    }
  }

  /// Convert to JSON
  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'status': _statusToString(status),
      'responseTime': responseTime,
      'connectionCount': connectionCount,
      'maxConnections': maxConnections,
      'lastChecked': lastChecked,
      'errorMessage': errorMessage,
    };
  }

  /// Parse status string to HealthStatus enum
  static HealthStatus _parseStatus(String status) {
    switch (status.toLowerCase()) {
      case 'healthy':
        return HealthStatus.healthy;
      case 'degraded':
        return HealthStatus.degraded;
      case 'critical':
        return HealthStatus.critical;
      default:
        return HealthStatus.unknown;
    }
  }

  /// Convert HealthStatus enum to string
  static String _statusToString(HealthStatus status) {
    switch (status) {
      case HealthStatus.healthy:
        return 'healthy';
      case HealthStatus.degraded:
        return 'degraded';
      case HealthStatus.critical:
        return 'critical';
      case HealthStatus.unknown:
        return 'unknown';
    }
  }

  /// Get DateTime from ISO 8601 string
  DateTime get lastCheckedDateTime => DateTime.parse(lastChecked);

  /// Get Duration from milliseconds
  Duration get responseTimeDuration => Duration(milliseconds: responseTime);

  /// Calculate connection usage percentage (0.0 to 1.0)
  double get connectionUsage {
    if (maxConnections == 0) return 0.0;
    return connectionCount / maxConnections;
  }

  @override
  String toString() {
    return 'DatabaseHealth(name: $name, status: $status, responseTime: ${responseTime}ms)';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is DatabaseHealth &&
        other.name == name &&
        other.status == status &&
        other.responseTime == responseTime &&
        other.connectionCount == connectionCount &&
        other.maxConnections == maxConnections &&
        other.lastChecked == lastChecked &&
        other.errorMessage == errorMessage;
  }

  @override
  int get hashCode {
    return Object.hash(
      name,
      status,
      responseTime,
      connectionCount,
      maxConnections,
      lastChecked,
      errorMessage,
    );
  }
}

/// Response from /api/health/databases endpoint
class DatabasesHealthResponse {
  /// List of database health information
  final List<DatabaseHealth> databases;

  /// Timestamp when health check was performed (ISO 8601)
  final String timestamp;

  const DatabasesHealthResponse({
    required this.databases,
    required this.timestamp,
  });

  /// Create from JSON
  ///
  /// DEFENSIVE: Validates all fields with toSafe*() to prevent runtime crashes
  /// Throws ArgumentError with clear field name if data is invalid
  factory DatabasesHealthResponse.fromJson(Map<String, dynamic> json) {
    try {
      // Validate databases array exists and is a list
      if (!json.containsKey('databases') || json['databases'] is! List) {
        throw ArgumentError(
          'databases_health_response.databases must be a list',
        );
      }

      return DatabasesHealthResponse(
        databases: (json['databases'] as List)
            .map((db) => DatabaseHealth.fromJson(db as Map<String, dynamic>))
            .toList(),
        timestamp: Validators.toSafeString(
          json['timestamp'],
          'databases_health_response.timestamp',
        )!,
      );
    } catch (e) {
      // Re-throw with context for debugging
      throw ArgumentError(
        'Failed to parse DatabasesHealthResponse from JSON: $e\nJSON: $json',
      );
    }
  }

  /// Convert to JSON
  Map<String, dynamic> toJson() {
    return {
      'databases': databases.map((db) => db.toJson()).toList(),
      'timestamp': timestamp,
    };
  }

  /// Get DateTime from ISO 8601 string
  DateTime get timestampDateTime => DateTime.parse(timestamp);

  /// Get overall system status (worst status among all databases)
  HealthStatus get overallStatus {
    if (databases.isEmpty) return HealthStatus.unknown;

    // Critical takes precedence
    if (databases.any((db) => db.status == HealthStatus.critical)) {
      return HealthStatus.critical;
    }

    // Then degraded
    if (databases.any((db) => db.status == HealthStatus.degraded)) {
      return HealthStatus.degraded;
    }

    // Then unknown
    if (databases.any((db) => db.status == HealthStatus.unknown)) {
      return HealthStatus.unknown;
    }

    // All healthy
    return HealthStatus.healthy;
  }

  @override
  String toString() {
    return 'DatabasesHealthResponse(databases: ${databases.length}, overall: $overallStatus)';
  }
}
