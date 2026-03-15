/// Row Click Handlers
///
/// Utilities for handling row taps in data tables.
/// Supports navigate, modal (edit), and no-op behaviors.
///
/// PURE COMPOSITION: Uses existing EntityFormModal for editing.
/// ZERO SPECIFICITY: No custom widgets, only composing generics.
///
/// Usage:
/// ```dart
/// AppDataTable(
///   onRowTap: buildRowTapHandler(
///     context: context,
///     entityName: 'customer_unit',
///     behavior: RowClickBehavior.modal,
///     onSuccess: () => refreshData(),
///   ),
/// )
/// ```
library;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../models/form_mode.dart';
import '../models/relationship.dart';
import '../services/generic_entity_service.dart';
import '../widgets/organisms/modals/entity_form_modal.dart';

/// Callback type for row tap handlers
typedef RowTapCallback<T> = void Function(T item);

/// Build a row tap handler based on the specified behavior.
///
/// [context] - BuildContext for navigation/dialogs
/// [entityName] - Entity type name (e.g., 'customer_unit')
/// [behavior] - How to handle the tap (navigate, modal, none)
/// [idField] - Field name containing the entity ID (default: 'id')
/// [onSuccess] - Optional callback invoked when modal closes (for refresh)
RowTapCallback<Map<String, dynamic>>? buildRowTapHandler({
  required BuildContext context,
  required String entityName,
  required RowClickBehavior behavior,
  String idField = 'id',
  VoidCallback? onSuccess,
}) {
  return switch (behavior) {
    RowClickBehavior.navigate => (item) {
      final id = item[idField];
      if (id != null) {
        context.go('/$entityName/$id');
      }
    },
    RowClickBehavior.modal => (item) async {
      // Open edit form modal - pure composition with EntityFormModal
      final result = await EntityFormModal.show(
        context: context,
        entityName: entityName,
        mode: FormMode.edit,
        initialValue: item,
      );

      // If user saved changes, persist and refresh
      if (result != null && context.mounted) {
        try {
          final service = context.read<GenericEntityService>();
          final id = item[idField];
          if (id != null) {
            await service.update(entityName, id, result);
          }
          onSuccess?.call();
        } catch (e) {
          // Show error snackbar
          if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Failed to save: $e'),
                backgroundColor: Theme.of(context).colorScheme.error,
              ),
            );
          }
        }
      }
    },
    RowClickBehavior.none => null,
  };
}
