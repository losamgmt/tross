import 'package:flutter/foundation.dart' show debugPrint;
import 'package:flutter/material.dart' hide debugPrint;
import 'package:tross_app/widgets/molecules/forms/field_config.dart';
import 'package:tross_app/widgets/organisms/forms/form_field.dart';
import 'package:tross_app/config/app_spacing.dart';

/// Generic form organism that manages multiple fields based on config
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
/// - Provides validation methods via GlobalKey
///
/// Usage:
/// ```dart
/// final formKey = GlobalKey<GenericFormState<User>>();
/// GenericForm<User>(
///   key: formKey,
///   value: currentUser,
///   fields: [emailConfig, nameConfig, activeConfig],
///   onChange: (user) => setState(() => _user = user),
/// )
/// // Later: formKey.currentState?.validateAll()
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
  GenericFormState<T> createState() => GenericFormState<T>();
}

class GenericFormState<T> extends State<GenericForm<T>> {
  late T _currentValue;
  final Map<int, String?> _fieldErrors = {};

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
      _fieldErrors.clear(); // Clear errors when value changes
    }
  }

  void _handleFieldChange(T newValue) {
    setState(() => _currentValue = newValue);
    widget.onChange?.call(newValue);
  }

  void _handleFieldError(int fieldIndex, String? error) {
    setState(() => _fieldErrors[fieldIndex] = error);
  }

  /// Validate all fields and return true if all pass
  bool validateAll() {
    bool allValid = true;
    for (int i = 0; i < widget.fields.length; i++) {
      final field = widget.fields[i];
      if (field.validator != null) {
        final value = field.getValue(_currentValue);
        debugPrint('[VALIDATION] Field $i: ${field.label} = "$value"');
        final error = field.validator!(value);
        debugPrint('[VALIDATION] Error: $error');
        _fieldErrors[i] = error;
        if (error != null) allValid = false;
      }
    }
    setState(() {}); // Trigger rebuild to show errors
    debugPrint('[VALIDATION] All valid: $allValid');
    return allValid;
  }

  /// Get current form value
  T get currentValue => _currentValue;

  /// Check if form is valid (all fields pass validation)
  bool get isValid {
    for (int i = 0; i < widget.fields.length; i++) {
      final field = widget.fields[i];
      if (field.validator != null) {
        final value = field.getValue(_currentValue);
        final error = field.validator!(value);
        if (error != null) return false;
      }
    }
    return true;
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
          onError: (error) => _handleFieldError(index, error),
          externalError: _fieldErrors[index],
          enabled: widget.enabled,
        );
      },
    );
  }
}
