/// AppBadge - SINGLE unified badge atom
///
/// **SOLE RESPONSIBILITY:** Render styled badge with label and optional icon
/// - Parameterized by BadgeStyle (semantic only)
/// - No domain logic - mapping happens at usage site
/// - Named AppBadge to avoid collision with Flutter's material Badge
///
/// Usage:
/// ```dart
/// AppBadge(label: 'Active', style: BadgeStyle.success)
/// AppBadge(label: 'Admin', style: BadgeStyle.primary, icon: Icons.admin_panel_settings)
/// ```
library;

import 'package:flutter/material.dart';
import '../../../config/app_borders.dart';
import '../../../config/app_colors.dart';
import '../../../config/app_spacing.dart';
import '../../../config/app_typography.dart';

/// Semantic badge styles - NO domain-specific values
enum BadgeStyle {
  primary,
  secondary,
  tertiary,
  success,
  warning,
  error,
  info,
  neutral;

  /// Parse a color name string to BadgeStyle
  ///
  /// Returns neutral if name is null or unrecognized.
  /// Used by metadata-driven coloring.
  static BadgeStyle fromName(String? name) => switch (name) {
    'primary' => BadgeStyle.primary,
    'secondary' => BadgeStyle.secondary,
    'tertiary' => BadgeStyle.tertiary,
    'success' => BadgeStyle.success,
    'warning' => BadgeStyle.warning,
    'error' => BadgeStyle.error,
    'info' => BadgeStyle.info,
    _ => BadgeStyle.neutral,
  };
}

/// Extension to get visual color from semantic style
///
/// Use for charts, icons, or any context needing raw Color.
/// The badge widget uses its own richer color scheme internally.
extension BadgeStyleColor on BadgeStyle {
  /// Get the primary color for this semantic style
  Color get color => switch (this) {
    BadgeStyle.primary => AppColors.brandPrimary,
    BadgeStyle.secondary => AppColors.brandSecondary,
    BadgeStyle.tertiary => AppColors.brandTertiary,
    BadgeStyle.success => AppColors.success,
    BadgeStyle.warning => AppColors.warning,
    BadgeStyle.error => AppColors.error,
    BadgeStyle.info => AppColors.info,
    BadgeStyle.neutral => AppColors.grey500,
  };
}

class AppBadge extends StatelessWidget {
  final String label;
  final BadgeStyle style;
  final IconData? icon;
  final bool compact;

  const AppBadge({
    super.key,
    required this.label,
    this.style = BadgeStyle.neutral,
    this.icon,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    final colors = _getColors(context);
    final spacing = context.spacing;
    final theme = Theme.of(context);

    final padding = compact
        ? EdgeInsets.symmetric(horizontal: spacing.sm, vertical: spacing.xxs)
        : EdgeInsets.symmetric(horizontal: spacing.md, vertical: spacing.xs);

    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: colors.background,
        borderRadius: compact ? spacing.radiusSM : spacing.radiusMD,
        border: Border.all(color: colors.border, width: AppBorders.widthThin),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(
              icon,
              size: compact ? spacing.iconSizeXS : spacing.iconSizeSM,
              color: colors.text,
            ),
            SizedBox(width: compact ? spacing.xxs : spacing.xs),
          ],
          Flexible(
            child: Text(
              label,
              overflow: TextOverflow.ellipsis,
              maxLines: 1,
              style:
                  (compact
                          ? theme.textTheme.labelSmall
                          : theme.textTheme.labelMedium)
                      ?.copyWith(
                        fontWeight: AppTypography.semiBold,
                        color: colors.text,
                        letterSpacing: AppTypography.letterSpacingMedium,
                      ),
            ),
          ),
        ],
      ),
    );
  }

  _BadgeColors _getColors(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return switch (style) {
      BadgeStyle.primary => _BadgeColors(
        background: AppColors.withOpacity(AppColors.brandPrimary, 0.15),
        border: AppColors.brandPrimary,
        text: isDark ? AppColors.brandPrimaryLight : AppColors.brandPrimaryDark,
      ),
      BadgeStyle.secondary => _BadgeColors(
        background: AppColors.withOpacity(AppColors.brandSecondary, 0.15),
        border: AppColors.brandSecondary,
        text: isDark
            ? AppColors.brandSecondaryLight
            : AppColors.brandSecondaryDark,
      ),
      BadgeStyle.tertiary => _BadgeColors(
        background: AppColors.withOpacity(AppColors.brandTertiary, 0.15),
        border: AppColors.brandTertiary,
        text: isDark
            ? AppColors.brandTertiaryLight
            : AppColors.brandTertiaryDark,
      ),
      BadgeStyle.success => _BadgeColors(
        background: AppColors.withOpacity(AppColors.success, 0.1),
        border: AppColors.success,
        text: AppColors.successDark,
      ),
      BadgeStyle.warning => _BadgeColors(
        background: AppColors.withOpacity(AppColors.warning, 0.1),
        border: AppColors.warning,
        text: AppColors.warningDark,
      ),
      BadgeStyle.error => _BadgeColors(
        background: AppColors.withOpacity(AppColors.error, 0.1),
        border: AppColors.error,
        text: AppColors.errorDark,
      ),
      BadgeStyle.info => _BadgeColors(
        background: AppColors.withOpacity(AppColors.info, 0.1),
        border: AppColors.info,
        text: AppColors.infoDark,
      ),
      BadgeStyle.neutral => _BadgeColors(
        background: AppColors.grey100,
        border: AppColors.grey400,
        text: AppColors.grey800,
      ),
    };
  }
}

class _BadgeColors {
  final Color background;
  final Color border;
  final Color text;

  _BadgeColors({
    required this.background,
    required this.border,
    required this.text,
  });
}
