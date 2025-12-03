import 'package:flutter/foundation.dart' show debugPrint;
import 'package:flutter/material.dart' hide debugPrint;
import 'package:tross_app/widgets/molecules/forms/field_config.dart';
import 'package:tross_app/widgets/organisms/forms/generic_form.dart';
import 'package:tross_app/widgets/organisms/modals/generic_modal.dart';
import 'package:tross_app/services/navigation_coordinator.dart';

/// FormModal - Organism for create/edit forms via PURE COMPOSITION
///
/// **SOLE RESPONSIBILITY:** Compose GenericModal + form fields for CRUD operations
///
/// Architecture:
/// - NO implementation, ONLY composition
/// - Composes: GenericModal (organism) + GenericFormField (molecule) + Flutter widgets
/// - Handles create/edit use cases with validation
///
/// Usage:
/// ```dart
/// FormModal.show<User>(
///   context: context,
///   title: 'Edit User',
///   value: currentUser,
///   fields: [emailConfig, nameConfig, activeConfig],
///   onSave: (user) async => await updateUser(user),
/// )
/// ```
class FormModal<T> extends StatefulWidget {
  final String title;
  final T value;
  final List<FieldConfig<T, dynamic>> fields;
  final Future<void> Function(T)? onSave;
  final VoidCallback? onCancel;
  final String saveButtonText;
  final String cancelButtonText;
  final bool enabled;

  const FormModal({
    super.key,
    required this.title,
    required this.value,
    required this.fields,
    this.onSave,
    this.onCancel,
    this.saveButtonText = 'Save',
    this.cancelButtonText = 'Cancel',
    this.enabled = true,
  });

  @override
  State<FormModal<T>> createState() => _FormModalState<T>();

  /// Helper method to show form modal
  static Future<T?> show<T>({
    required BuildContext context,
    required String title,
    required T value,
    required List<FieldConfig<T, dynamic>> fields,
    Future<void> Function(T)? onSave,
    VoidCallback? onCancel,
    String saveButtonText = 'Save',
    String cancelButtonText = 'Cancel',
    bool enabled = true,
  }) {
    return showDialog<T>(
      context: context,
      barrierDismissible: false,
      builder: (context) => FormModal<T>(
        title: title,
        value: value,
        fields: fields,
        onSave: onSave,
        onCancel: onCancel,
        saveButtonText: saveButtonText,
        cancelButtonText: cancelButtonText,
        enabled: enabled,
      ),
    );
  }
}

class _FormModalState<T> extends State<FormModal<T>> {
  late T _currentValue;
  bool _isSaving = false;
  final GlobalKey<GenericFormState<T>> _formKey = GlobalKey();

  @override
  void initState() {
    super.initState();
    _currentValue = widget.value;
  }

  void _handleFieldChange(T newValue) {
    setState(() => _currentValue = newValue);
  }

  Future<void> _handleSave() async {
    if (widget.onSave == null || !widget.enabled) return;

    // Validate all fields before saving
    final formState = _formKey.currentState;
    if (formState == null || !formState.validateAll()) {
      // Validation failed - errors are now displayed on fields
      return;
    }

    setState(() => _isSaving = true);
    try {
      await widget.onSave!(_currentValue);
      if (mounted) {
        NavigationCoordinator.pop(context, result: _currentValue);
      }
    } catch (e, stackTrace) {
      // Handle errors gracefully - show user-friendly message
      debugPrint('❌ [FormModal] Save failed: $e');
      debugPrint('📚 [FormModal] Stack trace: $stackTrace');
      if (mounted) {
        final errorMessage = e.toString().replaceFirst('Exception: ', '');
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(errorMessage),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 4),
            action: SnackBarAction(
              label: 'Dismiss',
              textColor: Colors.white,
              onPressed: () {
                ScaffoldMessenger.of(context).hideCurrentSnackBar();
              },
            ),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  void _handleCancel() {
    if (widget.onCancel != null) {
      widget.onCancel!();
    }
    NavigationCoordinator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    // Pure composition: GenericModal + GenericForm (now context-agnostic!)
    return GenericModal(
      title: widget.title,
      showCloseButton: true,
      onClose: _handleCancel,
      content: GenericForm<T>(
        key: _formKey,
        value: _currentValue,
        fields: widget.fields,
        onChange: _handleFieldChange,
        enabled: widget.enabled && !_isSaving,
      ),
      actions: [
        // Cancel button
        TextButton(
          onPressed: widget.enabled && !_isSaving ? _handleCancel : null,
          child: Text(widget.cancelButtonText),
        ),

        // Save button with loading state
        FilledButton(
          onPressed: widget.enabled && !_isSaving ? _handleSave : null,
          child: _isSaving
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : Text(widget.saveButtonText),
        ),
      ],
    );
  }
}
