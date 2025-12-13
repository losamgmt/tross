import 'package:flutter/material.dart';

/// Generic multi-line text input atom for ANY text area field on ANY model
///
/// Features:
/// - Multi-line text input
/// - Character/word counter
/// - Max length constraint
/// - Min/max lines configuration
/// - Validation callback
/// - Error/helper text display
/// - Disabled state
///
/// **SRP: Pure Input Rendering**
/// - Returns ONLY the multi-line TextField
/// - NO label rendering (molecule's job)
/// - NO Column wrapper (molecule handles layout)
/// - Context-agnostic: Can be used anywhere
///
/// Usage:
/// ```dart
/// TextAreaInput(
///   value: 'Product description...',
///   onChanged: (value) => setState(() => description = value),
///   minLines: 3,
///   maxLines: 10,
///   maxLength: 500,
///   showCounter: true,
/// )
/// ```
class TextAreaInput extends StatefulWidget {
  final String value;
  final ValueChanged<String> onChanged;
  final String? Function(String)? validator;
  final String? errorText;
  final String? helperText;
  final bool enabled;
  final String? placeholder;
  final int minLines;
  final int? maxLines;
  final int? maxLength;
  final bool showCounter;
  final bool autocorrect;
  final bool enableSuggestions;

  const TextAreaInput({
    super.key,
    required this.value,
    required this.onChanged,
    this.validator,
    this.errorText,
    this.helperText,
    this.enabled = true,
    this.placeholder,
    this.minLines = 3,
    this.maxLines,
    this.maxLength,
    this.showCounter = false,
    this.autocorrect = true,
    this.enableSuggestions = true,
  });

  @override
  State<TextAreaInput> createState() => _TextAreaInputState();
}

class _TextAreaInputState extends State<TextAreaInput> {
  late TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.value);
  }

  @override
  void didUpdateWidget(TextAreaInput oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.value != oldWidget.value) {
      _controller.text = widget.value;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  String? _getCounterText() {
    if (!widget.showCounter) return null;

    final length = widget.value.length;
    if (widget.maxLength != null) {
      return '$length / ${widget.maxLength}';
    }
    return '$length characters';
  }

  @override
  Widget build(BuildContext context) {
    // Pure input rendering: Just the multi-line TextField
    return TextField(
      controller: _controller,
      enabled: widget.enabled,
      minLines: widget.minLines,
      maxLines: widget.maxLines ?? widget.minLines + 5,
      maxLength: widget.maxLength,
      autocorrect: widget.autocorrect,
      enableSuggestions: widget.enableSuggestions,
      keyboardType: TextInputType.multiline,
      textInputAction: TextInputAction.newline,
      decoration: InputDecoration(
        hintText: widget.placeholder,
        errorText: widget.errorText,
        helperText: widget.helperText,
        counterText: _getCounterText(),
        border: const OutlineInputBorder(),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 12,
          vertical: 12,
        ),
        alignLabelWithHint: true,
      ),
      onChanged: widget.onChanged,
    );
  }
}
