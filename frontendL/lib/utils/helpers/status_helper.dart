/// StatusHelper - Status enumeration to display label utilities
///
/// Uses centralized enums - ZERO duplication
/// NO business logic - pure status-to-label mapping only
/// SRP: Status label generation ONLY
library;

import '../../models/database_health.dart';

/// Status label utilities
class StatusHelper {
  StatusHelper._(); // Private constructor - static class only

  /// Maps HealthStatus enum to human-readable label
  ///
  /// Examples:
  ///   getHealthStatusLabel(HealthStatus.healthy) => 'All Systems Operational'
  ///   getHealthStatusLabel(HealthStatus.degraded) => 'System Degraded'
  ///   getHealthStatusLabel(HealthStatus.critical) => 'System Critical'
  static String getHealthStatusLabel(HealthStatus status) {
    return switch (status) {
      HealthStatus.healthy => 'All Systems Operational',
      HealthStatus.degraded => 'System Degraded',
      HealthStatus.critical => 'System Critical',
      HealthStatus.unknown => 'Status Unknown',
    };
  }
}
