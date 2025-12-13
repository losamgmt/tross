/// DataLabel - Atom component for field labels
///
/// Consistent styling for data labels in tables, forms, and details
/// Material 3 Design with optional required indicator
///
/// Used in: table headers, form labels, detail views
library;

import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';

class DataLabel extends StatelessWidget {
  final String text;
  final bool required;
  final TextStyle? style;
  final Color? color;

  const DataLabel({
    super.key,
    required this.text,
    this.required = false,
    this.style,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final spacing = context.spacing;
    final defaultStyle = theme.textTheme.labelMedium?.copyWith(
      fontWeight: FontWeight.w600,
      color: color ?? theme.colorScheme.onSurfaceVariant,
      letterSpacing: 0.5,
    );

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(text, style: style ?? defaultStyle),
        if (required) ...[
          SizedBox(width: spacing.xxs),
          Text(
            '*',
            style: theme.textTheme.labelMedium?.copyWith(
              color: theme.colorScheme.error,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ],
    );
  }
}
