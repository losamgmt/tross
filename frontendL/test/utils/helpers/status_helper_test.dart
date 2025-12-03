/// StatusHelper - Unit Tests
///
/// Tests simple status-to-label mapping
/// KISS: Pure enum-to-string conversion
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/models/database_health.dart';
import 'package:tross_app/utils/helpers/status_helper.dart';

void main() {
  group('StatusHelper', () {
    group('getHealthStatusLabel', () {
      test('returns correct label for healthy status', () {
        // Act
        final result = StatusHelper.getHealthStatusLabel(HealthStatus.healthy);

        // Assert
        expect(result, 'All Systems Operational');
      });

      test('returns correct label for degraded status', () {
        // Act
        final result = StatusHelper.getHealthStatusLabel(HealthStatus.degraded);

        // Assert
        expect(result, 'System Degraded');
      });

      test('returns correct label for critical status', () {
        // Act
        final result = StatusHelper.getHealthStatusLabel(HealthStatus.critical);

        // Assert
        expect(result, 'System Critical');
      });

      test('returns correct label for unknown status', () {
        // Act
        final result = StatusHelper.getHealthStatusLabel(HealthStatus.unknown);

        // Assert
        expect(result, 'Status Unknown');
      });

      test('covers all HealthStatus enum values', () {
        // Arrange - Get all enum values
        final allStatuses = HealthStatus.values;

        // Act & Assert - Verify each has a label (no exception thrown)
        for (final status in allStatuses) {
          expect(
            () => StatusHelper.getHealthStatusLabel(status),
            returnsNormally,
            reason: 'Status $status should have a label',
          );
        }
      });
    });
  });
}
