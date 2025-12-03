/// NotificationService - User notification coordinator
///
/// **SOLE RESPONSIBILITY:** Coordinate user notifications via SnackBars
/// - Show success messages
/// - Show error messages
/// - Show info messages
/// - Use atomic SnackBar components
///
/// This is a SERVICE - coordinates UI behavior, doesn't create widgets
/// Uses ScaffoldMessenger API + atomic SnackBar components
library;

import 'package:flutter/material.dart';
import '../widgets/atoms/atoms.dart';

/// Service for showing user notifications
///
/// Provides centralized notification coordination using atomic SnackBar components.
/// All methods delegate to ScaffoldMessenger API with typed SnackBar atoms.
class NotificationService {
  // Private constructor - this is a static utility class
  NotificationService._();

  /// Show success notification
  ///
  /// Displays a green SnackBar with success message.
  /// Auto-dismisses after 2 seconds.
  ///
  /// Example:
  /// ```dart
  /// NotificationService.showSuccess(context, 'User updated successfully');
  /// ```
  static void showSuccess(BuildContext context, String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SuccessSnackBar(message: message));
  }

  /// Show error notification
  ///
  /// Displays a red SnackBar with error message.
  /// Auto-dismisses after 4 seconds (longer for errors).
  ///
  /// Example:
  /// ```dart
  /// NotificationService.showError(context, 'Failed to update user');
  /// ```
  static void showError(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(ErrorSnackBar(message: message));
  }

  /// Show info notification
  ///
  /// Displays a theme-based SnackBar with info message.
  /// Auto-dismisses after 3 seconds.
  ///
  /// Example:
  /// ```dart
  /// NotificationService.showInfo(context, 'Settings saved');
  /// ```
  static void showInfo(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(InfoSnackBar(message: message));
  }

  /// Show error notification with action
  ///
  /// Displays a red SnackBar with error message and action button.
  ///
  /// Example:
  /// ```dart
  /// NotificationService.showErrorWithAction(
  ///   context,
  ///   'Failed to save',
  ///   actionLabel: 'Retry',
  ///   onAction: () => saveAgain(),
  /// );
  /// ```
  static void showErrorWithAction(
    BuildContext context,
    String message, {
    required String actionLabel,
    required VoidCallback onAction,
  }) {
    ScaffoldMessenger.of(context).showSnackBar(
      ErrorSnackBar(
        message: message,
        action: SnackBarAction(
          label: actionLabel,
          textColor: Colors.white,
          onPressed: onAction,
        ),
      ),
    );
  }
}
