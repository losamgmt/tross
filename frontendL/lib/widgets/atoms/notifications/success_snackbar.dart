/// SuccessSnackBar Atom - Success notification display
///
/// **SOLE RESPONSIBILITY:** Render success snackbar with consistent styling
/// - Green background
/// - White text
/// - Success icon (optional)
/// - Floating behavior
///
/// This is an ATOM - pure visual component, zero logic
library;

import 'package:flutter/material.dart';

/// Success snackbar with green background and white text
class SuccessSnackBar extends SnackBar {
  SuccessSnackBar({
    super.key,
    required String message,
    super.duration = const Duration(seconds: 2),
    super.action,
  }) : super(
         content: Text(message, style: const TextStyle(color: Colors.white)),
         backgroundColor: Colors.green,
         behavior: SnackBarBehavior.floating,
       );
}
