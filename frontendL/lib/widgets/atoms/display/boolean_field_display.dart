import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';

/// Generic read-only boolean field display atom for ANY boolean value on ANY model
///
/// **SOLE RESPONSIBILITY:** Render boolean value ONLY (no label, no layout)
/// - Context-agnostic: NO Column, NO Row assumptions
/// - Parent handles: Label rendering, layout, spacing
///
/// Features:
/// - Read-only boolean display
/// - Visual indicator (icon, badge, text)
/// - Customizable true/false labels
/// - Color coding
/// - Icon support
///
/// Usage:
/// ```dart
/// BooleanFieldDisplay(
///   value: true,
/// )
///
/// BooleanFieldDisplay(
///   value: user.isVerified,
///   trueLabel: 'Verified',
///   falseLabel: 'Not Verified',
///   trueColor: Colors.green,
///   falseColor: Colors.grey,
/// )
/// ```
class BooleanFieldDisplay extends StatelessWidget {
  final bool? value;
  final String trueLabel;
  final String falseLabel;
  final String? nullLabel;
  final Color? trueColor;
  final Color? falseColor;
  final Color? nullColor;
  final IconData? trueIcon;
  final IconData? falseIcon;
  final IconData? nullIcon;
  final bool showIcon;
  final TextStyle? valueStyle;

  const BooleanFieldDisplay({
    super.key,
    required this.value,
    this.trueLabel = 'Yes',
    this.falseLabel = 'No',
    this.nullLabel = '--',
    this.trueColor,
    this.falseColor,
    this.nullColor,
    this.trueIcon = Icons.check_circle,
    this.falseIcon = Icons.cancel,
    this.nullIcon = Icons.help_outline,
    this.showIcon = true,
    this.valueStyle,
  });

  Color _getColor(BuildContext context) {
    if (value == null) {
      return nullColor ??
          Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.38);
    }
    if (value!) {
      return trueColor ?? Colors.green;
    }
    return falseColor ?? Colors.grey;
  }

  String _getLabel() {
    if (value == null) return nullLabel!;
    return value! ? trueLabel : falseLabel;
  }

  IconData? _getIcon() {
    if (!showIcon) return null;
    if (value == null) return nullIcon;
    return value! ? trueIcon : falseIcon;
  }

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final displayColor = _getColor(context);
    final displayLabel = _getLabel();
    final displayIcon = _getIcon();

    // Pure value rendering: icon + text
    if (displayIcon != null) {
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(displayIcon, size: 16, color: displayColor),
          SizedBox(width: spacing.xs),
          Text(
            displayLabel,
            style:
                valueStyle ??
                TextStyle(color: displayColor, fontWeight: FontWeight.w500),
          ),
        ],
      );
    }

    // Just the text
    return Text(
      displayLabel,
      style:
          valueStyle ??
          TextStyle(color: displayColor, fontWeight: FontWeight.w500),
    );
  }
}
