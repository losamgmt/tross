/// AdaptiveShell - Responsive layout template with sidebar/drawer navigation
///
/// Provides a responsive layout with:
/// - Narrow screens (<900px): Hamburger menu with drawer
/// - Wide screens (>=900px): Persistent sidebar
/// - App bar with page title and user menu
/// - User menu dropdown for account actions (Settings, Admin, Logout)
///
/// Navigation items are derived from nav-config.json via NavMenuBuilder.
/// Uses centralized breakpoints from AppBreakpoints.
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
import '../../config/app_spacing.dart';
import '../../config/constants.dart';
import '../../core/routing/app_routes.dart';
import '../../providers/auth_provider.dart';
import '../../services/nav_menu_builder.dart';
import '../organisms/navigation/nav_menu_item.dart';

/// Responsive layout shell with sidebar/drawer navigation
class AdaptiveShell extends StatelessWidget {
  /// The main body content
  final Widget body;

  /// Current route for highlighting active menu item
  final String currentRoute;

  /// Page title for the app bar
  final String pageTitle;

  /// Custom sidebar items (defaults to NavMenuBuilder.buildSidebarItems())
  final List<NavMenuItem>? sidebarMenuItems;

  /// Custom user menu items (defaults to NavMenuBuilder.buildUserMenuItems())
  final List<NavMenuItem>? userMenuItems;

  /// Whether to show the app bar
  final bool showAppBar;

  const AdaptiveShell({
    super.key,
    required this.body,
    required this.currentRoute,
    required this.pageTitle,
    this.sidebarMenuItems,
    this.userMenuItems,
    this.showAppBar = true,
  });

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final user = authProvider.user;

    // Get menu items from NavMenuBuilder and filter by permissions
    final sidebarItems = NavMenuBuilder.filterForUser(
      sidebarMenuItems ?? NavMenuBuilder.buildSidebarItems(),
      user,
    );
    final userItems = NavMenuBuilder.filterForUser(
      userMenuItems ?? NavMenuBuilder.buildUserMenuItems(),
      user,
    );

    return LayoutBuilder(
      builder: (context, constraints) {
        final isWideScreen = AppBreakpoints.shouldShowPersistentSidebar(
          constraints.maxWidth,
        );

        if (isWideScreen) {
          return _buildWideLayout(
            context,
            authProvider,
            sidebarItems,
            userItems,
          );
        } else {
          return _buildNarrowLayout(
            context,
            authProvider,
            sidebarItems,
            userItems,
          );
        }
      },
    );
  }

  /// Wide screen layout: persistent sidebar + main content
  Widget _buildWideLayout(
    BuildContext context,
    AuthProvider authProvider,
    List<NavMenuItem> sidebarItems,
    List<NavMenuItem> userItems,
  ) {
    return Row(
      children: [
        // Persistent sidebar
        _SidebarContent(
          items: sidebarItems,
          currentRoute: currentRoute,
          width: AppBreakpoints.sidebarWidth,
          isDrawer: false,
        ),
        // Vertical divider
        const VerticalDivider(width: 1, thickness: 1),
        // Main content area
        Expanded(
          child: Scaffold(
            appBar: showAppBar
                ? _buildAppBar(
                    context,
                    authProvider,
                    userItems,
                    showMenuButton: false,
                  )
                : null,
            body: body,
          ),
        ),
      ],
    );
  }

  /// Narrow screen layout: drawer-based navigation
  Widget _buildNarrowLayout(
    BuildContext context,
    AuthProvider authProvider,
    List<NavMenuItem> sidebarItems,
    List<NavMenuItem> userItems,
  ) {
    return Scaffold(
      appBar: showAppBar
          ? _buildAppBar(context, authProvider, userItems)
          : null,
      drawer: Drawer(
        width: AppBreakpoints.sidebarWidth,
        child: _SidebarContent(
          items: sidebarItems,
          currentRoute: currentRoute,
          width: AppBreakpoints.sidebarWidth,
          isDrawer: true,
        ),
      ),
      body: body,
    );
  }

  /// Build the app bar with optional hamburger menu and user menu
  PreferredSizeWidget _buildAppBar(
    BuildContext context,
    AuthProvider authProvider,
    List<NavMenuItem> userItems, {
    bool showMenuButton = true,
  }) {
    return AppBar(
      backgroundColor: AppColors.brandPrimary,
      foregroundColor: AppColors.white,
      title: Text(pageTitle),
      centerTitle: true,
      automaticallyImplyLeading: showMenuButton,
      actions: [
        _UserMenuButton(
          authProvider: authProvider,
          userItems: userItems,
          currentRoute: currentRoute,
        ),
        const SizedBox(width: 8),
      ],
    );
  }
}

// ============================================================================
// SIDEBAR CONTENT WIDGET
// ============================================================================

/// Sidebar content - used by both drawer and persistent sidebar
class _SidebarContent extends StatelessWidget {
  final List<NavMenuItem> items;
  final String currentRoute;
  final double width;
  final bool isDrawer;

  const _SidebarContent({
    required this.items,
    required this.currentRoute,
    required this.width,
    required this.isDrawer,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: width,
      child: Material(
        color: isDrawer ? null : Theme.of(context).scaffoldBackgroundColor,
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            _buildHeader(context),
            ...items.map((item) => _buildItem(context, item)),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Container(
      color: AppColors.brandPrimary,
      padding: const EdgeInsets.all(16),
      child: SafeArea(
        bottom: false,
        child: Row(
          children: [
            const Icon(Icons.home, color: AppColors.white, size: 32),
            const SizedBox(width: 12),
            Text(
              AppConstants.appName,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                color: AppColors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildItem(BuildContext context, NavMenuItem item) {
    if (item.isDivider) {
      return const Divider();
    }

    final isActive = _isItemActive(item);

    return ListTile(
      leading: item.icon != null
          ? Icon(item.icon, color: isActive ? AppColors.brandPrimary : null)
          : null,
      title: Text(
        item.label,
        style: TextStyle(
          fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
          color: isActive ? AppColors.brandPrimary : null,
        ),
      ),
      selected: isActive,
      onTap: () => _handleTap(context, item),
    );
  }

  bool _isItemActive(NavMenuItem item) {
    return item.route == currentRoute ||
        (item.route == '/' && currentRoute == AppRoutes.home);
  }

  void _handleTap(BuildContext context, NavMenuItem item) {
    // Close drawer if in drawer mode
    if (isDrawer) {
      Navigator.pop(context);
    }
    // Navigate if route is different
    if (item.route != null && item.route != currentRoute) {
      context.go(item.route!);
    }
  }
}

// ============================================================================
// USER MENU BUTTON WIDGET
// ============================================================================

/// User menu button with dropdown for account actions
class _UserMenuButton extends StatelessWidget {
  final AuthProvider authProvider;
  final List<NavMenuItem> userItems;
  final String currentRoute;

  const _UserMenuButton({
    required this.authProvider,
    required this.userItems,
    required this.currentRoute,
  });

  @override
  Widget build(BuildContext context) {
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
      onSelected: (value) => _handleSelection(context, value),
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

        // User menu items (Settings, Admin, etc.)
        ...userItems.map(
          (item) => PopupMenuItem<String>(
            value: item.id,
            child: ListTile(
              leading: Icon(item.icon),
              title: Text(item.label),
              dense: true,
              contentPadding: EdgeInsets.zero,
            ),
          ),
        ),

        const PopupMenuDivider(),

        // Logout (always present, handled separately)
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

  void _handleSelection(BuildContext context, String value) async {
    if (value == 'logout') {
      await authProvider.logout();
      return;
    }

    // Find and navigate to the selected item's route
    final menuItem = userItems.firstWhere(
      (item) => item.id == value,
      orElse: () => userItems.first,
    );
    if (menuItem.route != null && menuItem.route != currentRoute) {
      context.go(menuItem.route!);
    }
  }
}
