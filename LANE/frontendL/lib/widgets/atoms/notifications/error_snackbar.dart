/// ErrorSnackBar Atom - Error notification display
///
/// **SOLE RESPONSIBILITY:** Render error snackbar with consistent styling
/// - Red background
/// - White text
/// - Error icon (optional)
/// - Floating behavior
///
/// This is an ATOM - pure visual component, zero logic
library;

import 'package:flutter/material.dart';

/// Error snackbar with red background and white text
class ErrorSnackBar extends SnackBar {
  ErrorSnackBar({
    super.key,
    required String message,
    super.duration = const Duration(seconds: 4),
    super.action,
  }) : super(
         content: Text(message, style: const TextStyle(color: Colors.white)),
         backgroundColor: Colors.red,
         behavior: SnackBarBehavior.floating,
       );
}
