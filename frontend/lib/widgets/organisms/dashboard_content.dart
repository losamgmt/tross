/// Dashboard Content Widget - Chart-Driven
///
/// The main dashboard view displaying distribution charts from real backend data.
/// Uses DashboardProvider for real-time data and dashboard-config.json for layout.
///
/// ARCHITECTURE:
/// - dashboard-config.json specifies which entities to show and chart type (bar/pie)
/// - EntityMetadataRegistry provides display names, icons, and value colors
/// - DashboardProvider provides countGrouped() data per entity
/// - Renders ComparisonBarChart or DistributionPieChart based on config
///
/// ZERO SPECIFICITY:
/// - No entity names mentioned in code
/// - No role branching
/// - All behavior emergent from config + metadata
library;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_colors.dart';
import '../../models/dashboard_config.dart';
import '../../providers/dashboard_provider.dart';
import '../../services/entity_metadata.dart';
import '../../utils/entity_icon_resolver.dart';
import '../../utils/helpers/string_helper.dart';
import '../atoms/indicators/app_badge.dart';
import '../atoms/indicators/loading_indicator.dart';
import '../molecules/containers/scrollable_content.dart';
import 'charts/dashboard_charts.dart';

/// Main dashboard content widget
class DashboardContent extends StatelessWidget {
  /// User's display name for welcome banner
  final String userName;

  const DashboardContent({super.key, required this.userName});

  @override
  Widget build(BuildContext context) {
    return Consumer<DashboardProvider>(
      builder: (context, dashboard, _) {
        if (dashboard.isLoading && !dashboard.isLoaded) {
          return const Center(child: CircularProgressIndicator());
        }

        return RefreshIndicator(
          onRefresh: dashboard.refresh,
          child: ScrollableContent(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildWelcomeBanner(context),
                const SizedBox(height: 24),
                // Config-driven entity charts - no hardcoded names!
                ...dashboard.getVisibleEntities().map(
                  (entityConfig) => Padding(
                    padding: const EdgeInsets.only(bottom: 24),
                    child: _buildEntityChart(context, entityConfig, dashboard),
                  ),
                ),
                if (dashboard.error != null)
                  _buildErrorBanner(context, dashboard.error!),
                if (dashboard.lastUpdated != null)
                  _buildLastUpdated(context, dashboard.lastUpdated!),
              ],
            ),
          ),
        );
      },
    );
  }

  /// Welcome banner with user name
  Widget _buildWelcomeBanner(BuildContext context) {
    final displayName = userName.split(' ').first;
    final theme = Theme.of(context);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.brandPrimary,
            AppColors.brandPrimary.withValues(alpha: 0.8),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(Icons.waving_hand, color: Colors.white, size: 32),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Welcome back, $displayName!',
                  style: theme.textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  "Here's what's happening with your maintenance system",
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: Colors.white.withValues(alpha: 0.9),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Build a chart for an entity - FULLY GENERIC
  Widget _buildEntityChart(
    BuildContext context,
    DashboardEntityConfig entityConfig,
    DashboardProvider dashboard,
  ) {
    final theme = Theme.of(context);

    // Get display info from metadata registry (static method)
    final metadata = EntityMetadataRegistry.tryGet(entityConfig.entity);
    final displayName =
        metadata?.displayNamePlural ??
        StringHelper.snakeToTitle(entityConfig.entity);
    final icon = metadata?.icon != null
        ? EntityIconResolver.fromString(metadata!.icon!)
        : Icons.bar_chart_outlined;

    // Check if this entity is still loading
    final isEntityLoading = dashboard.isEntityLoading(entityConfig.entity);

    // Get chart data from provider
    final chartData = dashboard.getChartData(entityConfig.entity);
    final totalCount = dashboard.getTotalCount(entityConfig.entity);

    // Convert to chart items with metadata-driven colors
    // EntityMetadataRegistry provides the color name, BadgeStyle converts to Color
    final groupByField = entityConfig.groupBy;
    final chartItems = chartData.map((item) {
      final colorName = EntityMetadataRegistry.getValueColor(
        entityConfig.entity,
        groupByField,
        item.value,
      );
      return _ChartItemData(
        label: StringHelper.snakeToTitle(item.value),
        value: item.count.toDouble(),
        color: BadgeStyle.fromName(colorName).color,
      );
    }).toList();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header with icon and title
            Row(
              children: [
                Icon(icon, color: theme.colorScheme.primary, size: 24),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    displayName,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                // Total count badge (or loading indicator)
                if (isEntityLoading)
                  SizedBox(
                    width: 80,
                    height: 24,
                    child: SkeletonLoader(width: 80, height: 24),
                  )
                else
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primaryContainer,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Text(
                      'Total: $totalCount',
                      style: theme.textTheme.labelMedium?.copyWith(
                        color: theme.colorScheme.onPrimaryContainer,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 16),
            // Chart content: loading skeleton, empty state, or chart
            if (isEntityLoading)
              _buildChartSkeleton()
            else if (chartItems.isEmpty)
              _buildEmptyState(context, displayName)
            else
              _buildChart(entityConfig.chartType, chartItems),
          ],
        ),
      ),
    );
  }

  /// Build the appropriate chart type from config
  Widget _buildChart(DashboardChartType chartType, List<_ChartItemData> items) {
    switch (chartType) {
      case DashboardChartType.pie:
        return DistributionPieChart(
          title: '', // Title already shown in header
          items: items
              .map(
                (i) => PieChartItem(
                  label: i.label,
                  value: i.value,
                  color: i.color,
                ),
              )
              .toList(),
        );
      case DashboardChartType.bar:
        return ComparisonBarChart(
          title: '', // Title already shown in header
          items: items
              .map(
                (i) => BarChartItem(
                  label: i.label,
                  value: i.value,
                  color: i.color,
                ),
              )
              .toList(),
        );
    }
  }

  /// Loading skeleton composed from generic SkeletonLoader atoms
  Widget _buildChartSkeleton() {
    return SizedBox(
      height: 200,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          // Simulate bar chart loading with varying height skeletons
          for (final height in [120.0, 80.0, 160.0, 100.0, 140.0])
            SkeletonLoader(width: 40, height: height),
        ],
      ),
    );
  }

  /// Empty state when no data
  Widget _buildEmptyState(BuildContext context, String entityName) {
    final theme = Theme.of(context);
    return Container(
      height: 200,
      alignment: Alignment.center,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.inbox_outlined,
            size: 48,
            color: theme.colorScheme.outline,
          ),
          const SizedBox(height: 8),
          Text(
            'No $entityName data available',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.outline,
            ),
          ),
        ],
      ),
    );
  }

  /// Error banner
  Widget _buildErrorBanner(BuildContext context, String error) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      margin: const EdgeInsets.only(top: 8),
      decoration: BoxDecoration(
        color: AppColors.error.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Icon(Icons.error_outline, color: AppColors.error, size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Text(error, style: TextStyle(color: AppColors.error)),
          ),
        ],
      ),
    );
  }

  /// Last updated timestamp
  Widget _buildLastUpdated(BuildContext context, DateTime lastUpdated) {
    final theme = Theme.of(context);
    final formatted = _formatDateTime(lastUpdated);

    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.sync,
            size: 14,
            color: theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.5),
          ),
          const SizedBox(width: 4),
          Text(
            'Updated $formatted',
            style: theme.textTheme.labelSmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.5),
            ),
          ),
        ],
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FORMATTERS
  // ═══════════════════════════════════════════════════════════════════════════

  /// Format date time
  String _formatDateTime(DateTime dt) {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    final month = months[dt.month - 1];
    final hour = dt.hour > 12 ? dt.hour - 12 : (dt.hour == 0 ? 12 : dt.hour);
    final period = dt.hour >= 12 ? 'PM' : 'AM';
    return '$month ${dt.day}, $hour:${dt.minute.toString().padLeft(2, '0')} $period';
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// PRIVATE DATA CLASSES
// ═════════════════════════════════════════════════════════════════════════════

/// Internal chart item data - unifies bar/pie chart data
class _ChartItemData {
  final String label;
  final double value;
  final Color color;

  const _ChartItemData({
    required this.label,
    required this.value,
    required this.color,
  });
}
