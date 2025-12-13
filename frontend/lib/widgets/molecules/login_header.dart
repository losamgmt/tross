/// LoginHeader - Molecule for login page header
///
/// Renders logo icon and title for login/branding screens
library;

import 'package:flutter/material.dart';
import '../../config/app_spacing.dart';
import '../../config/app_colors.dart';

class LoginHeader extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;

  const LoginHeader({
    super.key,
    required this.title,
    required this.subtitle,
    this.icon = Icons.build_circle,
  });

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final theme = Theme.of(context);
    final logoSize = spacing.xxxl * 2;

    return Column(
      children: [
        // Logo
        Container(
          width: logoSize,
          height: logoSize,
          decoration: BoxDecoration(
            color: AppColors.withOpacity(AppColors.brandPrimary, 0.1),
            borderRadius: BorderRadius.circular(logoSize / 2),
          ),
          child: Icon(
            icon,
            size: logoSize * 0.533,
            color: AppColors.brandPrimary,
          ),
        ),
        SizedBox(height: spacing.xl),
        // Title
        Text(
          title,
          style: theme.textTheme.headlineMedium?.copyWith(
            fontWeight: FontWeight.bold,
            color: AppColors.brandPrimary,
          ),
        ),
        SizedBox(height: spacing.sm),
        // Subtitle
        Text(
          subtitle,
          style: theme.textTheme.bodyLarge?.copyWith(
            color: theme.colorScheme.onSurface.withValues(alpha: 0.7),
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}
