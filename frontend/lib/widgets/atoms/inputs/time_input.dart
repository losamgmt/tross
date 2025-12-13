import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';

/// Generic time input atom for ANY time field on ANY model
///
/// Features:
/// - Time picker dialog
/// - Custom time format display
/// - Validation callback
/// - Error/helper text display
/// - Prefix/suffix icons
/// - Disabled state
/// - Clear button
///
/// **SRP: Pure Input Rendering**
/// - Returns ONLY the time input field
/// - NO label rendering (molecule's job)
/// - NO Column wrapper (molecule handles layout)
/// - Context-agnostic: Can be used anywhere
///
/// Usage:
/// ```dart
/// TimeInput(
///   value: TimeOfDay(hour: 9, minute: 0),
///   onChanged: (time) => setState(() => startTime = time),
/// )
/// ```
class TimeInput extends StatelessWidget {
  final TimeOfDay? value;
  final ValueChanged<TimeOfDay?> onChanged;
  final String? Function(TimeOfDay?)? validator;
  final String? errorText;
  final String? helperText;
  final bool enabled;
  final String? placeholder;
  final IconData? prefixIcon;
  final IconData? suffixIcon;
  final bool use24HourFormat;
  final bool showClearButton;

  const TimeInput({
    super.key,
    required this.value,
    required this.onChanged,
    this.validator,
    this.errorText,
    this.helperText,
    this.enabled = true,
    this.placeholder,
    this.prefixIcon,
    this.suffixIcon,
    this.use24HourFormat = false,
    this.showClearButton = true,
  });

  Future<void> _selectTime(BuildContext context) async {
    final TimeOfDay? picked = await showTimePicker(
      context: context,
      initialTime: value ?? TimeOfDay.now(),
      builder: (context, child) {
        return MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(alwaysUse24HourFormat: use24HourFormat),
          child: child!,
        );
      },
    );

    if (picked != null) {
      onChanged(picked);
    }
  }

  void _clearTime() {
    onChanged(null);
  }

  String _formatTime(TimeOfDay time) {
    if (use24HourFormat) {
      return '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';
    } else {
      final hour = time.hourOfPeriod == 0 ? 12 : time.hourOfPeriod;
      final minute = time.minute.toString().padLeft(2, '0');
      final period = time.period == DayPeriod.am ? 'AM' : 'PM';
      return '$hour:$minute $period';
    }
  }

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final theme = Theme.of(context);

    // Pure input rendering: Just the time input field
    return InkWell(
      onTap: enabled ? () => _selectTime(context) : null,
      child: InputDecorator(
        decoration: InputDecoration(
          hintText: placeholder ?? 'Select time',
          errorText: errorText,
          helperText: helperText,
          prefixIcon: prefixIcon != null
              ? Icon(prefixIcon)
              : const Icon(Icons.access_time),
          suffixIcon: value != null && showClearButton && enabled
              ? IconButton(
                  icon: const Icon(Icons.clear),
                  onPressed: _clearTime,
                  tooltip: 'Clear',
                )
              : (suffixIcon != null ? Icon(suffixIcon) : null),
          enabled: enabled,
          contentPadding: EdgeInsets.symmetric(
            horizontal: spacing.md,
            vertical: spacing.sm,
          ),
          border: OutlineInputBorder(borderRadius: spacing.radiusSM),
        ),
        child: Text(
          value != null ? _formatTime(value!) : placeholder ?? 'Select time',
          style: theme.textTheme.bodyMedium?.copyWith(
            color: value != null
                ? theme.colorScheme.onSurface
                : theme.colorScheme.onSurface.withValues(alpha: 0.6),
          ),
        ),
      ),
    );
  }
}
