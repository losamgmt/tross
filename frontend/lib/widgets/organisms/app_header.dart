/// AppHeader - Organism for main application navigation bar
///
/// Shared header across all authenticated pages
/// Composes: AppButton (for logo), UserAvatar, UserInfoHeader (molecules)
///
/// **PROP-DRIVEN WITH OPTIONAL PROVIDER FALLBACK:**
/// - If userName/userEmail/user provided: uses props (pure, testable)
/// - If not provided: falls back to AuthProvider context (convenient)
///
/// GENERIC: Menu items are fully configurable via menuItems parameter.
library;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_spacing.dart';
import '../../config/app_colors.dart';
import '../../config/constants.dart';
import '../../providers/auth_provider.dart';
import '../../services/auth/auth_profile_service.dart';
import '../atoms/buttons/app_button.dart';
import '../molecules/user_avatar.dart';
import '../molecules/user_info_header.dart';
import '../../core/routing/app_routes.dart';

/// Menu item configuration for AppHeader
class AppHeaderMenuItem {
  final String id;
  final String label;
  final IconData icon;
  final String? route;
  final bool Function(Map<String, dynamic>? user)? visibleWhen;
  final Future<void> Function(BuildContext context, AuthProvider auth)? onTap;

  const AppHeaderMenuItem({
    required this.id,
    required this.label,
    required this.icon,
    this.route,
    this.visibleWhen,
    this.onTap,
  });

  /// Standard settings menu item
  static const settings = AppHeaderMenuItem(
    id: 'settings',
    label: 'Settings',
    icon: Icons.settings,
    route: AppRoutes.settings,
  );

  /// Standard admin menu item (visible to admins only)
  static final admin = AppHeaderMenuItem(
    id: 'admin',
    label: 'Admin Dashboard',
    icon: Icons.admin_panel_settings,
    route: AppRoutes.admin,
    visibleWhen: (user) => AuthProfileService.isAdmin(user),
  );

  /// Standard logout menu item
  static const logout = AppHeaderMenuItem(
    id: 'logout',
    label: AppConstants.logoutButton,
    icon: Icons.logout,
  );

  /// Default menu items for standard app
  static List<AppHeaderMenuItem> get defaultItems => [settings, admin, logout];
}

class AppHeader extends StatelessWidget implements PreferredSizeWidget {
  final String pageTitle;
  final List<AppHeaderMenuItem>? menuItems;
  final VoidCallback? onLogoPressed;

  // Optional prop-driven user data (falls back to AuthProvider if not provided)
  final String? userName;
  final String? userEmail;
  final String? userRole;
  final Map<String, dynamic>? user;

  // Optional prop-driven callbacks (falls back to defaults if not provided)
  final void Function(String route)? onNavigate;
  final Future<void> Function()? onLogout;

  const AppHeader({
    super.key,
    required this.pageTitle,
    this.menuItems,
    this.onLogoPressed,
    this.userName,
    this.userEmail,
    this.userRole,
    this.user,
    this.onNavigate,
    this.onLogout,
  });

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  List<AppHeaderMenuItem> get _effectiveMenuItems =>
      menuItems ?? AppHeaderMenuItem.defaultItems;

  @override
  Widget build(BuildContext context) {
    // Use props if provided, otherwise fall back to AuthProvider
    final authProvider = Provider.of<AuthProvider>(context);
    final effectiveUserName = userName ?? authProvider.userName;
    final effectiveUserEmail = userEmail ?? authProvider.userEmail;
    final effectiveUserRole = userRole ?? authProvider.userRole;
    final effectiveUser = user ?? authProvider.user;

    final theme = Theme.of(context);
    final spacing = context.spacing;

    void navigateTo(String route) {
      if (onNavigate != null) {
        onNavigate!(route);
      } else {
        Navigator.of(context).pushNamed(route);
      }
    }

    return AppBar(
      backgroundColor: AppColors.brandPrimary,
      foregroundColor: AppColors.white,
      elevation: 2,
      leading: AppButton(
        icon: Icons.home,
        label: 'Tross',
        tooltip: 'Home',
        style: AppButtonStyle.ghost,
        onPressed: onLogoPressed ?? () => navigateTo('/'),
      ),
      leadingWidth: 120,
      title: Text(
        pageTitle,
        style: theme.textTheme.titleMedium?.copyWith(
          color: Colors.white,
          fontWeight: FontWeight.w500,
        ),
      ),
      centerTitle: true,
      actions: [
        // User menu with circular hover effect
        Padding(
          padding: EdgeInsets.only(right: spacing.sm),
          child: PopupMenuButton<String>(
            offset: Offset(0, spacing.xxl * 1.75),
            tooltip: 'User Menu',
            icon: UserAvatar(
              name: effectiveUserName,
              email: effectiveUserEmail,
            ),
            itemBuilder: (context) => _buildMenuItems(
              context,
              effectiveUserName: effectiveUserName,
              effectiveUserEmail: effectiveUserEmail,
              effectiveUserRole: effectiveUserRole,
              user: effectiveUser,
            ),
            onSelected: (value) => _handleMenuSelection(
              context,
              value,
              authProvider: authProvider,
              navigateTo: navigateTo,
              user: effectiveUser,
            ),
          ),
        ),
      ],
    );
  }

  List<PopupMenuEntry<String>> _buildMenuItems(
    BuildContext context, {
    required String effectiveUserName,
    required String effectiveUserEmail,
    required String effectiveUserRole,
    required Map<String, dynamic>? user,
  }) {
    final items = <PopupMenuEntry<String>>[];

    // Profile header (always first)
    items.add(
      PopupMenuItem<String>(
        value: AppConstants.menuProfile,
        padding: EdgeInsets.zero,
        child: UserInfoHeader(
          userName: effectiveUserName,
          userEmail: effectiveUserEmail,
          userRole: effectiveUserRole,
        ),
      ),
    );
    items.add(const PopupMenuDivider());

    // Build menu items from config
    bool needsDividerBeforeLogout = false;
    for (final menuItem in _effectiveMenuItems) {
      // Check visibility
      if (menuItem.visibleWhen != null && !menuItem.visibleWhen!(user)) {
        continue;
      }

      // Add divider before logout
      if (menuItem.id == 'logout' && needsDividerBeforeLogout) {
        items.add(const PopupMenuDivider());
      }

      items.add(
        PopupMenuItem<String>(
          value: menuItem.id,
          child: ListTile(
            leading: Icon(menuItem.icon, size: 20),
            title: Text(menuItem.label),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: AppSpacingConst.md,
            ),
            dense: true,
          ),
        ),
      );

      if (menuItem.id != 'logout') {
        needsDividerBeforeLogout = true;
      }
    }

    return items;
  }

  void _handleMenuSelection(
    BuildContext context,
    String value, {
    required AuthProvider authProvider,
    required void Function(String route) navigateTo,
    required Map<String, dynamic>? user,
  }) async {
    // Handle profile click
    if (value == AppConstants.menuProfile) {
      navigateTo(AppRoutes.settings);
      return;
    }

    // Find the menu item
    final menuItem = _effectiveMenuItems.firstWhere(
      (item) => item.id == value,
      orElse: () => AppHeaderMenuItem.settings,
    );

    // Custom handler
    if (menuItem.onTap != null) {
      await menuItem.onTap!(context, authProvider);
      return;
    }

    // Handle logout specially
    if (value == 'logout') {
      if (onLogout != null) {
        await onLogout!();
      } else {
        await authProvider.logout();
      }
      await Future.delayed(const Duration(milliseconds: 2));
      if (context.mounted) {
        Navigator.of(
          context,
        ).pushNamedAndRemoveUntil(AppRoutes.login, (route) => false);
      }
      return;
    }

    // Navigate to route
    if (menuItem.route != null && context.mounted) {
      navigateTo(menuItem.route!);
    }
  }
}
