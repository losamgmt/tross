import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';

/// RefreshableSection - Generic molecule for sections with refresh capability
///
/// **SOLE RESPONSIBILITY:** Display title + optional subtitle + refresh button + content
/// **GENERIC:** No domain-specific text - all content passed as props
///
/// Usage:
/// ```dart
/// RefreshableSection(
///   title: 'Database Health',
///   subtitle: '2 databases connected',
///   onRefresh: _refreshData,
///   isRefreshing: _isLoading,
///   child: DatabaseHealthCards(...),
/// )
/// ```
class RefreshableSection extends StatelessWidget {
  final String title;
  final VoidCallback onRefresh;
  final Widget? child;
  final String? subtitle;
  final bool isRefreshing;
  final IconData refreshIcon;

  const RefreshableSection({
    super.key,
    required this.title,
    required this.onRefresh,
    this.child,
    this.subtitle,
    this.isRefreshing = false,
    this.refreshIcon = Icons.refresh,
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
                    title,
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
                : IconButton(
                    icon: Icon(refreshIcon),
                    onPressed: onRefresh,
                    tooltip: 'Refresh',
                  ),
          ],
        ),
        if (child != null) ...[SizedBox(height: spacing.md), child!],
      ],
    );
  }
}

/// Backwards compatibility alias
@Deprecated('Use RefreshableSection instead')
typedef HealthStatusBox = RefreshableSection;
