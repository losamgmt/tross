/// ConfirmationDialog - Reusable confirmation dialog molecule
///
/// **SOLE RESPONSIBILITY:** Display message with confirm/cancel actions
/// **GENERIC:** No domain-specific factories - routes build specific dialogs
///
/// Features:
/// - Customizable title and message
/// - Customizable button labels
/// - Dangerous action styling (red confirm button)
///
/// Usage:
/// ```dart
/// // Generic confirmation
/// final confirmed = await showDialog<bool>(
///   context: context,
///   builder: (context) => ConfirmationDialog(
///     title: 'Delete Item?',
///     message: 'This action cannot be undone.',
///     confirmLabel: 'Delete',
///     isDangerous: true,
///     onConfirm: () {},
///   ),
/// );
///
/// // Route-level factory (keep domain logic in routes)
/// ConfirmationDialog buildDeactivateDialog(String type, String name, VoidCallback onConfirm) {
///   return ConfirmationDialog(
///     title: 'Deactivate $type?',
///     message: 'Are you sure you want to deactivate "$name"?',
///     confirmLabel: 'Deactivate',
///     isDangerous: true,
///     onConfirm: onConfirm,
///   );
/// }
/// ```
library;

import 'package:flutter/material.dart';

class ConfirmationDialog extends StatelessWidget {
  final String title;
  final String message;
  final String confirmLabel;
  final String cancelLabel;
  final VoidCallback onConfirm;
  final VoidCallback? onCancel;
  final bool isDangerous;

  const ConfirmationDialog({
    super.key,
    required this.title,
    required this.message,
    required this.onConfirm,
    this.onCancel,
    this.confirmLabel = 'Confirm',
    this.cancelLabel = 'Cancel',
    this.isDangerous = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AlertDialog(
      title: Text(title),
      content: Text(message),
      actions: [
        TextButton(
          onPressed: () {
            onCancel?.call();
            Navigator.of(context).pop(false);
          },
          child: Text(cancelLabel),
        ),
        ElevatedButton(
          onPressed: () {
            onConfirm();
            Navigator.of(context).pop(true);
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: isDangerous
                ? theme.colorScheme.error
                : theme.colorScheme.primary,
            foregroundColor: Colors.white,
          ),
          child: Text(confirmLabel),
        ),
      ],
    );
  }
}
