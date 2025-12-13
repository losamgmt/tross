/// NotificationService - User notification coordinator
///
/// **SOLE RESPONSIBILITY:** Coordinate user notifications via SnackBars
/// - Show success messages
/// - Show error messages
/// - Show info messages
/// - Use AppSnackbar atom with SnackbarStyle
///
/// This is a SERVICE - coordinates UI behavior, doesn't create widgets
/// Uses ScaffoldMessenger API + AppSnackbar atom
library;

import 'package:flutter/material.dart';
import '../widgets/atoms/atoms.dart';

/// Service for showing user notifications
///
/// Provides centralized notification coordination using AppSnackbar atom.
/// All methods delegate to ScaffoldMessenger API with styled snackbars.
class NotificationService {
  // Private constructor - this is a static utility class
  NotificationService._();

  /// Show success notification
  ///
  /// Displays a green SnackBar with success message.
  /// Auto-dismisses after 2 seconds.
  static void showSuccess(BuildContext context, String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(AppSnackbar(message: message, style: SnackbarStyle.success));
  }

  /// Show error notification
  ///
  /// Displays a red SnackBar with error message.
  /// Auto-dismisses after 4 seconds (longer for errors).
  static void showError(BuildContext context, String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(AppSnackbar(message: message, style: SnackbarStyle.error));
  }

  /// Show info notification
  ///
  /// Displays a blue SnackBar with info message.
  /// Auto-dismisses after 3 seconds.
  static void showInfo(BuildContext context, String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(AppSnackbar(message: message, style: SnackbarStyle.info));
  }

  /// Show error notification with action
  ///
  /// Displays a red SnackBar with error message and action button.
  static void showErrorWithAction(
    BuildContext context,
    String message, {
    required String actionLabel,
    required VoidCallback onAction,
  }) {
    ScaffoldMessenger.of(context).showSnackBar(
      AppSnackbar(
        message: message,
        style: SnackbarStyle.error,
        action: SnackBarAction(
          label: actionLabel,
          textColor: Colors.white,
          onPressed: onAction,
        ),
      ),
    );
  }
}
