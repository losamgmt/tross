import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';

/// Generic read-only text field display atom for ANY text value on ANY model
///
/// **SOLE RESPONSIBILITY:** Render text value ONLY (no label, no layout)
/// - Context-agnostic: NO Column, NO Row, NO Expanded
/// - Parent handles: Label rendering, layout, spacing
///
/// Features:
/// - Read-only text display
/// - Empty state handling
/// - Custom text styling
/// - Icon support (inline with text)
///
/// Usage:
/// ```dart
/// TextFieldDisplay(
///   value: user.email,
/// )
///
/// TextFieldDisplay(
///   value: order.status,
///   icon: Icons.info,
///   valueStyle: TextStyle(color: Colors.green),
/// )
/// ```
class TextFieldDisplay extends StatelessWidget {
  final String? value;
  final String? emptyText;
  final IconData? icon;
  final TextStyle? valueStyle;

  const TextFieldDisplay({
    super.key,
    required this.value,
    this.emptyText = '--',
    this.icon,
    this.valueStyle,
  });

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final theme = Theme.of(context);
    final displayValue = value?.isNotEmpty == true ? value! : emptyText!;
    final isEmptyState = value?.isNotEmpty != true;

    // Pure value rendering: just the text with optional icon
    if (icon != null) {
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            size: 16,
            color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
          ),
          SizedBox(width: spacing.xs),
          Text(
            displayValue,
            style:
                valueStyle ??
                theme.textTheme.bodyMedium?.copyWith(
                  color: isEmptyState
                      ? theme.colorScheme.onSurface.withValues(alpha: 0.38)
                      : theme.colorScheme.onSurface,
                ),
          ),
        ],
      );
    }

    // Just the text
    return Text(
      displayValue,
      style:
          valueStyle ??
          theme.textTheme.bodyMedium?.copyWith(
            color: isEmptyState
                ? theme.colorScheme.onSurface.withValues(alpha: 0.38)
                : theme.colorScheme.onSurface,
          ),
    );
  }
}
