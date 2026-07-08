/// FeedbackService - Transient user feedback coordinator
///
/// **SOLE RESPONSIBILITY:** Show transient user feedback via SnackBars
/// - Show success messages
/// - Show error messages
/// - Show info messages
/// - Use AppSnackbar atom with SnackbarStyle
///
/// This is a SERVICE - coordinates UI behavior, doesn't create widgets
/// Uses ScaffoldMessenger API + AppSnackbar atom
///
/// Note: "notification" is reserved for the persisted notification entity;
/// this service handles ephemeral in-app feedback (toasts/snackbars) only.
library;

import 'package:flutter/material.dart';
import '../widgets/atoms/atoms.dart';

/// Service for showing transient user feedback
///
/// Provides centralized feedback coordination using AppSnackbar atom.
/// All methods delegate to ScaffoldMessenger API with styled snackbars.
class FeedbackService {
  // Private constructor - this is a static utility class
  FeedbackService._();

  /// Show success feedback
  ///
  /// Displays a green SnackBar with success message.
  /// Auto-dismisses after 2 seconds.
  static void showSuccess(BuildContext context, String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(AppSnackbar(message: message, style: SnackbarStyle.success));
  }

  /// Show error feedback
  ///
  /// Displays a red SnackBar with error message.
  /// Auto-dismisses after 4 seconds (longer for errors).
  static void showError(BuildContext context, String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(AppSnackbar(message: message, style: SnackbarStyle.error));
  }

  /// Show info feedback
  ///
  /// Displays a blue SnackBar with info message.
  /// Auto-dismisses after 3 seconds.
  static void showInfo(BuildContext context, String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(AppSnackbar(message: message, style: SnackbarStyle.info));
  }

  /// Show error feedback with action
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
