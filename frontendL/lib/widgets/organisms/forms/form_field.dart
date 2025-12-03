import 'package:flutter/material.dart';
import 'package:tross_app/widgets/atoms/atoms.dart';
import 'package:tross_app/widgets/molecules/forms/field_config.dart';
import 'package:tross_app/config/app_spacing.dart';

/// Generic form field organism that composes label + input atom
///
/// **SOLE RESPONSIBILITY:** Manage field state and compose label + input
/// - StatefulWidget for managing field value state
/// - Renders label with required indicator (molecule's job)
/// - Selects and renders appropriate input atom (based on fieldType)
/// - Manages field state and validation
/// - Handles spacing/layout between label and input
///
/// Type parameters:
/// - T: The model type (e.g., User, Role)
/// - V: The field value type (e.g., String, int, DateTime, bool)
///
/// Usage:
/// ```dart
/// GenericFormField<User, String>(
///   config: emailFieldConfig,
///   value: currentUser,
///   onChanged: (user) => setState(() => currentUser = user),
/// )
/// ```
class GenericFormField<T, V> extends StatefulWidget {
  final FieldConfig<T, V> config;
  final T value;
  final ValueChanged<T> onChanged;
  final void Function(String?)? onError;
  final String? externalError;
  final bool enabled;

  const GenericFormField({
    super.key,
    required this.config,
    required this.value,
    required this.onChanged,
    this.onError,
    this.externalError,
    this.enabled = true,
  });

  @override
  State<GenericFormField<T, V>> createState() => _GenericFormFieldState<T, V>();
}

class _GenericFormFieldState<T, V> extends State<GenericFormField<T, V>> {
  String? _errorText;

  @override
  void didUpdateWidget(GenericFormField<T, V> oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Use external error if provided (from form-level validation)
    if (widget.externalError != oldWidget.externalError) {
      setState(() => _errorText = widget.externalError);
    }
  }

  void _handleChange(dynamic newValue) {
    // Cast to proper type for validation and setValue
    final typedValue = newValue as V;

    // Validate
    final error = widget.config.validator?.call(typedValue);
    setState(() => _errorText = error);
    widget.onError?.call(error);

    // Update model
    final updatedModel = widget.config.setValue(widget.value, typedValue);
    widget.onChanged(updatedModel);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final spacing = context.spacing;
    final fieldValue = widget.config.getValue(widget.value);

    // Molecule composition: Label + Input Atom + Spacing
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Label with required indicator (molecule's responsibility)
        Row(
          children: [
            Text(widget.config.label, style: theme.textTheme.labelMedium),
            if (widget.config.required) ...[
              SizedBox(width: spacing.xxs),
              Text(
                '*',
                style: theme.textTheme.labelMedium?.copyWith(
                  color: theme.colorScheme.error,
                ),
              ),
            ],
          ],
        ),
        SizedBox(height: spacing.xxs),

        // Input atom (context-agnostic, no layout assumptions)
        _buildInputAtom(fieldValue),
      ],
    );
  }

  /// Build the appropriate input atom based on field type
  Widget _buildInputAtom(V? fieldValue) {
    switch (widget.config.fieldType) {
      case FieldType.text:
        return TextInput(
          value: fieldValue as String? ?? '',
          onChanged: _handleChange,
          type: widget.config.textFieldType ?? TextFieldType.text,
          obscureText: widget.config.obscureText ?? false,
          maxLength: widget.config.maxLength,
          placeholder: widget.config.placeholder,
          helperText: widget.config.helperText,
          errorText: _errorText,
          enabled: widget.enabled,
          prefixIcon: widget.config.icon,
        );

      case FieldType.number:
        return NumberInput(
          value: fieldValue as num?,
          onChanged: _handleChange,
          isInteger: widget.config.isInteger ?? false,
          min: widget.config.minValue,
          max: widget.config.maxValue,
          step: widget.config.step,
          placeholder: widget.config.placeholder,
          helperText: widget.config.helperText,
          errorText: _errorText,
          enabled: widget.enabled,
          prefixIcon: widget.config.icon,
        );

      case FieldType.select:
        return SelectInput<V>(
          value: fieldValue,
          items: widget.config.selectItems ?? [],
          displayText: widget.config.displayText ?? (v) => v.toString(),
          onChanged: _handleChange,
          allowEmpty: widget.config.allowEmpty ?? false,
          placeholder: widget.config.placeholder,
          helperText: widget.config.helperText,
          errorText: _errorText,
          enabled: widget.enabled,
          prefixIcon: widget.config.icon,
        );

      case FieldType.date:
        return DateInput(
          value: fieldValue as DateTime?,
          onChanged: _handleChange,
          minDate: widget.config.minDate,
          maxDate: widget.config.maxDate,
          placeholder: widget.config.placeholder,
          helperText: widget.config.helperText,
          errorText: _errorText,
          enabled: widget.enabled,
          prefixIcon: widget.config.icon,
        );

      case FieldType.textArea:
        return TextAreaInput(
          value: fieldValue as String? ?? '',
          onChanged: _handleChange,
          minLines: widget.config.minLines ?? 3,
          maxLines: widget.config.maxLines,
          maxLength: widget.config.maxLength,
          placeholder: widget.config.placeholder,
          helperText: widget.config.helperText,
          errorText: _errorText,
          enabled: widget.enabled,
        );

      case FieldType.boolean:
        // Boolean is special - toggle doesn't need label wrapper
        // (already handled above in main Column)
        return Builder(
          builder: (context) {
            final spacing = context.spacing;

            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                BooleanToggle(
                  value: fieldValue as bool? ?? false,
                  onToggle: widget.enabled
                      ? () => _handleChange(!(fieldValue as bool? ?? false))
                      : null,
                ),
                if (widget.config.helperText != null) ...[
                  SizedBox(height: spacing.xxs),
                  Text(
                    widget.config.helperText!,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(
                        context,
                      ).colorScheme.onSurface.withValues(alpha: 0.6),
                    ),
                  ),
                ],
                if (_errorText != null) ...[
                  SizedBox(height: spacing.xxs),
                  Text(
                    _errorText!,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context).colorScheme.error,
                    ),
                  ),
                ],
              ],
            );
          },
        );
    }
  }
}
