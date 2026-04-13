/// ActionMenu - Molecule for rendering action items
///
/// SINGLE RESPONSIBILITY: Render ActionItem list appropriately by context
///
/// Display modes:
/// - Inline: Render all actions as icon buttons in a row
/// - Overflow: Render overflow icon that opens popup with actions
/// - Hybrid: Render first N inline, rest in overflow
///
/// Popup always anchors to trigger (never bottom sheet).
/// Actions in popup are displayed horizontally.
///
/// NOTE: This is a StatelessWidget to avoid issues with nested LayoutBuilders.
/// Async loading states are managed by the action handlers themselves.
library;

import 'package:flutter/material.dart';
import '../../../config/app_borders.dart';
import '../../../config/app_opacity.dart';
import '../../../config/app_sizes.dart';
import '../../../config/app_spacing.dart';
import '../../../config/platform_utilities.dart';
import '../../../config/table_config.dart';
import '../../atoms/atoms.dart';
import 'action_item.dart';

/// Display mode for action menu
enum ActionMenuMode {
  /// All actions inline as icon buttons
  inline,

  /// All actions in overflow dropdown
  overflow,

  /// First N actions inline, rest in overflow
  hybrid,
}

/// Renders a list of ActionItem appropriately
class ActionMenu extends StatelessWidget {
  /// Actions to render
  final List<ActionItem> actions;

  /// Display mode
  final ActionMenuMode mode;

  /// Max inline actions in hybrid mode
  final int maxInline;

  /// Button size for inline/hybrid modes (square buttons)
  /// When null, uses platform-aware default from TouchTarget
  /// When in a table, this should be set to row height for geometric alignment
  final double? buttonSize;

  /// Gap between buttons in inline/hybrid modes
  /// When null, uses spacing.xs for tight layout
  final double? buttonGap;

  const ActionMenu({
    super.key,
    required this.actions,
    this.mode = ActionMenuMode.inline,
    this.maxInline = TableConfig.maxInlineActions,
    this.buttonSize,
    this.buttonGap,
  });

  bool _isLoading(String actionId) =>
      actions.any((a) => a.id == actionId && a.isLoading);

  void _handleTap(BuildContext context, ActionItem action) {
    if (!action.isInteractive || _isLoading(action.id)) return;

    if (action.onTapAsync != null) {
      // Async handler - fire and forget, let handler manage its own UI
      action.onTapAsync!(context);
    } else if (action.onTap != null) {
      // Sync handler
      action.onTap!();
    }
  }

  @override
  Widget build(BuildContext context) {
    if (actions.isEmpty) return const SizedBox.shrink();

    final spacing = context.spacing;

    switch (mode) {
      case ActionMenuMode.inline:
        return _buildInlineActions(context, spacing);

      case ActionMenuMode.overflow:
        return _buildOverflowMenu(context);

      case ActionMenuMode.hybrid:
        return _buildHybridActions(context, spacing);
    }
  }

  /// All actions inline (respects maxInline, overflows the rest)
  Widget _buildInlineActions(BuildContext context, AppSpacing spacing) {
    final gap = buttonGap ?? spacing.xs;

    // If more actions than maxInline, use hybrid behavior
    if (actions.length > maxInline) {
      return _buildHybridActions(context, spacing);
    }

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: actions.indexed.expand((indexed) {
        final (index, action) = indexed;
        return [
          _buildActionButton(context, action),
          if (index < actions.length - 1) SizedBox(width: gap),
        ];
      }).toList(),
    );
  }

  /// All actions in overflow popup
  Widget _buildOverflowMenu(BuildContext context) {
    final theme = Theme.of(context);
    final spacing = context.spacing;
    final size = buttonSize ?? PlatformUtilities.minInteractiveSize;
    final iconSize = (size * TableConfig.overflowIconSizeRatio).clamp(
      spacing.iconSizeSM,
      spacing.iconSizeXL,
    );

    // Constrained overflow button - uses buttonSize for geometric alignment
    return SizedBox(
      width: size,
      height: size,
      child: PopupMenuButton<String>(
        iconSize: iconSize,
        padding: EdgeInsets.zero,
        icon: Icon(
          Icons.more_vert,
          size: iconSize,
          color: theme.colorScheme.onSurface,
        ),
        tooltip: 'More actions',
        position: PopupMenuPosition.under,
        onSelected: (actionId) {
          final action = actions.firstWhere(
            (a) => a.id == actionId,
            orElse: () => actions.first,
          );
          _handleTap(context, action);
        },
        itemBuilder: (ctx) => [
          PopupMenuItem<String>(
            enabled: false,
            padding: EdgeInsets.symmetric(
              horizontal: spacing.md,
              vertical: spacing.sm,
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: actions.indexed.expand((indexed) {
                final (index, action) = indexed;
                return [
                  _CompactButton(
                    action: action,
                    isLoading: _isLoading(action.id),
                    onTap: () => Navigator.of(ctx).pop(action.id),
                  ),
                  if (index < actions.length - 1) SizedBox(width: spacing.xs),
                ];
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  /// Hybrid: first N inline, rest in overflow
  Widget _buildHybridActions(BuildContext context, AppSpacing spacing) {
    final gap = buttonGap ?? spacing.xs;
    final inlineActions = actions.take(maxInline).toList();
    final overflowActions = actions.skip(maxInline).toList();

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Inline actions
        ...inlineActions.indexed.expand((indexed) {
          final (index, action) = indexed;
          return [_buildActionButton(context, action), SizedBox(width: gap)];
        }),

        // Overflow menu for remaining
        if (overflowActions.isNotEmpty)
          _ActionOverflowButton(
            actions: overflowActions,
            onTap: (action) => _handleTap(context, action),
            isLoading: _isLoading,
            buttonSize: buttonSize,
          ),
      ],
    );
  }

  /// Build single action as icon button
  /// Uses buttonSize if provided (geometric sizing from table row height),
  /// otherwise falls back to platform-aware TouchTarget defaults
  Widget _buildActionButton(BuildContext context, ActionItem action) {
    final isLoading = _isLoading(action.id);
    final spacing = context.spacing;
    final sizes = context.sizes;
    final size = buttonSize ?? PlatformUtilities.minInteractiveSize;
    // Icon is sized relative to button for visual balance
    final iconSize = (size * TableConfig.iconSizeRatio).clamp(
      spacing.iconSizeSM,
      spacing.iconSizeXL,
    );

    if (isLoading) {
      return SizedBox(
        width: size,
        height: size,
        child: Center(
          child: SizedBox(
            width: iconSize,
            height: iconSize,
            child: CircularProgressIndicator(
              strokeWidth: sizes.loadingStrokeThin,
            ),
          ),
        ),
      );
    }

    // When buttonSize is provided, render with exact sizing
    // Otherwise use TouchTarget for platform-aware sizing
    if (buttonSize != null) {
      return SizedBox(
        width: size,
        height: size,
        child: IconButton(
          icon: Icon(action.icon ?? Icons.circle, size: iconSize),
          tooltip: action.effectiveTooltip,
          onPressed: action.isInteractive
              ? () => _handleTap(context, action)
              : null,
          padding: EdgeInsets.zero,
          constraints: BoxConstraints(maxWidth: size, maxHeight: size),
        ),
      );
    }

    return TouchTarget.icon(
      icon: action.icon ?? Icons.circle,
      tooltip: action.effectiveTooltip,
      onTap: action.isInteractive ? () => _handleTap(context, action) : null,
    );
  }
}

/// Overflow button that shows remaining actions in popup
class _ActionOverflowButton extends StatelessWidget {
  final List<ActionItem> actions;
  final void Function(ActionItem action) onTap;
  final bool Function(String actionId) isLoading;
  final double? buttonSize;

  const _ActionOverflowButton({
    required this.actions,
    required this.onTap,
    required this.isLoading,
    this.buttonSize,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final spacing = context.spacing;
    final size = buttonSize ?? PlatformUtilities.minInteractiveSize;
    final iconSize = (size * TableConfig.overflowIconSizeRatio).clamp(
      spacing.iconSizeSM,
      spacing.iconSizeXL,
    );

    // Constrained overflow button - uses buttonSize for geometric alignment
    return SizedBox(
      width: size,
      height: size,
      child: PopupMenuButton<String>(
        iconSize: iconSize,
        padding: EdgeInsets.zero,
        icon: Icon(
          Icons.more_vert,
          size: iconSize,
          color: theme.colorScheme.onSurface,
        ),
        tooltip: 'More actions',
        position: PopupMenuPosition.under,
        onSelected: (actionId) {
          final action = actions.firstWhere(
            (a) => a.id == actionId,
            orElse: () => actions.first,
          );
          onTap(action);
        },
        itemBuilder: (ctx) => [
          PopupMenuItem<String>(
            enabled: false,
            padding: EdgeInsets.symmetric(
              horizontal: spacing.md,
              vertical: spacing.sm,
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: actions.indexed.expand((indexed) {
                final (index, action) = indexed;
                return [
                  _CompactButton(
                    action: action,
                    isLoading: isLoading(action.id),
                    onTap: () {
                      Navigator.of(ctx).pop(action.id);
                    },
                  ),
                  if (index < actions.length - 1) SizedBox(width: spacing.xs),
                ];
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }
}

/// Compact button for overflow menu (used in popup, not constrained by table row)
class _CompactButton extends StatelessWidget {
  final ActionItem action;
  final bool isLoading;
  final VoidCallback? onTap;

  const _CompactButton({
    required this.action,
    required this.isLoading,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final spacing = context.spacing;
    final sizes = context.sizes;
    final isInteractive = action.isInteractive && !isLoading;

    final color = switch (action.style) {
      ActionStyle.danger => theme.colorScheme.error,
      ActionStyle.secondary => theme.colorScheme.onSurfaceVariant,
      ActionStyle.primary => theme.colorScheme.primary,
    };

    if (isLoading) {
      return SizedBox(
        width: sizes.buttonHeightCompact,
        height: sizes.buttonHeightCompact,
        child: Center(
          child: SizedBox(
            width: sizes.loadingIndicatorSmall,
            height: sizes.loadingIndicatorSmall,
            child: CircularProgressIndicator(
              strokeWidth: sizes.loadingStrokeThin,
              color: color,
            ),
          ),
        ),
      );
    }

    return Tooltip(
      message: action.effectiveTooltip,
      child: InkWell(
        onTap: isInteractive ? onTap : null,
        borderRadius: AppBorders.radiusSmall,
        child: Padding(
          padding: EdgeInsets.all(spacing.xxs),
          child: Icon(
            action.icon ?? Icons.circle,
            size: spacing.iconSizeMD,
            color: isInteractive
                ? color
                : color.withValues(alpha: AppOpacity.disabled),
          ),
        ),
      ),
    );
  }
}
