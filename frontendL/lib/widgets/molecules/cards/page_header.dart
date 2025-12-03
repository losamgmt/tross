/// PageHeader - Molecule for page titles and subtitles
///
/// Standard header for screens with title + subtitle.
/// Supports optional status badge and action widgets (like refresh button).
///
/// Usage:
/// ```dart
/// // Simple header
/// PageHeader(
///   title: 'Profile & Settings',
///   subtitle: 'Manage your account and preferences',
/// )
///
/// // With status badge and action
/// PageHeader(
///   title: 'Database Health',
///   subtitle: '2 databases',
///   statusBadge: ConnectionStatusBadge(status: HealthStatus.healthy),
///   action: IconButton(icon: Icon(Icons.refresh), onPressed: refresh),
/// )
/// ```
library;

import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';
import '../../../config/app_colors.dart';

class PageHeader extends StatelessWidget {
  final String title;
  final String subtitle;
  final Color? titleColor;
  final Widget? statusBadge;
  final Widget? action;

  const PageHeader({
    super.key,
    required this.title,
    required this.subtitle,
    this.titleColor,
    this.statusBadge,
    this.action,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final spacing = context.spacing;

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Flexible(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: theme.textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: titleColor ?? AppColors.brandPrimary,
                ),
              ),
              SizedBox(height: spacing.xs),
              Row(
                children: [
                  if (statusBadge != null) ...[
                    statusBadge!,
                    SizedBox(width: spacing.sm),
                  ],
                  Flexible(
                    child: Text(
                      subtitle,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: AppColors.textSecondary,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        if (action != null) ...[SizedBox(width: spacing.md), action!],
      ],
    );
  }
}
