/// AuthTestPanel - Organism for authentication testing interface
///
/// Follows atomic design: Uses atoms/molecules for composition
/// Displays test controls and results for development auth testing
/// Fixed-height layout prevents page expansion/flashing
library;

import 'package:flutter/material.dart';
import '../../config/app_spacing.dart';
import '../../config/app_colors.dart';
import '../molecules/dashboard_card.dart';

class AuthTestPanel extends StatelessWidget {
  final VoidCallback? onRunTests;
  final List<String> testResults;
  final bool isLoading;

  const AuthTestPanel({
    super.key,
    this.onRunTests,
    this.testResults = const [],
    this.isLoading = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final spacing = context.spacing;

    return DashboardCard(
      maxWidth: 440,
      child: Padding(
        padding: spacing.paddingXL,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                Container(
                  padding: spacing.paddingMD,
                  decoration: BoxDecoration(
                    color: AppColors.brandPrimary.withValues(alpha: 0.1),
                    borderRadius: spacing.radiusSM,
                  ),
                  child: Icon(
                    Icons.security,
                    color: AppColors.brandPrimary,
                    size: 28,
                  ),
                ),
                SizedBox(width: spacing.lg),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Authentication Testing',
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                        letterSpacing: -0.5,
                      ),
                    ),
                    SizedBox(height: spacing.xxs),
                    Row(
                      children: [
                        Icon(
                          Icons.verified_user,
                          size: 14,
                          color: AppColors.brandSecondary,
                        ),
                        SizedBox(width: spacing.xxs),
                        Text(
                          'Security & Role Validation',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: AppColors.textSecondary,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
            SizedBox(height: spacing.xl),

            // Description
            Container(
              padding: spacing.paddingLG,
              decoration: BoxDecoration(
                color: AppColors.grey50,
                borderRadius: spacing.radiusSM,
                border: Border.all(
                  color: AppColors.brandPrimary.withValues(alpha: 0.2),
                  width: 1,
                ),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    Icons.info_outline,
                    size: 20,
                    color: AppColors.brandPrimary,
                  ),
                  SizedBox(width: spacing.md),
                  Flexible(
                    child: Text(
                      'Validates authentication system and role-based access control. Tests: system health, token auth, user profile retrieval, and admin permissions.',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: AppColors.textSecondary,
                        height: 1.5,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            SizedBox(height: spacing.xl),

            // Run Tests Button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: isLoading ? null : onRunTests,
                icon: isLoading
                    ? SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(Icons.play_arrow, size: 22),
                label: Text(
                  isLoading ? 'Running Tests...' : 'Run Authentication Tests',
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 15,
                    letterSpacing: 0.3,
                  ),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: isLoading
                      ? AppColors.grey400
                      : AppColors.brandPrimary,
                  foregroundColor: Colors.white,
                  padding: EdgeInsets.symmetric(
                    horizontal: spacing.xl,
                    vertical: spacing.lg,
                  ),
                  elevation: isLoading ? 0 : 2,
                  shadowColor: AppColors.brandPrimary.withValues(alpha: 0.3),
                  shape: RoundedRectangleBorder(borderRadius: spacing.radiusMD),
                ),
              ),
            ),

            // Test Results
            if (testResults.isNotEmpty) ...[
              SizedBox(height: spacing.xxl),
              const Divider(thickness: 1),
              SizedBox(height: spacing.lg),

              Row(
                children: [
                  Icon(
                    Icons.assignment_turned_in,
                    size: 20,
                    color: AppColors.brandPrimary,
                  ),
                  SizedBox(width: spacing.sm),
                  Text(
                    'Test Results',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  SizedBox(width: spacing.sm),
                  Container(
                    padding: EdgeInsets.symmetric(
                      horizontal: spacing.sm,
                      vertical: spacing.xxs / 2,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.brandSecondary.withValues(alpha: 0.15),
                      borderRadius: spacing.radiusSM,
                    ),
                    child: Text(
                      '${testResults.length} tests',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: AppColors.brandSecondaryDark,
                        fontWeight: FontWeight.w600,
                        fontSize: 11,
                      ),
                    ),
                  ),
                ],
              ),
              SizedBox(height: spacing.md),

              Container(
                padding: spacing.paddingLG,
                decoration: BoxDecoration(
                  color: AppColors.grey50,
                  borderRadius: spacing.radiusMD,
                  border: Border.all(color: AppColors.grey300, width: 1.5),
                ),
                child: ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: testResults.length,
                  separatorBuilder: (context, index) =>
                      SizedBox(height: spacing.xs),
                  itemBuilder: (context, index) {
                    final result = testResults[index];
                    final isSuccess = result.startsWith('✅');
                    final isError = result.startsWith('❌');
                    final isInfo = result.startsWith('ℹ️');

                    return Container(
                      padding: EdgeInsets.symmetric(
                        horizontal: spacing.md,
                        vertical: spacing.sm,
                      ),
                      decoration: BoxDecoration(
                        color: isSuccess
                            ? AppColors.success.withValues(alpha: 0.08)
                            : isError
                            ? AppColors.error.withValues(alpha: 0.08)
                            : isInfo
                            ? AppColors.info.withValues(alpha: 0.08)
                            : Colors.white,
                        borderRadius: spacing.radiusSM,
                        border: Border.all(
                          color: isSuccess
                              ? AppColors.success.withValues(alpha: 0.3)
                              : isError
                              ? AppColors.error.withValues(alpha: 0.3)
                              : isInfo
                              ? AppColors.info.withValues(alpha: 0.3)
                              : AppColors.grey200,
                          width: 1,
                        ),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(
                            isSuccess
                                ? Icons.check_circle
                                : isError
                                ? Icons.error
                                : isInfo
                                ? Icons.info
                                : Icons.circle_outlined,
                            size: 16,
                            color: isSuccess
                                ? AppColors.success
                                : isError
                                ? AppColors.error
                                : isInfo
                                ? AppColors.info
                                : AppColors.grey500,
                          ),
                          SizedBox(width: spacing.sm),
                          Flexible(
                            child: Text(
                              result.replaceAll(RegExp(r'^[✅❌ℹ️]\s*'), ''),
                              style: theme.textTheme.bodySmall?.copyWith(
                                fontFamily: 'monospace',
                                color: isSuccess
                                    ? AppColors.successDark
                                    : isError
                                    ? AppColors.errorDark
                                    : isInfo
                                    ? AppColors.infoDark
                                    : AppColors.textPrimary,
                                fontWeight: FontWeight.w500,
                                height: 1.4,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
