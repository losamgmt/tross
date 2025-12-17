/// Dashboard Content Widget
///
/// The main dashboard view displaying statistics, charts, and activity.
/// Uses fl_chart for visualizations.
library;

import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../config/app_colors.dart';
import '../molecules/cards/stat_card.dart';
import 'charts/dashboard_charts.dart';

/// Main dashboard content widget
class DashboardContent extends StatelessWidget {
  const DashboardContent({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Stats are in cards - good
          _buildStatCards(context),
          const SizedBox(height: 24),
          // Charts are in cards - good
          _buildCharts(context),
          const SizedBox(height: 24),
          // Activity is in a card - good
          _buildRecentActivity(context),
        ],
      ),
    );
  }

  // REMOVED: _buildHeader - navbar title is sufficient, no loose text

  Widget _buildStatCards(BuildContext context) {
    final stats = [
      StatCard.dashboard(
        label: 'Total Users',
        value: '1,234',
        icon: Icons.people_outline,
        color: AppColors.brandPrimary,
        trend: '+12%',
        trendUp: true,
      ),
      StatCard.dashboard(
        label: 'Active Sessions',
        value: '856',
        icon: Icons.trending_up,
        color: AppColors.success,
        trend: '+5%',
        trendUp: true,
      ),
      StatCard.dashboard(
        label: 'Pending Tasks',
        value: '28',
        icon: Icons.assignment_outlined,
        color: AppColors.warning,
        trend: '-8%',
        trendUp: false,
      ),
      StatCard.dashboard(
        label: 'Completed',
        value: '94%',
        icon: Icons.check_circle_outline,
        color: AppColors.info,
        trend: '+3%',
        trendUp: true,
      ),
    ];

    return LayoutBuilder(
      builder: (context, constraints) {
        final crossAxisCount = constraints.maxWidth > 1200
            ? 4
            : constraints.maxWidth > 800
            ? 2
            : 1;

        return GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: crossAxisCount,
            mainAxisSpacing: 16,
            crossAxisSpacing: 16,
            childAspectRatio: 1.5,
          ),
          itemCount: stats.length,
          itemBuilder: (context, index) {
            return stats[index];
          },
        );
      },
    );
  }

  Widget _buildCharts(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth > 800;

        if (isWide) {
          return Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(child: _buildLineChart(context)),
              const SizedBox(width: 16),
              Expanded(child: _buildPieChart(context)),
            ],
          );
        }

        return Column(
          children: [
            _buildLineChart(context),
            const SizedBox(height: 16),
            _buildPieChart(context),
          ],
        );
      },
    );
  }

  Widget _buildLineChart(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: TrendLineChart(
          title: 'Activity Over Time',
          xLabels: const ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          series: [
            LineChartSeries(
              label: 'This Week',
              color: AppColors.brandPrimary,
              data: const [
                FlSpot(0, 30),
                FlSpot(1, 45),
                FlSpot(2, 38),
                FlSpot(3, 65),
                FlSpot(4, 55),
                FlSpot(5, 40),
                FlSpot(6, 50),
              ],
            ),
            LineChartSeries(
              label: 'Last Week',
              color: AppColors.info,
              data: const [
                FlSpot(0, 20),
                FlSpot(1, 35),
                FlSpot(2, 42),
                FlSpot(3, 50),
                FlSpot(4, 45),
                FlSpot(5, 35),
                FlSpot(6, 40),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPieChart(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: DistributionPieChart(
          title: 'User Distribution',
          items: [
            PieChartItem(
              label: 'Admin',
              value: 15,
              color: AppColors.brandPrimary,
            ),
            PieChartItem(
              label: 'Manager',
              value: 25,
              color: AppColors.brandSecondary,
            ),
            PieChartItem(label: 'User', value: 45, color: AppColors.info),
            PieChartItem(label: 'Guest', value: 15, color: AppColors.success),
          ],
        ),
      ),
    );
  }

  Widget _buildRecentActivity(BuildContext context) {
    final theme = Theme.of(context);

    final activities = [
      _ActivityItem(
        icon: Icons.person_add,
        title: 'New user registered',
        subtitle: 'John Doe joined the platform',
        time: '2 min ago',
        color: AppColors.success,
      ),
      _ActivityItem(
        icon: Icons.edit,
        title: 'Profile updated',
        subtitle: 'Jane Smith updated their profile',
        time: '15 min ago',
        color: AppColors.info,
      ),
      _ActivityItem(
        icon: Icons.security,
        title: 'Role changed',
        subtitle: 'Mike Johnson promoted to Manager',
        time: '1 hour ago',
        color: AppColors.warning,
      ),
      _ActivityItem(
        icon: Icons.login,
        title: 'New session',
        subtitle: 'Sarah Williams logged in',
        time: '2 hours ago',
        color: AppColors.brandPrimary,
      ),
    ];

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Recent Activity', style: theme.textTheme.titleMedium),
                TextButton(onPressed: () {}, child: const Text('View All')),
              ],
            ),
            const SizedBox(height: 8),
            const Divider(),
            ...activities.map((activity) {
              return _buildActivityTile(context, activity);
            }),
          ],
        ),
      ),
    );
  }

  Widget _buildActivityTile(BuildContext context, _ActivityItem activity) {
    final theme = Theme.of(context);

    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: activity.color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(activity.icon, color: activity.color, size: 20),
      ),
      title: Text(activity.title),
      subtitle: Text(
        activity.subtitle,
        style: theme.textTheme.bodySmall?.copyWith(
          color: theme.colorScheme.onSurfaceVariant,
        ),
      ),
      trailing: Text(
        activity.time,
        style: theme.textTheme.labelSmall?.copyWith(
          color: theme.colorScheme.onSurfaceVariant,
        ),
      ),
    );
  }
}

/// Activity item model
class _ActivityItem {
  final IconData icon;
  final String title;
  final String subtitle;
  final String time;
  final Color color;

  const _ActivityItem({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.time,
    required this.color,
  });
}
