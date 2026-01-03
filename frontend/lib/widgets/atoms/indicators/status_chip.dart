/// StatusChip - Generic status indicator chip atom
///
/// Renders a colored chip indicating status. Fully parameterized.
/// Use factory constructors for semantic statuses (success, error, etc.)
/// or pass custom color for domain-specific needs.
library;

import 'package:flutter/material.dart';
import '../../../config/app_borders.dart';
import '../../../config/app_colors.dart';
import '../../../config/app_spacing.dart';
import '../../../config/app_typography.dart';

class StatusChip extends StatelessWidget {
  /// The status label text
  final String label;

  /// Background color for the chip
  final Color color;

  /// Optional leading icon
  final IconData? icon;

  /// Compact mode (smaller padding and font)
  final bool compact;

  /// Whether to use outlined style instead of filled
  final bool outlined;

  const StatusChip({
    super.key,
    required this.label,
    required this.color,
    this.icon,
    this.compact = false,
    this.outlined = false,
  });

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final theme = Theme.of(context);

    // Calculate contrasting text color
    final textColor = outlined ? color : _contrastingTextColor(color);
    final iconColor = textColor;

    // Size variations using centralized spacing
    final horizontalPadding = compact ? spacing.xs : spacing.sm;
    final verticalPadding = compact ? spacing.xxs : spacing.xs;
    final iconSize = compact ? spacing.iconSizeXS : spacing.iconSizeSM;

    // Use theme text styles - labelSmall for compact, labelMedium for standard
    final textStyle = compact
        ? theme.textTheme.labelSmall
        : theme.textTheme.labelMedium;

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: horizontalPadding,
        vertical: verticalPadding,
      ),
      decoration: BoxDecoration(
        color: outlined ? Colors.transparent : color,
        border: outlined
            ? Border.all(color: color, width: AppBorders.widthMedium)
            : null,
        borderRadius: spacing.radiusSM,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: iconSize, color: iconColor),
            SizedBox(width: spacing.xxs),
          ],
          Text(
            label,
            style: textStyle?.copyWith(
              color: textColor,
              fontWeight: AppTypography.semiBold,
              letterSpacing: AppTypography.letterSpacingMedium,
            ),
          ),
        ],
      ),
    );
  }

  /// Calculate contrasting text color (black or white) based on background
  Color _contrastingTextColor(Color background) {
    // Using relative luminance formula
    final luminance = background.computeLuminance();
    return luminance > 0.5 ? AppColors.textPrimary : AppColors.textOnDark;
  }

  // === Factory constructors for common status patterns ===

  /// Success/Active status (green)
  factory StatusChip.success({
    required String label,
    IconData? icon,
    bool compact = false,
  }) {
    return StatusChip(
      label: label,
      color: AppColors.success,
      icon: icon,
      compact: compact,
    );
  }

  /// Warning/Pending status (orange)
  factory StatusChip.warning({
    required String label,
    IconData? icon,
    bool compact = false,
  }) {
    return StatusChip(
      label: label,
      color: AppColors.warning,
      icon: icon,
      compact: compact,
    );
  }

  /// Error/Inactive status (red)
  factory StatusChip.error({
    required String label,
    IconData? icon,
    bool compact = false,
  }) {
    return StatusChip(
      label: label,
      color: AppColors.error,
      icon: icon,
      compact: compact,
    );
  }

  /// Neutral/Default status (grey)
  factory StatusChip.neutral({
    required String label,
    IconData? icon,
    bool compact = false,
  }) {
    return StatusChip(
      label: label,
      color: AppColors.grey500,
      icon: icon,
      compact: compact,
    );
  }

  /// Info status (blue)
  factory StatusChip.info({
    required String label,
    IconData? icon,
    bool compact = false,
  }) {
    return StatusChip(
      label: label,
      color: AppColors.info,
      icon: icon,
      compact: compact,
    );
  }
}
