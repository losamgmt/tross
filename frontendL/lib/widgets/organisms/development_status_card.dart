/// DevelopmentStatusCard - Organism for development environment information
///
/// Follows atomic design: Self-contained status indicator
/// Shows REAL environment data: backend URL, auth mode, API health, coverage
library;

import 'package:flutter/material.dart';
import '../../config/app_spacing.dart';
import '../../config/app_colors.dart';
import '../../services/environment_service.dart';
import '../../utils/helpers/health_helper.dart';
import '../../utils/helpers/string_helper.dart';
import '../molecules/dashboard_card.dart';

class DevelopmentStatusCard extends StatefulWidget {
  final String? authToken;

  const DevelopmentStatusCard({super.key, this.authToken});

  @override
  State<DevelopmentStatusCard> createState() => _DevelopmentStatusCardState();
}

class _DevelopmentStatusCardState extends State<DevelopmentStatusCard> {
  EnvironmentInfo? _envInfo;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadEnvironmentInfo();
  }

  @override
  void didUpdateWidget(DevelopmentStatusCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Reload if auth token changed
    if (oldWidget.authToken != widget.authToken) {
      _loadEnvironmentInfo();
    }
  }

  Future<void> _loadEnvironmentInfo() async {
    if (widget.authToken == null) {
      setState(() {
        _error = 'No auth token available';
        _isLoading = false;
      });
      return;
    }

    try {
      final info = await EnvironmentService.getEnvironmentInfo(
        token: widget.authToken!,
      );

      if (mounted) {
        setState(() {
          _envInfo = info;
          _isLoading = false;
          _error = null;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final spacing = context.spacing;

    return DashboardCard(
      maxWidth: 440, // Squarish, matches other cards/tables
      child: Padding(
        padding: spacing.paddingXL,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Enhanced Header
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: spacing.paddingMD,
                  decoration: BoxDecoration(
                    color: AppColors.infoDark.withValues(alpha: 0.15),
                    borderRadius: spacing.radiusSM,
                  ),
                  child: Icon(
                    Icons.info_outline,
                    color: AppColors.infoDark,
                    size: 24,
                  ),
                ),
                SizedBox(width: spacing.md),
                Flexible(
                  fit: FlexFit.loose,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'Environment Status',
                        style: theme.textTheme.titleLarge?.copyWith(
                          color: AppColors.infoDark,
                          fontWeight: FontWeight.bold,
                          letterSpacing: -0.5,
                        ),
                      ),
                      SizedBox(height: spacing.xxs / 2),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.api, size: 14, color: AppColors.info),
                          SizedBox(width: spacing.xxs),
                          Flexible(
                            child: Text(
                              'Real-time System Configuration',
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: AppColors.textSecondary,
                                fontWeight: FontWeight.w500,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                if (_isLoading)
                  Container(
                    padding: spacing.paddingSM,
                    decoration: BoxDecoration(
                      color: AppColors.info.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(100),
                    ),
                    child: SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: AppColors.infoDark,
                      ),
                    ),
                  ),
              ],
            ),
            SizedBox(height: spacing.lg),

            // Error State
            if (_error != null) ...[
              Text(
                'Unable to load environment data: $_error',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: AppColors.error,
                ),
              ),
            ]
            // Loaded State
            else if (_envInfo != null) ...[
              // Environment Info description
              Container(
                padding: spacing.paddingMD,
                decoration: BoxDecoration(
                  color: AppColors.info.withValues(alpha: 0.08),
                  borderRadius: spacing.radiusSM,
                  border: Border.all(
                    color: AppColors.info.withValues(alpha: 0.2),
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.cloud_done, size: 16, color: AppColors.infoDark),
                    SizedBox(width: spacing.sm),
                    Flexible(
                      fit: FlexFit.loose,
                      child: Text(
                        'Real-time system configuration and API status.',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: AppColors.infoDark,
                          fontWeight: FontWeight.w500,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
              SizedBox(height: spacing.lg),

              // Enhanced Status Details Container
              Container(
                padding: spacing.paddingXL,
                decoration: BoxDecoration(
                  color: AppColors.white,
                  borderRadius: spacing.radiusMD,
                  border: Border.all(color: AppColors.infoLight, width: 1.5),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.info.withValues(alpha: 0.08),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _buildInfoRow(
                      context,
                      'Backend',
                      _envInfo!.backendUrl,
                      Icons.dns,
                    ),
                    _buildInfoRow(
                      context,
                      'Auth Mode',
                      _envInfo!.authMode,
                      Icons.security,
                    ),
                    _buildInfoRow(
                      context,
                      'API Health',
                      StringHelper.toUpperCase(_envInfo!.apiHealth),
                      Icons.favorite,
                      valueColor: HealthHelper.getColorForStatus(
                        _envInfo!.apiHealth,
                      ),
                    ),
                    if (_envInfo!.databaseStatus != null)
                      _buildInfoRow(
                        context,
                        'Database',
                        _envInfo!.databaseStatus!,
                        Icons.storage,
                      ),
                    _buildInfoRow(
                      context,
                      'Endpoints Tested',
                      _envInfo!.coverageDisplay,
                      Icons.check_circle,
                    ),
                    _buildInfoRow(
                      context,
                      'Development Phase',
                      _envInfo!.phase,
                      Icons.build,
                      isLast: true,
                    ),
                  ],
                ),
              ),
            ]
            // Loading State
            else ...[
              Center(
                child: Text(
                  'Loading environment data...',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(
    BuildContext context,
    String label,
    String value,
    IconData icon, {
    Color? valueColor,
    bool isLast = false,
  }) {
    final theme = Theme.of(context);
    final spacing = context.spacing;

    // Enhanced styling for health status
    final isHealthRow = label == 'API Health';
    final healthIcon = isHealthRow
        ? HealthHelper.getIconForStatus(value)
        : null;

    return Container(
      margin: EdgeInsets.only(bottom: isLast ? 0 : spacing.sm),
      padding: spacing.paddingMD,
      decoration: BoxDecoration(
        color: valueColor != null && isHealthRow
            ? valueColor.withValues(alpha: 0.08)
            : AppColors.white,
        borderRadius: spacing.radiusSM,
        border: Border.all(
          color: valueColor != null && isHealthRow
              ? valueColor.withValues(alpha: 0.3)
              : AppColors.grey200,
          width: 1,
        ),
      ),
      child: Row(
        children: [
          // Icon with background
          Container(
            padding: EdgeInsets.all(spacing.xs),
            decoration: BoxDecoration(
              color: (valueColor ?? AppColors.infoDark).withValues(alpha: 0.1),
              borderRadius: spacing.radiusSM,
            ),
            child: Icon(
              icon,
              size: 18,
              color: valueColor ?? AppColors.infoDark,
            ),
          ),
          SizedBox(width: spacing.md),
          // Label
          Text(
            '$label:',
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w600,
              color: AppColors.textSecondary,
              fontSize: 13,
            ),
          ),
          SizedBox(width: spacing.sm),
          // Value with optional health icon
          Flexible(
            child: Row(
              children: [
                if (healthIcon != null) ...[
                  Icon(healthIcon, size: 16, color: valueColor),
                  SizedBox(width: spacing.xs),
                ],
                Flexible(
                  child: Text(
                    value,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: valueColor ?? AppColors.textPrimary,
                      fontFamily: label == 'Backend' ? 'monospace' : null,
                      fontWeight: isHealthRow
                          ? FontWeight.w600
                          : FontWeight.w500,
                      fontSize: 13,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
