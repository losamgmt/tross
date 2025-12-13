import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';

/// SettingDropdownRow - Molecule for dropdown settings with description
///
/// **SOLE RESPONSIBILITY:** Compose label + description + dropdown in a row layout
///
/// Features:
/// - Label text (left side)
/// - Optional description text (below label)
/// - Dropdown selector (right side)
/// - Consistent spacing across all settings screens
/// - Generic - works with any type T
/// - Zero business logic, pure presentation
///
/// This is the generic equivalent of Lane's `_buildDropdownSetting()` pattern.
///
/// Usage:
/// ```dart
/// SettingDropdownRow<String>(
///   label: 'Timezone',
///   description: 'Select your office timezone',
///   value: settings['timezone'],
///   items: ['America/Los_Angeles', 'America/New_York', 'America/Chicago'],
///   displayText: (tz) => tz,
///   onChanged: (value) => _updateSetting('timezone', value),
/// )
/// ```
class SettingDropdownRow<T> extends StatelessWidget {
  final String label;
  final String? description;
  final T? value;
  final List<T> items;
  final String Function(T) displayText;
  final ValueChanged<T?>? onChanged;
  final bool enabled;
  final double? dropdownWidth;

  const SettingDropdownRow({
    super.key,
    required this.label,
    this.description,
    required this.value,
    required this.items,
    required this.displayText,
    this.onChanged,
    this.enabled = true,
    this.dropdownWidth,
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
          // Dropdown (right side, flex: 3 or fixed width)
          SizedBox(
            width: dropdownWidth,
            child: Expanded(
              flex: dropdownWidth == null ? 3 : 0,
              child: DropdownButtonFormField<T>(
                initialValue: value,
                decoration: InputDecoration(
                  contentPadding: EdgeInsets.symmetric(
                    horizontal: spacing.md,
                    vertical: spacing.sm,
                  ),
                  border: OutlineInputBorder(borderRadius: spacing.radiusSM),
                ),
                items: items.map((item) {
                  return DropdownMenuItem<T>(
                    value: item,
                    child: Text(
                      displayText(item),
                      style: theme.textTheme.bodyMedium,
                    ),
                  );
                }).toList(),
                onChanged: enabled ? onChanged : null,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
