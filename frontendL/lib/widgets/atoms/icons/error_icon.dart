// Atom: Error Icon Display
import 'package:flutter/material.dart';

/// Displays an icon for error pages
class ErrorIcon extends StatelessWidget {
  final IconData icon;
  final Color? color;
  final double? size;

  const ErrorIcon({super.key, required this.icon, this.color, this.size});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Icon(
      icon,
      size: size ?? 80,
      color: color ?? theme.colorScheme.primary,
    );
  }
}
