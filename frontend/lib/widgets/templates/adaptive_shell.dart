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
/// Sidebar Strategy:
/// - By default, sidebar items are determined by the currentRoute
/// - Routes starting with /admin use 'admin' strategy
/// - Other routes use 'app' strategy
/// - Override with sidebarMenuItems prop for custom menus
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
import '../../core/routing/route_guard.dart';
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

  /// Custom sidebar items (defaults to route-based strategy from NavMenuBuilder)
  final List<NavMenuItem>? sidebarMenuItems;

  /// Custom user menu items (defaults to NavMenuBuilder.buildUserMenuItems())
  final List<NavMenuItem>? userMenuItems;

  /// Whether to show the app bar
  final bool showAppBar;

  /// Override the sidebar strategy ('app', 'admin', etc.)
  /// If null, strategy is determined from currentRoute
  final String? sidebarStrategy;

  const AdaptiveShell({
    super.key,
    required this.body,
    required this.currentRoute,
    required this.pageTitle,
    this.sidebarMenuItems,
    this.userMenuItems,
    this.showAppBar = true,
    this.sidebarStrategy,
  });

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final user = authProvider.user;

    // ══════════════════════════════════════════════════════════════════════
    // DEFENSE-IN-DEPTH: Shell-level guard (second tier after router guard)
    // If somehow the router guard is bypassed, prevent rendering protected content
    // ══════════════════════════════════════════════════════════════════════
    final guardResult = RouteGuard.checkAccess(
      route: currentRoute,
      isAuthenticated: authProvider.isAuthenticated,
      user: user,
    );

    if (!guardResult.canAccess) {
      // Don't render protected content - show access denied inline
      // The router SHOULD have redirected, but this is a safety net
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.lock, size: 64, color: Colors.grey),
              const SizedBox(height: 16),
              Text(
                guardResult.reason ?? 'Access denied',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => context.go(AppRoutes.home),
                child: const Text('Go to Home'),
              ),
            ],
          ),
        ),
      );
    }

    // Get menu items: custom > strategy-based > default
    final sidebarItems = NavMenuBuilder.filterForUser(
      sidebarMenuItems ??
          (sidebarStrategy != null
              ? NavMenuBuilder.buildSidebarItemsForStrategy(sidebarStrategy!)
              : NavMenuBuilder.buildSidebarItemsForRoute(currentRoute)),
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

        // HEADER-OUTER PATTERN: Full-width header, then sidebar + content below
        return Scaffold(
          appBar: showAppBar
              ? _buildGlobalAppBar(
                  context,
                  authProvider,
                  userItems,
                  isWideScreen,
                )
              : null,
          drawer: isWideScreen
              ? null
              : Drawer(
                  width: AppBreakpoints.sidebarWidth,
                  child: _SidebarContent(
                    items: sidebarItems,
                    currentRoute: currentRoute,
                    width: AppBreakpoints.sidebarWidth,
                    isDrawer: true,
                    showHeader: false, // Header is global now
                  ),
                ),
          body: isWideScreen
              ? Row(
                  children: [
                    // Persistent sidebar (no header - it's global)
                    _SidebarContent(
                      items: sidebarItems,
                      currentRoute: currentRoute,
                      width: AppBreakpoints.sidebarWidth,
                      isDrawer: false,
                      showHeader: false, // Header is global now
                    ),
                    const VerticalDivider(width: 1, thickness: 1),
                    Expanded(child: body),
                  ],
                )
              : body,
        );
      },
    );
  }

  /// Build the global app bar with logo (always routes to /home), title, and user menu
  PreferredSizeWidget _buildGlobalAppBar(
    BuildContext context,
    AuthProvider authProvider,
    List<NavMenuItem> userItems,
    bool isWideScreen,
  ) {
    return AppBar(
      backgroundColor: AppColors.brandPrimary,
      foregroundColor: AppColors.white,
      // Logo + App name as home link (always routes to business home)
      leading: isWideScreen
          ? null // No hamburger on wide screens
          : null, // Let automaticallyImplyLeading handle hamburger
      title: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Clickable logo - always routes to /home
          InkWell(
            onTap: () => context.go(AppRoutes.home),
            borderRadius: BorderRadius.circular(4),
            child: Padding(
              padding: const EdgeInsets.all(4),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.home, color: AppColors.white, size: 28),
                  const SizedBox(width: 8),
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
          ),
          // Separator and page title
          if (pageTitle.isNotEmpty) ...[
            const SizedBox(width: 16),
            Container(
              height: 24,
              width: 1,
              color: AppColors.white.withValues(alpha: 0.3),
            ),
            const SizedBox(width: 16),
            Text(
              pageTitle,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                color: AppColors.white.withValues(alpha: 0.9),
              ),
            ),
          ],
        ],
      ),
      centerTitle: false,
      automaticallyImplyLeading: !isWideScreen, // Hamburger on narrow screens
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
///
/// Supports:
/// - Scrollable content when items exceed viewport
/// - Collapsible section headers with children
/// - Regular nav items with active highlighting
class _SidebarContent extends StatefulWidget {
  final List<NavMenuItem> items;
  final String currentRoute;
  final double width;
  final bool isDrawer;
  final bool showHeader;

  const _SidebarContent({
    required this.items,
    required this.currentRoute,
    required this.width,
    required this.isDrawer,
    this.showHeader = true,
  });

  @override
  State<_SidebarContent> createState() => _SidebarContentState();
}

class _SidebarContentState extends State<_SidebarContent> {
  // Track which sections are expanded (default: all expanded)
  final Set<String> _expandedSections = {};
  bool _initialized = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initialized) {
      // Auto-expand sections that contain the active route
      for (final item in widget.items) {
        if (item.isSectionHeader && item.children != null) {
          // Expand if any child is active
          final hasActiveChild = item.children!.any(
            (child) => _isItemActive(child),
          );
          if (hasActiveChild) {
            _expandedSections.add(item.id);
          }
        }
      }
      _initialized = true;
    }
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: widget.width,
      child: Material(
        color: widget.isDrawer
            ? null
            : Theme.of(context).scaffoldBackgroundColor,
        child: Column(
          children: [
            if (widget.showHeader) _buildHeader(context),
            Expanded(
              child: ListView(
                padding: EdgeInsets.zero,
                children: widget.items
                    .map((item) => _buildItem(context, item))
                    .toList(),
              ),
            ),
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
    // Divider
    if (item.isDivider) {
      return const Divider();
    }

    // Section header with children - collapsible
    if (item.isSectionHeader &&
        item.children != null &&
        item.children!.isNotEmpty) {
      return _buildCollapsibleSection(context, item);
    }

    // Section header without children - just a label
    if (item.isSectionHeader) {
      return _buildSectionLabel(context, item);
    }

    // Regular nav item
    return _buildNavItem(context, item);
  }

  Widget _buildCollapsibleSection(BuildContext context, NavMenuItem item) {
    final isExpanded = _expandedSections.contains(item.id);
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Section header - clickable to expand/collapse
        InkWell(
          onTap: () {
            setState(() {
              if (isExpanded) {
                _expandedSections.remove(item.id);
              } else {
                _expandedSections.add(item.id);
              }
            });
          },
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                if (item.icon != null) ...[
                  Icon(
                    item.icon,
                    size: 18,
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                  const SizedBox(width: 8),
                ],
                Expanded(
                  child: Text(
                    item.label.toUpperCase(),
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
                Icon(
                  isExpanded ? Icons.expand_less : Icons.expand_more,
                  size: 20,
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ],
            ),
          ),
        ),
        // Children - only visible when expanded
        if (isExpanded)
          ...item.children!.map(
            (child) => Padding(
              padding: const EdgeInsets.only(left: 16),
              child: _buildNavItem(context, child),
            ),
          ),
      ],
    );
  }

  Widget _buildSectionLabel(BuildContext context, NavMenuItem item) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Row(
        children: [
          if (item.icon != null) ...[
            Icon(
              item.icon,
              size: 16,
              color: theme.colorScheme.onSurfaceVariant,
            ),
            const SizedBox(width: 8),
          ],
          Text(
            item.label.toUpperCase(),
            style: theme.textTheme.labelSmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNavItem(BuildContext context, NavMenuItem item) {
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
    return item.route == widget.currentRoute ||
        (item.route == '/' && widget.currentRoute == AppRoutes.home);
  }

  void _handleTap(BuildContext context, NavMenuItem item) {
    // Close drawer if in drawer mode
    if (widget.isDrawer && Navigator.canPop(context)) {
      Navigator.pop(context);
    }
    // Navigate if route is different
    if (item.route != null && item.route != widget.currentRoute) {
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
