import 'package:flutter/material.dart';
import 'package:tross_app/widgets/organisms/modals/generic_modal.dart';
import 'package:tross_app/services/navigation_coordinator.dart';
import 'package:tross_app/config/app_spacing.dart';

/// ConfirmationModal - Organism for confirmation dialogs via PURE COMPOSITION
///
/// **SOLE RESPONSIBILITY:** Compose GenericModal for Yes/No confirmations
///
/// Architecture:
/// - NO implementation, ONLY composition
/// - Composes: GenericModal (organism) + Flutter widgets (Icon, Text, Buttons)
/// - Common use: Delete confirmations, dangerous actions
///
/// Usage:
/// ```dart
/// ConfirmationModal.show(
///   context: context,
///   title: 'Delete User?',
///   message: 'This action cannot be undone.',
///   confirmText: 'Delete',
///   onConfirm: () => deleteUser(),
///   isDanger: true,
/// )
/// ```
class ConfirmationModal extends StatelessWidget {
  final String title;
  final String message;
  final IconData? icon;
  final Color? iconColor;
  final String confirmText;
  final String cancelText;
  final VoidCallback? onConfirm;
  final VoidCallback? onCancel;
  final bool isDanger;

  const ConfirmationModal({
    super.key,
    required this.title,
    required this.message,
    this.icon,
    this.iconColor,
    this.confirmText = 'Confirm',
    this.cancelText = 'Cancel',
    this.onConfirm,
    this.onCancel,
    this.isDanger = false,
  });

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;

    // Pure composition: GenericModal + Flutter widgets
    return GenericModal(
      title: title,
      showCloseButton: false,
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Icon (optional)
          if (icon != null) ...[
            Icon(
              icon,
              size: 64,
              color:
                  iconColor ??
                  (isDanger
                      ? Theme.of(context).colorScheme.error
                      : Theme.of(context).colorScheme.primary),
            ),
            SizedBox(height: spacing.md),
          ],

          // Message
          Text(
            message,
            style: Theme.of(context).textTheme.bodyLarge,
            textAlign: TextAlign.center,
          ),
        ],
      ),
      actions: [
        // Cancel button
        TextButton(
          onPressed:
              onCancel ??
              () => NavigationCoordinator.pop(context, result: false),
          child: Text(cancelText),
        ),

        // Confirm button (danger style if isDanger)
        if (isDanger)
          FilledButton(
            onPressed:
                onConfirm ??
                () => NavigationCoordinator.pop(context, result: true),
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.error,
            ),
            child: Text(confirmText),
          )
        else
          FilledButton(
            onPressed:
                onConfirm ??
                () => NavigationCoordinator.pop(context, result: true),
            child: Text(confirmText),
          ),
      ],
    );
  }

  /// Helper method to show confirmation modal
  static Future<bool?> show({
    required BuildContext context,
    required String title,
    required String message,
    IconData? icon,
    Color? iconColor,
    String confirmText = 'Confirm',
    String cancelText = 'Cancel',
    VoidCallback? onConfirm,
    VoidCallback? onCancel,
    bool isDanger = false,
  }) {
    return showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (context) => ConfirmationModal(
        title: title,
        message: message,
        icon: icon,
        iconColor: iconColor,
        confirmText: confirmText,
        cancelText: cancelText,
        onConfirm: onConfirm,
        onCancel: onCancel,
        isDanger: isDanger,
      ),
    );
  }
}
