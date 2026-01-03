import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';
import '../../../config/app_colors.dart';

/// StatCard - Molecule for displaying a statistic with label and count
///
/// **SOLE RESPONSIBILITY:** Render a colored card with a statistic display
///
/// Features:
/// - Large count/value display
/// - Label text
/// - Optional icon
/// - Customizable colors (background, text)
/// - Optional tap action
/// - Optional trend indicator (for dashboard cards)
/// - Consistent styling across dashboards
/// - Zero business logic, pure presentation
///
/// Usage:
/// ```dart
/// // Simple stat card (horizontal layout)
/// StatCard(
///   label: 'Total Assets',
///   value: '14',
///   backgroundColor: Colors.grey.shade200,
///   textColor: Colors.black87,
/// )
///
/// // Dashboard stat card with trend (vertical layout)
/// StatCard.dashboard(
///   label: 'Total Users',
///   value: '1,234',
///   icon: Icons.people_outline,
///   color: AppColors.brandPrimary,
///   trend: '+12%',
///   trendUp: true,
/// )
/// ```
class StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData? icon;
  final Color? backgroundColor;
  final Color? textColor;
  final Color? iconColor;
  final VoidCallback? onTap;
  final double? width;
  final double? minHeight;
  final bool showChevron;

  // Dashboard-specific properties
  final String? trend;
  final bool? trendUp;
  final bool _isDashboardStyle;

  const StatCard({
    super.key,
    required this.label,
    required this.value,
    this.icon,
    this.backgroundColor,
    this.textColor,
    this.iconColor,
    this.onTap,
    this.width,
    this.minHeight,
    this.showChevron = false,
  }) : trend = null,
       trendUp = null,
       _isDashboardStyle = false;

  /// Dashboard-style stat card with vertical layout and optional trend indicator
  const StatCard.dashboard({
    super.key,
    required this.label,
    required this.value,
    required this.icon,
    Color? color,
    this.trend,
    this.trendUp,
    this.onTap,
    this.width,
  }) : backgroundColor = null,
       textColor = color,
       iconColor = color,
       minHeight = null,
       showChevron = false,
       _isDashboardStyle = true;

  @override
  Widget build(BuildContext context) {
    if (_isDashboardStyle) {
      return _buildDashboardStyle(context);
    }
    return _buildCompactStyle(context);
  }

  /// Dashboard-style: Vertical layout with trend indicator, wrapped in Card
  Widget _buildDashboardStyle(BuildContext context) {
    final theme = Theme.of(context);
    final spacing = context.spacing;
    final cardColor = textColor ?? theme.colorScheme.primary;

    return Card(
      child: Padding(
        padding: spacing.paddingLG,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: spacing.paddingSM,
                  decoration: BoxDecoration(
                    color: cardColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(spacing.sm),
                  ),
                  child: Icon(icon, color: cardColor, size: 24),
                ),
                const Spacer(),
                if (trend != null) _buildTrendBadge(theme),
              ],
            ),
            SizedBox(height: spacing.lg),
            Text(
              value,
              style: theme.textTheme.headlineMedium?.copyWith(
                fontWeight: FontWeight.bold,
                color: cardColor,
              ),
            ),
            SizedBox(height: spacing.xxs),
            Text(
              label,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Trend badge for dashboard cards
  Widget _buildTrendBadge(ThemeData theme) {
    final isUp = trendUp ?? true;
    final trendColor = isUp ? AppColors.success : AppColors.error;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: trendColor.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            isUp ? Icons.trending_up : Icons.trending_down,
            size: 14,
            color: trendColor,
          ),
          const SizedBox(width: 4),
          Text(
            trend!,
            style: theme.textTheme.labelSmall?.copyWith(
              color: trendColor,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  /// Compact-style: Horizontal layout for quick stats
  Widget _buildCompactStyle(BuildContext context) {
    final spacing = context.spacing;
    final theme = Theme.of(context);
    final effectiveBackgroundColor =
        backgroundColor ?? theme.colorScheme.surfaceContainerHighest;
    final effectiveTextColor = textColor ?? theme.colorScheme.onSurface;
    final effectiveIconColor = iconColor ?? effectiveTextColor;

    final content = Container(
      width: width,
      constraints: BoxConstraints(minHeight: minHeight ?? 100),
      padding: EdgeInsets.all(spacing.lg),
      decoration: BoxDecoration(
        color: effectiveBackgroundColor,
        borderRadius: spacing.radiusMD,
        boxShadow: [
          BoxShadow(
            color: theme.shadowColor.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          // Icon (optional)
          if (icon != null) ...[
            Container(
              padding: EdgeInsets.all(spacing.md),
              decoration: BoxDecoration(
                color: effectiveIconColor.withValues(alpha: 0.1),
                borderRadius: spacing.radiusSM,
              ),
              child: Icon(icon, color: effectiveIconColor, size: 24),
            ),
            SizedBox(width: spacing.md),
          ],
          // Value + Label
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  value,
                  style: theme.textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: effectiveTextColor,
                  ),
                ),
                SizedBox(height: spacing.xxs),
                Text(
                  label,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: effectiveTextColor.withValues(alpha: 0.8),
                  ),
                ),
              ],
            ),
          ),
          // Chevron (optional, for clickable cards)
          if (showChevron || onTap != null)
            Icon(
              Icons.chevron_right,
              color: effectiveTextColor.withValues(alpha: 0.5),
            ),
        ],
      ),
    );

    if (onTap != null) {
      return InkWell(
        onTap: onTap,
        borderRadius: spacing.radiusMD,
        child: content,
      );
    }

    return content;
  }
}
