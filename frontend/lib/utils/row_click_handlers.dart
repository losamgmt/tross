/// Row Click Handlers
///
/// Utilities for handling row taps in data tables.
/// Supports navigate, modal, and no-op behaviors.
///
/// PURE COMPOSITION: Uses existing GenericModal + EntityDetailCard.
/// ZERO SPECIFICITY: No custom widgets, only composing generics.
///
/// Usage:
/// ```dart
/// AppDataTable(
///   onRowTap: buildRowTapHandler(
///     context: context,
///     entityName: 'customer_unit',
///     behavior: RowClickBehavior.modal,
///   ),
/// )
/// ```
library;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../models/relationship.dart';
import '../widgets/organisms/modals/generic_modal.dart';
import '../widgets/organisms/cards/entity_detail_card.dart';

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
      // Pure composition: GenericModal + EntityDetailCard
      await GenericModal.show(
        context: context,
        title: _getEntityTitle(item, entityName),
        content: EntityDetailCard(
          entityName: entityName,
          entity: item,
          elevation: 0,
          padding: EdgeInsets.zero,
        ),
      );
      // Refresh parent after modal closes (user may have edited data)
      onSuccess?.call();
    },
    RowClickBehavior.none => null,
  };
}

/// Get a display title from an entity map.
/// Tries common fields, falls back to entity name + id.
String _getEntityTitle(Map<String, dynamic> item, String entityName) {
  final name =
      item['name'] ?? item['title'] ?? item['display_name'] ?? item['email'];
  if (name != null) return name.toString();

  final id = item['id'];
  if (id != null) return '$entityName #$id';

  return entityName;
}
