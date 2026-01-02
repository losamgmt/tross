/// DashboardPage - Responsive card grid page template
///
/// SOLE RESPONSIBILITY: Compose cards in a responsive grid layout
///
/// PURE COMPOSITION: Composes Card widgets in responsive grid,
/// implements ZERO business logic.
///
/// Used for:
/// - Admin home dashboard
/// - Overview pages with multiple stat/action cards
/// - Any page needing responsive card grid
///
/// Grid Behavior:
/// - Narrow (<600px): 1 column
/// - Medium (600-900px): 2 columns
/// - Wide (>900px): 3 columns
///
/// USAGE:
/// ```dart
/// DashboardPage(
///   title: 'Admin Dashboard',
///   cards: [
///     DashboardCardConfig(
///       title: 'System Health',
///       icon: Icons.monitor_heart,
///       content: const HealthSummary(),
///       onTap: () => context.go('/admin/system/health'),
///     ),
///     DashboardCardConfig(
///       title: 'Users',
///       icon: Icons.people,
///       subtitle: '42 active',
///       onTap: () => context.go('/admin/users'),
///     ),
///   ],
/// )
/// ```
library;

import 'package:flutter/material.dart';
import '../../config/app_colors.dart';
import '../../config/app_spacing.dart';

/// Configuration for a dashboard card
class DashboardCardConfig {
  /// Card title
  final String title;

  /// Optional subtitle (e.g., count, status)
  final String? subtitle;

  /// Optional icon
  final IconData? icon;

  /// Optional custom content widget
  final Widget? content;

  /// Callback when card is tapped
  final VoidCallback? onTap;

  /// Whether this card is highlighted/featured
  final bool isHighlighted;

  /// Optional badge text (e.g., "New", "3")
  final String? badge;

  /// Card background color (defaults to surface)
  final Color? backgroundColor;

  const DashboardCardConfig({
    required this.title,
    this.subtitle,
    this.icon,
    this.content,
    this.onTap,
    this.isHighlighted = false,
    this.badge,
    this.backgroundColor,
  });
}

/// DashboardPage - Responsive card grid template
///
/// Composes cards in a responsive grid layout.
class DashboardPage extends StatelessWidget {
  /// Page title
  final String title;

  /// Optional page subtitle/description
  final String? subtitle;

  /// Cards to display in the grid
  final List<DashboardCardConfig> cards;

  /// Optional actions for the page header
  final List<Widget>? actions;

  /// Minimum card width for grid calculation
  final double minCardWidth;

  /// Maximum number of columns
  final int maxColumns;

  /// Custom padding around the grid
  final EdgeInsetsGeometry? padding;

  /// Empty state message when no cards
  final String emptyMessage;

  const DashboardPage({
    super.key,
    required this.title,
    this.subtitle,
    required this.cards,
    this.actions,
    this.minCardWidth = 280,
    this.maxColumns = 3,
    this.padding,
    this.emptyMessage = 'No items to display',
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final spacing = context.spacing;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Header
        _buildHeader(context, theme, spacing),

        // Grid or empty state
        Expanded(
          child: cards.isEmpty
              ? _buildEmptyState(context, theme)
              : _buildGrid(context, spacing),
        ),
      ],
    );
  }

  Widget _buildHeader(
    BuildContext context,
    ThemeData theme,
    AppSpacing spacing,
  ) {
    return Padding(
      padding: EdgeInsets.all(spacing.md),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: theme.textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (subtitle != null) ...[
                  SizedBox(height: spacing.xxs),
                  Text(
                    subtitle!,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (actions != null) ...actions!,
        ],
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context, ThemeData theme) {
    final spacing = context.spacing;
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.dashboard_outlined,
            size: spacing.iconSizeXL * 2.5,
            color: theme.colorScheme.outline,
          ),
          SizedBox(height: spacing.lg),
          Text(
            emptyMessage,
            style: theme.textTheme.bodyLarge?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGrid(BuildContext context, AppSpacing spacing) {
    return LayoutBuilder(
      builder: (context, constraints) {
        // Calculate columns based on available width
        final availableWidth = constraints.maxWidth - (spacing.md * 2);
        int columns = (availableWidth / minCardWidth).floor();
        columns = columns.clamp(1, maxColumns);

        return SingleChildScrollView(
          padding: padding ?? EdgeInsets.all(spacing.md),
          child: Wrap(
            spacing: spacing.md,
            runSpacing: spacing.md,
            children: [
              for (final card in cards)
                SizedBox(
                  width: _calculateCardWidth(availableWidth, columns, spacing),
                  child: _DashboardCardWidget(card: card),
                ),
            ],
          ),
        );
      },
    );
  }

  double _calculateCardWidth(
    double availableWidth,
    int columns,
    AppSpacing spacing,
  ) {
    // Account for spacing between cards
    final totalSpacing = spacing.md * (columns - 1);
    return (availableWidth - totalSpacing) / columns;
  }
}

/// Internal card widget
class _DashboardCardWidget extends StatelessWidget {
  final DashboardCardConfig card;

  const _DashboardCardWidget({required this.card});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final spacing = context.spacing;

    return Card(
      elevation: card.isHighlighted ? 4 : 1,
      color: card.backgroundColor ?? theme.colorScheme.surface,
      shape: RoundedRectangleBorder(
        borderRadius: spacing.radiusLG,
        side: card.isHighlighted
            ? BorderSide(color: AppColors.brandPrimary, width: 2)
            : BorderSide.none,
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: card.onTap,
        child: Padding(
          padding: EdgeInsets.all(spacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              // Header row with icon and badge
              Row(
                children: [
                  if (card.icon != null) ...[
                    Container(
                      padding: EdgeInsets.all(spacing.sm),
                      decoration: BoxDecoration(
                        color: AppColors.brandPrimary.withValues(alpha: 0.1),
                        borderRadius: spacing.radiusSM,
                      ),
                      child: Icon(
                        card.icon,
                        size: spacing.iconSizeXL,
                        color: AppColors.brandPrimary,
                      ),
                    ),
                    SizedBox(width: spacing.sm),
                  ],
                  Expanded(
                    child: Text(
                      card.title,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  if (card.badge != null)
                    Container(
                      padding: EdgeInsets.symmetric(
                        horizontal: spacing.sm,
                        vertical: spacing.xxs,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.brandPrimary,
                        borderRadius: spacing.radiusLG,
                      ),
                      child: Text(
                        card.badge!,
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                ],
              ),

              // Subtitle
              if (card.subtitle != null) ...[
                SizedBox(height: spacing.xs),
                Text(
                  card.subtitle!,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],

              // Custom content
              if (card.content != null) ...[
                SizedBox(height: spacing.sm),
                card.content!,
              ],

              // Tap indicator
              if (card.onTap != null) ...[
                SizedBox(height: spacing.sm),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    Icon(
                      Icons.arrow_forward,
                      size: spacing.iconSizeMD,
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
