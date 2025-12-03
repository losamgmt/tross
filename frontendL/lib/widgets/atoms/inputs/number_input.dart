import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../config/app_spacing.dart';

/// Generic number input atom for ANY numeric field on ANY model
///
/// **SOLE RESPONSIBILITY:** Render number input field ONLY (no label, no layout)
/// - Context-agnostic: NO Column, NO label rendering
/// - Parent (GenericFormField) handles: Label, required indicator, layout
///
/// Features:
/// - Integer or decimal input
/// - Min/max value constraints
/// - Step buttons (increment/decrement)
/// - Validation callback
/// - Error/helper text display
/// - Prefix/suffix icons
/// - Disabled state
///
/// Usage:
/// ```dart
/// NumberInput(
///   value: 25,
///   onChanged: (value) => setState(() => age = value),
///   min: 0,
///   max: 120,
///   isInteger: true,
/// )
/// ```
class NumberInput extends StatefulWidget {
  final num? value;
  final ValueChanged<num?> onChanged;
  final bool isInteger;
  final num? min;
  final num? max;
  final num? step;
  final String? Function(num?)? validator;
  final String? errorText;
  final String? helperText;
  final bool enabled;
  final String? placeholder;
  final IconData? prefixIcon;
  final IconData? suffixIcon;
  final bool showStepButtons;

  const NumberInput({
    super.key,
    required this.value,
    required this.onChanged,
    this.isInteger = false,
    this.min,
    this.max,
    this.step,
    this.validator,
    this.errorText,
    this.helperText,
    this.enabled = true,
    this.placeholder,
    this.prefixIcon,
    this.suffixIcon,
    this.showStepButtons = true,
  });

  @override
  State<NumberInput> createState() => _NumberInputState();
}

class _NumberInputState extends State<NumberInput> {
  late TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.value?.toString() ?? '');
  }

  @override
  void didUpdateWidget(NumberInput oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.value != oldWidget.value) {
      _controller.text = widget.value?.toString() ?? '';
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _handleIncrement() {
    final currentValue = widget.value ?? (widget.min ?? 0);
    final step = widget.step ?? (widget.isInteger ? 1 : 0.1);
    final newValue = currentValue + step;

    if (widget.max == null || newValue <= widget.max!) {
      final adjustedValue = widget.isInteger ? newValue.round() : newValue;
      widget.onChanged(adjustedValue);
    }
  }

  void _handleDecrement() {
    final currentValue = widget.value ?? (widget.min ?? 0);
    final step = widget.step ?? (widget.isInteger ? 1 : 0.1);
    final newValue = currentValue - step;

    if (widget.min == null || newValue >= widget.min!) {
      final adjustedValue = widget.isInteger ? newValue.round() : newValue;
      widget.onChanged(adjustedValue);
    }
  }

  void _handleTextChange(String text) {
    if (text.isEmpty) {
      widget.onChanged(null);
      return;
    }

    final parsed = widget.isInteger
        ? int.tryParse(text)
        : double.tryParse(text);
    if (parsed != null) {
      // Apply min/max constraints
      num constrainedValue = parsed;
      if (widget.min != null && constrainedValue < widget.min!) {
        constrainedValue = widget.min!;
      }
      if (widget.max != null && constrainedValue > widget.max!) {
        constrainedValue = widget.max!;
      }

      widget.onChanged(constrainedValue);
    }
  }

  List<TextInputFormatter> _getInputFormatters() {
    if (widget.isInteger) {
      return [FilteringTextInputFormatter.allow(RegExp(r'^-?\d*'))];
    } else {
      return [FilteringTextInputFormatter.allow(RegExp(r'^-?\d*\.?\d*'))];
    }
  }

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing; // Get spacing from context

    // Pure input rendering: TextField with optional step buttons
    return Row(
      children: [
        Expanded(
          child: TextField(
            controller: _controller,
            enabled: widget.enabled,
            keyboardType: TextInputType.numberWithOptions(
              decimal: !widget.isInteger,
              signed: widget.min == null || widget.min! < 0,
            ),
            inputFormatters: _getInputFormatters(),
            decoration: InputDecoration(
              hintText: widget.placeholder,
              errorText: widget.errorText,
              helperText: widget.helperText,
              prefixIcon: widget.prefixIcon != null
                  ? Icon(widget.prefixIcon)
                  : null,
              suffixIcon: widget.suffixIcon != null
                  ? Icon(widget.suffixIcon)
                  : null,
              border: const OutlineInputBorder(),
              contentPadding: EdgeInsets.symmetric(
                horizontal: spacing.sm,
                vertical: spacing.xs,
              ),
            ),
            onChanged: _handleTextChange,
          ),
        ),

        // Step buttons
        if (widget.showStepButtons && widget.enabled) ...[
          SizedBox(width: spacing.xxs),
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Increment button
              SizedBox(
                width: 32,
                height: 24,
                child: IconButton(
                  padding: EdgeInsets.zero,
                  iconSize: spacing.iconSizeMD,
                  icon: const Icon(Icons.arrow_drop_up),
                  onPressed:
                      (widget.max != null &&
                          widget.value != null &&
                          widget.value! >= widget.max!)
                      ? null
                      : _handleIncrement,
                ),
              ),
              // Decrement button
              SizedBox(
                width: 32,
                height: 24,
                child: IconButton(
                  padding: EdgeInsets.zero,
                  iconSize: spacing.iconSizeMD,
                  icon: const Icon(Icons.arrow_drop_down),
                  onPressed:
                      (widget.min != null &&
                          widget.value != null &&
                          widget.value! <= widget.min!)
                      ? null
                      : _handleDecrement,
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }
}
