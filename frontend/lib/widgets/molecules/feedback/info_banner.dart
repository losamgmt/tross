import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';

/// InfoBanner - Generic molecule for alert/info/warning banners
///
/// **SOLE RESPONSIBILITY:** Display a banner with icon, message, and optional action
/// **GENERIC:** Works for any alert type (info, warning, error, success)
///
/// Features:
/// - Icon + message + optional action button
/// - Semantic styling (info, warning, error, success)
/// - Dismissible option
/// - Consistent spacing
/// - Zero business logic, pure presentation
///
/// Usage:
/// ```dart
/// // Info banner
/// InfoBanner(
///   message: 'Your trial expires in 7 days',
///   style: BannerStyle.info,
///   action: TextButton(
///     onPressed: () => upgradePlan(),
///     child: Text('Upgrade'),
///   ),
/// )
///
/// // Warning banner
/// InfoBanner(
///   message: 'Unsaved changes will be lost',
///   style: BannerStyle.warning,
/// )
///
/// // Dismissible error
/// InfoBanner(
///   message: 'Failed to sync data',
///   style: BannerStyle.error,
///   onDismiss: () => setState(() => _showError = false),
/// )
/// ```
class InfoBanner extends StatelessWidget {
  final String message;
  final BannerStyle style;
  final IconData? icon;
  final Widget? action;
  final VoidCallback? onDismiss;
  final bool compact;

  const InfoBanner({
    super.key,
    required this.message,
    this.style = BannerStyle.info,
    this.icon,
    this.action,
    this.onDismiss,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final theme = Theme.of(context);
    final colors = _getColors(theme);

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: spacing.md,
        vertical: compact ? spacing.sm : spacing.md,
      ),
      decoration: BoxDecoration(
        color: colors.background,
        border: Border.all(color: colors.border),
        borderRadius: spacing.radiusMD,
      ),
      child: Row(
        children: [
          // Icon
          Icon(
            icon ?? _getDefaultIcon(),
            color: colors.foreground,
            size: compact ? 18 : 24,
          ),
          SizedBox(width: spacing.md),
          // Message
          Expanded(
            child: Text(
              message,
              style:
                  (compact
                          ? theme.textTheme.bodySmall
                          : theme.textTheme.bodyMedium)
                      ?.copyWith(color: colors.foreground),
            ),
          ),
          // Action button (optional)
          if (action != null) ...[SizedBox(width: spacing.md), action!],
          // Dismiss button (optional)
          if (onDismiss != null) ...[
            SizedBox(width: spacing.sm),
            IconButton(
              icon: Icon(Icons.close, size: 18),
              onPressed: onDismiss,
              padding: EdgeInsets.zero,
              constraints: BoxConstraints(),
              color: colors.foreground.withValues(alpha: 0.7),
              tooltip: 'Dismiss',
            ),
          ],
        ],
      ),
    );
  }

  IconData _getDefaultIcon() {
    switch (style) {
      case BannerStyle.info:
        return Icons.info_outline;
      case BannerStyle.success:
        return Icons.check_circle_outline;
      case BannerStyle.warning:
        return Icons.warning_amber_outlined;
      case BannerStyle.error:
        return Icons.error_outline;
    }
  }

  _BannerColors _getColors(ThemeData theme) {
    switch (style) {
      case BannerStyle.info:
        return _BannerColors(
          background: theme.colorScheme.primaryContainer.withValues(alpha: 0.3),
          border: theme.colorScheme.primary.withValues(alpha: 0.5),
          foreground: theme.colorScheme.primary,
        );
      case BannerStyle.success:
        return _BannerColors(
          background: Colors.green.shade50,
          border: Colors.green.shade200,
          foreground: Colors.green.shade700,
        );
      case BannerStyle.warning:
        return _BannerColors(
          background: Colors.amber.shade50,
          border: Colors.amber.shade200,
          foreground: Colors.amber.shade800,
        );
      case BannerStyle.error:
        return _BannerColors(
          background: theme.colorScheme.errorContainer.withValues(alpha: 0.3),
          border: theme.colorScheme.error.withValues(alpha: 0.5),
          foreground: theme.colorScheme.error,
        );
    }
  }
}

/// Semantic banner styles
enum BannerStyle { info, success, warning, error }

class _BannerColors {
  final Color background;
  final Color border;
  final Color foreground;

  _BannerColors({
    required this.background,
    required this.border,
    required this.foreground,
  });
}
