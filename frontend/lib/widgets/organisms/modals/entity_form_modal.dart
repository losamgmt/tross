/// EntityFormModal - Context-Agnostic Entity Create/Edit Modal
///
/// SOLE RESPONSIBILITY: Compose GenericModal + GenericForm for any entity
///
/// **CONTEXT-AGNOSTIC:** Works anywhere - called from screen, tab, card, etc.
/// **ENTITY-GENERIC:** Works with any entity via metadata
/// **FUNCTION-GENERIC:** Works for both CREATE and EDIT via FormMode
/// **DIRTY STATE AWARE:** Tracks unsaved changes and warns before discard
///
/// This organism:
/// - Uses MetadataFieldConfigFactory to generate form fields
/// - Adapts title/buttons based on FormMode (create vs edit)
/// - Handles form validation
/// - **Tracks dirty state via EditableFormNotifier (composition)**
/// - **Shows UnsavedChangesDialog on cancel if dirty**
/// - Returns the entity data on submit (caller handles persistence)
///
/// USAGE:
/// ```dart
/// // Show create modal
/// final newUser = await EntityFormModal.show<Map<String, dynamic>>(
///   context: context,
///   entityName: 'user',
///   mode: FormMode.create,
/// );
///
/// // Show edit modal (warns if user tries to close with unsaved changes)
/// final updatedUser = await EntityFormModal.show<Map<String, dynamic>>(
///   context: context,
///   entityName: 'user',
///   mode: FormMode.edit,
///   initialValue: existingUser,
/// );
///
/// // Caller handles persistence
/// if (newUser != null) {
///   await userService.create(newUser);
/// }
/// ```
library;

import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';
import '../../../models/form_mode.dart';
import '../../../providers/editable_form_notifier.dart';
import '../../../services/metadata_field_config_factory.dart';
import '../../../services/entity_metadata.dart';
import '../../atoms/buttons/app_button.dart';
import '../../molecules/dialogs/unsaved_changes_dialog.dart';
import '../forms/generic_form.dart';
import 'generic_modal.dart';

/// EntityFormModal - Generic entity create/edit modal organism
class EntityFormModal extends StatefulWidget {
  /// Entity type name (e.g., 'user', 'customer', 'role')
  final String entityName;

  /// Form mode (create, edit, or view)
  final FormMode mode;

  /// Initial entity value (required for edit, empty map for create)
  final Map<String, dynamic> initialValue;

  /// Optional custom title (defaults to "[Mode] [EntityName]")
  final String? title;

  /// Fields to include (null = all non-system fields)
  final List<String>? includeFields;

  /// Fields to exclude
  final List<String>? excludeFields;

  /// Optional callback after successful submit
  final void Function(Map<String, dynamic>)? onSubmit;

  const EntityFormModal({
    super.key,
    required this.entityName,
    required this.mode,
    Map<String, dynamic>? initialValue,
    this.title,
    this.includeFields,
    this.excludeFields,
    this.onSubmit,
  }) : initialValue = initialValue ?? const {};

  @override
  State<EntityFormModal> createState() => _EntityFormModalState();

  /// Show the modal and return the submitted entity (or null if cancelled)
  static Future<Map<String, dynamic>?> show({
    required BuildContext context,
    required String entityName,
    required FormMode mode,
    Map<String, dynamic>? initialValue,
    String? title,
    List<String>? includeFields,
    List<String>? excludeFields,
  }) {
    return showDialog<Map<String, dynamic>>(
      context: context,
      barrierDismissible: false, // Prevent accidental dismiss
      builder: (context) => EntityFormModal(
        entityName: entityName,
        mode: mode,
        initialValue: initialValue,
        title: title,
        includeFields: includeFields,
        excludeFields: excludeFields,
      ),
    );
  }
}

class _EntityFormModalState extends State<EntityFormModal> {
  final _formKey = GlobalKey<GenericFormState<Map<String, dynamic>>>();
  late Map<String, dynamic> _currentValue;
  late EditableFormNotifier _dirtyNotifier;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _currentValue = Map<String, dynamic>.from(widget.initialValue);
    // Initialize dirty state notifier for tracking unsaved changes
    _dirtyNotifier = EditableFormNotifier(initialValues: widget.initialValue);
  }

  @override
  void dispose() {
    _dirtyNotifier.dispose();
    super.dispose();
  }

  String get _title {
    if (widget.title != null) return widget.title!;

    // Get display name from metadata
    final metadata = EntityMetadataRegistry.tryGet(widget.entityName);
    final displayName = metadata?.displayName ?? _capitalize(widget.entityName);

    return '${widget.mode.titlePrefix} $displayName';
  }

  String _capitalize(String s) {
    if (s.isEmpty) return s;
    return '${s[0].toUpperCase()}${s.substring(1)}';
  }

  void _handleFormChange(Map<String, dynamic> value) {
    setState(() => _currentValue = value);
    // Sync with dirty notifier for tracking unsaved changes
    _dirtyNotifier.setCurrent(value);
  }

  Future<void> _handleSubmit() async {
    // Validate form
    final isValid = _formKey.currentState?.validateAll() ?? false;
    if (!isValid) return;

    setState(() => _isSaving = true);

    try {
      // Call onSubmit callback if provided
      widget.onSubmit?.call(_currentValue);

      // Return the value and close modal
      if (mounted) {
        Navigator.of(context).pop(_currentValue);
      }
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  Future<void> _handleCancel() async {
    // Warn if there are unsaved changes
    if (_dirtyNotifier.isDirty) {
      final shouldDiscard = await UnsavedChangesDialog.show(
        context: context,
        changeCount: _dirtyNotifier.changeCount,
      );

      if (shouldDiscard != true) return; // User chose to keep editing
    }

    if (mounted) {
      Navigator.of(context).pop(null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;

    // Get metadata for grouping support
    final metadata = EntityMetadataRegistry.get(widget.entityName);
    final useGroupedLayout = metadata.hasFieldGroups;

    // Get field configs based on mode
    final fieldConfigs = widget.mode.isCreate
        ? MetadataFieldConfigFactory.forCreate(
            context,
            widget.entityName,
            includeFields: widget.includeFields,
            excludeFields: widget.excludeFields,
          )
        : MetadataFieldConfigFactory.forEdit(
            context,
            widget.entityName,
            includeFields: widget.includeFields,
            excludeFields: widget.excludeFields,
          );

    return GenericModal(
      title: _title,
      dismissible: false,
      content: GenericForm<Map<String, dynamic>>(
        key: _formKey,
        value: _currentValue,
        fields: fieldConfigs,
        layout: useGroupedLayout ? FormLayout.grouped : FormLayout.flat,
        fieldGroups: useGroupedLayout ? metadata.sortedFieldGroups : null,
        onChange: _handleFormChange,
        enabled: widget.mode.isEditable && !_isSaving,
      ),
      actions: [
        // Cancel button
        TextButton(
          onPressed: _isSaving ? null : _handleCancel,
          child: const Text('Cancel'),
        ),

        SizedBox(width: spacing.sm),

        // Submit button (only if editable)
        if (widget.mode.isEditable)
          _isSaving
              ? const SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : AppButton(
                  icon: widget.mode.isCreate ? Icons.add : Icons.save,
                  label: widget.mode.actionLabel,
                  tooltip: '${widget.mode.actionLabel} ${widget.entityName}',
                  onPressed: _handleSubmit,
                  style: AppButtonStyle.primary,
                ),
      ],
    );
  }
}
