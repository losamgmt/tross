import 'package:flutter/material.dart';
import 'package:tross_app/config/app_spacing.dart';
import 'package:tross_app/widgets/molecules/forms/field_config.dart';
import 'package:tross_app/widgets/molecules/forms/form_field.dart';

/// Generic form widget that renders multiple fields based on config
///
/// **SOLE RESPONSIBILITY:** Manage form field state and render fields ONLY
/// - Context-agnostic: NO Expanded, NO title, NO buttons
/// - Parent handles: Container sizing, title rendering, action buttons
///
/// Type parameter:
/// - T: The model type (e.g., User, Role)
///
/// This widget:
/// - Renders fields in a list (shrinkWrap: true)
/// - Manages field state changes
/// - Provides onChange callback for state updates
/// - Exposes currentValue and isSaving state
///
/// Usage:
/// ```dart
/// GenericForm<User>(
///   value: currentUser,
///   fields: [emailConfig, nameConfig, activeConfig],
///   onChange: (user) => setState(() => _user = user),
/// )
/// ```
class GenericForm<T> extends StatefulWidget {
  final T value;
  final List<FieldConfig<T, dynamic>> fields;
  final void Function(T)? onChange;
  final bool enabled;

  const GenericForm({
    super.key,
    required this.value,
    required this.fields,
    this.onChange,
    this.enabled = true,
  });

  @override
  State<GenericForm<T>> createState() => _GenericFormState<T>();
}

class _GenericFormState<T> extends State<GenericForm<T>> {
  late T _currentValue;

  @override
  void initState() {
    super.initState();
    _currentValue = widget.value;
  }

  @override
  void didUpdateWidget(GenericForm<T> oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.value != oldWidget.value) {
      _currentValue = widget.value;
    }
  }

  void _handleFieldChange(T newValue) {
    setState(() => _currentValue = newValue);
    widget.onChange?.call(newValue);
  }

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    // Context-agnostic: Just render fields, NO container assumptions
    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: widget.fields.length,
      separatorBuilder: (context, index) => SizedBox(height: spacing.md),
      itemBuilder: (context, index) {
        final field = widget.fields[index];
        return GenericFormField(
          config: field,
          value: _currentValue,
          onChanged: _handleFieldChange,
          enabled: widget.enabled,
        );
      },
    );
  }
}
