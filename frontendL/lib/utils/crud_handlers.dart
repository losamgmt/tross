/// CRUD Handlers - Orchestration functions for CRUD operations
///
/// **SOLE RESPONSIBILITY:** Coordinate dialogs, services, and callbacks
///
/// These are PURE ORCHESTRATION FUNCTIONS - no widgets, no state.
/// - Show confirmation dialog
/// - Call service method
/// - Handle success/error
/// - Trigger refresh callback
///
/// SRP: Each function orchestrates ONE CRUD operation pattern
/// Pattern: Async orchestration with proper error handling
/// Testing: Mock services and dialogs to test orchestration logic
///
/// Usage:
/// ```dart
/// await CrudHandlers.handleDelete(
///   context: context,
///   entityType: 'user',
///   entityName: user.fullName,
///   deleteOperation: () => UserService.delete(user.id),
///   onSuccess: refreshTable,
/// );
/// ```
library;

import 'package:flutter/material.dart';
import '../widgets/molecules/dialogs/confirmation_dialog.dart';

class CrudHandlers {
  // Private constructor - static class only
  CrudHandlers._();

  /// Handle delete operation with confirmation dialog
  ///
  /// 1. Shows confirmation dialog
  /// 2. If confirmed, calls deleteOperation
  /// 3. If successful, shows success snackbar and calls all onSuccess callbacks
  /// 4. If error, shows error snackbar
  ///
  /// [context] - BuildContext for dialogs/snackbars
  /// [entityType] - Type of entity being deleted (e.g., 'user', 'role')
  /// [entityName] - Name of entity being deleted (for confirmation message)
  /// [deleteOperation] - Async function that performs the delete (returns bool)
  /// [onSuccess] - Primary callback to trigger after successful delete (e.g., refresh table)
  /// [additionalRefreshCallbacks] - Optional additional callbacks for cascading refreshes
  ///   (e.g., refresh users table when deleting a role)
  ///
  /// Returns true if delete was successful, false if cancelled or failed
  static Future<bool> handleDelete({
    required BuildContext context,
    required String entityType,
    required String entityName,
    required Future<bool> Function() deleteOperation,
    required VoidCallback onSuccess,
    List<VoidCallback>? additionalRefreshCallbacks,
  }) async {
    // Step 1: Show confirmation dialog
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => ConfirmationDialog(
        title: 'Delete $entityType?',
        message:
            'Are you sure you want to delete "$entityName"? This action cannot be undone.',
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        isDangerous: true,
        onConfirm: () {}, // Dialog handles navigation
      ),
    );

    // Step 2: If cancelled, return false
    if (confirmed != true) {
      return false;
    }

    // Step 3: Perform delete operation
    try {
      final success = await deleteOperation();

      if (!context.mounted) return success;

      // Step 4a: Success - show snackbar and trigger refresh
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('$entityType deleted successfully'),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 2),
          ),
        );

        // Schedule refresh callbacks after current frame completes
        // This prevents potential navigation issues from simultaneous setState calls
        WidgetsBinding.instance.addPostFrameCallback((_) {
          onSuccess(); // Primary refresh callback

          // Trigger additional refresh callbacks (e.g., cascading table refreshes)
          if (additionalRefreshCallbacks != null) {
            for (final callback in additionalRefreshCallbacks) {
              callback();
            }
          }
        });

        return true;
      } else {
        // Step 4b: Service returned false (unexpected)
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to delete $entityType'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 3),
          ),
        );
        return false;
      }
    } catch (error) {
      // Step 4c: Error occurred
      if (!context.mounted) return false;

      // Extract and transform error message for end users
      String errorMessage = error.toString();
      if (errorMessage.startsWith('Exception: ')) {
        errorMessage = errorMessage.substring('Exception: '.length);
      }

      // Transform technical backend messages to user-friendly ones
      errorMessage = _transformErrorMessage(errorMessage, entityType);

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(errorMessage),
          backgroundColor: Colors.red,
          duration: const Duration(seconds: 5), // Longer for error messages
        ),
      );
      return false;
    }
  }

  /// Transform technical backend error messages to user-friendly format
  static String _transformErrorMessage(String message, String entityType) {
    // Remove backend-specific instructions (e.g., "Use force=true...")
    if (message.contains('Use force=true')) {
      message = message.split('Use force=true')[0].trim();
      if (message.endsWith('.')) {
        message = message.substring(0, message.length - 1);
      }
    }

    // Transform "N user(s)" to proper grammar
    final userCountMatch = RegExp(r'(\d+) user\(s\)').firstMatch(message);
    if (userCountMatch != null) {
      final count = int.parse(userCountMatch.group(1)!);
      final plural = count == 1 ? 'user is' : 'users are';
      message = message.replaceFirst(
        '${userCountMatch.group(1)} user(s)',
        '$count $plural',
      );

      // Add helpful guidance
      if (!message.contains('reassign')) {
        message = '$message. Please reassign them first.';
      }
    }

    // Transform protected role message
    if (message.contains('Cannot delete protected role')) {
      return 'This is a protected system role and cannot be deleted.';
    }

    // Transform "not found" messages
    if (message.contains('not found')) {
      return 'This $entityType no longer exists. It may have been deleted by another user.';
    }

    // Transform authorization errors
    if (message.contains('Unauthorized') || message.contains('403')) {
      return 'You do not have permission to delete this $entityType.';
    }

    return message;
  }

  // Future expansion: handleCreate/handleUpdate for form modals
}
