// Molecule: Error Message (title + description)
import 'package:flutter/material.dart';
import '../../config/app_spacing.dart';

/// Displays title and description for error pages
class ErrorMessage extends StatelessWidget {
  final String title;
  final String description;
  final TextAlign? textAlign;

  const ErrorMessage({
    super.key,
    required this.title,
    required this.description,
    this.textAlign,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final spacing = context.spacing;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          title,
          style: theme.textTheme.headlineMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
          textAlign: textAlign ?? TextAlign.center,
        ),
        SizedBox(height: spacing.sm),
        SelectableText(
          description,
          style: theme.textTheme.bodyLarge,
          textAlign: textAlign ?? TextAlign.center,
        ),
      ],
    );
  }
}
