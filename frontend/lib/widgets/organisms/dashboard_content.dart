/// Dashboard Content Widget
///
/// The main dashboard view displaying statistics from real backend data.
/// Uses DashboardProvider for real-time data and AppBreakpoints for responsive behavior.
///
/// ARCHITECTURE:
/// - Consumes DashboardProvider for all stats (no hardcoded data)
/// - Uses StatCard molecules for stat display
/// - Responsive grid layout via AppBreakpoints
/// - Loading/error states handled gracefully
///
/// STATS DISPLAYED:
/// - Row 1: Welcome banner (userName from prop)
/// - Row 2: Work Order Stats (total, pending, in_progress, completed)
/// - Row 3: Financial Stats (revenue, outstanding, active contracts)
/// - Row 4: Resource Stats (customers, technicians, low stock, active users)
library;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_colors.dart';
import '../../config/app_spacing.dart';
import '../../providers/dashboard_provider.dart';
import '../molecules/cards/stat_card.dart';

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
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildWelcomeBanner(context),
                const SizedBox(height: 24),
                _buildWorkOrderStats(context, dashboard),
                const SizedBox(height: 24),
                _buildFinancialStats(context, dashboard),
                const SizedBox(height: 24),
                _buildResourceStats(context, dashboard),
                const SizedBox(height: 16),
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

  /// Work order stats row
  Widget _buildWorkOrderStats(
    BuildContext context,
    DashboardProvider dashboard,
  ) {
    final stats = dashboard.workOrderStats;

    return _buildSection(
      context,
      title: 'Work Orders',
      children: [
        StatCard.dashboard(
          label: 'Total',
          value: _formatNumber(stats.total),
          icon: Icons.assignment_outlined,
          color: AppColors.brandPrimary,
        ),
        StatCard.dashboard(
          label: 'Pending',
          value: _formatNumber(stats.pending),
          icon: Icons.hourglass_empty,
          color: AppColors.warning,
        ),
        StatCard.dashboard(
          label: 'In Progress',
          value: _formatNumber(stats.inProgress),
          icon: Icons.autorenew,
          color: AppColors.info,
        ),
        StatCard.dashboard(
          label: 'Completed',
          value: _formatNumber(stats.completed),
          icon: Icons.check_circle_outline,
          color: AppColors.success,
        ),
      ],
    );
  }

  /// Financial stats row
  Widget _buildFinancialStats(
    BuildContext context,
    DashboardProvider dashboard,
  ) {
    final stats = dashboard.financialStats;

    return _buildSection(
      context,
      title: 'Financial Overview',
      children: [
        StatCard.dashboard(
          label: 'Revenue',
          value: _formatCurrency(stats.revenue),
          icon: Icons.attach_money,
          color: AppColors.success,
        ),
        StatCard.dashboard(
          label: 'Outstanding',
          value: _formatCurrency(stats.outstanding),
          icon: Icons.pending_actions,
          color: AppColors.warning,
        ),
        StatCard.dashboard(
          label: 'Active Contracts',
          value: _formatNumber(stats.activeContracts),
          icon: Icons.description_outlined,
          color: AppColors.brandPrimary,
        ),
      ],
    );
  }

  /// Resource stats row
  Widget _buildResourceStats(
    BuildContext context,
    DashboardProvider dashboard,
  ) {
    final stats = dashboard.resourceStats;

    return _buildSection(
      context,
      title: 'Resources',
      children: [
        StatCard.dashboard(
          label: 'Customers',
          value: _formatNumber(stats.customers),
          icon: Icons.people_outline,
          color: AppColors.brandPrimary,
        ),
        StatCard.dashboard(
          label: 'Available Technicians',
          value: _formatNumber(stats.availableTechnicians),
          icon: Icons.engineering_outlined,
          color: AppColors.success,
        ),
        StatCard.dashboard(
          label: 'Low Stock Items',
          value: _formatNumber(stats.lowStockItems),
          icon: Icons.inventory_2_outlined,
          color: stats.lowStockItems > 0
              ? AppColors.warning
              : AppColors.success,
        ),
        StatCard.dashboard(
          label: 'Active Users',
          value: _formatNumber(stats.activeUsers),
          icon: Icons.person_outline,
          color: AppColors.info,
        ),
      ],
    );
  }

  /// Section with title and responsive grid
  Widget _buildSection(
    BuildContext context, {
    required String title,
    required List<Widget> children,
  }) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 12),
        LayoutBuilder(
          builder: (context, constraints) {
            final crossAxisCount = AppBreakpoints.getDashboardColumns(
              constraints.maxWidth,
            );

            return GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: crossAxisCount,
                mainAxisSpacing: 16,
                crossAxisSpacing: 16,
                childAspectRatio: 1.5,
              ),
              itemCount: children.length,
              itemBuilder: (context, index) => children[index],
            );
          },
        ),
      ],
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

  /// Format number with thousand separators
  String _formatNumber(int value) {
    if (value < 1000) return value.toString();
    if (value < 1000000) {
      final thousands = value / 1000;
      return '${thousands.toStringAsFixed(thousands.truncate() == thousands ? 0 : 1)}k';
    }
    final millions = value / 1000000;
    return '${millions.toStringAsFixed(millions.truncate() == millions ? 0 : 1)}M';
  }

  /// Format currency
  String _formatCurrency(double value) {
    if (value >= 1000000) {
      return '\$${(value / 1000000).toStringAsFixed(1)}M';
    }
    if (value >= 1000) {
      return '\$${(value / 1000).toStringAsFixed(1)}k';
    }
    return '\$${value.toStringAsFixed(2)}';
  }

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
