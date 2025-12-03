import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/app_colors.dart';
import '../config/app_spacing.dart';
import '../widgets/organisms/app_header.dart';
import '../providers/auth_provider.dart';

/// Dashboard Screen - Main application dashboard
/// Shows key metrics, quick actions, and overview statistics
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String _dateRangeFilter = 'This year to date (01/01/2025 - 10/31/2025)';

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final userName = authProvider.userName.split(' ').first; // Get first name

    return Scaffold(
      appBar: const AppHeader(
        pageTitle: 'Dashboard',
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: EdgeInsets.all(context.spacing.xl),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Welcome Banner
              Container(
                width: double.infinity,
                padding: EdgeInsets.all(context.spacing.xl),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Colors.blue[600]!, Colors.blue[400]!],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: EdgeInsets.all(context.spacing.md),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(
                        Icons.waving_hand,
                        color: Colors.white,
                        size: 32,
                      ),
                    ),
                    SizedBox(width: context.spacing.lg),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Welcome back, $userName!',
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        SizedBox(height: context.spacing.xs),
                        Text(
                          'Here\'s what\'s happening with your maintenance system',
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.white.withOpacity(0.9),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              SizedBox(height: context.spacing.xxl),

              // Quick Actions Section
              Text(
                'Quick Actions',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
              SizedBox(height: context.spacing.lg),
              Row(
                children: [
                  Expanded(
                    child: _buildQuickActionCard(
                      '12',
                      'Work Orders',
                      Icons.description_outlined,
                      Colors.blue[100]!,
                      Colors.blue[600]!,
                    ),
                  ),
                  SizedBox(width: context.spacing.lg),
                  Expanded(
                    child: _buildQuickActionCard(
                      '6',
                      'Pending',
                      Icons.pending_outlined,
                      Colors.orange[100]!,
                      Colors.orange[600]!,
                    ),
                  ),
                  SizedBox(width: context.spacing.lg),
                  Expanded(
                    child: _buildQuickActionCard(
                      '2',
                      'In Progress',
                      Icons.autorenew,
                      Colors.purple[100]!,
                      Colors.purple[600]!,
                    ),
                  ),
                  SizedBox(width: context.spacing.lg),
                  Expanded(
                    child: _buildQuickActionCard(
                      '3',
                      'Completed',
                      Icons.check_circle_outline,
                      Colors.green[100]!,
                      Colors.green[600]!,
                    ),
                  ),
                ],
              ),
              SizedBox(height: context.spacing.xxl),

              // Overview Section
              Text(
                'Overview',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
              SizedBox(height: context.spacing.lg),
              Row(
                children: [
                  Expanded(
                    child: _buildOverviewCard(
                      '0',
                      'Completed Today',
                      Icons.calendar_today,
                      Colors.blue[600]!,
                    ),
                  ),
                  SizedBox(width: context.spacing.lg),
                  Expanded(
                    child: _buildOverviewCard(
                      '0',
                      'Completed This Week',
                      Icons.calendar_today,
                      Colors.green[600]!,
                    ),
                  ),
                  SizedBox(width: context.spacing.lg),
                  Expanded(
                    child: _buildOverviewCard(
                      '0',
                      'Completed This Month',
                      Icons.calendar_month,
                      Colors.purple[600]!,
                    ),
                  ),
                ],
              ),
              SizedBox(height: context.spacing.xxl),

              // Profitability Section
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Profitability',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  // Date Range Filter
                  Container(
                    padding: EdgeInsets.symmetric(
                      horizontal: context.spacing.md,
                      vertical: context.spacing.sm,
                    ),
                    decoration: BoxDecoration(
                      border: Border.all(color: AppColors.border),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.calendar_today,
                          size: 16,
                          color: AppColors.textSecondary,
                        ),
                        SizedBox(width: context.spacing.sm),
                        Text(
                          'Date Range Filter',
                          style: TextStyle(
                            fontSize: 12,
                            color: AppColors.textSecondary,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        SizedBox(width: context.spacing.xs),
                        Icon(
                          Icons.close,
                          size: 16,
                          color: AppColors.textSecondary,
                        ),
                        SizedBox(width: context.spacing.sm),
                        Icon(
                          Icons.arrow_drop_down,
                          size: 20,
                          color: AppColors.textSecondary,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              SizedBox(height: context.spacing.xs),
              Text(
                _dateRangeFilter,
                style: TextStyle(
                  fontSize: 13,
                  color: AppColors.textSecondary,
                ),
              ),
              SizedBox(height: context.spacing.lg),
              Row(
                children: [
                  Expanded(
                    child: _buildProfitabilityCard(
                      'Revenue',
                      '\$0.00',
                      'Company-wide',
                      'Total amount of money generated from sales for the period. Revenue equals total pre-tax invoice amount - total pre-tax adjustment amount.',
                    ),
                  ),
                  SizedBox(width: context.spacing.lg),
                  Expanded(
                    child: _buildProfitabilityCard(
                      'Service Job Margin',
                      '0.00%',
                      'Company-wide',
                      'Percentage of revenue that exceeds a company\'s COGS. Job Margin equals (total revenue - total cost)/total revenue.',
                      isPercentage: true,
                    ),
                  ),
                  SizedBox(width: context.spacing.lg),
                  Expanded(
                    child: _buildProfitabilityCard(
                      'Service Agreement Margin',
                      '0.00%',
                      'Company-wide',
                      'Percentage of revenue that exceeds a company\'s COGS. Service Agreement Margin equals (total revenue - total cost)/total revenue.',
                      isPercentage: true,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Build Quick Action Card
  Widget _buildQuickActionCard(
    String count,
    String label,
    IconData icon,
    Color bgColor,
    Color iconColor,
  ) {
    return Container(
      padding: EdgeInsets.all(context.spacing.lg),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: EdgeInsets.all(context.spacing.md),
            decoration: BoxDecoration(
              color: bgColor,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              icon,
              color: iconColor,
              size: 24,
            ),
          ),
          SizedBox(width: context.spacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  count,
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 13,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          Icon(
            Icons.chevron_right,
            color: AppColors.textSecondary,
          ),
        ],
      ),
    );
  }

  /// Build Overview Card
  Widget _buildOverviewCard(
    String count,
    String label,
    IconData icon,
    Color iconColor,
  ) {
    return Container(
      padding: EdgeInsets.all(context.spacing.lg),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: EdgeInsets.all(context.spacing.md),
            decoration: BoxDecoration(
              color: iconColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              icon,
              color: iconColor,
              size: 24,
            ),
          ),
          SizedBox(width: context.spacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  count,
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 13,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          Icon(
            Icons.chevron_right,
            color: AppColors.textSecondary,
          ),
        ],
      ),
    );
  }

  /// Build Profitability Card
  Widget _buildProfitabilityCard(
    String title,
    String value,
    String subtitle,
    String description, {
    bool isPercentage = false,
  }) {
    return Container(
      padding: EdgeInsets.all(context.spacing.lg),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  SizedBox(height: context.spacing.xs),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 12,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
              IconButton(
                icon: Icon(
                  Icons.more_vert,
                  color: AppColors.textSecondary,
                  size: 20,
                ),
                onPressed: () {},
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
            ],
          ),
          SizedBox(height: context.spacing.lg),
          Text(
            value,
            style: TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.bold,
              color: isPercentage ? Colors.green[600] : AppColors.textPrimary,
            ),
          ),
          SizedBox(height: context.spacing.md),
          Text(
            description,
            style: TextStyle(
              fontSize: 12,
              color: AppColors.textSecondary,
              height: 1.5,
            ),
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}
