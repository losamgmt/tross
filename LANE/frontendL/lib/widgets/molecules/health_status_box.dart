import 'package:flutter/material.dart';
import '../../config/app_spacing.dart';
import '../atoms/buttons/refresh_icon_button.dart';

class HealthStatusBox extends StatelessWidget {
  final VoidCallback onRefresh;
  final Widget? child;
  final String? subtitle;
  final bool isRefreshing;
  const HealthStatusBox({
    super.key,
    required this.onRefresh,
    this.child,
    this.subtitle,
    this.isRefreshing = false,
  });

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Title and subtitle (flexible, not expanded - no context assumption)
            Flexible(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Database Health',
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  if (subtitle != null)
                    Text(subtitle!, style: theme.textTheme.bodySmall),
                ],
              ),
            ),
            SizedBox(width: spacing.xs),
            // Refresh button
            isRefreshing
                ? SizedBox(
                    width: spacing.lg,
                    height: spacing.lg,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : RefreshIconButton(onPressed: onRefresh),
          ],
        ),
        if (child != null) ...[SizedBox(height: spacing.md), child!],
      ],
    );
  }
}
