/// TextInput - Generic text input atom
///
/// **SOLE RESPONSIBILITY:** Render input field ONLY (no label, no layout)
/// - Context-agnostic: NO Column, NO label rendering
/// - Parent (GenericFormField) handles: Label, required indicator, layout
///
/// GENERIC: Works for ANY text field (name, email, password, etc.)
/// NOT specific to any domain or model
///
/// Features:
/// - Supports text/email/password/url types
/// - Validation callback
/// - Error display
/// - Helper text
/// - Enabled/disabled states
/// - Customizable icons
///
/// Usage:
/// ```dart
/// // Name field
/// TextInput(
///   value: user.name,
///   onChanged: (value) => setState(() => name = value),
/// )
///
/// // Email field
/// TextInput(
///   value: user.email,
///   onChanged: (value) => setState(() => email = value),
///   type: TextInputType.email,
///   validator: (value) => value.contains('@') ? null : 'Invalid email',
/// )
///
/// // Password field
/// TextInput(
///   value: password,
///   onChanged: (value) => setState(() => password = value),
///   obscureText: true,
///   helperText: 'Must be at least 8 characters',
/// )
/// ```
library;

import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';
import '../../../utils/helpers/helpers.dart';

// Re-export TextFieldType for backwards compatibility
export '../../../utils/helpers/input_type_helpers.dart' show TextFieldType;

class TextInput extends StatefulWidget {
  /// Current value
  final String value;

  /// Callback when value changes
  final ValueChanged<String> onChanged;

  /// Input type (text, email, password, etc.)
  final TextFieldType type;

  /// Optional validation function (return error message or null)
  final String? Function(String)? validator;

  /// Current error message to display
  final String? errorText;

  /// Helper text shown below input
  final String? helperText;

  /// Whether field is enabled
  final bool enabled;

  /// Whether to obscure text (for passwords)
  final bool obscureText;

  /// Maximum length of input
  final int? maxLength;

  /// Maximum number of lines (null = single line)
  final int? maxLines;

  /// Optional prefix icon
  final IconData? prefixIcon;

  /// Optional suffix icon
  final IconData? suffixIcon;

  /// Placeholder text
  final String? placeholder;

  /// Autocorrect enabled
  final bool autocorrect;

  /// Enable suggestions
  final bool enableSuggestions;

  const TextInput({
    super.key,
    required this.value,
    required this.onChanged,
    this.type = TextFieldType.text,
    this.validator,
    this.errorText,
    this.helperText,
    this.enabled = true,
    this.obscureText = false,
    this.maxLength,
    this.maxLines = 1,
    this.prefixIcon,
    this.suffixIcon,
    this.placeholder,
    this.autocorrect = true,
    this.enableSuggestions = true,
  });

  @override
  State<TextInput> createState() => _TextInputState();
}

class _TextInputState extends State<TextInput> {
  late TextEditingController _controller;
  bool _obscureText = false;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.value);
    _obscureText = widget.obscureText;
  }

  @override
  void didUpdateWidget(TextInput oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Update controller if value changed externally
    if (oldWidget.value != widget.value && _controller.text != widget.value) {
      _controller.text = widget.value;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;

    // Pure input rendering: just the TextField
    return TextField(
      controller: _controller,
      enabled: widget.enabled,
      obscureText: _obscureText,
      maxLength: widget.maxLength,
      maxLines: widget.maxLines,
      keyboardType: InputTypeHelpers.getKeyboardType(widget.type),
      autocorrect: widget.autocorrect,
      enableSuggestions: widget.enableSuggestions,
      decoration: InputDecoration(
        hintText: widget.placeholder,
        errorText: widget.errorText,
        helperText: widget.helperText,
        prefixIcon: widget.prefixIcon != null ? Icon(widget.prefixIcon) : null,
        suffixIcon: _buildSuffixIcon(),
        border: const OutlineInputBorder(),
        contentPadding: EdgeInsets.symmetric(
          horizontal: spacing.md,
          vertical: spacing.sm,
        ),
      ),
      onChanged: widget.onChanged,
    );
  }

  Widget? _buildSuffixIcon() {
    // Password toggle icon
    if (widget.obscureText) {
      return IconButton(
        icon: Icon(_obscureText ? Icons.visibility_off : Icons.visibility),
        onPressed: () {
          setState(() => _obscureText = !_obscureText);
        },
      );
    }

    // Custom suffix icon
    if (widget.suffixIcon != null) {
      return Icon(widget.suffixIcon);
    }

    return null;
  }
}
