/// BooleanToggle - Generic toggle button for boolean values
///
/// SINGLE RESPONSIBILITY: Display boolean state and emit toggle event
///
/// Features:
/// - True/false visual states with custom icons
/// - **Keyboard accessible** - Space/Enter to toggle when focused
/// - Proper focus ring for keyboard navigation
/// - Tab navigation support
/// - Custom icons and colors
/// - Tooltips for accessibility
library;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../config/app_borders.dart';
import '../../../config/app_colors.dart';
import '../../../config/app_spacing.dart';

class BooleanToggle extends StatefulWidget {
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
  State<BooleanToggle> createState() => _BooleanToggleState();
}

class _BooleanToggleState extends State<BooleanToggle> {
  late final FocusNode _focusNode;
  bool _isFocused = false;

  @override
  void initState() {
    super.initState();
    _focusNode = FocusNode();
    _focusNode.addListener(_handleFocusChange);
  }

  @override
  void dispose() {
    _focusNode.removeListener(_handleFocusChange);
    _focusNode.dispose();
    super.dispose();
  }

  void _handleFocusChange() {
    setState(() => _isFocused = _focusNode.hasFocus);
  }

  void _handleKeyEvent(KeyEvent event) {
    if (event is KeyDownEvent && widget.onToggle != null) {
      // Toggle on Space or Enter
      if (event.logicalKey == LogicalKeyboardKey.space ||
          event.logicalKey == LogicalKeyboardKey.enter) {
        widget.onToggle!();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final spacing = context.spacing;

    // Visual state based on value
    final icon = widget.value ? widget.trueIcon : widget.falseIcon;
    final color = widget.value
        ? (widget.trueColor ?? theme.colorScheme.primary)
        : (widget.falseColor ?? theme.colorScheme.error);
    final tooltip = widget.value ? widget.tooltipTrue : widget.tooltipFalse;

    // Sizing
    final size = widget.compact ? spacing.xxl : spacing.xxl * 1.25;
    final iconSize = widget.compact ? spacing.iconSizeSM : spacing.iconSizeMD;

    return Semantics(
      button: true,
      enabled: widget.onToggle != null,
      toggled: widget.value,
      label: tooltip,
      child: Tooltip(
        message: tooltip,
        waitDuration: const Duration(milliseconds: 500),
        child: KeyboardListener(
          focusNode: _focusNode,
          onKeyEvent: _handleKeyEvent,
          child: InkWell(
            onTap: widget.onToggle,
            borderRadius: spacing.radiusSM,
            child: Container(
              width: size,
              height: size,
              decoration: BoxDecoration(
                border: Border.all(
                  color: _isFocused
                      ? theme.colorScheme.primary
                      : widget.onToggle == null
                      ? theme.disabledColor.withValues(
                          alpha: AppColors.opacityHint,
                        )
                      : color.withValues(alpha: AppColors.opacityHint),
                  width: _isFocused
                      ? AppBorders.widthThick
                      : AppBorders.widthMedium,
                ),
                borderRadius: spacing.radiusSM,
              ),
              child: Icon(
                icon,
                size: iconSize,
                color: widget.onToggle == null ? theme.disabledColor : color,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
