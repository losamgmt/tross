import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';

/// SettingTextRow - Molecule for text input settings with description
///
/// **SOLE RESPONSIBILITY:** Compose label + description + text input in a layout
///
/// Features:
/// - Left side: Label text + optional description
/// - Right side: Text input field
/// - Consistent spacing across all settings screens
/// - Zero business logic, pure presentation
///
/// This is the text equivalent of SettingToggleRow, SettingDropdownRow, etc.
///
/// Usage:
/// ```dart
/// SettingTextRow(
///   label: 'Company Name',
///   description: 'Your business name as it appears on invoices',
///   value: settings['companyName'] ?? '',
///   onChanged: (value) => _updateSetting('companyName', value),
///   placeholder: 'Enter company name',
/// )
/// ```
class SettingTextRow extends StatelessWidget {
  final String label;
  final String? description;
  final String value;
  final ValueChanged<String>? onChanged;
  final bool enabled;
  final String? placeholder;
  final String? helperText;
  final String? errorText;
  final int? maxLength;
  final int maxLines;
  final TextInputType keyboardType;
  final bool obscureText;
  final double? inputWidth;

  const SettingTextRow({
    super.key,
    required this.label,
    this.description,
    required this.value,
    this.onChanged,
    this.enabled = true,
    this.placeholder,
    this.helperText,
    this.errorText,
    this.maxLength,
    this.maxLines = 1,
    this.keyboardType = TextInputType.text,
    this.obscureText = false,
    this.inputWidth,
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
            flex: 2,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
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
          // Text input (right side)
          SizedBox(
            width: inputWidth ?? 200,
            child: TextField(
              controller: TextEditingController(text: value),
              onChanged: onChanged,
              enabled: enabled,
              maxLength: maxLength,
              maxLines: maxLines,
              keyboardType: keyboardType,
              obscureText: obscureText,
              decoration: InputDecoration(
                hintText: placeholder,
                helperText: helperText,
                errorText: errorText,
                counterText: '', // Hide character counter
                contentPadding: EdgeInsets.symmetric(
                  horizontal: spacing.md,
                  vertical: spacing.sm,
                ),
                border: OutlineInputBorder(borderRadius: spacing.radiusSM),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
