/// DropdownMenu - Generic molecule for dropdown menus
///
/// SINGLE RESPONSIBILITY: Display menu items in a dropdown
/// 100% GENERIC - receives menu items as props, NO business logic!
///
/// Parent organism handles menu logic and passes menu item configs down.
///
/// Usage:
/// ```dart
/// DropdownMenu(
///   trigger: Text('Menu'),
///   items: [
///     MenuItemData(label: 'Profile', icon: Icons.person, onTap: _goProfile),
///     MenuItemData(label: 'Settings', icon: Icons.settings, onTap: _goSettings),
///     MenuItemData.divider(),
///     MenuItemData(label: 'Logout', icon: Icons.logout, onTap: _logout),
///   ],
/// )
/// ```
library;

import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';

/// Configuration for a single menu item
class MenuItemData {
  final String id;
  final String label;
  final IconData? icon;
  final VoidCallback? onTap;
  final bool isDivider;
  final bool isDestructive;

  const MenuItemData({
    required this.id,
    required this.label,
    this.icon,
    this.onTap,
    this.isDivider = false,
    this.isDestructive = false,
  });

  /// Create a divider item
  factory MenuItemData.divider({String id = 'divider'}) {
    return MenuItemData(id: id, label: '', isDivider: true);
  }
}

/// Generic dropdown menu molecule
class DropdownMenu extends StatelessWidget {
  /// Widget that triggers the menu (e.g., button, text, avatar)
  final Widget trigger;

  /// List of menu items to display
  final List<MenuItemData> items;

  /// Menu width (null = auto-sized)
  final double? menuWidth;

  const DropdownMenu({
    super.key,
    required this.trigger,
    required this.items,
    this.menuWidth,
  });

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final theme = Theme.of(context);

    return PopupMenuButton<String>(
      itemBuilder: (context) {
        return items.map((item) {
          if (item.isDivider) {
            return const PopupMenuDivider() as PopupMenuEntry<String>;
          }

          return PopupMenuItem<String>(
            value: item.id,
            onTap: item.onTap,
            child: Row(
              children: [
                if (item.icon != null) ...[
                  Icon(
                    item.icon,
                    size: spacing.lg,
                    color: item.isDestructive
                        ? theme.colorScheme.error
                        : theme.colorScheme.onSurface,
                  ),
                  SizedBox(width: spacing.md),
                ],
                Text(
                  item.label,
                  style: item.isDestructive
                      ? TextStyle(color: theme.colorScheme.error)
                      : null,
                ),
              ],
            ),
          );
        }).toList();
      },
      offset: Offset(0, spacing.lg),
      child: trigger,
    );
  }
}
