/// PlaceholderCard - Molecule for "coming soon" feature sections
///
/// Standard card with icon, title, and message for features under development
///
/// Usage:
/// ```dart
/// PlaceholderCard(
///   icon: Icons.tune,
///   title: 'Preferences',
///   message: 'Notification, theme, and language preferences coming soon!',
/// )
/// ```
library;

import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';
import '../../../config/app_colors.dart';

class PlaceholderCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String message;
  final Color? iconColor;

  const PlaceholderCard({
    super.key,
    required this.icon,
    required this.title,
    required this.message,
    this.iconColor,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final spacing = context.spacing;

    return Card(
      elevation: 2,
      child: Padding(
        padding: spacing.paddingXL,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                Icon(icon, color: iconColor ?? AppColors.brandPrimary),
                SizedBox(width: spacing.md),
                Text(
                  title,
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            SizedBox(height: spacing.lg),
            const Divider(),
            SizedBox(height: spacing.lg),

            // Placeholder content
            Center(
              child: Column(
                children: [
                  Icon(
                    Icons.construction,
                    size: spacing.xxxl,
                    color: AppColors.grey400,
                  ),
                  SizedBox(height: spacing.md),
                  Text(
                    message,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: AppColors.textSecondary,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
