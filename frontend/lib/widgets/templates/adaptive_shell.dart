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
import '../../services/generic_entity_service.dart';
import '../../services/nav_config_loader.dart';
import '../../services/nav_menu_builder.dart';
import '../atoms/atoms.dart';
import '../molecules/menus/adaptive_nav_menu.dart';
import '../molecules/navigation/mobile_nav_bar.dart';
import '../organisms/navigation/nav_menu_item.dart';
import '../organisms/navigation/notification_tray.dart';

/// Responsive layout shell with sidebar/drawer navigation
class AdaptiveShell extends StatefulWidget {
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

  /// Whether to show bottom navigation bar on compact screens
  /// Default: true for mobile-first UX
  final bool showBottomNav;

  /// Custom mobile nav items (defaults to first 5 sidebar items with icons)
  final List<NavMenuItem>? mobileNavItems;

  const AdaptiveShell({
    super.key,
    required this.body,
    required this.currentRoute,
    required this.pageTitle,
    this.sidebarMenuItems,
    this.userMenuItems,
    this.showAppBar = true,
    this.sidebarStrategy,
    this.showBottomNav = true,
    this.mobileNavItems,
  });

  @override
  State<AdaptiveShell> createState() => _AdaptiveShellState();
}

class _AdaptiveShellState extends State<AdaptiveShell> {
  bool _sidebarCollapsed = false;

  void _toggleSidebarCollapse() {
    setState(() {
      _sidebarCollapsed = !_sidebarCollapsed;
    });
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final user = authProvider.user;

    // ══════════════════════════════════════════════════════════════════════
    // DEFENSE-IN-DEPTH: Shell-level guard (second tier after router guard)
    // If somehow the router guard is bypassed, prevent rendering protected content
    // ══════════════════════════════════════════════════════════════════════
    final guardResult = RouteGuard.checkAccess(
      route: widget.currentRoute,
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
      widget.sidebarMenuItems ??
          (widget.sidebarStrategy != null
              ? NavMenuBuilder.buildSidebarItemsForStrategy(
                  widget.sidebarStrategy!,
                )
              : NavMenuBuilder.buildSidebarItemsForRoute(widget.currentRoute)),
      user,
    );
    final userItems = NavMenuBuilder.filterForUser(
      widget.userMenuItems ?? NavMenuBuilder.buildUserMenuItems(),
      user,
    );

    return LayoutBuilder(
      builder: (context, constraints) {
        final isWideScreen = AppBreakpoints.shouldShowPersistentSidebar(
          constraints.maxWidth,
        );

        // Get mobile navigation style from config (bottomNav or drawer, not both)
        final mobileNavStyle = NavMenuBuilder.getMobileNavigationStyle();
        final useBottomNav = mobileNavStyle == MobileNavStyle.bottomNav;
        final useDrawer = mobileNavStyle == MobileNavStyle.drawer;

        // HEADER-OUTER PATTERN: Full-width header, then sidebar + content below
        return Scaffold(
          appBar: widget.showAppBar
              ? _buildGlobalAppBar(
                  context,
                  authProvider,
                  userItems,
                  isWideScreen,
                  // Hide hamburger when using bottom nav on mobile
                  showHamburger: !isWideScreen && useDrawer,
                )
              : null,
          // Drawer only shown when mobileNavStyle is 'drawer'
          drawer: isWideScreen || !useDrawer
              ? null
              : Drawer(
                  width: AppBreakpoints.sidebarWidth,
                  child: _SidebarContent(
                    items: sidebarItems,
                    currentRoute: widget.currentRoute,
                    width: AppBreakpoints.sidebarWidth,
                    isDrawer: true,
                    showHeader: false, // Header is global now
                  ),
                ),
          // Bottom nav only shown when mobileNavStyle is 'bottomNav'
          bottomNavigationBar:
              !isWideScreen && widget.showBottomNav && useBottomNav
              ? MobileNavBar.fromItems(
                  allItems: widget.mobileNavItems ?? sidebarItems,
                  currentRoute: widget.currentRoute,
                  onItemTap: (item) {
                    if (item.route != null) {
                      context.go(item.route!);
                    } else if (item.onTap != null) {
                      item.onTap!(context);
                    }
                  },
                )
              : null,
          body: isWideScreen
              ? Row(
                  children: [
                    // Persistent sidebar (no header - it's global)
                    _SidebarContent(
                      items: sidebarItems,
                      currentRoute: widget.currentRoute,
                      width: _sidebarCollapsed
                          ? 72
                          : AppBreakpoints.sidebarWidth,
                      isDrawer: false,
                      showHeader: false, // Header is global now
                      collapsed: _sidebarCollapsed,
                      onToggleCollapse: _toggleSidebarCollapse,
                    ),
                    const VerticalDivider(width: 1, thickness: 1),
                    Expanded(child: widget.body),
                  ],
                )
              : widget.body,
        );
      },
    );
  }

  /// Build the global app bar with logo (always routes to /home), title, and user menu
  PreferredSizeWidget _buildGlobalAppBar(
    BuildContext context,
    AuthProvider authProvider,
    List<NavMenuItem> userItems,
    bool isWideScreen, {
    bool showHamburger = true,
  }) {
    return AppBar(
      backgroundColor: AppColors.brandPrimary,
      foregroundColor: AppColors.white,
      // Logo + App name as home link (always routes to business home)
      // Hide app name on mobile to save space
      leading: isWideScreen
          ? null // No hamburger on wide screens
          : null, // Let automaticallyImplyLeading handle hamburger
      title: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Clickable logo - always routes to /home
          TouchTarget(
            onTap: () => context.go(AppRoutes.home),
            semanticLabel: 'Go to home',
            child: Padding(
              padding: const EdgeInsets.all(4),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.home, color: AppColors.white, size: 28),
                  // Only show app name on wide screens
                  if (isWideScreen) ...[
                    const SizedBox(width: 8),
                    Text(
                      AppConstants.appName,
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        color: AppColors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
          // Separator and page title
          if (widget.pageTitle.isNotEmpty) ...[
            const SizedBox(width: 16),
            Container(
              height: 24,
              width: 1,
              color: AppColors.white.withValues(alpha: 0.3),
            ),
            const SizedBox(width: 16),
            Flexible(
              child: Text(
                widget.pageTitle,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: AppColors.white.withValues(alpha: 0.9),
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ],
      ),
      centerTitle: false,
      // Only show hamburger on narrow screens when using drawer mode
      automaticallyImplyLeading: !isWideScreen && showHamburger,
      actions: [
        // Notification bell with dropdown
        const _NotificationTraySection(),
        _UserMenuButton(
          authProvider: authProvider,
          userItems: userItems,
          currentRoute: widget.currentRoute,
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
/// - Sidebar-wide collapse to icon-only mode
class _SidebarContent extends StatefulWidget {
  final List<NavMenuItem> items;
  final String currentRoute;
  final double width;
  final bool isDrawer;
  final bool showHeader;
  final bool collapsed;
  final VoidCallback? onToggleCollapse;

  const _SidebarContent({
    required this.items,
    required this.currentRoute,
    required this.width,
    required this.isDrawer,
    this.showHeader = true,
    this.collapsed = false,
    this.onToggleCollapse,
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
    final theme = Theme.of(context);

    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      curve: Curves.easeInOut,
      width: widget.width,
      child: Material(
        color: widget.isDrawer ? null : theme.scaffoldBackgroundColor,
        child: Column(
          children: [
            if (widget.showHeader) _buildHeader(context),
            // Collapse toggle (only for persistent sidebar)
            if (!widget.isDrawer && widget.onToggleCollapse != null)
              _buildCollapseToggle(context),
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

  Widget _buildCollapseToggle(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      child: Align(
        alignment: widget.collapsed ? Alignment.center : Alignment.centerRight,
        child: TouchTarget(
          onTap: widget.onToggleCollapse,
          semanticLabel: widget.collapsed
              ? 'Expand sidebar'
              : 'Collapse sidebar',
          child: Padding(
            padding: const EdgeInsets.all(8),
            child: Icon(
              widget.collapsed ? Icons.chevron_right : Icons.chevron_left,
              size: 20,
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
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

    // Section header with children
    if (item.isSectionHeader &&
        item.children != null &&
        item.children!.isNotEmpty) {
      // In sidebar mode (not drawer): flatten - render children directly
      // This shows actual entity icons instead of folder icons
      if (!widget.isDrawer) {
        return Column(
          children: item.children!
              .map((child) => _buildNavItem(context, child))
              .toList(),
        );
      }
      // In drawer mode: use collapsible sections
      return _buildCollapsibleSection(context, item);
    }

    // Section header without children - skip in sidebar mode, show label in drawer
    if (item.isSectionHeader) {
      if (!widget.isDrawer) {
        return const SizedBox.shrink();
      }
      return _buildSectionLabel(context, item);
    }

    // Regular nav item
    return _buildNavItem(context, item);
  }

  Widget _buildCollapsibleSection(BuildContext context, NavMenuItem item) {
    final isExpanded = _expandedSections.contains(item.id);
    final theme = Theme.of(context);

    // Collapsed mode - show icon only, hide children
    if (widget.collapsed) {
      if (item.icon != null) {
        return Tooltip(
          message: item.label,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Center(
              child: Icon(
                item.icon,
                size: 18,
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ),
        );
      }
      // No icon, show nothing in collapsed mode
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Section header - clickable to expand/collapse
        TouchTarget(
          onTap: () {
            setState(() {
              if (isExpanded) {
                _expandedSections.remove(item.id);
              } else {
                _expandedSections.add(item.id);
              }
            });
          },
          semanticLabel:
              '${item.label} section, ${isExpanded ? 'collapse' : 'expand'}',
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

    // Collapsed mode - show icon only or hide
    if (widget.collapsed) {
      if (item.icon != null) {
        return Tooltip(
          message: item.label,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Center(
              child: Icon(
                item.icon,
                size: 16,
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ),
        );
      }
      return const SizedBox.shrink();
    }

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

    // Collapsed mode - icon only with tooltip
    if (widget.collapsed) {
      return Tooltip(
        message: item.label,
        child: InkWell(
          onTap: () => _handleTap(context, item),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 12),
            alignment: Alignment.center,
            child: Icon(
              item.icon ?? Icons.circle,
              color: isActive ? AppColors.brandPrimary : null,
            ),
          ),
        ),
      );
    }

    // Expanded mode - full ListTile
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
///
/// Uses AdaptiveNavMenu with config-driven display mode:
/// - displayMode comes from nav-config.json menuBehaviors.userMenu
/// - Default: dropdown (always anchored to avatar trigger)
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

    // Build full menu items including logout
    final allItems = [
      ...userItems,
      NavMenuItem.divider(),
      NavMenuItem(id: 'logout', label: 'Logout', icon: Icons.logout),
    ];

    // Get display mode from config (userMenu defaults to dropdown)
    final displayMode = NavMenuBuilder.getDisplayModeForMenu('userMenu');

    return AdaptiveNavMenu(
      tooltip: 'User Menu',
      displayMode: displayMode,
      trigger: CircleAvatar(
        backgroundColor: AppColors.white.withValues(alpha: 0.2),
        child: Text(
          userName.isNotEmpty ? userName[0].toUpperCase() : '?',
          style: const TextStyle(color: AppColors.white),
        ),
      ),
      header: _UserInfoHeader(userName: userName, userEmail: userEmail),
      items: allItems,
      onSelected: (item) => _handleSelection(context, item),
    );
  }

  void _handleSelection(BuildContext context, NavMenuItem item) async {
    if (item.id == 'logout') {
      await authProvider.logout();
      return;
    }

    // Navigate to the selected item's route
    if (item.route != null && item.route != currentRoute) {
      context.go(item.route!);
    }
  }
}

/// User info header for the menu
class _UserInfoHeader extends StatelessWidget {
  final String userName;
  final String userEmail;

  const _UserInfoHeader({required this.userName, required this.userEmail});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(userName, style: theme.textTheme.titleSmall),
        Text(userEmail, style: theme.textTheme.bodySmall),
      ],
    );
  }
}

// ============================================================================
// NOTIFICATION TRAY SECTION
// ============================================================================

/// Stateful wrapper that manages notification data for the pure NotificationTray
///
/// This handles:
/// - Fetching notifications from GenericEntityService on dropdown open
/// - Maintaining the current list in state
/// - Passing plain props to the pure NotificationTray widget
class _NotificationTraySection extends StatefulWidget {
  const _NotificationTraySection();

  @override
  State<_NotificationTraySection> createState() =>
      _NotificationTraySectionState();
}

class _NotificationTraySectionState extends State<_NotificationTraySection> {
  List<Map<String, dynamic>> _notifications = [];

  @override
  void initState() {
    super.initState();
    // Initial load of notifications (only if authenticated)
    _loadNotificationsIfAuthenticated();
  }

  Future<void> _loadNotificationsIfAuthenticated() async {
    final authProvider = context.read<AuthProvider>();
    if (!authProvider.isAuthenticated) return;
    await _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    try {
      final entityService = context.read<GenericEntityService>();
      final result = await entityService.getAll(
        'notification',
        limit: 10,
        sortBy: 'created_at',
        sortOrder: 'DESC',
      );
      if (mounted) {
        setState(() => _notifications = result.data);
      }
    } catch (e) {
      // Silently fail - notifications are non-critical
      if (mounted) {
        setState(() => _notifications = []);
      }
    }
  }

  Future<void> _handleNotificationTap(Map<String, dynamic> notification) async {
    // Mark as read
    try {
      final entityService = context.read<GenericEntityService>();
      final id = notification['id'];
      if (id != null) {
        await entityService.update('notification', id, {'is_read': true});
        // Refresh the list
        await _loadNotifications();
      }
    } catch (e) {
      // Silently fail
    }

    // Navigate to related entity if available
    final relatedEntity = notification['related_entity_type'] as String?;
    final relatedId = notification['related_entity_id'];
    if (relatedEntity != null && relatedId != null && mounted) {
      context.go('/$relatedEntity/$relatedId');
    }
  }

  void _handleViewAll() {
    context.go('/notifications');
  }

  @override
  Widget build(BuildContext context) {
    // Only show notification tray when authenticated
    final authProvider = context.watch<AuthProvider>();
    if (!authProvider.isAuthenticated) {
      return const SizedBox.shrink();
    }

    return NotificationTray(
      notifications: _notifications,
      onOpen: _loadNotifications,
      onNotificationTap: _handleNotificationTap,
      onViewAll: _handleViewAll,
    );
  }
}
