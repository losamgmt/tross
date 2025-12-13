/// DevModeIndicator - Molecule component for displaying environment status
///
/// Shows the current environment (Development/Production) with appropriate
/// styling and visibility based on props (not config).
///
/// Atomic Design: Molecule (uses Badge atom)
library;

import 'package:flutter/material.dart';
import '../../config/app_spacing.dart';
import '../atoms/indicators/app_badge.dart';

/// A visual indicator showing the current runtime environment
///
/// Features:
/// - Shows environment badge with icon
/// - Badge style based on isDevelopment prop
/// - Visibility controlled by props
///
/// Usage:
/// ```dart
/// // Simple usage
/// DevModeIndicator(
///   environmentName: 'Development',
///   isDevelopment: true,
/// )
///
/// // With visibility control
/// DevModeIndicator(
///   environmentName: AppConfig.environmentName,
///   isDevelopment: AppConfig.devAuthEnabled,
///   show: !AppConfig.useProdBackend || alwaysShow,
/// )
/// ```
class DevModeIndicator extends StatelessWidget {
  /// Name to display in badge (e.g., "Development", "Production")
  final String environmentName;

  /// Whether this is a development environment (affects badge style)
  final bool isDevelopment;

  /// Whether to show the indicator (default: true)
  final bool show;

  /// Use compact styling (smaller text, tighter padding)
  final bool compact;

  /// Optional callback when tapped
  final VoidCallback? onTap;

  const DevModeIndicator({
    super.key,
    required this.environmentName,
    required this.isDevelopment,
    this.show = true,
    this.compact = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    if (!show) {
      return const SizedBox.shrink();
    }

    final spacing = context.spacing;

    // Choose badge style and icon based on environment
    final badgeStyle = isDevelopment ? BadgeStyle.warning : BadgeStyle.success;
    final icon = isDevelopment ? Icons.code : Icons.verified_user;

    final badge = AppBadge(
      label: environmentName,
      style: badgeStyle,
      icon: icon,
      compact: compact,
    );

    if (onTap == null) {
      return badge;
    }

    return InkWell(onTap: onTap, borderRadius: spacing.radiusSM, child: badge);
  }
}

/// Extended version with tooltip
class DevModeIndicatorWithTooltip extends StatelessWidget {
  /// Name to display in badge
  final String environmentName;

  /// Whether this is a development environment
  final bool isDevelopment;

  /// Whether to show the indicator
  final bool show;

  /// Use compact styling
  final bool compact;

  /// Tooltip message to display on hover
  final String tooltipMessage;

  const DevModeIndicatorWithTooltip({
    super.key,
    required this.environmentName,
    required this.isDevelopment,
    required this.tooltipMessage,
    this.show = true,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    if (!show) {
      return const SizedBox.shrink();
    }

    return Tooltip(
      message: tooltipMessage,
      preferBelow: true,
      child: DevModeIndicator(
        environmentName: environmentName,
        isDevelopment: isDevelopment,
        show: show,
        compact: compact,
      ),
    );
  }
}

/// Banner version for prominent display (e.g., top of login page)
class DevModeBanner extends StatelessWidget {
  /// Title to display (e.g., "Development Environment")
  final String title;

  /// Message to display below title
  final String message;

  /// Whether to show the banner
  final bool show;

  /// Optional action button callback
  final VoidCallback? onActionPressed;

  /// Optional action button label
  final String? actionLabel;

  const DevModeBanner({
    super.key,
    required this.title,
    required this.message,
    this.show = true,
    this.onActionPressed,
    this.actionLabel,
  });

  @override
  Widget build(BuildContext context) {
    if (!show) {
      return const SizedBox.shrink();
    }

    final spacing = context.spacing;
    final theme = Theme.of(context);

    return Container(
      width: double.infinity,
      padding: spacing.paddingMD,
      decoration: BoxDecoration(
        color: theme.colorScheme.errorContainer.withValues(alpha: 0.1),
        border: Border.all(
          color: theme.colorScheme.error.withValues(alpha: 0.3),
          width: 1,
        ),
        borderRadius: spacing.radiusSM,
      ),
      child: Row(
        children: [
          Icon(
            Icons.warning_amber_rounded,
            color: theme.colorScheme.error,
            size: 24,
          ),
          SizedBox(width: spacing.sm),
          Flexible(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  title,
                  style: theme.textTheme.titleSmall?.copyWith(
                    color: theme.colorScheme.error,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                SizedBox(height: spacing.xs),
                Text(
                  message,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.7),
                  ),
                ),
              ],
            ),
          ),
          if (onActionPressed != null && actionLabel != null) ...[
            SizedBox(width: spacing.sm),
            TextButton(onPressed: onActionPressed, child: Text(actionLabel!)),
          ],
        ],
      ),
    );
  }
}
