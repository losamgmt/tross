/// AppTitle - Atom for application title display
///
/// Single-purpose: Display app name and tagline
library;

import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';
import '../../../config/app_colors.dart';

class AppTitle extends StatelessWidget {
  final String title;
  final String? subtitle;

  const AppTitle({super.key, required this.title, this.subtitle});

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final theme = Theme.of(context);

    return Column(
      children: [
        Text(
          title,
          style: theme.textTheme.headlineMedium?.copyWith(
            fontWeight: FontWeight.bold,
            color: AppColors.brandPrimary,
          ),
        ),
        if (subtitle != null) ...[
          SizedBox(height: spacing.sm),
          Text(
            subtitle!,
            style: theme.textTheme.bodyLarge?.copyWith(
              color: theme.colorScheme.onSurface.withValues(alpha: 0.7),
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ],
    );
  }
}
