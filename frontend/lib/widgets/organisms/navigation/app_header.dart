/// AppHeader - Organism for main application navigation bar
///
/// Shared header across all authenticated pages
/// Composes: AppButton (for logo), InitialsAvatar, UserInfoHeader (molecules)
///
/// **FULLY PROP-DRIVEN:**
/// - userName, userEmail are required props
/// - onNavigate, onLogout callbacks for navigation/auth actions
/// - No Provider access - pure, testable component
///
/// **UNIFIED MENU SYSTEM:** Uses NavMenuItem + AdaptiveNavMenu
/// - Desktop/Tablet: Popup menu dropdown
/// - Mobile: Modal bottom sheet
library;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../config/app_spacing.dart';
import '../../../config/app_colors.dart';
import '../../../config/constants.dart';
import '../../../services/auth/auth_profile_service.dart';
import '../../atoms/buttons/app_button.dart';
import '../../molecules/display/initials_avatar.dart';
import '../../molecules/display/user_info_header.dart';
import '../../molecules/menus/adaptive_nav_menu.dart';
import '../../../core/routing/app_routes.dart';
import 'nav_menu_item.dart';

/// Helper class for default app header menu items
///
/// Provides factory methods for common menu items using NavMenuItem.
class AppHeaderMenuItems {
  AppHeaderMenuItems._();

  /// Standard settings menu item
  static NavMenuItem get settings => NavMenuItem(
    id: 'settings',
    label: 'Settings',
    icon: Icons.settings,
    route: AppRoutes.settings,
  );

  /// Standard admin menu item (visible to admins only)
  static NavMenuItem get admin => NavMenuItem(
    id: 'admin',
    label: 'Admin Dashboard',
    icon: Icons.admin_panel_settings,
    route: AppRoutes.admin,
    visibleWhen: (user) => AuthProfileService.isAdmin(user),
  );

  /// Standard logout menu item
  static NavMenuItem get logout => NavMenuItem(
    id: 'logout',
    label: AppConstants.logoutButton,
    icon: Icons.logout,
  );

  /// Default menu items for standard app
  static List<NavMenuItem> get defaultItems => [
    settings,
    admin,
    NavMenuItem.divider(),
    logout,
  ];
}

class AppHeader extends StatelessWidget implements PreferredSizeWidget {
  final String pageTitle;
  final List<NavMenuItem>? menuItems;
  final VoidCallback? onLogoPressed;

  /// Required user display name
  final String userName;

  /// Required user email
  final String userEmail;

  /// User role for display
  final String userRole;

  /// User data map for permission checks
  final Map<String, dynamic>? user;

  /// Navigation callback (defaults to context.go)
  final void Function(String route)? onNavigate;

  /// Logout callback - required for logout to work
  final Future<void> Function()? onLogout;

  const AppHeader({
    super.key,
    required this.pageTitle,
    required this.userName,
    required this.userEmail,
    this.userRole = '',
    this.menuItems,
    this.onLogoPressed,
    this.user,
    this.onNavigate,
    this.onLogout,
  });

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  List<NavMenuItem> get _effectiveMenuItems =>
      menuItems ?? AppHeaderMenuItems.defaultItems;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final spacing = context.spacing;

    void navigateTo(String route) {
      if (onNavigate != null) {
        onNavigate!(route);
      } else {
        context.go(route);
      }
    }

    // Filter items based on user permissions
    final visibleItems = _effectiveMenuItems
        .where((item) => item.isVisibleFor(user))
        .toList();

    // Hide app name on mobile to save space
    final screenWidth = MediaQuery.of(context).size.width;
    final isMobile = AppBreakpoints.isMobile(screenWidth);

    return AppBar(
      backgroundColor: AppColors.brandPrimary,
      foregroundColor: AppColors.white,
      elevation: 2,
      leading: AppButton(
        icon: Icons.home,
        label: isMobile ? null : 'Tross',
        tooltip: 'Home',
        style: AppButtonStyle.ghost,
        onPressed: onLogoPressed ?? () => navigateTo('/'),
      ),
      leadingWidth: isMobile ? 56 : 120,
      title: Text(
        pageTitle,
        style: theme.textTheme.titleMedium?.copyWith(
          color: Colors.white,
          fontWeight: FontWeight.w500,
        ),
      ),
      centerTitle: true,
      actions: [
        // User menu - always dropdown from avatar, never bottom sheet
        Padding(
          padding: EdgeInsets.only(right: spacing.sm),
          child: AdaptiveNavMenu(
            tooltip: 'User Menu',
            displayMode: MenuDisplayMode.dropdown,
            trigger: InitialsAvatar(name: userName, email: userEmail),
            header: UserInfoHeader(
              userName: userName,
              userEmail: userEmail,
              userRole: userRole,
            ),
            items: visibleItems,
            onSelected: (item) =>
                _handleMenuSelection(context, item, navigateTo: navigateTo),
          ),
        ),
      ],
    );
  }

  void _handleMenuSelection(
    BuildContext context,
    NavMenuItem item, {
    required void Function(String route) navigateTo,
  }) async {
    // Execute item's onTap if defined
    if (item.onTap != null) {
      item.onTap!(context);
      return;
    }

    // Handle logout specially
    if (item.id == 'logout') {
      if (onLogout != null) {
        await onLogout!();
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
    if (item.route != null && context.mounted) {
      navigateTo(item.route!);
    }
  }
}
