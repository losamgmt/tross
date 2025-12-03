/// ActionButton - Icon button for table/UI actions (edit, delete, view)
///
/// **Atom**: Pure UI, no dependencies. Always provide tooltip for accessibility.
///
/// **Features**: 4 styles (primary/secondary/danger/ghost), compact mode, disabled state
///
/// **Usage**:
/// ```dart
/// ActionButton.edit(onPressed: () => edit(user))
/// ActionButton.delete(onPressed: hasPermission ? delete : null)
/// ActionButton.view(onPressed: showDetails, compact: true)
/// ```
library;

import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';

enum ActionButtonStyle { primary, secondary, danger, ghost }

class ActionButton extends StatelessWidget {
  final IconData icon;
  final String tooltip;
  final VoidCallback? onPressed;
  final ActionButtonStyle style;
  final bool compact;

  const ActionButton({
    super.key,
    required this.icon,
    required this.tooltip,
    this.onPressed,
    this.style = ActionButtonStyle.secondary,
    this.compact = false,
  });

  /// Factory for edit actions
  factory ActionButton.edit({
    required VoidCallback? onPressed,
    String tooltip = 'Edit',
  }) {
    return ActionButton(
      icon: Icons.edit,
      tooltip: tooltip,
      onPressed: onPressed,
      style: ActionButtonStyle.primary,
    );
  }

  /// Factory for delete actions
  factory ActionButton.delete({
    required VoidCallback? onPressed,
    String tooltip = 'Delete',
  }) {
    return ActionButton(
      icon: Icons.delete,
      tooltip: tooltip,
      onPressed: onPressed,
      style: ActionButtonStyle.danger,
    );
  }

  /// Factory for view/details actions
  factory ActionButton.view({
    required VoidCallback? onPressed,
    String tooltip = 'View Details',
  }) {
    return ActionButton(
      icon: Icons.visibility,
      tooltip: tooltip,
      onPressed: onPressed,
      style: ActionButtonStyle.ghost,
    );
  }

  @override
  Widget build(BuildContext context) {
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
              border: Border.all(color: colors.border, width: 1),
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

  _ActionButtonColors _getColors(ThemeData theme) {
    switch (style) {
      case ActionButtonStyle.primary:
        return _ActionButtonColors(
          background: theme.colorScheme.primaryContainer,
          border: theme.colorScheme.primary.withValues(alpha: 0.3),
          icon: theme.colorScheme.primary,
          disabled: theme.colorScheme.onSurface.withValues(alpha: 0.3),
        );
      case ActionButtonStyle.danger:
        return _ActionButtonColors(
          background: theme.colorScheme.errorContainer,
          border: theme.colorScheme.error.withValues(alpha: 0.3),
          icon: theme.colorScheme.error,
          disabled: theme.colorScheme.onSurface.withValues(alpha: 0.3),
        );
      case ActionButtonStyle.ghost:
        return _ActionButtonColors(
          background: Colors.transparent,
          border: theme.colorScheme.outline.withValues(alpha: 0.2),
          icon: theme.colorScheme.onSurfaceVariant,
          disabled: theme.colorScheme.onSurface.withValues(alpha: 0.3),
        );
      case ActionButtonStyle.secondary:
        return _ActionButtonColors(
          background: theme.colorScheme.surfaceContainerHighest,
          border: theme.colorScheme.outline.withValues(alpha: 0.3),
          icon: theme.colorScheme.onSurfaceVariant,
          disabled: theme.colorScheme.onSurface.withValues(alpha: 0.3),
        );
    }
  }
}

class _ActionButtonColors {
  final Color background;
  final Color border;
  final Color icon;
  final Color disabled;

  _ActionButtonColors({
    required this.background,
    required this.border,
    required this.icon,
    required this.disabled,
  });
}
