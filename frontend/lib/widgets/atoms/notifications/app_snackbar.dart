import 'package:flutter/material.dart';

/// Snackbar style - semantic notification types
enum SnackbarStyle { success, error, info, warning }

/// AppSnackbar - SINGLE unified snackbar atom
///
/// **SOLE RESPONSIBILITY:** Render styled snackbar notification
/// - Parameterized by SnackbarStyle
/// - Consistent floating behavior
/// - Optional action support
///
/// Usage:
/// ```dart
/// ScaffoldMessenger.of(context).showSnackBar(
///   AppSnackbar(message: 'Saved!', style: SnackbarStyle.success),
/// );
/// ```
class AppSnackbar extends SnackBar {
  AppSnackbar({
    super.key,
    required String message,
    SnackbarStyle style = SnackbarStyle.info,
    Duration? duration,
    super.action,
  }) : super(
         content: Text(message, style: const TextStyle(color: Colors.white)),
         backgroundColor: _colorForStyle(style),
         behavior: SnackBarBehavior.floating,
         duration: duration ?? _durationForStyle(style),
       );

  static Color _colorForStyle(SnackbarStyle style) {
    return switch (style) {
      SnackbarStyle.success => Colors.green,
      SnackbarStyle.error => Colors.red,
      SnackbarStyle.warning => Colors.orange,
      SnackbarStyle.info => Colors.blue,
    };
  }

  static Duration _durationForStyle(SnackbarStyle style) {
    return switch (style) {
      SnackbarStyle.success => const Duration(seconds: 2),
      SnackbarStyle.error => const Duration(seconds: 4),
      SnackbarStyle.warning => const Duration(seconds: 3),
      SnackbarStyle.info => const Duration(seconds: 3),
    };
  }
}
