import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../config/app_spacing.dart';

/// SettingNumberRow - Molecule for number settings with description
///
/// **SOLE RESPONSIBILITY:** Compose label + description + number input in a row layout
///
/// Features:
/// - Label text (left side)
/// - Optional description text (below label)
/// - Number input field (right side)
/// - Optional suffix text (e.g., "min", "hours", "days")
/// - Consistent spacing across all settings screens
/// - Zero business logic, pure presentation
///
/// This is the generic equivalent of Lane's `_buildNumberSetting()` pattern.
///
/// Usage:
/// ```dart
/// SettingNumberRow(
///   label: 'Daily threshold',
///   description: 'Number of hours before overtime kicks in',
///   value: settings['dailyThreshold'] ?? 8,
///   suffix: 'hours',
///   onChanged: (value) => _updateSetting('dailyThreshold', value),
/// )
/// ```
class SettingNumberRow extends StatelessWidget {
  final String label;
  final String? description;
  final num? value;
  final ValueChanged<num?>? onChanged;
  final bool enabled;
  final String? suffix;
  final num? min;
  final num? max;
  final double? inputWidth;
  final bool allowDecimals;

  const SettingNumberRow({
    super.key,
    required this.label,
    this.description,
    required this.value,
    this.onChanged,
    this.enabled = true,
    this.suffix,
    this.min,
    this.max,
    this.inputWidth = 100,
    this.allowDecimals = false,
  });

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final theme = Theme.of(context);

    return Padding(
      padding: EdgeInsets.only(bottom: spacing.md),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Label + description (left side, flex: 2)
          Expanded(
            flex: 2,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w500,
                    color: enabled
                        ? theme.colorScheme.onSurface
                        : theme.colorScheme.onSurface.withValues(alpha: 0.5),
                  ),
                ),
                if (description != null) ...[
                  SizedBox(height: spacing.xxs),
                  Text(
                    description!,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ],
            ),
          ),
          SizedBox(width: spacing.md),
          // Number input + suffix (right side)
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(
                width: inputWidth,
                child: TextFormField(
                  initialValue: value?.toString() ?? '',
                  keyboardType: TextInputType.numberWithOptions(
                    decimal: allowDecimals,
                  ),
                  inputFormatters: [
                    if (allowDecimals)
                      FilteringTextInputFormatter.allow(RegExp(r'[\d.]'))
                    else
                      FilteringTextInputFormatter.digitsOnly,
                  ],
                  decoration: InputDecoration(
                    contentPadding: EdgeInsets.symmetric(
                      horizontal: spacing.md,
                      vertical: spacing.sm,
                    ),
                    border: OutlineInputBorder(borderRadius: spacing.radiusSM),
                  ),
                  enabled: enabled,
                  onChanged: (text) {
                    if (onChanged == null) return;
                    if (text.isEmpty) {
                      onChanged!(null);
                      return;
                    }
                    final parsed = allowDecimals
                        ? double.tryParse(text)
                        : int.tryParse(text);
                    if (parsed != null) {
                      // Clamp to min/max if specified
                      num clamped = parsed;
                      if (min != null && clamped < min!) clamped = min!;
                      if (max != null && clamped > max!) clamped = max!;
                      onChanged!(clamped);
                    }
                  },
                ),
              ),
              if (suffix != null) ...[
                SizedBox(width: spacing.sm),
                Text(
                  suffix!,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}
