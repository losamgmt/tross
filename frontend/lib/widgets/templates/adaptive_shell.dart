/// AdaptiveShell - Template-level responsive layout wrapper
///
/// Provides a clean top-bar only layout with:
/// - App bar with logo, page title, and user menu
/// - User menu dropdown (top-right) for navigation, settings, and logout
/// - Responsive body that adapts to screen width
/// - NO sidebars, bottom nav, or navigation rails
///
/// Single point of access for navigation: the user menu dropdown.
///
/// Usage:
/// ```dart
/// AdaptiveShell(
///   currentRoute: '/settings',
///   pageTitle: 'Settings',
///   body: const SettingsContent(),
/// )
/// ```
library;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../config/app_colors.dart';
import '../../config/constants.dart';
import '../../core/routing/app_routes.dart';
import '../../providers/auth_provider.dart';
import '../../services/auth/auth_profile_service.dart';

/// Navigation menu item configuration
class NavMenuItem {
  final String id;
  final String label;
  final IconData icon;
  final String route;
  final bool Function(Map<String, dynamic>? user)? visibleWhen;
  final bool isDivider;

  const NavMenuItem({
    required this.id,
    required this.label,
    required this.icon,
    required this.route,
    this.visibleWhen,
    this.isDivider = false,
  });

  /// Create a divider item
  const NavMenuItem.divider()
    : id = '_divider',
      label = '',
      icon = Icons.remove,
      route = '',
      visibleWhen = null,
      isDivider = true;

  /// Default navigation menu items - includes core pages and entity access
  static List<NavMenuItem> get defaults => [
    // Core app pages
    const NavMenuItem(
      id: 'home',
      label: 'Dashboard',
      icon: Icons.dashboard_outlined,
      route: AppRoutes.home,
    ),
    NavMenuItem(
      id: 'admin',
      label: 'Admin (All Entities)',
      icon: Icons.admin_panel_settings_outlined,
      route: AppRoutes.admin,
      visibleWhen: (user) => AuthProfileService.isAdmin(user),
    ),

    // Divider before entity section
    const NavMenuItem.divider(),

    // Entity quick links (most common entities) - camelCase names
    const NavMenuItem(
      id: 'entity_user',
      label: 'Users',
      icon: Icons.people_outlined,
      route: '/entity/user',
    ),
    const NavMenuItem(
      id: 'entity_customer',
      label: 'Customers',
      icon: Icons.business_outlined,
      route: '/entity/customer',
    ),
    const NavMenuItem(
      id: 'entity_workOrder',
      label: 'Work Orders',
      icon: Icons.assignment_outlined,
      route: '/entity/workOrder',
    ),
    const NavMenuItem(
      id: 'entity_invoice',
      label: 'Invoices',
      icon: Icons.receipt_long_outlined,
      route: '/entity/invoice',
    ),
    const NavMenuItem(
      id: 'entity_inventory',
      label: 'Inventory',
      icon: Icons.inventory_2_outlined,
      route: '/entity/inventory',
    ),

    // Divider before settings
    const NavMenuItem.divider(),

    const NavMenuItem(
      id: 'settings',
      label: 'Settings',
      icon: Icons.settings_outlined,
      route: AppRoutes.settings,
    ),
  ];
}

/// Clean top-bar layout with dropdown navigation
class AdaptiveShell extends StatelessWidget {
  /// The main body content
  final Widget body;

  /// Current route for highlighting active menu item
  final String currentRoute;

  /// Page title for the app bar
  final String pageTitle;

  /// Custom navigation items (defaults to standard app nav)
  final List<NavMenuItem>? menuItems;

  /// Whether to show the app bar
  final bool showAppBar;

  const AdaptiveShell({
    super.key,
    required this.body,
    required this.currentRoute,
    required this.pageTitle,
    this.menuItems,
    this.showAppBar = true,
  });

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final user = authProvider.user;
    final visibleMenuItems = _getVisibleMenuItems(user);

    return Scaffold(
      appBar: showAppBar
          ? _buildAppBar(context, authProvider, visibleMenuItems)
          : null,
      body: body,
    );
  }

  /// Get filtered menu items based on user permissions
  List<NavMenuItem> _getVisibleMenuItems(Map<String, dynamic>? user) {
    final items = menuItems ?? NavMenuItem.defaults;
    return items.where((item) {
      if (item.visibleWhen == null) return true;
      return item.visibleWhen!(user);
    }).toList();
  }

  /// Build the app bar with logo and user menu
  PreferredSizeWidget _buildAppBar(
    BuildContext context,
    AuthProvider authProvider,
    List<NavMenuItem> visibleMenuItems,
  ) {
    return AppBar(
      backgroundColor: AppColors.brandPrimary,
      foregroundColor: AppColors.white,
      title: Text(pageTitle),
      centerTitle: true,
      leading: _buildLogo(context),
      leadingWidth: 120,
      actions: [_buildUserMenu(context, authProvider, visibleMenuItems)],
    );
  }

  /// Build the logo/home button
  Widget _buildLogo(BuildContext context) {
    return TextButton.icon(
      onPressed: () => context.go(AppRoutes.home),
      icon: const Icon(Icons.home, color: AppColors.white),
      label: Text(
        AppConstants.appName,
        style: Theme.of(context).textTheme.titleMedium?.copyWith(
          color: AppColors.white,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  /// Build user menu dropdown - SINGLE POINT OF ACCESS for nav, settings, logout
  Widget _buildUserMenu(
    BuildContext context,
    AuthProvider authProvider,
    List<NavMenuItem> visibleMenuItems,
  ) {
    final userName = authProvider.userName;
    final userEmail = authProvider.userEmail;

    return PopupMenuButton<String>(
      icon: CircleAvatar(
        backgroundColor: AppColors.white.withValues(alpha: 0.2),
        child: Text(
          userName.isNotEmpty ? userName[0].toUpperCase() : '?',
          style: const TextStyle(color: AppColors.white),
        ),
      ),
      onSelected: (value) async {
        if (value == 'logout') {
          await authProvider.logout();
          return;
        }
        // Navigate to route
        final menuItem = visibleMenuItems.firstWhere(
          (item) => item.id == value,
          orElse: () => visibleMenuItems.first,
        );
        if (menuItem.route != currentRoute) {
          context.go(menuItem.route);
        }
      },
      itemBuilder: (_) => [
        // User info header
        PopupMenuItem(
          enabled: false,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(userName, style: Theme.of(context).textTheme.titleSmall),
              Text(userEmail, style: Theme.of(context).textTheme.bodySmall),
            ],
          ),
        ),
        const PopupMenuDivider(),

        // Navigation items (with divider support)
        ...visibleMenuItems.expand((item) {
          if (item.isDivider) {
            return [const PopupMenuDivider()];
          }
          return [
            PopupMenuItem<String>(
              value: item.id,
              child: ListTile(
                leading: Icon(
                  item.icon,
                  color: item.route == currentRoute
                      ? AppColors.brandPrimary
                      : null,
                ),
                title: Text(
                  item.label,
                  style: TextStyle(
                    fontWeight: item.route == currentRoute
                        ? FontWeight.bold
                        : FontWeight.normal,
                    color: item.route == currentRoute
                        ? AppColors.brandPrimary
                        : null,
                  ),
                ),
                dense: true,
                contentPadding: EdgeInsets.zero,
              ),
            ),
          ];
        }),

        const PopupMenuDivider(),

        // Logout
        const PopupMenuItem(
          value: 'logout',
          child: ListTile(
            leading: Icon(Icons.logout),
            title: Text('Logout'),
            dense: true,
            contentPadding: EdgeInsets.zero,
          ),
        ),
      ],
    );
  }
}
