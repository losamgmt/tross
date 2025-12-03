/// Number Field Display Atom
library;

import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';
import '../../../utils/helpers/helpers.dart';

/// Generic read-only number field display atom for ANY numeric value on ANY model
///
/// **SOLE RESPONSIBILITY:** Render numeric value ONLY (no label, no layout)
/// - Context-agnostic: NO Column, NO Row with Expanded
/// - Parent handles: Label rendering, layout, spacing
///
/// Features:
/// - Read-only number display
/// - Empty state handling
/// - Number formatting
/// - Prefix/suffix support (e.g., $, %, units)
/// - Icon support (inline with value)
/// - Custom text styling
///
/// Usage:
/// ```dart
/// NumberFieldDisplay(
///   value: 25,
/// )
///
/// NumberFieldDisplay(
///   value: 99.99,
///   prefix: '\$',
///   decimals: 2,
/// )
/// ```
class NumberFieldDisplay extends StatelessWidget {
  final num? value;
  final String? emptyText;
  final String? prefix;
  final String? suffix;
  final int? decimals;
  final IconData? icon;
  final TextStyle? valueStyle;

  const NumberFieldDisplay({
    super.key,
    required this.value,
    this.emptyText = '--',
    this.prefix,
    this.suffix,
    this.decimals,
    this.icon,
    this.valueStyle,
  });

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final theme = Theme.of(context);
    final isEmptyState = value == null;

    String displayValue;
    if (isEmptyState) {
      displayValue = emptyText!;
    } else {
      final formattedNumber = NumberHelpers.formatNumber(
        value!,
        decimals: decimals,
      );
      displayValue = '${prefix ?? ''}$formattedNumber${suffix ?? ''}';
    }

    // Pure value rendering: just the number with optional icon
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

    // Just the number
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
