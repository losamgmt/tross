/// MenuHelper - Pure functions for menu item logic
///
/// SINGLE RESPONSIBILITY: Menu item calculations and filtering
/// NO rendering, NO state management, NO provider access!
library;

import 'package:flutter/material.dart';

/// Menu item configuration for generic DropdownMenu
class MenuItemConfig {
  final String id;
  final String label;
  final dynamic icon;
  final VoidCallback? onTap;
  final bool isDivider;
  final bool isVisible;

  const MenuItemConfig({
    required this.id,
    required this.label,
    this.icon,
    this.onTap,
    this.isDivider = false,
    this.isVisible = true,
  });

  /// Create a divider item
  factory MenuItemConfig.divider() {
    return const MenuItemConfig(id: 'divider', label: '', isDivider: true);
  }
}

class MenuHelper {
  /// Filter menu items by visibility
  static List<MenuItemConfig> getVisibleItems(List<MenuItemConfig> items) {
    return items.where((item) => item.isVisible).toList();
  }

  /// Check if user has admin role (pure string comparison)
  ///
  /// Move this to AuthHelper or RoleHelper if it grows more complex
  static bool isAdminRole(String role) {
    return role.toLowerCase() == 'admin';
  }

  /// Get user menu items based on role
  ///
  /// Returns configured menu items - organism decides which to show
  static List<MenuItemConfig> getUserMenuItems({
    required bool isAdmin,
    required VoidCallback onProfile,
    required VoidCallback onSettings,
    required VoidCallback onAdmin,
    required VoidCallback onLogout,
  }) {
    return [
      MenuItemConfig(
        id: 'profile',
        label: 'Profile',
        icon: 'person',
        onTap: onProfile,
      ),
      MenuItemConfig(
        id: 'settings',
        label: 'Settings',
        icon: 'settings',
        onTap: onSettings,
      ),
      if (isAdmin) ...[
        MenuItemConfig.divider(),
        MenuItemConfig(
          id: 'admin',
          label: 'Admin Panel',
          icon: 'admin_panel_settings',
          onTap: onAdmin,
        ),
      ],
      MenuItemConfig.divider(),
      MenuItemConfig(
        id: 'logout',
        label: 'Logout',
        icon: 'logout',
        onTap: onLogout,
      ),
    ];
  }

  /// Build menu items for dropdown (pure data structure)
  ///
  /// Returns list of PopupMenuEntry - NO business logic
  /// Organism passes callbacks, helper just structures data
  static List<PopupMenuEntry<String>> buildDropdownMenuItems({
    required bool isAdmin,
  }) {
    final items = <PopupMenuEntry<String>>[];

    items.add(
      const PopupMenuItem<String>(
        value: 'settings',
        child: Row(
          children: [
            Icon(Icons.settings),
            SizedBox(width: 12),
            Text('Settings'),
          ],
        ),
      ),
    );

    if (isAdmin) {
      items.add(const PopupMenuDivider());
      items.add(
        const PopupMenuItem<String>(
          value: 'admin',
          child: Row(
            children: [
              Icon(Icons.admin_panel_settings),
              SizedBox(width: 12),
              Text('Admin Panel'),
            ],
          ),
        ),
      );
    }

    items.add(const PopupMenuDivider());
    items.add(
      const PopupMenuItem<String>(
        value: 'logout',
        child: Row(
          children: [Icon(Icons.logout), SizedBox(width: 12), Text('Logout')],
        ),
      ),
    );

    return items;
  }
}
