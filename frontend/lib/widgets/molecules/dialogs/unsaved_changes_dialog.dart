/// UnsavedChangesDialog - Standard dialog for unsaved changes warning
///
/// **SOLE RESPONSIBILITY:** Display unsaved changes warning with discard/stay
///
/// Features:
/// - Standard "discard changes?" messaging
/// - Discard (destructive) and Stay (safe) actions
/// - Change count display
/// - Consistent styling across the app
///
/// Usage:
/// ```dart
/// // Show before navigation or modal close
/// final shouldDiscard = await UnsavedChangesDialog.show(
///   context: context,
///   changeCount: 3,
/// );
///
/// if (shouldDiscard == true) {
///   Navigator.pop(context);
/// }
/// ```
library;

import 'package:flutter/material.dart';

/// Dialog for warning users about unsaved changes
class UnsavedChangesDialog extends StatelessWidget {
  /// Number of unsaved changes (for messaging)
  final int changeCount;

  /// Custom title (default: "Discard Changes?")
  final String? title;

  /// Custom message (default: generated from changeCount)
  final String? message;

  /// Label for discard button (default: "Discard")
  final String discardLabel;

  /// Label for stay button (default: "Keep Editing")
  final String stayLabel;

  const UnsavedChangesDialog({
    super.key,
    this.changeCount = 0,
    this.title,
    this.message,
    this.discardLabel = 'Discard',
    this.stayLabel = 'Keep Editing',
  });

  /// Show the dialog and return true if user chose to discard
  static Future<bool?> show({
    required BuildContext context,
    int changeCount = 0,
    String? title,
    String? message,
  }) {
    return showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (context) => UnsavedChangesDialog(
        changeCount: changeCount,
        title: title,
        message: message,
      ),
    );
  }

  String get _title => title ?? 'Discard Changes?';

  String get _message {
    if (message != null) return message!;

    if (changeCount <= 0) {
      return 'You have unsaved changes. Are you sure you want to discard them?';
    } else if (changeCount == 1) {
      return 'You have 1 unsaved change. Are you sure you want to discard it?';
    } else {
      return 'You have $changeCount unsaved changes. Are you sure you want to discard them?';
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AlertDialog(
      title: Text(_title),
      content: Text(_message),
      actions: [
        // Stay button (safe action - primary)
        TextButton(
          onPressed: () => Navigator.of(context).pop(false),
          child: Text(stayLabel),
        ),
        // Discard button (destructive action)
        ElevatedButton(
          onPressed: () => Navigator.of(context).pop(true),
          style: ElevatedButton.styleFrom(
            backgroundColor: theme.colorScheme.error,
            foregroundColor: theme.colorScheme.onError,
          ),
          child: Text(discardLabel),
        ),
      ],
    );
  }
}
