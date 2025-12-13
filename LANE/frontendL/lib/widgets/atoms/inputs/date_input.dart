import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';
import '../../../utils/helpers/helpers.dart';

/// Generic date input atom for ANY date field on ANY model
///
/// Features:
/// - Date picker dialog
/// - Custom date format display
/// - Min/max date constraints
/// - Validation callback
/// - Error/helper text display
/// - Prefix/suffix icons
/// - Disabled state
/// - Clear button
///
/// **SRP: Pure Input Rendering**
/// - Returns ONLY the date input field
/// - NO label rendering (molecule's job)
/// - NO Column wrapper (molecule handles layout)
/// - Context-agnostic: Can be used anywhere
///
/// Usage:
/// ```dart
/// DateInput(
///   value: DateTime(1990, 1, 1),
///   onChanged: (date) => setState(() => birthDate = date),
///   minDate: DateTime(1900, 1, 1),
///   maxDate: DateTime.now(),
/// )
/// ```
class DateInput extends StatelessWidget {
  final DateTime? value;
  final ValueChanged<DateTime?> onChanged;
  final DateTime? minDate;
  final DateTime? maxDate;
  final String? Function(DateTime?)? validator;
  final String? errorText;
  final String? helperText;
  final bool enabled;
  final String? placeholder;
  final IconData? prefixIcon;
  final IconData? suffixIcon;
  final String dateFormat;
  final bool showClearButton;

  const DateInput({
    super.key,
    required this.value,
    required this.onChanged,
    this.minDate,
    this.maxDate,
    this.validator,
    this.errorText,
    this.helperText,
    this.enabled = true,
    this.placeholder,
    this.prefixIcon,
    this.suffixIcon,
    this.dateFormat = 'MMM d, yyyy',
    this.showClearButton = true,
  });

  Future<void> _selectDate(BuildContext context) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: value ?? DateTime.now(),
      firstDate: minDate ?? DateTime(1900),
      lastDate: maxDate ?? DateTime(2100),
    );

    if (picked != null) {
      onChanged(picked);
    }
  }

  void _clearDate() {
    onChanged(null);
  }

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final theme = Theme.of(context);

    // Pure input rendering: Just the date input field
    return InkWell(
      onTap: enabled ? () => _selectDate(context) : null,
      child: InputDecorator(
        decoration: InputDecoration(
          hintText: placeholder ?? 'Select date',
          errorText: errorText,
          helperText: helperText,
          prefixIcon: prefixIcon != null
              ? Icon(prefixIcon)
              : const Icon(Icons.calendar_today),
          suffixIcon: value != null && showClearButton && enabled
              ? IconButton(
                  icon: const Icon(Icons.clear),
                  onPressed: _clearDate,
                  tooltip: 'Clear date',
                )
              : (suffixIcon != null ? Icon(suffixIcon) : null),
          border: const OutlineInputBorder(),
          contentPadding: EdgeInsets.symmetric(
            horizontal: spacing.sm,
            vertical: spacing.md,
          ),
          enabled: enabled,
        ),
        child: Text(
          value != null ? DateTimeHelpers.formatDate(value!) : '',
          style: theme.textTheme.bodyMedium?.copyWith(
            color: enabled
                ? theme.colorScheme.onSurface
                : theme.colorScheme.onSurface.withValues(alpha: 0.38),
          ),
        ),
      ),
    );
  }
}
