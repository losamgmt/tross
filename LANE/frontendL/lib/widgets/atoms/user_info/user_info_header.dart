/// UserInfoHeader - Atom for displaying user information
///
/// Shows user name, email, and role badge
library;

import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';
import '../../../config/app_colors.dart';
import '../../../utils/helpers/string_helper.dart';

class UserInfoHeader extends StatelessWidget {
  final String userName;
  final String userEmail;
  final String userRole;
  final VoidCallback? onTap;

  const UserInfoHeader({
    super.key,
    required this.userName,
    required this.userEmail,
    required this.userRole,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final theme = Theme.of(context);

    final content = Padding(
      padding: spacing.paddingLG,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            userName,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          SizedBox(height: spacing.xxs),
          Text(
            userEmail,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppColors.textPrimary,
            ),
            overflow: TextOverflow.ellipsis,
          ),
          SizedBox(height: spacing.sm),
          Container(
            padding: EdgeInsets.symmetric(
              horizontal: spacing.sm,
              vertical: spacing.xxs,
            ),
            decoration: BoxDecoration(
              color: AppColors.withOpacity(AppColors.brandPrimary, 0.15),
              borderRadius: spacing.radiusXS,
            ),
            child: Text(
              StringHelper.toUpperCase(userRole),
              style: theme.textTheme.labelSmall?.copyWith(
                fontWeight: FontWeight.bold,
                color: AppColors.brandPrimary,
              ),
            ),
          ),
        ],
      ),
    );

    if (onTap != null) {
      return InkWell(onTap: onTap, child: content);
    }

    return content;
  }
}
