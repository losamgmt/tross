import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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
/// - Tab navigation support
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
class DateInput extends StatefulWidget {
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
  final FocusNode? focusNode;

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
    this.focusNode,
  });

  @override
  State<DateInput> createState() => _DateInputState();
}

class _DateInputState extends State<DateInput> {
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
  void didUpdateWidget(DateInput oldWidget) {
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
    return widget.value != null
        ? DateTimeHelpers.formatDate(widget.value!)
        : '';
  }

  Future<void> _selectDate(BuildContext context) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: widget.value ?? DateTime.now(),
      firstDate: widget.minDate ?? DateTime(1900),
      lastDate: widget.maxDate ?? DateTime(2100),
    );

    if (picked != null) {
      widget.onChanged(picked);
    }
  }

  void _clearDate() {
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
          _selectDate(context);
          return KeyEventResult.handled;
        }
        return KeyEventResult.ignored;
      },
      child: TextField(
        controller: _controller,
        readOnly: true,
        enabled: widget.enabled,
        onTap: widget.enabled ? () => _selectDate(context) : null,
        decoration: InputDecoration(
          hintText: widget.placeholder ?? 'Select date',
          errorText: widget.errorText,
          helperText: widget.helperText,
          prefixIcon: widget.prefixIcon != null
              ? Icon(widget.prefixIcon)
              : const Icon(Icons.calendar_today),
          suffixIcon:
              widget.value != null && widget.showClearButton && widget.enabled
                  ? IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: _clearDate,
                      tooltip: 'Clear date',
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
