/// ActionItem - Data model for toolbar/table actions
///
/// SINGLE RESPONSIBILITY: Define action data structure
///
/// Similar to NavMenuItem but optimized for action buttons:
/// - Supports async handlers with loading state
/// - Supports disabled state
/// - Supports destructive styling
/// - Used by TableToolbar, ActionMenu
///
/// The key principle: Actions are DATA, not widgets.
/// This allows different components to render them appropriately
/// (inline buttons, dropdown, popup, etc.)
library;

import 'package:flutter/material.dart';

/// Style variants for action items
enum ActionStyle {
  /// Default action styling
  primary,

  /// Secondary/subtle action
  secondary,

  /// Destructive action (delete, remove)
  danger,
}

/// Action item configuration
///
/// Immutable data class for action properties.
/// Handlers can be sync or async - async handlers enable loading state.
class ActionItem {
  /// Unique identifier for the action
  final String id;

  /// Display label
  final String label;

  /// Icon for the action
  final IconData? icon;

  /// Tooltip text (defaults to label if not provided)
  final String? tooltip;

  /// Sync tap handler
  final VoidCallback? onTap;

  /// Async tap handler (enables loading state management)
  /// If provided, takes precedence over onTap
  final Future<void> Function(BuildContext context)? onTapAsync;

  /// Whether this action is currently loading
  final bool isLoading;

  /// Whether this action is disabled
  final bool isDisabled;

  /// Visual style of the action
  final ActionStyle style;

  /// Whether to show label in compact mode (icon-only otherwise)
  final bool showLabelInCompact;

  const ActionItem({
    required this.id,
    required this.label,
    this.icon,
    this.tooltip,
    this.onTap,
    this.onTapAsync,
    this.isLoading = false,
    this.isDisabled = false,
    this.style = ActionStyle.primary,
    this.showLabelInCompact = false,
  });

  /// Get effective tooltip (falls back to label)
  String get effectiveTooltip => tooltip ?? label;

  /// Whether this action has an async handler
  bool get isAsync => onTapAsync != null;

  /// Whether this action is interactive (not loading and not disabled)
  bool get isInteractive => !isLoading && !isDisabled;

  /// Create a copy with optional field overrides
  ActionItem copyWith({
    String? id,
    String? label,
    IconData? icon,
    String? tooltip,
    VoidCallback? onTap,
    Future<void> Function(BuildContext context)? onTapAsync,
    bool? isLoading,
    bool? isDisabled,
    ActionStyle? style,
    bool? showLabelInCompact,
  }) {
    return ActionItem(
      id: id ?? this.id,
      label: label ?? this.label,
      icon: icon ?? this.icon,
      tooltip: tooltip ?? this.tooltip,
      onTap: onTap ?? this.onTap,
      onTapAsync: onTapAsync ?? this.onTapAsync,
      isLoading: isLoading ?? this.isLoading,
      isDisabled: isDisabled ?? this.isDisabled,
      style: style ?? this.style,
      showLabelInCompact: showLabelInCompact ?? this.showLabelInCompact,
    );
  }

  /// Factory for refresh action
  factory ActionItem.refresh({
    required VoidCallback onTap,
    String label = 'Refresh',
  }) {
    return ActionItem(
      id: 'refresh',
      label: label,
      icon: Icons.refresh,
      onTap: onTap,
      style: ActionStyle.secondary,
    );
  }

  /// Factory for create/add action
  factory ActionItem.create({
    required VoidCallback onTap,
    String label = 'Create',
    String? tooltip,
  }) {
    return ActionItem(
      id: 'create',
      label: label,
      icon: Icons.add,
      tooltip: tooltip,
      onTap: onTap,
      style: ActionStyle.primary,
    );
  }

  /// Factory for edit action
  factory ActionItem.edit({
    required VoidCallback onTap,
    String label = 'Edit',
  }) {
    return ActionItem(
      id: 'edit',
      label: label,
      icon: Icons.edit_outlined,
      onTap: onTap,
      style: ActionStyle.secondary,
    );
  }

  /// Factory for delete action
  factory ActionItem.delete({
    required VoidCallback onTap,
    String label = 'Delete',
    bool isDisabled = false,
    String? tooltip,
  }) {
    return ActionItem(
      id: 'delete',
      label: label,
      icon: Icons.delete_outline,
      tooltip: tooltip,
      onTap: onTap,
      isDisabled: isDisabled,
      style: ActionStyle.danger,
    );
  }

  /// Factory for export action with async handler
  factory ActionItem.export({
    required Future<void> Function(BuildContext context) onTapAsync,
    String label = 'Export',
    String? tooltip,
    bool isLoading = false,
  }) {
    return ActionItem(
      id: 'export',
      label: label,
      icon: Icons.download,
      tooltip: tooltip,
      onTapAsync: onTapAsync,
      isLoading: isLoading,
      style: ActionStyle.secondary,
    );
  }

  /// Factory for customize/settings action
  factory ActionItem.customize({
    required VoidCallback onTap,
    String label = 'Customize',
    String? tooltip,
  }) {
    return ActionItem(
      id: 'customize',
      label: label,
      icon: Icons.tune,
      tooltip: tooltip ?? 'Customize table',
      onTap: onTap,
      style: ActionStyle.secondary,
    );
  }
}
