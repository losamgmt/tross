/// LoadingIndicator - Atom component for loading states
///
/// Consistent loading UI across the application
/// Supports different sizes and optional message
///
/// Material 3 Design with TrossApp branding
library;

import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';

enum LoadingSize { small, medium, large }

class LoadingIndicator extends StatelessWidget {
  final LoadingSize size;
  final String? message;
  final Color? color;

  const LoadingIndicator({
    super.key,
    this.size = LoadingSize.medium,
    this.message,
    this.color,
  });

  /// Named constructor for inline loading (small, no message)
  const LoadingIndicator.inline({super.key, this.color})
    : size = LoadingSize.small,
      message = null;

  /// Named constructor for full-screen loading
  const LoadingIndicator.fullScreen({super.key, this.message, this.color})
    : size = LoadingSize.large;

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final theme = Theme.of(context);
    final indicatorColor =
        color ?? theme.colorScheme.primary; // Bronze by default

    final double indicatorSize = switch (size) {
      LoadingSize.small => spacing.lg,
      LoadingSize.medium => spacing.xl,
      LoadingSize.large => spacing.xxl,
    };

    final Widget indicator = SizedBox(
      width: indicatorSize,
      height: indicatorSize,
      child: CircularProgressIndicator(
        strokeWidth: size == LoadingSize.small ? 2 : 3,
        valueColor: AlwaysStoppedAnimation<Color>(indicatorColor),
      ),
    );

    if (message == null) {
      return Center(child: indicator);
    }

    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          indicator,
          SizedBox(height: spacing.lg),
          Flexible(
            child: Text(
              message!,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
              overflow: TextOverflow.ellipsis,
              maxLines: 2,
            ),
          ),
        ],
      ),
    );
  }
}

/// Skeleton loader for content placeholders
class SkeletonLoader extends StatefulWidget {
  final double width;
  final double height;
  final BorderRadius? borderRadius;

  const SkeletonLoader({
    super.key,
    required this.width,
    required this.height,
    this.borderRadius,
  });

  @override
  State<SkeletonLoader> createState() => _SkeletonLoaderState();
}

class _SkeletonLoaderState extends State<SkeletonLoader>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    )..repeat(reverse: true);

    _animation = Tween<double>(
      begin: 0.3,
      end: 0.7,
    ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeInOut));
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final theme = Theme.of(context);

    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            color: theme.colorScheme.surfaceContainerHighest.withValues(
              alpha: _animation.value,
            ),
            borderRadius: widget.borderRadius ?? spacing.radiusXS,
          ),
        );
      },
    );
  }
}
