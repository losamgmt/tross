/// AppFooter - Atom for application footer display
///
/// Single-purpose: Display copyright and app description
library;

import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';
import '../../../config/app_colors.dart';

class AppFooter extends StatelessWidget {
  final String copyright;
  final String description;

  const AppFooter({
    super.key,
    required this.copyright,
    required this.description,
  });

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final theme = Theme.of(context);

    return Column(
      children: [
        Text(
          copyright,
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
          ),
          textAlign: TextAlign.center,
        ),
        SizedBox(height: spacing.sm),
        Text(
          description,
          style: theme.textTheme.bodySmall?.copyWith(
            color: AppColors.withOpacity(AppColors.brandPrimary, 0.8),
            fontWeight: FontWeight.w500,
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}
