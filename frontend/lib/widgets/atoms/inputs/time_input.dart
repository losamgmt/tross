import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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
  final FocusNode? focusNode;

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
    this.focusNode,
  });

  @override
  State<TimeInput> createState() => _TimeInputState();
}

class _TimeInputState extends State<TimeInput> {
  FocusNode? _internalFocusNode;
  FocusNode get _focusNode =>
      widget.focusNode ?? (_internalFocusNode ??= FocusNode());
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: _formatValue());
  }

  @override
  void didUpdateWidget(TimeInput oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.value != widget.value) {
      _controller.text = _formatValue();
    }
  }

  @override
  void dispose() {
    _internalFocusNode?.dispose();
    _controller.dispose();
    super.dispose();
  }

  String _formatValue() {
    if (widget.value == null) return '';
    return _formatTime(widget.value!);
  }

  Future<void> _selectTime(BuildContext context) async {
    final TimeOfDay? picked = await showTimePicker(
      context: context,
      initialTime: widget.value ?? TimeOfDay.now(),
      builder: (context, child) {
        return MediaQuery(
          data: MediaQuery.of(context)
              .copyWith(alwaysUse24HourFormat: widget.use24HourFormat),
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

    return Focus(
      focusNode: _focusNode,
      onKeyEvent: (node, event) {
        if (widget.enabled &&
            event is KeyDownEvent &&
            (event.logicalKey == LogicalKeyboardKey.space ||
                event.logicalKey == LogicalKeyboardKey.enter)) {
          _selectTime(context);
          return KeyEventResult.handled;
        }
        return KeyEventResult.ignored;
      },
      child: TextField(
        controller: _controller,
        readOnly: true,
        enabled: widget.enabled,
        onTap: widget.enabled ? () => _selectTime(context) : null,
        decoration: InputDecoration(
          hintText: widget.placeholder ?? 'Select time',
          errorText: widget.errorText,
          helperText: widget.helperText,
          prefixIcon: widget.prefixIcon != null
              ? Icon(widget.prefixIcon)
              : const Icon(Icons.access_time),
          suffixIcon:
              widget.value != null && widget.showClearButton && widget.enabled
                  ? IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: _clearTime,
                      tooltip: 'Clear time',
                    )
                  : (widget.suffixIcon != null ? Icon(widget.suffixIcon) : null),
          border: const OutlineInputBorder(),
          contentPadding: EdgeInsets.symmetric(
            horizontal: spacing.md,
            vertical: spacing.sm,
          ),
        ),
      ),
    );
  }
}
