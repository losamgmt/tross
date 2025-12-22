/// RadioInput - Generic radio button atom for use within RadioGroup
///
/// **SOLE RESPONSIBILITY:** Render a single radio button with label
/// - Must be used within a RadioGroup ancestor
/// - Context-agnostic: NO layout assumptions (single item only)
/// - Parent decides: grouping, layout (horizontal/vertical), spacing
///
/// GENERIC: Works for ANY radio selection (priority, status, type, etc.)
///
/// Note: This is a SINGLE radio button atom. Must be wrapped in a RadioGroup.
/// For a complete settings row with label and description, use SettingRadioGroup.
///
/// Features:
/// - Customizable label
/// - Optional description text
/// - Enabled/disabled states
/// - Compact and standard sizes
///
/// Usage:
/// ```dart
/// // Wrap multiple RadioInputs in a RadioGroup
/// RadioGroup<Priority>(
///   groupValue: selectedPriority,
///   onChanged: (value) => setState(() => selectedPriority = value),
///   child: Column(
///     children: [
///       RadioInput<Priority>(value: Priority.high, label: 'High'),
///       RadioInput<Priority>(value: Priority.medium, label: 'Medium'),
///       RadioInput<Priority>(value: Priority.low, label: 'Low'),
///     ],
///   ),
/// )
///
/// // With description
/// RadioGroup<String>(
///   groupValue: shippingMethod,
///   onChanged: (value) => setState(() => shippingMethod = value),
///   child: RadioInput<String>(
///     value: 'express',
///     label: 'Express Shipping',
///     description: '2-3 business days',
///   ),
/// )
/// ```
library;

import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';

class RadioInput<T> extends StatelessWidget {
  /// This radio button's value
  final T value;

  /// Label text next to the radio button
  final String label;

  /// Optional description below the label
  final String? description;

  /// Whether the radio is enabled
  final bool enabled;

  /// Compact mode (smaller visual)
  final bool compact;

  const RadioInput({
    super.key,
    required this.value,
    required this.label,
    this.description,
    this.enabled = true,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final theme = Theme.of(context);

    // Get group context from RadioGroup ancestor
    final groupValue = RadioGroup.maybeOf<T>(context)?.groupValue;
    final onChanged = RadioGroup.maybeOf<T>(context)?.onChanged;

    final isSelected = value == groupValue;
    final labelFontSize = compact ? 13.0 : 14.0;
    final descFontSize = compact ? 11.0 : 12.0;

    return InkWell(
      onTap: enabled && onChanged != null ? () => onChanged(value) : null,
      borderRadius: spacing.radiusSM,
      child: Padding(
        padding: EdgeInsets.symmetric(vertical: spacing.xxs),
        child: Row(
          crossAxisAlignment: description != null
              ? CrossAxisAlignment.start
              : CrossAxisAlignment.center,
          children: [
            SizedBox(
              width: compact ? 36 : 40,
              height: compact ? 36 : 40,
              child: Radio<T>(
                value: value,
                materialTapTargetSize: compact
                    ? MaterialTapTargetSize.shrinkWrap
                    : MaterialTapTargetSize.padded,
              ),
            ),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    label,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontSize: labelFontSize,
                      fontWeight: isSelected
                          ? FontWeight.w500
                          : FontWeight.normal,
                      color: enabled
                          ? theme.colorScheme.onSurface
                          : theme.colorScheme.onSurface.withValues(alpha: 0.5),
                    ),
                  ),
                  if (description != null) ...[
                    SizedBox(height: spacing.xxs / 2),
                    Text(
                      description!,
                      style: theme.textTheme.bodySmall?.copyWith(
                        fontSize: descFontSize,
                        color: theme.colorScheme.onSurface.withValues(
                          alpha: 0.6,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
