/// MobileNavBar - Bottom navigation bar for mobile/compact screens
///
/// Material Design 3 bottom navigation following mobile-first patterns.
/// Displays up to 5 items (Material guideline) with active state highlighting.
///
/// Platform-aware:
/// - Touch devices: Haptic feedback on selection
/// - All devices: Route-based active state
///
/// Usage:
/// ```dart
/// MobileNavBar(
///   items: NavMenuBuilder.buildMobileNavItems(),
///   currentRoute: '/home',
///   onItemTap: (item) => context.go(item.route!),
/// )
/// ```
library;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../config/platform_utilities.dart';
import '../../organisms/navigation/nav_menu_item.dart';

/// Bottom navigation bar for mobile/compact screens
class MobileNavBar extends StatelessWidget {
  /// Navigation items (max 5 per Material guidelines)
  final List<NavMenuItem> items;

  /// Current active route for highlighting
  final String currentRoute;

  /// Callback when item is tapped
  final void Function(NavMenuItem item)? onItemTap;

  /// Background color (defaults to theme surface)
  final Color? backgroundColor;

  /// Selected item color (defaults to primary)
  final Color? selectedColor;

  /// Unselected item color (defaults to onSurfaceVariant)
  final Color? unselectedColor;

  /// Whether to show labels
  final bool showLabels;

  /// Whether to show labels only when selected
  final bool showSelectedLabelsOnly;

  const MobileNavBar({
    super.key,
    required this.items,
    required this.currentRoute,
    this.onItemTap,
    this.backgroundColor,
    this.selectedColor,
    this.unselectedColor,
    this.showLabels = true,
    this.showSelectedLabelsOnly = false,
  });

  /// Build from NavMenuItems, filtering to max 5 with icons
  factory MobileNavBar.fromItems({
    Key? key,
    required List<NavMenuItem> allItems,
    required String currentRoute,
    void Function(NavMenuItem item)? onItemTap,
    int maxItems = 5,
  }) {
    // Filter to items that have icons and routes (required for bottom nav)
    final validItems = allItems
        .where((item) => item.icon != null && item.route != null)
        .take(maxItems)
        .toList();

    return MobileNavBar(
      key: key,
      items: validItems,
      currentRoute: currentRoute,
      onItemTap: onItemTap,
    );
  }

  @override
  Widget build(BuildContext context) {
    // NavigationBar requires at least 2 destinations
    // Return empty widget if insufficient items
    if (items.length < 2) return const SizedBox.shrink();

    final theme = Theme.of(context);
    final effectiveSelectedColor = selectedColor ?? theme.colorScheme.primary;
    final effectiveUnselectedColor =
        unselectedColor ?? theme.colorScheme.onSurfaceVariant;

    return NavigationBar(
      backgroundColor: backgroundColor,
      indicatorColor: effectiveSelectedColor.withValues(alpha: 0.12),
      selectedIndex: _getSelectedIndex(),
      labelBehavior: _getLabelBehavior(),
      onDestinationSelected: (index) => _handleTap(context, index),
      destinations: items.map((item) {
        final isSelected = _isItemSelected(item);
        return NavigationDestination(
          icon: Icon(
            item.icon,
            color: isSelected
                ? effectiveSelectedColor
                : effectiveUnselectedColor,
          ),
          selectedIcon: Icon(item.icon, color: effectiveSelectedColor),
          label: item.label,
          tooltip: item.label,
        );
      }).toList(),
    );
  }

  NavigationDestinationLabelBehavior _getLabelBehavior() {
    if (!showLabels) {
      return NavigationDestinationLabelBehavior.alwaysHide;
    }
    if (showSelectedLabelsOnly) {
      return NavigationDestinationLabelBehavior.onlyShowSelected;
    }
    return NavigationDestinationLabelBehavior.alwaysShow;
  }

  int _getSelectedIndex() {
    for (int i = 0; i < items.length; i++) {
      if (_isItemSelected(items[i])) {
        return i;
      }
    }
    return 0;
  }

  bool _isItemSelected(NavMenuItem item) {
    if (item.route == null) return false;
    // Exact match or starts with (for nested routes)
    return currentRoute == item.route ||
        currentRoute.startsWith('${item.route}/');
  }

  void _handleTap(BuildContext context, int index) {
    if (index < 0 || index >= items.length) return;

    final item = items[index];

    // Haptic feedback on touch devices
    if (PlatformUtilities.isTouchDevice) {
      HapticFeedback.selectionClick();
    }

    // Call custom handler or item's onTap
    if (onItemTap != null) {
      onItemTap!(item);
    } else if (item.onTap != null) {
      item.onTap!(context);
    }
  }
}
