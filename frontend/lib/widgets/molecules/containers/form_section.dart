/// FormSection - Visual grouping container for form fields
///
/// A simple, reusable container that groups related form fields
/// with a label header. Used by GenericForm when layout is [FormLayout.grouped].
///
/// Features:
/// - Label header with consistent styling
/// - Optional divider between sections
/// - Optional trailing action widget (e.g., "Same as Billing" button)
/// - Responsive spacing using AppSpacing
/// - No business logic - pure presentation
///
/// Usage:
/// ```dart
/// FormSection(
///   label: 'Service Address',
///   trailing: TextButton(
///     onPressed: onCopyFromBilling,
///     child: Text('Same as Billing'),
///   ),
///   children: [
///     GenericFormField(config: line1Config, ...),
///     GenericFormField(config: cityConfig, ...),
///   ],
/// )
/// ```
library;

import 'package:flutter/material.dart';
import 'package:tross/config/app_spacing.dart';

/// Visual section container for grouping form fields
class FormSection extends StatelessWidget {
  /// Section header label (e.g., "Billing Address", "Appearance")
  final String label;

  /// Child widgets (typically GenericFormField widgets)
  final List<Widget> children;

  /// Whether to show a divider above this section
  /// Default true for all but first section
  final bool showDivider;

  /// Optional icon to display next to label
  final IconData? icon;

  /// Optional trailing widget (e.g., "Same as Billing" button)
  final Widget? trailing;

  const FormSection({
    super.key,
    required this.label,
    required this.children,
    this.showDivider = true,
    this.icon,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final spacing = context.spacing;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        // Divider (optional, for visual separation between sections)
        if (showDivider)
          Padding(
            padding: EdgeInsets.only(bottom: spacing.md),
            child: Divider(
              color: theme.dividerColor.withValues(alpha: 0.5),
              height: 1,
            ),
          ),

        // Section header with optional trailing action
        Padding(
          padding: EdgeInsets.only(bottom: spacing.sm),
          child: Row(
            children: [
              if (icon != null) ...[
                Icon(icon, size: 18, color: theme.colorScheme.primary),
                SizedBox(width: spacing.xs),
              ],
              Text(
                label,
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: theme.colorScheme.primary,
                ),
              ),
              if (trailing != null) ...[const Spacer(), trailing!],
            ],
          ),
        ),

        // Section content (form fields)
        ...children,
      ],
    );
  }
}
