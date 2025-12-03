// Auth Status Indicator - Shows loading and error states
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../config/constants.dart';
import '../../config/app_spacing.dart';

class AuthStatusIndicator extends StatelessWidget {
  const AuthStatusIndicator({super.key});

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final theme = Theme.of(context);

    return Consumer<AuthProvider>(
      builder: (context, authProvider, child) {
        if (authProvider.isLoading) {
          return Column(
            children: [
              const CircularProgressIndicator(),
              SizedBox(height: spacing.lg),
              Text(
                AppConstants.authenticating,
                style: theme.textTheme.titleMedium,
              ),
            ],
          );
        }

        if (authProvider.error != null) {
          return Container(
            margin: EdgeInsets.only(bottom: spacing.lg),
            padding: spacing.paddingLG,
            decoration: BoxDecoration(
              color: theme.colorScheme.errorContainer,
              borderRadius: spacing.radiusMD,
            ),
            child: Row(
              children: [
                Icon(Icons.error_outline, color: theme.colorScheme.error),
                SizedBox(width: spacing.md),
                Expanded(
                  child: Text(
                    authProvider.error!,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.error,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
          );
        }

        return const SizedBox.shrink();
      },
    );
  }
}
