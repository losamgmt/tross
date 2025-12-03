/// UnderConstructionDisplay - Organism for showing features in development
///
/// Reusable centered display with animation, icon, and message
/// Used for dashboard sections or pages under construction
library;

import 'package:flutter/material.dart';
import '../../config/app_spacing.dart';
import '../../config/app_colors.dart';

class UnderConstructionDisplay extends StatelessWidget {
  final String? title;
  final String? message;
  final IconData? icon;
  final bool showAnimation;

  const UnderConstructionDisplay({
    super.key,
    this.title,
    this.message,
    this.icon,
    this.showAnimation = true,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final spacing = context.spacing;
    final displayTitle = title ?? 'Coming Soon!';
    final displayMessage =
        message ??
        'We\'re working hard to bring you exciting new features. Check back soon for updates!';

    return Center(
      child: SingleChildScrollView(
        padding: spacing.paddingXL,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 600),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Icon with optional animation
              if (showAnimation)
                TweenAnimationBuilder<double>(
                  tween: Tween(begin: 0.0, end: 1.0),
                  duration: const Duration(milliseconds: 800),
                  builder: (context, value, child) {
                    return Transform.scale(scale: value, child: child);
                  },
                  child: _buildIconContainer(context),
                )
              else
                _buildIconContainer(context),

              SizedBox(height: spacing.xxl),

              // Title
              Text(
                displayTitle,
                style: theme.textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: AppColors.brandPrimary,
                ),
                textAlign: TextAlign.center,
              ),

              SizedBox(height: spacing.lg),

              // Message
              Text(
                displayMessage,
                style: theme.textTheme.bodyLarge?.copyWith(
                  color: AppColors.textSecondary,
                ),
                textAlign: TextAlign.center,
              ),

              SizedBox(height: spacing.xxl),

              // Progress indicator
              SizedBox(
                width: 200,
                child: LinearProgressIndicator(
                  backgroundColor: AppColors.grey200,
                  valueColor: AlwaysStoppedAnimation<Color>(
                    AppColors.brandPrimary,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildIconContainer(BuildContext context) {
    final spacing = context.spacing;

    return Container(
      padding: EdgeInsets.all(spacing.xxl),
      decoration: BoxDecoration(
        color: AppColors.withOpacity(AppColors.brandPrimary, 0.15),
        shape: BoxShape.circle,
      ),
      child: Icon(
        icon ?? Icons.construction,
        size: spacing.xxl * 2.5,
        color: AppColors.brandPrimary,
      ),
    );
  }
}
