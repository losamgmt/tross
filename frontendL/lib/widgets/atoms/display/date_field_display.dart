import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';
import '../../../utils/helpers/helpers.dart';

/// Generic read-only date field display atom for ANY date value on ANY model
///
/// **SOLE RESPONSIBILITY:** Render date value ONLY (no label, no layout)
/// - Context-agnostic: NO Column, NO Row with Expanded
/// - Parent handles: Label rendering, layout, spacing
///
/// Features:
/// - Read-only date display
/// - Empty state handling
/// - Simple date formatting
/// - Icon support (inline with value)
/// - Custom text styling
///
/// Usage:
/// ```dart
/// DateFieldDisplay(
///   value: DateTime(1990, 5, 15),
/// )
///
/// DateFieldDisplay(
///   value: user.createdAt,
///   icon: Icons.calendar_today,
/// )
/// ```
class DateFieldDisplay extends StatelessWidget {
  final DateTime? value;
  final String? emptyText;
  final IconData? icon;
  final TextStyle? valueStyle;

  const DateFieldDisplay({
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
    final isEmptyState = value == null;
    final displayValue = isEmptyState
        ? emptyText!
        : DateTimeHelpers.formatDate(value!);

    // Pure value rendering: just the date with optional icon
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

    // Just the date
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
