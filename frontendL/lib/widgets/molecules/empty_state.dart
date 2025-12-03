/// EmptyState - Molecule component for "no data" states
///
/// Consistent empty state UI across the application
/// Used when tables/lists have no data to display
///
/// Composes: Icons, Text atoms
library;

import 'package:flutter/material.dart';
import '../../config/app_spacing.dart';

class EmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? message;
  final Widget? action;

  const EmptyState({
    super.key,
    required this.icon,
    required this.title,
    this.message,
    this.action,
  });

  /// Factory for no results/empty lists
  factory EmptyState.noData({String title = 'No Data', String? message}) {
    return EmptyState(
      icon: Icons.inbox_outlined,
      title: title,
      message: message ?? 'No items to display',
    );
  }

  /// Factory for search with no results
  factory EmptyState.noResults({required String searchTerm}) {
    return EmptyState(
      icon: Icons.search_off,
      title: 'No Results Found',
      message: 'No matches for "$searchTerm"',
    );
  }

  /// Factory for errors
  factory EmptyState.error({
    String title = 'Error',
    String? message,
    Widget? action,
  }) {
    return EmptyState(
      icon: Icons.error_outline,
      title: title,
      message: message ?? 'Something went wrong',
      action: action,
    );
  }

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final theme = Theme.of(context);

    return Center(
      child: Padding(
        padding: EdgeInsets.all(spacing.xxxl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: spacing.xxl * 2, // 24 * 2 = 48
              color: theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.5),
            ),
            SizedBox(height: spacing.lg),
            Text(
              title,
              style: theme.textTheme.titleLarge?.copyWith(
                color: theme.colorScheme.onSurface,
                fontWeight: FontWeight.w600,
              ),
              textAlign: TextAlign.center,
            ),
            if (message != null) ...[
              SizedBox(height: spacing.sm),
              Text(
                message!,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),
            ],
            if (action != null) ...[SizedBox(height: spacing.xl), action!],
          ],
        ),
      ),
    );
  }
}
