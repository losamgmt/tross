import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';

/// SettingRadioGroup - Molecule for radio button settings with description
///
/// **SOLE RESPONSIBILITY:** Compose label + description + radio options in a layout
///
/// Features:
/// - Header label text
/// - Optional description text (below label)
/// - Radio button options (vertical list)
/// - Generic - works with any type T
/// - Consistent spacing across all settings screens
/// - Zero business logic, pure presentation
///
/// This is the generic equivalent of Lane's RadioListTile patterns.
///
/// Usage:
/// ```dart
/// SettingRadioGroup<String>(
///   label: 'Visit Summary',
///   description: 'Select which visit summaries to include',
///   value: settings['visitSummaryOption'],
///   options: [
///     RadioOption(value: 'costs', label: 'Only visits with costs'),
///     RadioOption(value: 'all', label: 'All visit summaries'),
///   ],
///   onChanged: (value) => _updateSetting('visitSummaryOption', value),
/// )
/// ```
class SettingRadioGroup<T> extends StatelessWidget {
  final String label;
  final String? description;
  final T? value;
  final List<RadioOption<T>> options;
  final ValueChanged<T?>? onChanged;
  final bool enabled;
  final Color? activeColor;

  const SettingRadioGroup({
    super.key,
    required this.label,
    this.description,
    required this.value,
    required this.options,
    this.onChanged,
    this.enabled = true,
    this.activeColor,
  });

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final theme = Theme.of(context);
    final effectiveActiveColor = activeColor ?? theme.colorScheme.primary;

    return Padding(
      padding: EdgeInsets.only(bottom: spacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header label
          Text(
            label,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
              color: enabled
                  ? theme.colorScheme.onSurface
                  : theme.colorScheme.onSurface.withValues(alpha: 0.5),
            ),
          ),
          if (description != null) ...[
            SizedBox(height: spacing.xs),
            Text(
              description!,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
          SizedBox(height: spacing.md),
          // Radio options using RadioGroup
          RadioGroup<T>(
            groupValue: value,
            onChanged: enabled && onChanged != null ? onChanged! : (_) {},
            child: Column(
              children: options.map((option) {
                final isSelected = option.value == value;
                return RadioListTile<T>(
                  value: option.value,
                  title: Text(
                    option.label,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: enabled
                          ? theme.colorScheme.onSurface
                          : theme.colorScheme.onSurface.withValues(alpha: 0.5),
                    ),
                  ),
                  subtitle: option.subtitle != null
                      ? Text(
                          option.subtitle!,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        )
                      : null,
                  activeColor: effectiveActiveColor,
                  selected: isSelected,
                  contentPadding: EdgeInsets.zero,
                  dense: true,
                  secondary: option.trailing,
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }
}

/// Radio option configuration
class RadioOption<T> {
  final T value;
  final String label;
  final String? subtitle;
  final Widget? trailing;

  const RadioOption({
    required this.value,
    required this.label,
    this.subtitle,
    this.trailing,
  });
}
