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
import '../../../config/app_colors.dart';
import '../../../config/app_sizes.dart';
import '../../../config/app_spacing.dart';
import '../../../config/app_typography.dart';

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
    final sizes = context.sizes;
    final theme = Theme.of(context);

    // Flutter 3.32+: RadioGroup ancestor provides groupValue and onChanged
    final radioGroup = RadioGroup.maybeOf<T>(context);
    final isSelected = value == radioGroup?.groupValue;
    final onChanged = enabled ? radioGroup?.onChanged : null;

    // Use theme text styles, not hardcoded sizes
    final labelStyle = compact
        ? theme.textTheme.bodySmall
        : theme.textTheme.bodyMedium;
    final descStyle = theme.textTheme.bodySmall;

    // Use centralized sizes for radio button container
    final radioSize = compact
        ? sizes.buttonHeightSmall
        : sizes.buttonHeightMedium;

    return Semantics(
      label: label,
      selected: isSelected,
      enabled: enabled,
      child: InkWell(
        onTap: onChanged != null ? () => onChanged(value) : null,
        child: Padding(
          padding: EdgeInsets.symmetric(vertical: spacing.xxs),
          child: Row(
            crossAxisAlignment: description != null
                ? CrossAxisAlignment.start
                : CrossAxisAlignment.center,
            children: [
              SizedBox(
                width: radioSize,
                height: radioSize,
                // Flutter 3.32+: Radio gets groupValue/onChanged from RadioGroup ancestor
                child: Radio<T>(
                  value: value,
                  toggleable: false,
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
                      style: labelStyle?.copyWith(
                        fontWeight: isSelected
                            ? AppTypography.medium
                            : AppTypography.regular,
                        color: enabled
                            ? theme.colorScheme.onSurface
                            : theme.colorScheme.onSurface.withValues(
                                alpha: AppColors.opacityHint,
                              ),
                      ),
                    ),
                    if (description != null) ...[
                      SizedBox(height: spacing.xxs / 2),
                      Text(
                        description!,
                        style: descStyle?.copyWith(
                          color: theme.colorScheme.onSurface.withValues(
                            alpha: AppColors.opacitySecondary,
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
      ),
    );
  }
}
