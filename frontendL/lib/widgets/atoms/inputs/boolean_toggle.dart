/// BooleanToggle - Generic toggle button for boolean values
///
/// SINGLE RESPONSIBILITY: Display boolean state and emit toggle event
///
/// GENERIC: Works for ANY boolean field (isActive, isPublished, isEnabled, etc.)
/// NOT specific to activation - fully parameterized
///
/// Visual Design:
/// - True: Configurable icon + color (default: green check_circle)
/// - False: Configurable icon + color (default: red cancel)
/// - Disabled: Gray icon with gray border
///
/// TESTABLE: Widget test verifies icon, color, tooltip, onToggle callback
///
/// Usage:
/// ```dart
/// // For isActive field
/// BooleanToggle(
///   value: user.isActive,
///   onToggle: () => _handleToggle(),
///   trueIcon: Icons.check_circle,
///   falseIcon: Icons.cancel,
///   tooltipTrue: 'Active',
///   tooltipFalse: 'Inactive',
/// )
///
/// // For isPublished field
/// BooleanToggle(
///   value: post.isPublished,
///   onToggle: () => _handleToggle(),
///   trueIcon: Icons.public,
///   falseIcon: Icons.public_off,
///   tooltipTrue: 'Published',
///   tooltipFalse: 'Draft',
/// )
/// ```
library;

import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';

class BooleanToggle extends StatelessWidget {
  /// Current boolean value
  final bool value;

  /// Callback when button is tapped (null = disabled)
  final VoidCallback? onToggle;

  /// Icon to show when value is true
  final IconData trueIcon;

  /// Icon to show when value is false
  final IconData falseIcon;

  /// Color to use when value is true
  final Color? trueColor;

  /// Color to use when value is false
  final Color? falseColor;

  /// Tooltip to show when value is true
  final String tooltipTrue;

  /// Tooltip to show when value is false
  final String tooltipFalse;

  /// Compact mode (smaller size)
  final bool compact;

  const BooleanToggle({
    super.key,
    required this.value,
    this.onToggle,
    this.trueIcon = Icons.check_circle,
    this.falseIcon = Icons.cancel,
    this.trueColor,
    this.falseColor,
    this.tooltipTrue = 'True',
    this.tooltipFalse = 'False',
    this.compact = false,
  });

  /// Factory for active/inactive pattern (common use case)
  factory BooleanToggle.activeInactive({
    required bool value,
    VoidCallback? onToggle,
    bool compact = false,
  }) {
    return BooleanToggle(
      value: value,
      onToggle: onToggle,
      trueIcon: Icons.check_circle,
      falseIcon: Icons.cancel,
      tooltipTrue: 'Active',
      tooltipFalse: 'Inactive',
      compact: compact,
    );
  }

  /// Factory for published/draft pattern
  factory BooleanToggle.publishedDraft({
    required bool value,
    VoidCallback? onToggle,
    bool compact = false,
  }) {
    return BooleanToggle(
      value: value,
      onToggle: onToggle,
      trueIcon: Icons.public,
      falseIcon: Icons.public_off,
      tooltipTrue: 'Published',
      tooltipFalse: 'Draft',
      compact: compact,
    );
  }

  /// Factory for enabled/disabled pattern
  factory BooleanToggle.enabledDisabled({
    required bool value,
    VoidCallback? onToggle,
    bool compact = false,
  }) {
    return BooleanToggle(
      value: value,
      onToggle: onToggle,
      trueIcon: Icons.toggle_on,
      falseIcon: Icons.toggle_off,
      tooltipTrue: 'Enabled',
      tooltipFalse: 'Disabled',
      compact: compact,
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final spacing = context.spacing;

    // Visual state based on value
    final icon = value ? trueIcon : falseIcon;
    final color = value
        ? (trueColor ?? theme.colorScheme.primary)
        : (falseColor ?? theme.colorScheme.error);
    final tooltip = value ? tooltipTrue : tooltipFalse;

    // Sizing
    final size = compact ? spacing.xxl : spacing.xxl * 1.25;
    final iconSize = compact ? spacing.iconSizeSM : spacing.iconSizeMD;

    return Tooltip(
      message: tooltip,
      waitDuration: const Duration(milliseconds: 500),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onToggle,
          borderRadius: spacing.radiusSM,
          child: Container(
            width: size,
            height: size,
            decoration: BoxDecoration(
              border: Border.all(
                color: onToggle == null
                    ? theme.disabledColor.withValues(alpha: 0.5)
                    : color.withValues(alpha: 0.5),
                width: 1.5,
              ),
              borderRadius: spacing.radiusSM,
            ),
            child: Icon(
              icon,
              size: iconSize,
              color: onToggle == null ? theme.disabledColor : color,
            ),
          ),
        ),
      ),
    );
  }
}
