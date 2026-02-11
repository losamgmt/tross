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
import '../../../config/app_spacing.dart';
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

  /// Max inline actions in hybrid mode (default: 2)
  final int maxInline;

  const ActionMenu({
    super.key,
    required this.actions,
    this.mode = ActionMenuMode.inline,
    this.maxInline = 2,
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

  /// All actions inline
  Widget _buildInlineActions(BuildContext context, AppSpacing spacing) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: actions.indexed.expand((indexed) {
        final (index, action) = indexed;
        return [
          _buildActionButton(context, action),
          if (index < actions.length - 1) SizedBox(width: spacing.sm),
        ];
      }).toList(),
    );
  }

  /// All actions in overflow popup
  Widget _buildOverflowMenu(BuildContext context) {
    final theme = Theme.of(context);

    return PopupMenuButton<String>(
      icon: Icon(Icons.more_vert, color: theme.colorScheme.onSurface),
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
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
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
                if (index < actions.length - 1) const SizedBox(width: 4),
              ];
            }).toList(),
          ),
        ),
      ],
    );
  }

  /// Hybrid: first N inline, rest in overflow
  Widget _buildHybridActions(BuildContext context, AppSpacing spacing) {
    final inlineActions = actions.take(maxInline).toList();
    final overflowActions = actions.skip(maxInline).toList();

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Inline actions
        ...inlineActions.indexed.expand((indexed) {
          final (index, action) = indexed;
          return [
            _buildActionButton(context, action),
            SizedBox(width: spacing.sm),
          ];
        }),

        // Overflow menu for remaining
        if (overflowActions.isNotEmpty)
          _ActionOverflowButton(
            actions: overflowActions,
            onTap: (action) => _handleTap(context, action),
            isLoading: _isLoading,
          ),
      ],
    );
  }

  /// Build single action as icon button
  Widget _buildActionButton(BuildContext context, ActionItem action) {
    final isLoading = _isLoading(action.id);

    if (isLoading) {
      return const SizedBox(
        width: 40,
        height: 40,
        child: Center(
          child: SizedBox(
            width: 20,
            height: 20,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
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

  const _ActionOverflowButton({
    required this.actions,
    required this.onTap,
    required this.isLoading,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return PopupMenuButton<String>(
      icon: Icon(Icons.more_vert, color: theme.colorScheme.onSurface),
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
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
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
                if (index < actions.length - 1) const SizedBox(width: 4),
              ];
            }).toList(),
          ),
        ),
      ],
    );
  }
}

/// Compact button for overflow menu
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
    final isInteractive = action.isInteractive && !isLoading;

    final color = switch (action.style) {
      ActionStyle.danger => theme.colorScheme.error,
      ActionStyle.secondary => theme.colorScheme.onSurfaceVariant,
      ActionStyle.primary => theme.colorScheme.primary,
    };

    if (isLoading) {
      return SizedBox(
        width: 40,
        height: 40,
        child: Center(
          child: SizedBox(
            width: 16,
            height: 16,
            child: CircularProgressIndicator(strokeWidth: 2, color: color),
          ),
        ),
      );
    }

    return Tooltip(
      message: action.effectiveTooltip,
      child: InkWell(
        onTap: isInteractive ? onTap : null,
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: Icon(
            action.icon ?? Icons.circle,
            size: 24,
            color: isInteractive ? color : color.withValues(alpha: 0.5),
          ),
        ),
      ),
    );
  }
}
