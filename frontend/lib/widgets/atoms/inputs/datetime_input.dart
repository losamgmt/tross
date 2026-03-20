/// DateTime Input Atom - Full date AND time picker
///
/// Combines date picker dialog with time picker dialog for complete datetime.
/// Used for timestamp fields like scheduled_start, scheduled_end.
///
/// **SRP: Pure Input Rendering**
/// - Returns ONLY the datetime input field
/// - NO label rendering (molecule's job)
/// - NO Column wrapper (molecule handles layout)
///
/// **Composition Pattern:**
/// - Single input displays both date AND time
/// - Tap opens date picker → then time picker
/// - Clear button resets both
///
/// Usage:
/// ```dart
/// DateTimeInput(
///   value: DateTime(2026, 3, 15, 9, 30),
///   onChanged: (dt) => setState(() => scheduledStart = dt),
/// )
/// ```
library;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../config/app_spacing.dart';
import '../../../utils/helpers/helpers.dart';

class DateTimeInput extends StatefulWidget {
  final DateTime? value;
  final ValueChanged<DateTime?> onChanged;
  final DateTime? minDate;
  final DateTime? maxDate;
  final String? Function(DateTime?)? validator;
  final String? errorText;
  final String? helperText;
  final bool enabled;
  final String? placeholder;
  final bool showClearButton;
  final FocusNode? focusNode;
  final IconData? prefixIcon;

  const DateTimeInput({
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
    this.showClearButton = true,
    this.focusNode,
    this.prefixIcon,
  });

  @override
  State<DateTimeInput> createState() => _DateTimeInputState();
}

class _DateTimeInputState extends State<DateTimeInput> {
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
  void didUpdateWidget(DateTimeInput oldWidget) {
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
    // Format as "Mar 15, 2026 9:30 AM"
    return DateTimeUtils.formatDateTime(widget.value!);
  }

  Future<void> _selectDateTime(BuildContext context) async {
    // Step 1: Pick date
    final DateTime? pickedDate = await showDatePicker(
      context: context,
      initialDate: widget.value ?? DateTime.now(),
      firstDate: widget.minDate ?? DateTime(1900),
      lastDate: widget.maxDate ?? DateTime(2100),
    );

    if (pickedDate == null || !context.mounted) return;

    // Step 2: Pick time
    final TimeOfDay? pickedTime = await showTimePicker(
      context: context,
      initialTime: widget.value != null
          ? TimeOfDay.fromDateTime(widget.value!)
          : TimeOfDay.now(),
    );

    if (pickedTime == null) return;

    // Combine date and time
    final combined = DateTime(
      pickedDate.year,
      pickedDate.month,
      pickedDate.day,
      pickedTime.hour,
      pickedTime.minute,
    );

    // DEBUG: Log what DateTimeInput is returning
    debugPrint('[DateTimeInput] User picked:');
    debugPrint('  pickedDate: $pickedDate');
    debugPrint('  pickedTime: ${pickedTime.hour}:${pickedTime.minute}');
    debugPrint('  combined: $combined (isUtc: ${combined.isUtc})');

    widget.onChanged(combined);
  }

  void _clearDateTime() {
    widget.onChanged(null);
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
          _selectDateTime(context);
          return KeyEventResult.handled;
        }
        return KeyEventResult.ignored;
      },
      child: TextField(
        controller: _controller,
        readOnly: true,
        enabled: widget.enabled,
        onTap: widget.enabled ? () => _selectDateTime(context) : null,
        decoration: InputDecoration(
          hintText: widget.placeholder ?? 'Select date & time',
          errorText: widget.errorText,
          helperText: widget.helperText,
          prefixIcon: Icon(widget.prefixIcon ?? Icons.event),
          suffixIcon:
              widget.value != null && widget.showClearButton && widget.enabled
              ? IconButton(
                  icon: const Icon(Icons.clear),
                  onPressed: _clearDateTime,
                  tooltip: 'Clear date & time',
                )
              : null,
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
