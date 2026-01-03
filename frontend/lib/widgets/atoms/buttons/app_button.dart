/// AppButton - SINGLE unified button atom
///
/// **SOLE RESPONSIBILITY:** Render styled icon button with tooltip
/// - Parameterized by ButtonStyle (primary/secondary/danger/ghost)
/// - Optional label for text+icon buttons
/// - Compact mode for table actions
/// - No domain-specific factories - all configuration via parameters
///
/// Usage:
/// ```dart
/// // Icon-only button
/// AppButton(icon: Icons.edit, tooltip: 'Edit', onPressed: edit)
///
/// // With label
/// AppButton(icon: Icons.home, label: 'Home', onPressed: goHome)
///
/// // Danger style
/// AppButton(icon: Icons.delete, tooltip: 'Delete', style: ButtonStyle.danger, onPressed: delete)
///
/// // Compact for tables
/// AppButton(icon: Icons.visibility, tooltip: 'View', compact: true, onPressed: view)
/// ```
library;

import 'package:flutter/material.dart';
import '../../../config/app_borders.dart';
import '../../../config/app_colors.dart';
import '../../../config/app_spacing.dart';
import '../../../config/app_typography.dart';

/// Button styles - semantic only
enum AppButtonStyle { primary, secondary, danger, ghost }

class AppButton extends StatelessWidget {
  final IconData icon;
  final String? label;
  final String tooltip;
  final VoidCallback? onPressed;
  final AppButtonStyle style;
  final bool compact;

  const AppButton({
    super.key,
    required this.icon,
    required this.tooltip,
    this.label,
    this.onPressed,
    this.style = AppButtonStyle.secondary,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    // If label is provided, render as TextButton with icon
    if (label != null) {
      return _buildLabeledButton(context);
    }
    // Otherwise render as icon-only button
    return _buildIconButton(context);
  }

  Widget _buildLabeledButton(BuildContext context) {
    final theme = Theme.of(context);
    final spacing = context.spacing;
    final colors = _getColors(theme);

    return TextButton.icon(
      onPressed: onPressed,
      icon: Icon(icon, color: colors.icon, size: spacing.iconSizeLG),
      label: Text(
        label!,
        style: theme.textTheme.titleMedium?.copyWith(
          color: colors.icon,
          fontWeight: AppTypography.bold,
          letterSpacing: AppTypography.letterSpacingWide,
        ),
        overflow: TextOverflow.clip,
        maxLines: 1,
        softWrap: false,
      ),
      style: TextButton.styleFrom(
        padding: EdgeInsets.symmetric(
          horizontal: spacing.lg,
          vertical: spacing.md,
        ),
      ),
    );
  }

  Widget _buildIconButton(BuildContext context) {
    final theme = Theme.of(context);
    final spacing = context.spacing;
    final colors = _getColors(theme);
    final size = compact ? spacing.xxl : spacing.xxl * 1.25;
    final iconSize = compact ? spacing.iconSizeSM : spacing.iconSizeMD;

    return Tooltip(
      message: tooltip,
      waitDuration: const Duration(milliseconds: 500),
      child: Material(
        color: colors.background,
        borderRadius: spacing.radiusSM,
        child: InkWell(
          onTap: onPressed,
          borderRadius: spacing.radiusSM,
          child: Container(
            width: size,
            height: size,
            decoration: BoxDecoration(
              border: Border.all(
                color: colors.border,
                width: AppBorders.widthThin,
              ),
              borderRadius: spacing.radiusSM,
            ),
            child: Icon(
              icon,
              size: iconSize,
              color: onPressed == null ? colors.disabled : colors.icon,
            ),
          ),
        ),
      ),
    );
  }

  _ButtonColors _getColors(ThemeData theme) {
    return switch (style) {
      AppButtonStyle.primary => _ButtonColors(
        background: theme.colorScheme.primaryContainer,
        border: theme.colorScheme.primary.withValues(
          alpha: AppColors.opacityDisabled,
        ),
        icon: theme.colorScheme.primary,
        disabled: theme.colorScheme.onSurface.withValues(
          alpha: AppColors.opacityDisabled,
        ),
      ),
      AppButtonStyle.danger => _ButtonColors(
        background: theme.colorScheme.errorContainer,
        border: theme.colorScheme.error.withValues(
          alpha: AppColors.opacityDisabled,
        ),
        icon: theme.colorScheme.error,
        disabled: theme.colorScheme.onSurface.withValues(
          alpha: AppColors.opacityDisabled,
        ),
      ),
      AppButtonStyle.ghost => _ButtonColors(
        background: Colors.transparent,
        border: theme.colorScheme.outline.withValues(
          alpha: AppColors.opacityBorder,
        ),
        icon: theme.colorScheme.onSurfaceVariant,
        disabled: theme.colorScheme.onSurface.withValues(
          alpha: AppColors.opacityDisabled,
        ),
      ),
      AppButtonStyle.secondary => _ButtonColors(
        background: theme.colorScheme.surfaceContainerHighest,
        border: theme.colorScheme.outline.withValues(
          alpha: AppColors.opacityDisabled,
        ),
        icon: theme.colorScheme.onSurfaceVariant,
        disabled: theme.colorScheme.onSurface.withValues(
          alpha: AppColors.opacityDisabled,
        ),
      ),
    };
  }
}

class _ButtonColors {
  final Color background;
  final Color border;
  final Color icon;
  final Color disabled;

  _ButtonColors({
    required this.background,
    required this.border,
    required this.icon,
    required this.disabled,
  });
}
