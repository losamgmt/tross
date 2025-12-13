/// UserProfileCard - Organism for displaying user profile information
///
/// Composes molecules (ErrorCard, UserAvatar) with minimal layout logic
/// Used in settings page and anywhere profile display needed
///
/// **PURE COMPOSITION:** Uses molecules for all complex UI:
/// - ErrorCard for error states
/// - UserAvatar for profile avatar display
library;

import 'package:flutter/material.dart';
import '../../config/app_spacing.dart';
import '../../config/app_colors.dart';
import '../../utils/helpers/string_helper.dart';
import '../molecules/buttons/button_group.dart';
import '../molecules/cards/error_card.dart';
import '../molecules/user_avatar.dart';

class UserProfileCard extends StatelessWidget {
  final Map<String, dynamic>? userProfile;
  final VoidCallback? onRetry;
  final String? error;
  final bool showWelcome;

  const UserProfileCard({
    super.key,
    this.userProfile,
    this.onRetry,
    this.error,
    this.showWelcome = false,
  });

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final theme = Theme.of(context);

    // Error state - delegate to ErrorCard molecule
    if (error != null && error!.isNotEmpty) {
      return ErrorCard(
        title: 'Profile Error',
        message: error!,
        icon: Icons.error_outline,
        iconColor: AppColors.errorLight,
        buttons: onRetry != null
            ? [
                ButtonConfig(
                  label: 'Retry',
                  onPressed: onRetry!,
                  isPrimary: true,
                ),
              ]
            : null,
      );
    }

    // Extract user data
    final firstName = userProfile?['first_name'] ?? '';
    final lastName = userProfile?['last_name'] ?? '';
    final fullName = StringHelper.trim('$firstName $lastName');
    final displayName = fullName.isNotEmpty ? fullName : 'User';
    final email = userProfile?['email'] ?? 'No email';
    final role = userProfile?['role'] ?? 'User';

    return Card(
      elevation: 2,
      child: Padding(
        padding: spacing.paddingXL,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header with avatar and name - uses UserAvatar molecule
            Row(
              children: [
                UserAvatar(
                  name: displayName,
                  email: email,
                  size: spacing.xxl * 2,
                ),
                SizedBox(width: spacing.lg),
                Flexible(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (showWelcome)
                        Text(
                          'Welcome, $displayName!',
                          style: theme.textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        )
                      else
                        Text(
                          displayName,
                          style: theme.textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      SizedBox(height: spacing.xxs),
                      Text(
                        email,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),

            SizedBox(height: spacing.xl),
            const Divider(),
            SizedBox(height: spacing.lg),

            // Profile details
            _buildProfileField(
              context,
              icon: Icons.person,
              label: 'Full Name',
              value: displayName,
            ),
            SizedBox(height: spacing.md),
            _buildProfileField(
              context,
              icon: Icons.email,
              label: 'Email',
              value: email,
            ),
            SizedBox(height: spacing.md),
            _buildProfileField(
              context,
              icon: Icons.badge,
              label: 'Role',
              value: StringHelper.toUpperCase(role),
              valueColor: AppColors.brandPrimary,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileField(
    BuildContext context, {
    required IconData icon,
    required String label,
    required String value,
    Color? valueColor,
  }) {
    final theme = Theme.of(context);
    final spacing = context.spacing;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: spacing.iconSizeMD, color: AppColors.textSecondary),
        SizedBox(width: spacing.md),
        Flexible(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: theme.textTheme.labelSmall?.copyWith(
                  color: AppColors.textSecondary,
                  fontWeight: FontWeight.w500,
                ),
              ),
              SizedBox(height: spacing.xxs),
              Text(
                value,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: valueColor ?? AppColors.textPrimary,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
