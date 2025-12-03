import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';

/// Generic read-only select field display atom for ANY enum or object value on ANY model
///
/// **SOLE RESPONSIBILITY:** Render select value ONLY (no label, no layout)
/// - Context-agnostic: NO Column, NO Row with Expanded
/// - Parent handles: Label rendering, layout, spacing
///
/// Type-safe display that works with any type T
/// Uses a displayText function to convert items to strings
///
/// Features:
/// - Read-only display of selected value
/// - Empty state handling
/// - Custom display text transformation
/// - Icon support (inline with value)
/// - Custom text styling
///
/// Usage:
/// ```dart
/// // With enum
/// SelectFieldDisplay<UserRole>(
///   value: UserRole.admin,
///   displayText: (role) => role.name,
/// )
///
/// // With objects
/// SelectFieldDisplay<User>(
///   value: currentUser,
///   displayText: (user) => user.fullName,
/// )
/// ```
class SelectFieldDisplay<T> extends StatelessWidget {
  final T? value;
  final String Function(T) displayText;
  final String? emptyText;
  final IconData? icon;
  final TextStyle? valueStyle;

  const SelectFieldDisplay({
    super.key,
    required this.value,
    required this.displayText,
    this.emptyText = '--',
    this.icon,
    this.valueStyle,
  });

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final theme = Theme.of(context);
    final isEmptyState = value == null;
    final displayValue = isEmptyState ? emptyText! : displayText(value as T);

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
