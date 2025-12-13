/// InfoSnackBar Atom - Info notification display
///
/// **SOLE RESPONSIBILITY:** Render info snackbar with consistent styling
/// - Theme-based background
/// - Contrast text color
/// - Info icon (optional)
/// - Floating behavior
///
/// This is an ATOM - pure visual component, zero logic
library;

import 'package:flutter/material.dart';

/// Info snackbar with theme-based background
class InfoSnackBar extends SnackBar {
  InfoSnackBar({
    super.key,
    required String message,
    super.duration = const Duration(seconds: 3),
    super.action,
  }) : super(content: Text(message), behavior: SnackBarBehavior.floating);
}
