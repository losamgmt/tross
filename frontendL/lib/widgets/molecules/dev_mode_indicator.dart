/// DevModeIndicator - Molecule component for displaying environment status
///
/// Shows the current environment (Development/Production) with appropriate
/// styling and visibility based on configuration.
///
/// Atomic Design: Molecule (uses StatusBadge atom + Icon atom)
/// Material 3 Design with Tross branding
library;

import 'package:flutter/material.dart';
import '../../config/app_config.dart';
import '../../config/app_spacing.dart';
import '../atoms/indicators/status_badge.dart';

/// A visual indicator showing the current runtime environment
///
/// Features:
/// - Shows "Development" or "Production" badge
/// - Warning color in development mode
/// - Automatically hidden in production (configurable)
/// - Includes icon for quick visual recognition
/// - Uses centralized AppConfig for environment detection
///
/// Usage:
/// ```dart
/// DevModeIndicator() // Simple, uses defaults
/// DevModeIndicator(alwaysShow: true) // Force show in prod (for admin)
/// DevModeIndicator(compact: true) // Smaller size
/// ```
class DevModeIndicator extends StatelessWidget {
  /// Whether to show the indicator even in production
  /// Default: false (hidden in production)
  final bool alwaysShow;

  /// Use compact styling (smaller text, tighter padding)
  final bool compact;

  /// Optional callback when tapped (e.g., show environment details)
  final VoidCallback? onTap;

  const DevModeIndicator({
    super.key,
    this.alwaysShow = false,
    this.compact = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    // Hide in production unless alwaysShow is true
    if (AppConfig.isProduction && !alwaysShow) {
      return const SizedBox.shrink();
    }

    final spacing = context.spacing;

    // Get environment details
    final envName = AppConfig.environmentName;
    final isDev = AppConfig.isDevMode;

    // Choose badge style and icon based on environment
    final badgeStyle = isDev ? BadgeStyle.warning : BadgeStyle.success;
    final icon = isDev ? Icons.code : Icons.verified_user;

    final badge = StatusBadge(
      label: envName,
      style: badgeStyle,
      icon: icon,
      compact: compact,
    );

    // If no tap handler, just return the badge
    if (onTap == null) {
      return badge;
    }

    // Wrap in InkWell for tap handling
    return InkWell(onTap: onTap, borderRadius: spacing.radiusSM, child: badge);
  }
}

/// Extended version with tooltip and additional info
///
/// Shows environment details on hover/tap:
/// - Environment name
/// - Dev auth status
/// - API endpoint
/// - Build info
class DevModeIndicatorWithTooltip extends StatelessWidget {
  final bool alwaysShow;
  final bool compact;

  const DevModeIndicatorWithTooltip({
    super.key,
    this.alwaysShow = false,
    this.compact = false,
  });

  String _buildTooltipMessage() {
    final lines = <String>[
      'Environment: ${AppConfig.environmentName}',
      'Dev Auth: ${AppConfig.devAuthEnabled ? 'Enabled' : 'Disabled'}',
      'API: ${AppConfig.baseUrl}',
      'Version: ${AppConfig.version}',
    ];
    return lines.join('\n');
  }

  @override
  Widget build(BuildContext context) {
    // Hide in production unless alwaysShow is true
    if (AppConfig.isProduction && !alwaysShow) {
      return const SizedBox.shrink();
    }

    return Tooltip(
      message: _buildTooltipMessage(),
      preferBelow: true,
      child: DevModeIndicator(alwaysShow: alwaysShow, compact: compact),
    );
  }
}

/// Banner version for prominent display (e.g., top of login page)
///
/// Full-width banner with icon, text, and optional action button
class DevModeBanner extends StatelessWidget {
  final String? message;
  final VoidCallback? onActionPressed;
  final String? actionLabel;

  const DevModeBanner({
    super.key,
    this.message,
    this.onActionPressed,
    this.actionLabel,
  });

  @override
  Widget build(BuildContext context) {
    // Hide in production
    if (AppConfig.isProduction) {
      return const SizedBox.shrink();
    }

    final spacing = context.spacing;
    final theme = Theme.of(context);

    // Default message if not provided
    final displayMessage =
        message ?? 'Development Mode - Test authentication available below';

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
                  'Development Environment',
                  style: theme.textTheme.titleSmall?.copyWith(
                    color: theme.colorScheme.error,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                SizedBox(height: spacing.xs),
                Text(
                  displayMessage,
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
