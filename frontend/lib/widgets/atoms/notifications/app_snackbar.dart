import 'package:flutter/material.dart';
import '../../../config/app_colors.dart';

/// Snackbar style - semantic notification types
enum SnackbarStyle { success, error, info, warning }

/// AppSnackbar - SINGLE unified snackbar atom
///
/// **SOLE RESPONSIBILITY:** Render styled snackbar notification
/// - Parameterized by SnackbarStyle
/// - Consistent floating behavior
/// - Optional action support
/// - Uses design system colors (AppColors)
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
         content: Text(
           message,
           style: const TextStyle(color: AppColors.textOnDark),
         ),
         backgroundColor: _colorForStyle(style),
         behavior: SnackBarBehavior.floating,
         duration: duration ?? _durationForStyle(style),
       );

  static Color _colorForStyle(SnackbarStyle style) {
    return switch (style) {
      SnackbarStyle.success => AppColors.success,
      SnackbarStyle.error => AppColors.error,
      SnackbarStyle.warning => AppColors.warning,
      SnackbarStyle.info => AppColors.info,
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
