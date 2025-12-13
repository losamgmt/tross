/// AppSidebar - Generic metadata-driven sidebar navigation
///
/// SINGLE RESPONSIBILITY: Display sidebar navigation with collapsible sections
///
/// Features:
/// - Collapsible/expandable
/// - Metadata-driven menu items
/// - Permission-based visibility
/// - Active route highlighting
/// - Nested navigation support
///
/// Usage:
/// ```dart
/// AppSidebar(
///   items: [
///     NavMenuItem(id: 'home', label: 'Home', icon: Icons.home, route: '/'),
///     NavMenuItem.section(id: 'admin', label: 'Administration'),
///     NavMenuItem(id: 'users', label: 'Users', icon: Icons.people, route: '/admin/users'),
///   ],
///   currentRoute: '/admin/users',
///   onItemTap: (item) => Navigator.pushNamed(context, item.route!),
/// )
/// ```
library;

import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';
import 'nav_menu_item.dart';

/// Collapsible sidebar navigation
class AppSidebar extends StatefulWidget {
  /// Navigation menu items
  final List<NavMenuItem> items;

  /// Currently active route (for highlighting)
  final String? currentRoute;

  /// Callback when a menu item is tapped
  final void Function(NavMenuItem item)? onItemTap;

  /// Current user data (for permission filtering)
  final Map<String, dynamic>? user;

  /// Whether sidebar is collapsed (icon-only mode)
  final bool collapsed;

  /// Callback when collapse state changes
  final VoidCallback? onToggleCollapse;

  /// Width when expanded
  final double expandedWidth;

  /// Width when collapsed
  final double collapsedWidth;

  /// Header widget (e.g., logo)
  final Widget? header;

  /// Footer widget (e.g., user profile, logout)
  final Widget? footer;

  const AppSidebar({
    super.key,
    required this.items,
    this.currentRoute,
    this.onItemTap,
    this.user,
    this.collapsed = false,
    this.onToggleCollapse,
    this.expandedWidth = 250,
    this.collapsedWidth = 72,
    this.header,
    this.footer,
  });

  @override
  State<AppSidebar> createState() => _AppSidebarState();
}

class _AppSidebarState extends State<AppSidebar>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _widthAnimation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 200),
    );
    _updateAnimation();
    if (widget.collapsed) {
      _animationController.value = 1.0;
    }
  }

  @override
  void didUpdateWidget(AppSidebar oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.collapsed != widget.collapsed) {
      if (widget.collapsed) {
        _animationController.forward();
      } else {
        _animationController.reverse();
      }
    }
  }

  void _updateAnimation() {
    _widthAnimation =
        Tween<double>(
          begin: widget.expandedWidth,
          end: widget.collapsedWidth,
        ).animate(
          CurvedAnimation(
            parent: _animationController,
            curve: Curves.easeInOut,
          ),
        );
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final spacing = context.spacing;

    return AnimatedBuilder(
      animation: _widthAnimation,
      builder: (context, child) {
        return Container(
          width: _widthAnimation.value,
          decoration: BoxDecoration(
            color: theme.colorScheme.surface,
            border: Border(
              right: BorderSide(
                color: theme.colorScheme.outline.withValues(alpha: 0.2),
              ),
            ),
          ),
          child: Column(
            children: [
              // Header
              if (widget.header != null)
                Padding(
                  padding: EdgeInsets.all(spacing.md),
                  child: widget.header,
                ),

              // Collapse toggle
              _buildCollapseToggle(theme, spacing),

              // Navigation items
              Expanded(
                child: ListView(
                  padding: EdgeInsets.symmetric(vertical: spacing.sm),
                  children: _buildMenuItems(theme, spacing),
                ),
              ),

              // Footer
              if (widget.footer != null)
                Padding(
                  padding: EdgeInsets.all(spacing.md),
                  child: widget.footer,
                ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildCollapseToggle(ThemeData theme, AppSpacing spacing) {
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: spacing.sm),
      child: Align(
        alignment: widget.collapsed ? Alignment.center : Alignment.centerRight,
        child: IconButton(
          onPressed: widget.onToggleCollapse,
          icon: Icon(
            widget.collapsed ? Icons.chevron_right : Icons.chevron_left,
          ),
          tooltip: widget.collapsed ? 'Expand sidebar' : 'Collapse sidebar',
        ),
      ),
    );
  }

  List<Widget> _buildMenuItems(ThemeData theme, AppSpacing spacing) {
    final visibleItems = widget.items
        .where((item) => item.isVisibleFor(widget.user))
        .toList();

    return visibleItems.map((item) {
      if (item.isDivider) {
        return Divider(
          height: spacing.lg,
          indent: spacing.md,
          endIndent: spacing.md,
        );
      }

      if (item.isSectionHeader) {
        return _buildSectionHeader(item, theme, spacing);
      }

      return _buildMenuItem(item, theme, spacing);
    }).toList();
  }

  Widget _buildSectionHeader(
    NavMenuItem item,
    ThemeData theme,
    AppSpacing spacing,
  ) {
    if (widget.collapsed) {
      return Padding(
        padding: EdgeInsets.symmetric(vertical: spacing.sm),
        child: Divider(indent: spacing.sm, endIndent: spacing.sm),
      );
    }

    return Padding(
      padding: EdgeInsets.fromLTRB(
        spacing.md,
        spacing.lg,
        spacing.md,
        spacing.sm,
      ),
      child: Text(
        item.label.toUpperCase(),
        style: theme.textTheme.labelSmall?.copyWith(
          color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
          fontWeight: FontWeight.bold,
          letterSpacing: 1.2,
        ),
      ),
    );
  }

  Widget _buildMenuItem(NavMenuItem item, ThemeData theme, AppSpacing spacing) {
    final isActive = widget.currentRoute == item.route;

    return Padding(
      padding: EdgeInsets.symmetric(
        horizontal: spacing.sm,
        vertical: spacing.xs / 2,
      ),
      child: Material(
        color: isActive
            ? theme.colorScheme.primary.withValues(alpha: 0.1)
            : Colors.transparent,
        borderRadius: BorderRadius.circular(8),
        child: InkWell(
          onTap: () => _handleItemTap(item),
          borderRadius: BorderRadius.circular(8),
          child: Container(
            padding: EdgeInsets.symmetric(
              horizontal: spacing.md,
              vertical: spacing.sm,
            ),
            child: Row(
              children: [
                // Icon
                if (item.icon != null)
                  Icon(
                    item.icon,
                    size: 20,
                    color: isActive
                        ? theme.colorScheme.primary
                        : theme.colorScheme.onSurface.withValues(alpha: 0.7),
                  ),

                // Label (hidden when collapsed)
                if (!widget.collapsed) ...[
                  SizedBox(width: spacing.md),
                  Expanded(
                    child: Text(
                      item.label,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: isActive
                            ? theme.colorScheme.primary
                            : theme.colorScheme.onSurface,
                        fontWeight: isActive ? FontWeight.w600 : null,
                      ),
                    ),
                  ),

                  // Badge
                  if (item.badgeCount != null && item.badgeCount! > 0)
                    Container(
                      padding: EdgeInsets.symmetric(
                        horizontal: spacing.xs,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: theme.colorScheme.error,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        item.badgeCount! > 99 ? '99+' : '${item.badgeCount}',
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: theme.colorScheme.onError,
                        ),
                      ),
                    ),

                  // Chevron for nested items
                  if (item.children?.isNotEmpty == true)
                    Icon(
                      Icons.chevron_right,
                      size: 16,
                      color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
                    ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _handleItemTap(NavMenuItem item) {
    if (item.onTap != null) {
      item.onTap!(context);
    } else if (widget.onItemTap != null) {
      widget.onItemTap!(item);
    }
  }
}
