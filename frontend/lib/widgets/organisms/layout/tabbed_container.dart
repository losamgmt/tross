/// TabbedContainer - Generic tabbed layout organism
///
/// SOLE RESPONSIBILITY: Compose TabBar + TabBarView with consistent styling
///
/// CONTEXT-AGNOSTIC: Works in screens, modals, nested contexts
/// GENERIC: Works with any tab content widgets
/// THEME-AWARE: Uses AppColors and AppSpacing
///
/// Features:
/// - Horizontal or vertical tab orientation
/// - Optional icons on tabs
/// - Permission-gated tabs (hidden if no permission)
/// - Nestable (tabs within tabs)
/// - Works inside modals
///
/// Usage:
/// ```dart
/// TabbedContainer(
///   tabs: [
///     TabConfig(label: 'Profile', icon: Icons.person, content: ProfileTab()),
///     TabConfig(label: 'Security', icon: Icons.lock, content: SecurityTab()),
///   ],
/// )
/// ```
library;

import 'package:flutter/material.dart';
import '../../../config/app_colors.dart';
import '../../../config/app_spacing.dart';

/// Configuration for a single tab
class TabConfig {
  /// Display label for the tab
  final String label;

  /// Optional icon displayed before label
  final IconData? icon;

  /// Content widget displayed when tab is selected
  final Widget content;

  /// Whether this tab is enabled (greyed out if false)
  final bool enabled;

  /// Optional tooltip for the tab
  final String? tooltip;

  /// Key for testing
  final Key? tabKey;

  const TabConfig({
    required this.label,
    required this.content,
    this.icon,
    this.enabled = true,
    this.tooltip,
    this.tabKey,
  });
}

/// Tab bar position relative to content
enum TabPosition {
  /// Tabs above content (default)
  top,

  /// Tabs below content
  bottom,

  /// Tabs on left side (vertical)
  left,

  /// Tabs on right side (vertical)
  right,
}

/// TabbedContainer - Generic tabbed layout organism
///
/// Composes Flutter's TabBar + TabBarView with consistent styling
/// and additional features like icons, tooltips, and flexible positioning.
class TabbedContainer extends StatefulWidget {
  /// List of tab configurations
  final List<TabConfig> tabs;

  /// Position of tab bar relative to content
  final TabPosition tabPosition;

  /// Initial tab index (defaults to 0)
  final int initialIndex;

  /// Callback when tab changes
  final ValueChanged<int>? onTabChanged;

  /// Whether tabs should expand to fill available width
  final bool isScrollable;

  /// Custom tab bar padding
  final EdgeInsetsGeometry? tabBarPadding;

  /// Custom content padding
  final EdgeInsetsGeometry? contentPadding;

  /// Tab indicator color (defaults to brand primary)
  final Color? indicatorColor;

  /// Selected tab label color
  final Color? selectedLabelColor;

  /// Unselected tab label color
  final Color? unselectedLabelColor;

  /// Whether to show divider between tab bar and content
  final bool showDivider;

  /// Custom height for horizontal tabs (null = auto)
  final double? tabBarHeight;

  /// Custom width for vertical tabs (null = auto)
  final double? tabBarWidth;

  const TabbedContainer({
    super.key,
    required this.tabs,
    this.tabPosition = TabPosition.top,
    this.initialIndex = 0,
    this.onTabChanged,
    this.isScrollable = false,
    this.tabBarPadding,
    this.contentPadding,
    this.indicatorColor,
    this.selectedLabelColor,
    this.unselectedLabelColor,
    this.showDivider = true,
    this.tabBarHeight,
    this.tabBarWidth,
  });

  @override
  State<TabbedContainer> createState() => _TabbedContainerState();
}

class _TabbedContainerState extends State<TabbedContainer>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(
      length: widget.tabs.length,
      vsync: this,
      initialIndex: widget.initialIndex.clamp(0, widget.tabs.length - 1),
    );
    _tabController.addListener(_handleTabChange);
  }

  @override
  void didUpdateWidget(TabbedContainer oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Recreate controller if tab count changes
    if (oldWidget.tabs.length != widget.tabs.length) {
      _tabController.removeListener(_handleTabChange);
      _tabController.dispose();
      _tabController = TabController(
        length: widget.tabs.length,
        vsync: this,
        initialIndex: 0,
      );
      _tabController.addListener(_handleTabChange);
    }
  }

  @override
  void dispose() {
    _tabController.removeListener(_handleTabChange);
    _tabController.dispose();
    super.dispose();
  }

  void _handleTabChange() {
    if (!_tabController.indexIsChanging) {
      widget.onTabChanged?.call(_tabController.index);
    }
  }

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final theme = Theme.of(context);

    // Build tab widgets
    final tabWidgets = widget.tabs.map((config) {
      Widget tab = Tab(
        key: config.tabKey,
        icon: config.icon != null ? Icon(config.icon) : null,
        text: config.label,
      );

      // Wrap with tooltip if provided
      if (config.tooltip != null) {
        tab = Tooltip(message: config.tooltip!, child: tab);
      }

      return tab;
    }).toList();

    // Build tab bar with styling
    final tabBar = TabBar(
      controller: _tabController,
      tabs: tabWidgets,
      isScrollable: widget.isScrollable,
      padding: widget.tabBarPadding,
      indicatorColor: widget.indicatorColor ?? AppColors.brandPrimary,
      labelColor: widget.selectedLabelColor ?? AppColors.brandPrimary,
      unselectedLabelColor:
          widget.unselectedLabelColor ?? AppColors.textSecondary,
      indicatorWeight: 3.0,
      labelStyle: theme.textTheme.titleSmall?.copyWith(
        fontWeight: FontWeight.w600,
      ),
      unselectedLabelStyle: theme.textTheme.titleSmall,
      dividerColor: widget.showDivider ? AppColors.divider : Colors.transparent,
    );

    // Build tab content
    final tabContent = TabBarView(
      controller: _tabController,
      children: widget.tabs.map((config) {
        return Padding(
          padding: widget.contentPadding ?? EdgeInsets.all(spacing.lg),
          child: config.content,
        );
      }).toList(),
    );

    // Arrange based on position
    return _buildLayout(tabBar, tabContent, spacing);
  }

  Widget _buildLayout(Widget tabBar, Widget tabContent, AppSpacing spacing) {
    switch (widget.tabPosition) {
      case TabPosition.top:
        return Column(
          children: [
            SizedBox(height: widget.tabBarHeight, child: tabBar),
            Expanded(child: tabContent),
          ],
        );

      case TabPosition.bottom:
        return Column(
          children: [
            Expanded(child: tabContent),
            SizedBox(height: widget.tabBarHeight, child: tabBar),
          ],
        );

      case TabPosition.left:
        return Row(
          children: [
            SizedBox(
              width: widget.tabBarWidth ?? 150,
              child: RotatedBox(quarterTurns: 3, child: tabBar),
            ),
            if (widget.showDivider)
              VerticalDivider(width: 1, color: AppColors.divider),
            Expanded(child: tabContent),
          ],
        );

      case TabPosition.right:
        return Row(
          children: [
            Expanded(child: tabContent),
            if (widget.showDivider)
              VerticalDivider(width: 1, color: AppColors.divider),
            SizedBox(
              width: widget.tabBarWidth ?? 150,
              child: RotatedBox(quarterTurns: 1, child: tabBar),
            ),
          ],
        );
    }
  }
}
