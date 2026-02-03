import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../config/app_spacing.dart';
import '../interactions/touch_target.dart';

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
/// - **Keyboard shortcuts** - Space/Enter to open picker when focused
/// - Tab navigation support
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
class TimeInput extends StatefulWidget {
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

  @override
  State<TimeInput> createState() => _TimeInputState();
}

class _TimeInputState extends State<TimeInput> {
  late final FocusNode _focusNode;
  bool _isFocused = false;

  @override
  void initState() {
    super.initState();
    _focusNode = FocusNode();
    _focusNode.addListener(_handleFocusChange);
  }

  @override
  void dispose() {
    _focusNode.removeListener(_handleFocusChange);
    _focusNode.dispose();
    super.dispose();
  }

  void _handleFocusChange() {
    setState(() => _isFocused = _focusNode.hasFocus);
  }

  void _handleKeyEvent(KeyEvent event) {
    if (event is KeyDownEvent && widget.enabled) {
      // Open picker on Space or Enter
      if (event.logicalKey == LogicalKeyboardKey.space ||
          event.logicalKey == LogicalKeyboardKey.enter) {
        _selectTime(context);
      }
    }
  }

  Future<void> _selectTime(BuildContext context) async {
    final TimeOfDay? picked = await showTimePicker(
      context: context,
      initialTime: widget.value ?? TimeOfDay.now(),
      builder: (context, child) {
        return MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(alwaysUse24HourFormat: widget.use24HourFormat),
          child: child!,
        );
      },
    );

    if (picked != null) {
      widget.onChanged(picked);
    }
  }

  void _clearTime() {
    widget.onChanged(null);
  }

  String _formatTime(TimeOfDay time) {
    if (widget.use24HourFormat) {
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
    return KeyboardListener(
      focusNode: _focusNode,
      onKeyEvent: _handleKeyEvent,
      child: TouchTarget(
        onTap: widget.enabled ? () => _selectTime(context) : null,
        enabled: widget.enabled,
        semanticLabel: 'Select time',
        child: InputDecorator(
          isFocused: _isFocused,
          decoration: InputDecoration(
            hintText: widget.placeholder ?? 'Select time',
            errorText: widget.errorText,
            helperText: widget.helperText,
            prefixIcon: widget.prefixIcon != null
                ? Icon(widget.prefixIcon)
                : const Icon(Icons.access_time),
            suffixIcon:
                widget.value != null && widget.showClearButton && widget.enabled
                ? TouchTarget.icon(
                    icon: Icons.clear,
                    onTap: _clearTime,
                    tooltip: 'Clear',
                  )
                : (widget.suffixIcon != null ? Icon(widget.suffixIcon) : null),
            enabled: widget.enabled,
            contentPadding: EdgeInsets.symmetric(
              horizontal: spacing.md,
              vertical: spacing.sm,
            ),
            border: OutlineInputBorder(borderRadius: spacing.radiusSM),
          ),
          child: Text(
            widget.value != null
                ? _formatTime(widget.value!)
                : widget.placeholder ?? 'Select time',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: widget.value != null
                  ? theme.colorScheme.onSurface
                  : theme.colorScheme.onSurface.withValues(alpha: 0.6),
            ),
          ),
        ),
      ),
    );
  }
}
