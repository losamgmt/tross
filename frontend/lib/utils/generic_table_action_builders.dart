/// Generic Table Action Builders - Metadata-driven row/toolbar actions
///
/// **SOLE RESPONSIBILITY:** Build action buttons for ANY entity using metadata
///
/// Pure composition: Uses GenericModal + GenericForm directly.
/// No wrappers. No indulgence.
library;

import 'package:flutter/material.dart';
import '../models/permission.dart';
import '../services/permission_service_dynamic.dart';
import '../services/generic_entity_service.dart';
import '../services/entity_metadata.dart';
import '../services/metadata_field_config_factory.dart';
import '../services/navigation_coordinator.dart';
import '../services/error_service.dart';
import '../services/export_service.dart';
import '../widgets/atoms/buttons/app_button.dart';
import '../widgets/organisms/modals/generic_modal.dart';
import '../widgets/organisms/forms/generic_form.dart';
import '../widgets/molecules/forms/field_config.dart' hide FieldType;
import 'crud_handlers.dart';

/// Generic action builders for any entity type
class GenericTableActionBuilders {
  GenericTableActionBuilders._();

  /// Build per-row actions for any entity
  static List<Widget> buildRowActions(
    BuildContext context, {
    required String entityName,
    required Map<String, dynamic> entity,
    required String? userRole,
    required VoidCallback onRefresh,
    String? currentUserId,
    List<VoidCallback>? additionalRefreshCallbacks,
  }) {
    final actions = <Widget>[];
    final metadata = EntityMetadataRegistry.get(entityName);
    final resource = metadata.rlsResource;

    // Edit action
    if (PermissionService.hasPermission(
      userRole,
      resource,
      CrudOperation.update,
    )) {
      actions.add(
        AppButton(
          icon: Icons.edit_outlined,
          tooltip: 'Edit',
          style: AppButtonStyle.secondary,
          compact: true,
          onPressed: () => _showEntityForm(
            context,
            entityName: entityName,
            entity: entity,
            onSuccess: onRefresh,
          ),
        ),
      );
    }

    // Delete action
    if (PermissionService.hasPermission(
      userRole,
      resource,
      CrudOperation.delete,
    )) {
      final identityField = metadata.identityField;
      final entityDisplayName =
          entity[identityField]?.toString() ?? '#${entity['id']}';

      final isSelf =
          entityName == 'user' &&
          currentUserId != null &&
          entity['id'].toString() == currentUserId;

      actions.add(
        AppButton(
          icon: Icons.delete_outline,
          tooltip: isSelf
              ? 'Cannot delete your own account'
              : 'Delete ${metadata.displayName.toLowerCase()}',
          style: AppButtonStyle.danger,
          compact: true,
          onPressed: isSelf
              ? null
              : () async {
                  await CrudHandlers.handleDelete(
                    context: context,
                    entityType: metadata.displayName.toLowerCase(),
                    entityName: entityDisplayName,
                    deleteOperation: () async {
                      await GenericEntityService.delete(
                        entityName,
                        entity['id'] as int,
                      );
                      return true;
                    },
                    onSuccess: onRefresh,
                    additionalRefreshCallbacks: additionalRefreshCallbacks,
                  );
                },
        ),
      );
    }

    return actions;
  }

  /// Build toolbar actions for any entity
  static List<Widget> buildToolbarActions(
    BuildContext context, {
    required String entityName,
    required String? userRole,
    required VoidCallback onRefresh,
  }) {
    final actions = <Widget>[];
    final metadata = EntityMetadataRegistry.get(entityName);
    final resource = metadata.rlsResource;

    // Refresh action
    actions.add(
      IconButton(
        icon: const Icon(Icons.refresh),
        tooltip: 'Refresh ${metadata.displayNamePlural.toLowerCase()}',
        onPressed: onRefresh,
      ),
    );

    // Create action
    if (PermissionService.hasPermission(
      userRole,
      resource,
      CrudOperation.create,
    )) {
      actions.add(
        IconButton(
          icon: const Icon(Icons.add),
          tooltip: 'Create new ${metadata.displayName.toLowerCase()}',
          onPressed: () => _showEntityForm(
            context,
            entityName: entityName,
            onSuccess: onRefresh,
          ),
        ),
      );
    }

    // Export action - always visible for read permission
    if (PermissionService.hasPermission(
      userRole,
      resource,
      CrudOperation.read,
    )) {
      actions.add(_ExportButton(entityName: entityName));
    }

    return actions;
  }

  /// Pure composition: GenericModal + GenericForm
  /// No wrapper classes. Direct composition.
  static Future<void> _showEntityForm(
    BuildContext context, {
    required String entityName,
    Map<String, dynamic>? entity,
    required VoidCallback onSuccess,
  }) async {
    final metadata = EntityMetadataRegistry.get(entityName);
    final isEdit = entity != null;

    // Generate fields from metadata
    final fields = isEdit
        ? MetadataFieldConfigFactory.forEdit(entityName)
        : MetadataFieldConfigFactory.forCreate(entityName);

    // Initialize data
    final initialData = isEdit
        ? Map<String, dynamic>.from(entity)
        : _createEmptyData(metadata);

    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => _EntityFormDialog(
        entityName: entityName,
        metadata: metadata,
        fields: fields,
        initialData: initialData,
        isEdit: isEdit,
        entityId: entity?['id'] as int?,
        onSuccess: onSuccess,
      ),
    );
  }

  /// Create empty data map with defaults from metadata
  static Map<String, dynamic> _createEmptyData(EntityMetadata metadata) {
    final data = <String, dynamic>{};
    for (final entry in metadata.fields.entries) {
      final fieldName = entry.key;
      final fieldDef = entry.value;
      if (fieldDef.defaultValue != null) {
        data[fieldName] = fieldDef.defaultValue;
      } else {
        data[fieldName] = switch (fieldDef.type) {
          FieldType.boolean => false,
          FieldType.integer || FieldType.decimal => null,
          FieldType.string ||
          FieldType.email ||
          FieldType.phone ||
          FieldType.text => '',
          _ => null,
        };
      }
    }
    return data;
  }
}

/// Stateful dialog for form - manages form state and save operation
/// This is NOT a wrapper - it's the minimal StatefulWidget needed
/// to manage mutable form state within an immutable dialog.
class _EntityFormDialog extends StatefulWidget {
  final String entityName;
  final EntityMetadata metadata;
  final List<FieldConfig<Map<String, dynamic>, dynamic>> fields;
  final Map<String, dynamic> initialData;
  final bool isEdit;
  final int? entityId;
  final VoidCallback onSuccess;

  const _EntityFormDialog({
    required this.entityName,
    required this.metadata,
    required this.fields,
    required this.initialData,
    required this.isEdit,
    this.entityId,
    required this.onSuccess,
  });

  @override
  State<_EntityFormDialog> createState() => _EntityFormDialogState();
}

class _EntityFormDialogState extends State<_EntityFormDialog> {
  late Map<String, dynamic> _data;
  final _formKey = GlobalKey<GenericFormState<Map<String, dynamic>>>();
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _data = widget.initialData;
  }

  Future<void> _handleSave() async {
    if (!_formKey.currentState!.validateAll()) return;

    setState(() => _isSaving = true);
    try {
      if (widget.isEdit) {
        final updates = _getChangedFields();
        if (updates.isNotEmpty) {
          await GenericEntityService.update(
            widget.entityName,
            widget.entityId!,
            updates,
          );
        }
      } else {
        final cleanData = _cleanData();
        await GenericEntityService.create(widget.entityName, cleanData);
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              '${widget.metadata.displayName} ${widget.isEdit ? 'updated' : 'created'} successfully',
            ),
          ),
        );
        NavigationCoordinator.pop(context);
        widget.onSuccess();
      }
    } catch (e, stackTrace) {
      ErrorService.logError(
        '[EntityForm] Save failed',
        error: e,
        stackTrace: stackTrace,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceFirst('Exception: ', '')),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  Map<String, dynamic> _getChangedFields() {
    final updates = <String, dynamic>{};
    for (final key in _data.keys) {
      if (widget.metadata.isImmutable(key)) continue;
      if (_data[key] != widget.initialData[key]) {
        updates[key] = _data[key];
      }
    }
    return updates;
  }

  Map<String, dynamic> _cleanData() {
    final clean = <String, dynamic>{};
    for (final entry in _data.entries) {
      final value = entry.value;
      if (value == null) continue;
      if (value is String && value.isEmpty) continue;
      clean[entry.key] = value;
    }
    return clean;
  }

  @override
  Widget build(BuildContext context) {
    final title = widget.isEdit
        ? 'Edit ${widget.metadata.displayName}'
        : 'Create ${widget.metadata.displayName}';

    // Pure composition: GenericModal + GenericForm
    return GenericModal(
      title: title,
      showCloseButton: true,
      onClose: () => NavigationCoordinator.pop(context),
      content: GenericForm<Map<String, dynamic>>(
        key: _formKey,
        value: _data,
        fields: widget.fields,
        onChange: (data) => setState(() => _data = data),
        enabled: !_isSaving,
      ),
      actions: [
        TextButton(
          onPressed: _isSaving
              ? null
              : () => NavigationCoordinator.pop(context),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: _isSaving ? null : _handleSave,
          child: _isSaving
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : Text(widget.isEdit ? 'Save' : 'Create'),
        ),
      ],
    );
  }
}

/// Export button with loading state
class _ExportButton extends StatefulWidget {
  final String entityName;

  const _ExportButton({required this.entityName});

  @override
  State<_ExportButton> createState() => _ExportButtonState();
}

class _ExportButtonState extends State<_ExportButton> {
  bool _isExporting = false;

  Future<void> _handleExport() async {
    if (_isExporting) return;

    setState(() => _isExporting = true);

    try {
      final success = await ExportService.exportToCsv(
        entityName: widget.entityName,
      );

      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Export downloaded successfully'),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      ErrorService.logError(
        'Export failed',
        error: e,
        context: {'entity': widget.entityName},
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Export failed: ${e.toString().replaceFirst('Exception: ', '')}',
            ),
            behavior: SnackBarBehavior.floating,
            backgroundColor: Theme.of(context).colorScheme.error,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isExporting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final metadata = EntityMetadataRegistry.get(widget.entityName);

    return IconButton(
      icon: _isExporting
          ? const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          : const Icon(Icons.download),
      tooltip: _isExporting
          ? 'Exporting...'
          : 'Export ${metadata.displayNamePlural.toLowerCase()} to CSV',
      onPressed: _isExporting ? null : _handleExport,
    );
  }
}
