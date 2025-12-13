/// DatabaseHealthCard - Molecule for displaying database health information
///
/// Displays comprehensive health info for a single database:
/// - Database name
/// - Connection status (using ConnectionStatusBadge)
/// - Response time
/// - Connection count
/// - Last check timestamp
///
/// Usage:
/// ```dart
/// DatabaseHealthCard(
///   databaseName: 'Users Database',
///   status: HealthStatus.healthy,
///   responseTime: Duration(milliseconds: 45),
///   connectionCount: 12,
///   lastChecked: DateTime.now(),
/// )
/// ```
library;

import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';
import '../../../config/app_colors.dart';
import '../../../utils/helpers/date_time_helpers.dart';
import '../../../utils/helpers/color_helpers.dart';
import '../../../models/database_health.dart';
import '../../atoms/indicators/connection_status_badge.dart';

/// Molecule component for displaying database health information
class DatabaseHealthCard extends StatelessWidget {
  /// Name of the database
  final String databaseName;

  /// Current health status
  final HealthStatus status;

  /// Database response time (latency)
  final Duration responseTime;

  /// Number of active connections
  final int connectionCount;

  /// When the health check was last performed
  final DateTime lastChecked;

  /// Optional error message (for critical/degraded states)
  final String? errorMessage;

  /// Whether to show detailed metrics (response time, connections)
  final bool showDetails;

  const DatabaseHealthCard({
    super.key,
    required this.databaseName,
    required this.status,
    required this.responseTime,
    required this.connectionCount,
    required this.lastChecked,
    this.errorMessage,
    this.showDetails = true,
  });

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: EdgeInsets.all(spacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header: Name + Status Badge
            _buildHeader(theme, spacing),

            if (errorMessage != null) ...[
              SizedBox(height: spacing.sm),
              _buildErrorMessage(theme, spacing),
            ],

            if (showDetails) ...[
              SizedBox(height: spacing.md),
              _buildMetrics(theme, spacing),
            ],

            SizedBox(height: spacing.sm),
            _buildLastChecked(theme, spacing),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(ThemeData theme, AppSpacing spacing) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Flexible(
          child: Text(
            databaseName,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ),
        SizedBox(width: spacing.sm),
        ConnectionStatusBadge(status: status, showLabel: false),
      ],
    );
  }

  Widget _buildErrorMessage(ThemeData theme, AppSpacing spacing) {
    return Container(
      padding: EdgeInsets.all(spacing.sm),
      decoration: BoxDecoration(
        color: AppColors.error.withValues(alpha: 0.1),
        borderRadius: spacing.radiusSM,
        border: Border.all(
          color: AppColors.error.withValues(alpha: 0.3),
          width: 1,
        ),
      ),
      child: Row(
        children: [
          Icon(
            Icons.error_outline,
            color: AppColors.error,
            size: spacing.iconSizeSM,
          ),
          SizedBox(width: spacing.xs),
          Flexible(
            child: Text(
              errorMessage!,
              style: theme.textTheme.bodySmall?.copyWith(
                color: AppColors.error,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMetrics(ThemeData theme, AppSpacing spacing) {
    return Row(
      children: [
        Flexible(
          child: _buildMetricItem(
            theme,
            spacing,
            icon: Icons.timer_outlined,
            label: 'Response Time',
            value: DateTimeHelpers.formatResponseTime(responseTime),
            color: ColorHelpers.responseTimeColor(responseTime),
          ),
        ),
        SizedBox(width: spacing.md),
        Flexible(
          child: _buildMetricItem(
            theme,
            spacing,
            icon: Icons.link,
            label: 'Connections',
            value: connectionCount.toString(),
            color: AppColors.textSecondary,
          ),
        ),
      ],
    );
  }

  Widget _buildMetricItem(
    ThemeData theme,
    AppSpacing spacing, {
    required IconData icon,
    required String label,
    required String value,
    required Color color,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: spacing.iconSizeXS, color: color),
            SizedBox(width: spacing.xxs),
            Flexible(
              child: Text(
                label,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: AppColors.textSecondary,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
        SizedBox(height: spacing.xxs),
        Text(
          value,
          style: theme.textTheme.titleSmall?.copyWith(
            color: color,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }

  Widget _buildLastChecked(ThemeData theme, AppSpacing spacing) {
    return Row(
      children: [
        Icon(
          Icons.schedule,
          size: spacing.iconSizeXS,
          color: AppColors.textSecondary,
        ),
        SizedBox(width: spacing.xxs),
        Flexible(
          child: Text(
            'Last checked: ${DateTimeHelpers.formatRelativeTime(lastChecked)}',
            style: theme.textTheme.bodySmall?.copyWith(
              color: AppColors.textSecondary,
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}
