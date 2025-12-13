/// ConfirmationDialog - Reusable confirmation dialog molecule
///
/// SINGLE RESPONSIBILITY: Display message with confirm/cancel actions
///
/// Features:
/// - Customizable title and message
/// - Customizable button labels
/// - Dangerous action styling (red confirm button)
/// - Factory methods for common use cases
///
/// TESTABLE: Widget tests verify title, message, button labels, and callbacks
///
/// Usage:
/// ```dart
/// final confirmed = await showDialog<bool>(
///   context: context,
///   builder: (context) => ConfirmationDialog.deactivate(
///     entityType: 'user',
///     entityName: 'John Doe',
///     onConfirm: () {},
///   ),
/// );
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

  /// Factory for deactivation confirmation
  ///
  /// Shows warning message about losing access
  factory ConfirmationDialog.deactivate({
    required String entityType,
    required String entityName,
    required VoidCallback onConfirm,
    VoidCallback? onCancel,
  }) {
    return ConfirmationDialog(
      title: 'Deactivate $entityType?',
      message:
          'Are you sure you want to deactivate "$entityName"? '
          'They will no longer be able to access the system.',
      confirmLabel: 'Deactivate',
      cancelLabel: 'Cancel',
      onConfirm: onConfirm,
      onCancel: onCancel,
      isDangerous: true,
    );
  }

  /// Factory for reactivation confirmation
  ///
  /// Shows informative message about regaining access
  factory ConfirmationDialog.reactivate({
    required String entityType,
    required String entityName,
    required VoidCallback onConfirm,
    VoidCallback? onCancel,
  }) {
    return ConfirmationDialog(
      title: 'Reactivate $entityType?',
      message:
          'Are you sure you want to reactivate "$entityName"? '
          'They will regain access to the system.',
      confirmLabel: 'Reactivate',
      cancelLabel: 'Cancel',
      onConfirm: onConfirm,
      onCancel: onCancel,
      isDangerous: false,
    );
  }

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
