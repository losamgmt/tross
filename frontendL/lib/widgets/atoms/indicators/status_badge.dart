/// StatusBadge - Atom component for displaying status/role badges
///
/// Reusable badge component with color coding and semantic meaning
/// Used for: user roles, statuses, tags, categories
///
/// Material 3 Design with TrossApp branding
library;

import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';
import '../../../config/app_colors.dart';

enum BadgeStyle {
  admin,
  technician,
  manager,
  dispatcher,
  client,
  success,
  warning,
  error,
  info,
  neutral,
}

class StatusBadge extends StatelessWidget {
  final String label;
  final BadgeStyle style;
  final IconData? icon;
  final bool compact;

  const StatusBadge({
    super.key,
    required this.label,
    this.style = BadgeStyle.neutral,
    this.icon,
    this.compact = false,
  });

  // ✅ REMOVED: StatusBadge.role() factory - domain-specific logic
  // Routes/configs should map role → BadgeStyle + icon as DATA
  // Example usage in route config:
  //   final roleBadgeConfig = {
  //     'admin': (BadgeStyle.admin, Icons.admin_panel_settings),
  //     'technician': (BadgeStyle.technician, Icons.build),
  //   };
  //   StatusBadge(
  //     label: user.role,
  //     style: roleBadgeConfig[user.role].$1,
  //     icon: roleBadgeConfig[user.role].$2,
  //   )

  @override
  Widget build(BuildContext context) {
    final colors = _getColors(context);
    final spacing = context.spacing;
    final theme = Theme.of(context);

    final padding = compact
        ? EdgeInsets.symmetric(horizontal: spacing.sm, vertical: spacing.xxs)
        : EdgeInsets.symmetric(horizontal: spacing.md, vertical: spacing.xs);

    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: colors.background,
        borderRadius: compact ? spacing.radiusSM : spacing.radiusMD,
        border: Border.all(color: colors.border, width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(
              icon,
              size: compact ? spacing.iconSizeXS : spacing.iconSizeSM,
              color: colors.text,
            ),
            SizedBox(width: compact ? spacing.xxs : spacing.xs),
          ],
          Flexible(
            child: Text(
              label,
              overflow: TextOverflow.ellipsis,
              maxLines: 1,
              style:
                  (compact
                          ? theme.textTheme.labelSmall
                          : theme.textTheme.labelMedium)
                      ?.copyWith(
                        fontWeight: FontWeight.w600,
                        color: colors.text,
                        letterSpacing: 0.3,
                      ),
            ),
          ),
        ],
      ),
    );
  }

  _BadgeColors _getColors(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    switch (style) {
      case BadgeStyle.admin:
        return _BadgeColors(
          background: AppColors.withOpacity(AppColors.roleAdmin, 0.15),
          border: AppColors.roleAdmin,
          text: isDark ? AppColors.brandSecondary : AppColors.roleAdminDark,
        );
      case BadgeStyle.technician:
        return _BadgeColors(
          background: AppColors.withOpacity(AppColors.roleTechnician, 0.15),
          border: AppColors.roleTechnician,
          text: AppColors.roleTechnicianDark,
        );
      case BadgeStyle.manager:
        return _BadgeColors(
          background: AppColors.withOpacity(AppColors.roleManager, 0.15),
          border: AppColors.roleManager,
          text: AppColors.roleManagerDark,
        );
      case BadgeStyle.dispatcher:
        return _BadgeColors(
          background: AppColors.withOpacity(AppColors.warning, 0.1),
          border: AppColors.warning,
          text: AppColors.warningDark,
        );
      case BadgeStyle.client:
        return _BadgeColors(
          background: AppColors.withOpacity(AppColors.success, 0.1),
          border: AppColors.success,
          text: AppColors.successDark,
        );
      case BadgeStyle.success:
        return _BadgeColors(
          background: AppColors.withOpacity(AppColors.success, 0.1),
          border: AppColors.success,
          text: AppColors.successDark,
        );
      case BadgeStyle.warning:
        return _BadgeColors(
          background: AppColors.withOpacity(AppColors.warning, 0.1),
          border: AppColors.warning,
          text: AppColors.warningDark,
        );
      case BadgeStyle.error:
        return _BadgeColors(
          background: AppColors.withOpacity(AppColors.error, 0.1),
          border: AppColors.error,
          text: AppColors.errorDark,
        );
      case BadgeStyle.info:
        return _BadgeColors(
          background: AppColors.withOpacity(AppColors.info, 0.1),
          border: AppColors.info,
          text: AppColors.infoDark,
        );
      case BadgeStyle.neutral:
        return _BadgeColors(
          background: AppColors.grey100,
          border: AppColors.grey400,
          text: AppColors.grey800,
        );
    }
  }
}

class _BadgeColors {
  final Color background;
  final Color border;
  final Color text;

  _BadgeColors({
    required this.background,
    required this.border,
    required this.text,
  });
}
