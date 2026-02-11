/// CopyFieldsButton - UI-only button for "Same as [source]" actions
///
/// SINGLE RESPONSIBILITY: Trigger field copy operation
///
/// A compact button that triggers copying field values from one
/// source group to a target group. Used in forms with multiple
/// related field groups (e.g., billing/service addresses).
///
/// Features:
/// - Compact secondary styling
/// - Icon + label in minimal space
/// - Consistent hover/press states
/// - Purely UI - parent handles the actual copy logic
///
/// Usage:
/// ```dart
/// CopyFieldsButton(
///   label: 'Same as Billing',
///   onPressed: () => copyBillingToService(),
/// )
/// ```
library;

import 'package:flutter/material.dart';

/// Compact button for copying field values between sections
class CopyFieldsButton extends StatelessWidget {
  /// Button label (e.g., "Same as Billing")
  final String label;

  /// Callback when button is pressed
  final VoidCallback? onPressed;

  /// Whether the button is disabled
  final bool enabled;

  /// Custom icon (defaults to content_copy)
  final IconData icon;

  const CopyFieldsButton({
    super.key,
    required this.label,
    this.onPressed,
    this.enabled = true,
    this.icon = Icons.content_copy,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return TextButton.icon(
      onPressed: enabled ? onPressed : null,
      icon: Icon(icon, size: 16),
      label: Text(label, style: theme.textTheme.bodySmall),
      style: TextButton.styleFrom(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        minimumSize: Size.zero,
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        foregroundColor: theme.colorScheme.secondary,
      ),
    );
  }
}
