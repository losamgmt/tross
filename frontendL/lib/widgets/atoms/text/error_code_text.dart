// Atom: Error Code Text Display
import 'package:flutter/material.dart';

/// Displays a large error code (404, 403, 500, etc.)
class ErrorCodeText extends StatelessWidget {
  final String code;
  final Color? color;

  const ErrorCodeText({super.key, required this.code, this.color});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Text(
      code,
      style: theme.textTheme.displayLarge?.copyWith(
        fontWeight: FontWeight.bold,
        color: color ?? theme.colorScheme.primary,
      ),
    );
  }
}
