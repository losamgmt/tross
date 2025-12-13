/// Under Construction Widget
///
/// Reusable widget for features still in development
/// Can be used for any upcoming admin features
library;

import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';
import '../../../config/app_colors.dart';

class UnderConstruction extends StatelessWidget {
  final String title;
  final String? message;
  final String? phase;
  final VoidCallback? onBack;

  const UnderConstruction({
    super.key,
    this.title = 'Under Construction',
    this.message,
    this.phase,
    this.onBack,
  });

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;

    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 800),
        child: TweenAnimationBuilder<double>(
          tween: Tween(begin: 0.0, end: 1.0),
          duration: const Duration(milliseconds: 800),
          builder: (context, value, child) {
            return Transform.scale(scale: value, child: child);
          },
          child: Card(
            elevation: 4,
            color: AppColors.brandSecondary.withValues(alpha: 0.1),
            child: Padding(
              padding: EdgeInsets.all(spacing.xl),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Construction Icon
                  Container(
                    padding: EdgeInsets.all(spacing.lg),
                    decoration: BoxDecoration(
                      color: AppColors.brandSecondary.withValues(alpha: 0.2),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.construction,
                      size: 64,
                      color: AppColors.brandPrimary,
                    ),
                  ),

                  SizedBox(height: spacing.lg),

                  // Title
                  Text(
                    title,
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: AppColors.brandPrimary,
                    ),
                    textAlign: TextAlign.center,
                  ),

                  SizedBox(height: spacing.md),

                  // Message
                  if (message != null)
                    Text(
                      message!,
                      style: Theme.of(context).textTheme.bodyLarge,
                      textAlign: TextAlign.center,
                    ),

                  SizedBox(height: spacing.xl),

                  // Progress Indicator
                  LinearProgressIndicator(
                    backgroundColor: Theme.of(
                      context,
                    ).colorScheme.surfaceContainerHighest,
                    valueColor: const AlwaysStoppedAnimation<Color>(
                      AppColors.brandPrimary,
                    ),
                  ),

                  if (phase != null) ...[
                    SizedBox(height: spacing.xs),
                    Text(
                      phase!,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],

                  if (onBack != null) ...[
                    SizedBox(height: spacing.lg),
                    OutlinedButton.icon(
                      onPressed: onBack,
                      icon: const Icon(Icons.arrow_back),
                      label: const Text('Go Back'),
                      style: OutlinedButton.styleFrom(
                        padding: EdgeInsets.symmetric(
                          horizontal: spacing.lg,
                          vertical: spacing.sm,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
