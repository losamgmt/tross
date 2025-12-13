import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';

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
/// - Consistent styling across dashboards
/// - Zero business logic, pure presentation
///
/// This is the generic equivalent of Lane's `_buildStatCard()` and
/// `_buildQuickActionCard()` patterns.
///
/// Usage:
/// ```dart
/// // Simple stat card
/// StatCard(
///   label: 'Total Assets',
///   value: '14',
///   backgroundColor: Colors.grey.shade200,
///   textColor: Colors.black87,
/// )
///
/// // With icon and tap action
/// StatCard(
///   label: 'Pending',
///   value: '6',
///   icon: Icons.pending_outlined,
///   backgroundColor: Colors.orange.shade100,
///   textColor: Colors.orange.shade700,
///   onTap: () => navigateToPending(),
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
  });

  @override
  Widget build(BuildContext context) {
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
