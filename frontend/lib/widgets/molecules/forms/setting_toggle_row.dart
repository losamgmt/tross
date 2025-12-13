import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';

/// SettingToggleRow - Molecule for toggle settings with description
///
/// **SOLE RESPONSIBILITY:** Compose label + description + toggle in a row layout
///
/// Features:
/// - Label text (left side)
/// - Optional description text (below label)
/// - Toggle switch (right side)
/// - Consistent spacing across all settings screens
/// - Zero business logic, pure presentation
///
/// This is the generic equivalent of Lane's `_buildSettingRow()` pattern.
///
/// Usage:
/// ```dart
/// SettingToggleRow(
///   label: 'Enable billable events',
///   description: 'Allow tracking of billable time events',
///   value: settings['billableEventsEnabled'] ?? false,
///   onChanged: (value) => _updateSetting('billableEventsEnabled', value),
/// )
/// ```
class SettingToggleRow extends StatelessWidget {
  final String label;
  final String? description;
  final bool value;
  final ValueChanged<bool>? onChanged;
  final bool enabled;
  final Color? activeColor;

  const SettingToggleRow({
    super.key,
    required this.label,
    this.description,
    required this.value,
    this.onChanged,
    this.enabled = true,
    this.activeColor,
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
          // Label + description (left side)
          Expanded(
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
          // Toggle (right side)
          Switch(
            value: value,
            onChanged: enabled ? onChanged : null,
            activeThumbColor: activeColor ?? theme.colorScheme.primary,
          ),
        ],
      ),
    );
  }
}
