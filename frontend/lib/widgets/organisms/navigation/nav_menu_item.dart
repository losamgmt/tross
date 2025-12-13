/// NavMenuItem - Configuration for navigation menu items
///
/// SINGLE RESPONSIBILITY: Define navigation item data structure
///
/// Used by: AppSidebar, GenericNavMenu, AppHeader
/// Can be generated from metadata or defined statically.
library;

import 'package:flutter/material.dart';

/// Navigation menu item configuration
///
/// Immutable data class for menu item properties.
/// Can include visibility rules based on user permissions.
class NavMenuItem {
  /// Unique identifier for the menu item
  final String id;

  /// Display label
  final String label;

  /// Optional icon
  final IconData? icon;

  /// Route to navigate to (if navigation-based)
  final String? route;

  /// Custom tap handler (if action-based)
  final void Function(BuildContext context)? onTap;

  /// Whether this item is visible
  /// Can be a function that evaluates based on user/permissions
  final bool Function(Map<String, dynamic>? user)? visibleWhen;

  /// Child items for nested navigation
  final List<NavMenuItem>? children;

  /// Whether this is a section header (non-clickable)
  final bool isSectionHeader;

  /// Whether this is a divider
  final bool isDivider;

  /// Badge count (for notifications, etc.)
  final int? badgeCount;

  /// Whether this item requires admin role
  final bool requiresAdmin;

  /// Whether this item requires authenticated user
  final bool requiresAuth;

  const NavMenuItem({
    required this.id,
    required this.label,
    this.icon,
    this.route,
    this.onTap,
    this.visibleWhen,
    this.children,
    this.isSectionHeader = false,
    this.isDivider = false,
    this.badgeCount,
    this.requiresAdmin = false,
    this.requiresAuth = true,
  });

  /// Create a divider item
  factory NavMenuItem.divider({String id = 'divider'}) {
    return NavMenuItem(id: id, label: '', isDivider: true);
  }

  /// Create a section header
  factory NavMenuItem.section({
    required String id,
    required String label,
    IconData? icon,
  }) {
    return NavMenuItem(id: id, label: label, icon: icon, isSectionHeader: true);
  }

  /// Check if this item should be visible for the given user
  bool isVisibleFor(Map<String, dynamic>? user) {
    // Check custom visibility function first
    if (visibleWhen != null) {
      return visibleWhen!(user);
    }

    // Check auth requirement
    if (requiresAuth && user == null) {
      return false;
    }

    // Check admin requirement
    if (requiresAdmin) {
      final role = user?['role'] as String?;
      return role == 'admin';
    }

    return true;
  }
}
