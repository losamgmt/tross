import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../config/app_spacing.dart';
import '../../../utils/helpers/helpers.dart';
import '../interactions/touch_target.dart';

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
/// - **Keyboard shortcuts** - Space/Enter to open picker when focused
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

  @override
  State<DateInput> createState() => _DateInputState();
}

class _DateInputState extends State<DateInput> {
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
        _selectDate(context);
      }
    }
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
    final theme = Theme.of(context);

    // Pure input rendering: Just the date input field
    return KeyboardListener(
      focusNode: _focusNode,
      onKeyEvent: _handleKeyEvent,
      child: TouchTarget(
        onTap: widget.enabled ? () => _selectDate(context) : null,
        enabled: widget.enabled,
        semanticLabel: 'Select date',
        child: InputDecorator(
          isFocused: _isFocused,
          decoration: InputDecoration(
            hintText: widget.placeholder ?? 'Select date',
            errorText: widget.errorText,
            helperText: widget.helperText,
            prefixIcon: widget.prefixIcon != null
                ? Icon(widget.prefixIcon)
                : const Icon(Icons.calendar_today),
            suffixIcon:
                widget.value != null && widget.showClearButton && widget.enabled
                ? TouchTarget.icon(
                    icon: Icons.clear,
                    onTap: _clearDate,
                    tooltip: 'Clear date',
                  )
                : (widget.suffixIcon != null ? Icon(widget.suffixIcon) : null),
            border: const OutlineInputBorder(),
            contentPadding: EdgeInsets.symmetric(
              horizontal: spacing.sm,
              vertical: spacing.md,
            ),
            enabled: widget.enabled,
          ),
          child: Text(
            widget.value != null
                ? DateTimeHelpers.formatDate(widget.value!)
                : '',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: widget.enabled
                  ? theme.colorScheme.onSurface
                  : theme.colorScheme.onSurface.withValues(alpha: 0.38),
            ),
          ),
        ),
      ),
    );
  }
}
