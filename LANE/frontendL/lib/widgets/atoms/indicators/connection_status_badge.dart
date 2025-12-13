/// ConnectionStatusBadge - Atom for connection/health status display
///
/// Displays status with color-coded badge, icon, and optional text label
/// Supports three states: healthy (green), degraded (amber), critical (red), unknown (grey)
///
/// Usage:
/// ```dart
/// ConnectionStatusBadge(status: HealthStatus.healthy)
/// ConnectionStatusBadge(status: HealthStatus.degraded, label: 'Database')
/// ConnectionStatusBadge(status: HealthStatus.critical, showLabel: false)
/// ```
///
/// Note: HealthStatus enum is defined in models/database_health.dart for
/// proper separation of concerns (models should not depend on widgets).
library;

import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';
import '../../../config/app_colors.dart';
import '../../../models/database_health.dart'; // Import HealthStatus from model

/// Atomic component for displaying health/connection status
class ConnectionStatusBadge extends StatelessWidget {
  /// Current health status
  final HealthStatus status;

  /// Optional custom label (defaults to status name if showLabel is true)
  final String? label;

  /// Whether to show text label alongside icon
  final bool showLabel;

  /// Whether to show in compact mode (smaller size)
  final bool isCompact;

  const ConnectionStatusBadge({
    super.key,
    required this.status,
    this.label,
    this.showLabel = true,
    this.isCompact = false,
  });

  /// Factory: Backend connection status (legacy compatibility)
  factory ConnectionStatusBadge.connection({
    required bool isConnected,
    String? label,
    bool showLabel = true,
  }) {
    return ConnectionStatusBadge(
      status: isConnected ? HealthStatus.healthy : HealthStatus.critical,
      label: label,
      showLabel: showLabel,
    );
  }

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final theme = Theme.of(context);

    final statusData = _getStatusData(theme);
    final displayLabel = label ?? _getDefaultLabel();

    if (isCompact) {
      return _buildCompactBadge(statusData, spacing);
    }

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: spacing.md,
        vertical: spacing.sm,
      ),
      decoration: BoxDecoration(
        color: statusData.color.withValues(alpha: 0.1),
        borderRadius: spacing.radiusSM,
        border: Border.all(
          color: statusData.color.withValues(alpha: 0.3),
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            statusData.icon,
            color: statusData.color,
            size: spacing.iconSizeSM,
          ),
          if (showLabel) ...[
            SizedBox(width: spacing.xs),
            Flexible(
              child: Text(
                displayLabel,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: statusData.color,
                  fontWeight: FontWeight.w600,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildCompactBadge(_StatusData statusData, AppSpacing spacing) {
    return Container(
      width: spacing.md,
      height: spacing.md,
      decoration: BoxDecoration(
        color: statusData.color,
        shape: BoxShape.circle,
      ),
    );
  }

  _StatusData _getStatusData(ThemeData theme) {
    switch (status) {
      case HealthStatus.healthy:
        return _StatusData(color: AppColors.success, icon: Icons.check_circle);
      case HealthStatus.degraded:
        return _StatusData(color: AppColors.warning, icon: Icons.warning);
      case HealthStatus.critical:
        return _StatusData(color: AppColors.error, icon: Icons.error);
      case HealthStatus.unknown:
        return _StatusData(
          color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
          icon: Icons.help_outline,
        );
    }
  }

  String _getDefaultLabel() {
    switch (status) {
      case HealthStatus.healthy:
        return 'Healthy';
      case HealthStatus.degraded:
        return 'Degraded';
      case HealthStatus.critical:
        return 'Critical';
      case HealthStatus.unknown:
        return 'Unknown';
    }
  }
}

/// Internal data class for status styling
class _StatusData {
  final Color color;
  final IconData icon;

  const _StatusData({required this.color, required this.icon});
}
