/// AdaptiveNavMenu - Unified navigation popup menu
///
/// **SINGLE RESPONSIBILITY:** Present navigation options adaptively
///
/// DISPLAY MODE (controlled by [MenuDisplayMode]):
/// - [MenuDisplayMode.adaptive] (default): Popup on desktop/tablet, bottom sheet on mobile
/// - [MenuDisplayMode.dropdown]: Always popup dropdown anchored to trigger
///
/// UNIFIED DATA MODEL: Uses NavMenuItem for all menu items
/// - Supports icons, dividers, children, visibility rules
/// - Replaces: AppHeaderMenuItem, MenuItemData
///
/// Usage:
/// ```dart
/// // Adaptive menu (bottom sheet on mobile, popup on desktop)
/// AdaptiveNavMenu(
///   trigger: Icon(Icons.menu),
///   items: [
///     NavMenuItem(id: 'settings', label: 'Settings', icon: Icons.settings),
///     NavMenuItem.divider(),
///     NavMenuItem(id: 'logout', label: 'Logout', icon: Icons.logout),
///   ],
///   onSelected: (item) => handleSelection(item),
/// )
///
/// // User avatar menu - always dropdown from trigger, never bottom sheet
/// AdaptiveNavMenu(
///   trigger: Avatar(user: currentUser),
///   displayMode: MenuDisplayMode.dropdown,
///   items: userMenuItems,
///   onSelected: (item) => handleSelection(item),
/// )
///
/// // Imperatively (for custom triggers)
/// final selected = await AdaptiveNavMenu.show(
///   context: context,
///   items: menuItems,
///   title: 'Select Option',
///   displayMode: MenuDisplayMode.adaptive, // or .dropdown
/// );
/// ```
library;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../config/app_spacing.dart';
import '../../../config/platform_utilities.dart';
import '../../organisms/navigation/nav_menu_item.dart';

/// Controls how the menu is displayed and positioned
///
/// - [adaptive]: Adapts based on screen size (popup on desktop, bottom sheet on mobile)
/// - [dropdown]: Always shows as popup dropdown from trigger (e.g., user avatar menu)
enum MenuDisplayMode {
  /// Adaptive: popup on desktop/tablet, bottom sheet on mobile
  adaptive,

  /// Always popup dropdown positioned relative to trigger
  dropdown,
}

/// Default popup menu offset (from anchor point)
const _kDefaultPopupOffset = Offset(0, 40);

/// Default popup position from right edge
const _kPopupRightMargin = 16.0;
const _kPopupWidth = 200.0;
const _kPopupTopOffset = 50.0;

/// Adaptive navigation menu that switches between popup and bottom sheet
class AdaptiveNavMenu extends StatelessWidget {
  /// Widget that triggers the menu (e.g., icon, avatar, button)
  final Widget trigger;

  /// Menu items to display
  final List<NavMenuItem> items;

  /// Callback when an item is selected
  final void Function(NavMenuItem item)? onSelected;

  /// Optional header widget (shown in both popup and bottom sheet modes)
  final Widget? header;

  /// Tooltip for the trigger button
  final String? tooltip;

  /// Position offset for popup menu (ignored in bottom sheet mode)
  final Offset popupOffset;

  /// Controls menu display mode and positioning
  ///
  /// - [MenuDisplayMode.adaptive]: Adapts based on screen size (default)
  /// - [MenuDisplayMode.dropdown]: Always popup, ideal for user menus
  /// - [MenuDisplayMode.bottomSheet]: Always bottom sheet
  final MenuDisplayMode displayMode;

  const AdaptiveNavMenu({
    super.key,
    required this.trigger,
    required this.items,
    this.onSelected,
    this.header,
    this.tooltip,
    this.popupOffset = _kDefaultPopupOffset,
    this.displayMode = MenuDisplayMode.adaptive,
  });

  /// Show menu imperatively and return selected item
  ///
  /// Use this when you need programmatic control over when the menu appears.
  /// Returns null if dismissed without selection.
  static Future<NavMenuItem?> show({
    required BuildContext context,
    required List<NavMenuItem> items,
    String? title,
    Widget? header,
    RelativeRect? position,
    MenuDisplayMode displayMode = MenuDisplayMode.adaptive,
  }) {
    final useBottomSheet = _shouldUseBottomSheet(context, displayMode);

    if (useBottomSheet) {
      return _showBottomSheet(
        context: context,
        items: items,
        title: title,
        header: header,
      );
    }

    return _showPopupMenu(
      context: context,
      items: items,
      position: position ?? _defaultPosition(context),
    );
  }

  /// Determines whether to use bottom sheet based on display mode and screen size
  static bool _shouldUseBottomSheet(
    BuildContext context,
    MenuDisplayMode mode,
  ) {
    switch (mode) {
      case MenuDisplayMode.dropdown:
        return false; // Always popup anchored to trigger
      case MenuDisplayMode.adaptive:
        // Adaptive: bottom sheet on mobile, popup on desktop/tablet
        return PlatformUtilities.breakpointAdaptive<bool>(
          context: context,
          compact: true,
          expanded: false,
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    // Caller is responsible for pre-filtering items by visibility
    // This widget displays whatever items are passed to it
    if (items.isEmpty) return const SizedBox.shrink();

    final useBottomSheet = _shouldUseBottomSheet(context, displayMode);

    if (useBottomSheet) {
      return _buildBottomSheetTrigger(context, items);
    }

    return _buildPopupMenuButton(context, items);
  }

  // ============================================================================
  // POPUP MENU (Desktop/Tablet)
  // ============================================================================

  Widget _buildPopupMenuButton(BuildContext context, List<NavMenuItem> items) {
    return PopupMenuButton<String>(
      offset: popupOffset,
      tooltip: tooltip,
      onSelected: (id) => _handleSelection(context, id, items),
      itemBuilder: (_) => _buildPopupEntries(context, items, header: header),
      child: trigger,
    );
  }

  /// Builds popup menu entries from items
  ///
  /// Shared by both widget and static show method.
  static List<PopupMenuEntry<String>> _buildPopupEntries(
    BuildContext context,
    List<NavMenuItem> items, {
    Widget? header,
  }) {
    final theme = Theme.of(context);
    final spacing = context.spacing;
    final result = <PopupMenuEntry<String>>[];

    // Add header as non-selectable first item if provided
    if (header != null) {
      result.add(
        PopupMenuItem<String>(
          enabled: false,
          padding: EdgeInsets.symmetric(
            horizontal: spacing.md,
            vertical: spacing.sm,
          ),
          child: header,
        ),
      );
      result.add(const PopupMenuDivider());
    }

    for (final item in items) {
      if (item.isDivider) {
        result.add(const PopupMenuDivider());
        continue;
      }

      if (item.isSectionHeader) {
        result.add(
          PopupMenuItem<String>(
            enabled: false,
            height: spacing.xl,
            child: Text(
              item.label,
              style: theme.textTheme.labelSmall?.copyWith(
                color: theme.colorScheme.primary,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        );
        continue;
      }

      result.add(
        PopupMenuItem<String>(
          value: item.id,
          child: _MenuItemRow(item: item),
        ),
      );
    }

    return result;
  }

  static Future<NavMenuItem?> _showPopupMenu({
    required BuildContext context,
    required List<NavMenuItem> items,
    required RelativeRect position,
    Widget? header,
  }) async {
    if (items.isEmpty) return null;

    final entries = _buildPopupEntries(context, items, header: header);

    final selectedId = await showMenu<String>(
      context: context,
      position: position,
      items: entries,
    );

    if (selectedId == null) return null;
    return items.firstWhere(
      (item) => item.id == selectedId,
      orElse: () => items.first,
    );
  }

  // ============================================================================
  // BOTTOM SHEET (Mobile)
  // ============================================================================

  Widget _buildBottomSheetTrigger(
    BuildContext context,
    List<NavMenuItem> items,
  ) {
    return GestureDetector(
      onTap: () => _openBottomSheet(context, items),
      child: Tooltip(message: tooltip ?? '', child: trigger),
    );
  }

  void _openBottomSheet(BuildContext context, List<NavMenuItem> items) async {
    final selected = await _showBottomSheet(
      context: context,
      items: items,
      header: header,
    );

    if (selected != null && onSelected != null) {
      onSelected!(selected);
    }
  }

  static Future<NavMenuItem?> _showBottomSheet({
    required BuildContext context,
    required List<NavMenuItem> items,
    String? title,
    Widget? header,
  }) {
    // Caller is responsible for pre-filtering items
    if (items.isEmpty) return Future.value(null);

    // Haptic feedback on mobile
    if (PlatformUtilities.isTouchDevice) {
      HapticFeedback.selectionClick();
    }

    return showModalBottomSheet<NavMenuItem>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (context) =>
          _BottomSheetContent(items: items, title: title, header: header),
    );
  }

  // ============================================================================
  // SHARED HELPERS
  // ============================================================================

  void _handleSelection(
    BuildContext context,
    String id,
    List<NavMenuItem> items,
  ) {
    final item = items.firstWhere((i) => i.id == id, orElse: () => items.first);

    // Execute item's onTap if defined
    if (item.onTap != null) {
      item.onTap!(context);
    }

    // Also call external onSelected
    onSelected?.call(item);
  }

  static RelativeRect _defaultPosition(BuildContext context) {
    final size = MediaQuery.of(context).size;
    return RelativeRect.fromLTRB(
      size.width - _kPopupWidth,
      _kPopupTopOffset,
      _kPopupRightMargin,
      0,
    );
  }
}

// =============================================================================
// PRIVATE WIDGETS
// =============================================================================

/// Bottom sheet content with scrollable list of items
class _BottomSheetContent extends StatelessWidget {
  final List<NavMenuItem> items;
  final String? title;
  final Widget? header;

  const _BottomSheetContent({required this.items, this.title, this.header});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final spacing = context.spacing;

    return SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Optional header
          if (header != null) ...[
            Padding(
              padding: EdgeInsets.symmetric(horizontal: spacing.md),
              child: header!,
            ),
            Divider(height: spacing.md),
          ] else if (title != null) ...[
            Padding(
              padding: EdgeInsets.symmetric(
                horizontal: spacing.md,
                vertical: spacing.sm,
              ),
              child: Text(
                title!,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
            ),
            Divider(height: spacing.xs),
          ],

          // Scrollable list of items
          Flexible(
            child: ListView.builder(
              shrinkWrap: true,
              padding: EdgeInsets.only(bottom: spacing.md),
              itemCount: items.length,
              itemBuilder: (context, index) {
                final item = items[index];

                if (item.isDivider) {
                  return const Divider();
                }

                if (item.isSectionHeader) {
                  return _SectionHeader(item: item);
                }

                return _BottomSheetItem(
                  item: item,
                  onTap: () {
                    // Haptic feedback
                    if (PlatformUtilities.isTouchDevice) {
                      HapticFeedback.selectionClick();
                    }

                    // Execute item's onTap
                    if (item.onTap != null) {
                      item.onTap!(context);
                    }

                    // Return the item
                    Navigator.of(context).pop(item);
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

/// Section header in bottom sheet
class _SectionHeader extends StatelessWidget {
  final NavMenuItem item;

  const _SectionHeader({required this.item});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final spacing = context.spacing;

    return Padding(
      padding: EdgeInsets.fromLTRB(
        spacing.md,
        spacing.md,
        spacing.md,
        spacing.xs,
      ),
      child: Text(
        item.label,
        style: theme.textTheme.labelSmall?.copyWith(
          color: theme.colorScheme.primary,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}

/// Single item in bottom sheet
class _BottomSheetItem extends StatelessWidget {
  final NavMenuItem item;
  final VoidCallback onTap;

  const _BottomSheetItem({required this.item, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;

    return ListTile(
      leading: item.icon != null ? Icon(item.icon) : null,
      title: Text(item.label),
      trailing: item.badgeCount != null && item.badgeCount! > 0
          ? Badge.count(count: item.badgeCount!)
          : null,
      contentPadding: EdgeInsets.symmetric(horizontal: spacing.md),
      onTap: onTap,
    );
  }
}

/// Menu item row for popup menu
class _MenuItemRow extends StatelessWidget {
  final NavMenuItem item;

  const _MenuItemRow({required this.item});

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;

    return Row(
      children: [
        if (item.icon != null) ...[
          Icon(item.icon, size: spacing.lg),
          SizedBox(width: spacing.sm),
        ],
        Expanded(child: Text(item.label)),
        if (item.badgeCount != null && item.badgeCount! > 0)
          Badge.count(count: item.badgeCount!),
      ],
    );
  }
}
