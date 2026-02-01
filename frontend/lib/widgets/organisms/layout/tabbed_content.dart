/// TabbedContent - Unified tabbed layout organism
///
/// SOLE RESPONSIBILITY: Compose TabBar with content using consistent styling
///
/// DUAL MODE: Supports both local state and URL-synced tab selection
/// - syncWithUrl: false → Internal TabController (local state)
/// - syncWithUrl: true → Derived from URL via go_router
///
/// CONTEXT-AGNOSTIC: Works in screens, modals, nested contexts
/// GENERIC: Uses contentBuilder for lazy content creation
/// THEME-AWARE: Uses AppColors and AppSpacing
///
/// Features:
/// - Horizontal or vertical tab orientation
/// - Optional icons on tabs
/// - URL-synced tabs (bookmarkable/shareable)
/// - Local state tabs (modals, nested contexts)
/// - Consistent styling across both modes
///
/// USAGE (Local State):
/// ```dart
/// TabbedContent(
///   tabs: [
///     TabConfig(id: 'profile', label: 'Profile', icon: Icons.person),
///     TabConfig(id: 'security', label: 'Security', icon: Icons.lock),
///   ],
///   contentBuilder: (tabId) => switch (tabId) {
///     'profile' => const ProfileTab(),
///     'security' => const SecurityTab(),
///     _ => const SizedBox.shrink(),
///   },
/// )
/// ```
///
/// USAGE (URL-Synced):
/// ```dart
/// TabbedContent(
///   syncWithUrl: true,
///   currentTabId: tabFromUrl,
///   baseRoute: '/admin/system/logs',
///   tabs: [
///     TabConfig(id: 'data', label: 'Data Changes'),
///     TabConfig(id: 'auth', label: 'Auth Events'),
///   ],
///   contentBuilder: (tabId) => switch (tabId) { ... },
/// )
/// ```
library;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../config/app_colors.dart';
import '../../../config/app_spacing.dart';

/// Configuration for a single tab
class TabConfig {
  /// Unique identifier for the tab (used in URL if synced)
  final String id;

  /// Display label for the tab
  final String label;

  /// Optional icon displayed before label
  final IconData? icon;

  /// Whether this tab is enabled (greyed out if false)
  final bool enabled;

  /// Optional tooltip for the tab
  final String? tooltip;

  /// Key for testing
  final Key? tabKey;

  const TabConfig({
    required this.id,
    required this.label,
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

/// TabbedContent - Unified tabbed layout organism
///
/// Supports both local state (internal TabController) and URL-synced
/// (go_router navigation) tab management via the `syncWithUrl` parameter.
class TabbedContent extends StatefulWidget {
  /// Tab configurations
  final List<TabConfig> tabs;

  /// Builder for tab content - receives tab ID, returns content widget
  /// Called lazily when tab is selected (memory efficient)
  final Widget Function(String tabId) contentBuilder;

  /// Whether to sync tab selection with URL via go_router
  /// When true, baseRoute and currentTabId are required
  final bool syncWithUrl;

  /// Base route for URL navigation (required if syncWithUrl)
  /// Tab routes will use query param: baseRoute?tab=tabId
  final String? baseRoute;

  /// Current tab ID from URL (required if syncWithUrl)
  final String? currentTabId;

  /// Initial tab index for local state mode (ignored if syncWithUrl)
  final int initialIndex;

  /// Callback when tab changes (for local state mode)
  final ValueChanged<int>? onTabChanged;

  /// Position of tab bar relative to content
  final TabPosition tabPosition;

  /// Optional title displayed above tabs
  final String? title;

  /// Whether to show divider between tab bar and content
  final bool showDivider;

  /// Whether tabs should be scrollable (for many tabs)
  final bool isScrollable;

  /// Tab indicator color (defaults to brand primary)
  final Color? indicatorColor;

  /// Custom content padding
  final EdgeInsetsGeometry? contentPadding;

  /// Custom tab bar padding
  final EdgeInsetsGeometry? tabBarPadding;

  const TabbedContent({
    super.key,
    required this.tabs,
    required this.contentBuilder,
    this.syncWithUrl = false,
    this.baseRoute,
    this.currentTabId,
    this.initialIndex = 0,
    this.onTabChanged,
    this.tabPosition = TabPosition.top,
    this.title,
    this.showDivider = true,
    this.isScrollable = false,
    this.indicatorColor,
    this.contentPadding,
    this.tabBarPadding,
  }) : assert(
         !syncWithUrl || (baseRoute != null && currentTabId != null),
         'baseRoute and currentTabId required when syncWithUrl is true',
       );

  @override
  State<TabbedContent> createState() => _TabbedContentState();
}

class _TabbedContentState extends State<TabbedContent>
    with SingleTickerProviderStateMixin {
  TabController? _tabController;

  @override
  void initState() {
    super.initState();
    if (!widget.syncWithUrl && widget.tabs.isNotEmpty) {
      _initTabController();
    }
  }

  void _initTabController() {
    if (widget.tabs.isEmpty) return;

    _tabController = TabController(
      length: widget.tabs.length,
      vsync: this,
      initialIndex: widget.initialIndex.clamp(0, widget.tabs.length - 1),
    );
    _tabController!.addListener(_handleTabChange);
  }

  @override
  void didUpdateWidget(TabbedContent oldWidget) {
    super.didUpdateWidget(oldWidget);

    // Handle mode switch
    if (oldWidget.syncWithUrl != widget.syncWithUrl) {
      if (widget.syncWithUrl) {
        _disposeTabController();
      } else {
        _initTabController();
      }
      return;
    }

    // Handle tab count change in local mode
    if (!widget.syncWithUrl && oldWidget.tabs.length != widget.tabs.length) {
      _disposeTabController();
      _initTabController();
    }
  }

  void _disposeTabController() {
    _tabController?.removeListener(_handleTabChange);
    _tabController?.dispose();
    _tabController = null;
  }

  @override
  void dispose() {
    _disposeTabController();
    super.dispose();
  }

  void _handleTabChange() {
    if (_tabController != null && !_tabController!.indexIsChanging) {
      widget.onTabChanged?.call(_tabController!.index);
    }
  }

  /// Get current tab index based on mode
  int get _currentIndex {
    if (widget.syncWithUrl) {
      final index = widget.tabs.indexWhere((t) => t.id == widget.currentTabId);
      return index >= 0 ? index : 0;
    }
    return _tabController?.index ?? 0;
  }

  /// Get current tab ID based on mode
  String get _currentTabId {
    if (widget.syncWithUrl) {
      return widget.currentTabId ?? widget.tabs.first.id;
    }
    final index = _tabController?.index ?? 0;
    return widget.tabs[index].id;
  }

  @override
  Widget build(BuildContext context) {
    if (widget.tabs.isEmpty) return const SizedBox.shrink();

    final theme = Theme.of(context);
    final spacing = context.spacing;
    final isVertical =
        widget.tabPosition == TabPosition.left ||
        widget.tabPosition == TabPosition.right;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Optional title
        if (widget.title != null) ...[
          Padding(
            padding: EdgeInsets.symmetric(
              horizontal: spacing.md,
              vertical: spacing.sm,
            ),
            child: Text(
              widget.title!,
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],

        // Layout based on position
        if (isVertical)
          Expanded(child: _buildVerticalLayout(context, theme, spacing))
        else
          Expanded(child: _buildHorizontalLayout(context, theme, spacing)),
      ],
    );
  }

  Widget _buildHorizontalLayout(
    BuildContext context,
    ThemeData theme,
    AppSpacing spacing,
  ) {
    final tabBar = _buildHorizontalTabBar(context, theme, spacing);
    final content = _buildContent(spacing);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: widget.tabPosition == TabPosition.bottom
          ? [Expanded(child: content), tabBar]
          : [
              tabBar,
              if (widget.showDivider) _buildHorizontalDivider(theme),
              Expanded(child: content),
            ],
    );
  }

  Widget _buildVerticalLayout(
    BuildContext context,
    ThemeData theme,
    AppSpacing spacing,
  ) {
    final tabBar = _buildVerticalTabBar(context, theme, spacing);
    final content = _buildContent(spacing);
    final divider = widget.showDivider
        ? VerticalDivider(width: 1, thickness: 1, color: theme.dividerColor)
        : const SizedBox.shrink();

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: widget.tabPosition == TabPosition.right
          ? [Expanded(child: content), divider, tabBar]
          : [tabBar, divider, Expanded(child: content)],
    );
  }

  Widget _buildHorizontalTabBar(
    BuildContext context,
    ThemeData theme,
    AppSpacing spacing,
  ) {
    if (widget.syncWithUrl) {
      // URL-synced: Custom tab bar with InkWell navigation
      return Container(
        decoration: BoxDecoration(
          color: theme.colorScheme.surface,
          border: Border(
            bottom: BorderSide(
              color: theme.colorScheme.outlineVariant,
              width: 1,
            ),
          ),
        ),
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              for (int i = 0; i < widget.tabs.length; i++)
                _buildUrlSyncedTab(
                  context,
                  theme,
                  spacing,
                  widget.tabs[i],
                  i == _currentIndex,
                ),
            ],
          ),
        ),
      );
    } else {
      // Local state: Flutter TabBar
      return TabBar(
        controller: _tabController,
        tabs: widget.tabs.map((config) {
          Widget tab = Tab(
            key: config.tabKey,
            icon: config.icon != null ? Icon(config.icon) : null,
            text: config.label,
          );
          if (config.tooltip != null) {
            tab = Tooltip(message: config.tooltip!, child: tab);
          }
          return tab;
        }).toList(),
        isScrollable: widget.isScrollable,
        padding: widget.tabBarPadding,
        indicatorColor: widget.indicatorColor ?? AppColors.brandPrimary,
        labelColor: AppColors.brandPrimary,
        unselectedLabelColor: AppColors.textSecondary,
        indicatorWeight: 3.0,
        labelStyle: theme.textTheme.titleSmall?.copyWith(
          fontWeight: FontWeight.w600,
        ),
        unselectedLabelStyle: theme.textTheme.titleSmall,
        dividerColor: Colors.transparent, // We handle divider separately
      );
    }
  }

  Widget _buildVerticalTabBar(
    BuildContext context,
    ThemeData theme,
    AppSpacing spacing,
  ) {
    return Container(
      width: 180,
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerLow,
        border: Border(
          right: BorderSide(color: theme.colorScheme.outlineVariant, width: 1),
        ),
      ),
      child: ListView(
        shrinkWrap: true,
        children: [
          for (int i = 0; i < widget.tabs.length; i++)
            _buildVerticalTab(
              context,
              theme,
              spacing,
              widget.tabs[i],
              i == _currentIndex,
            ),
        ],
      ),
    );
  }

  Widget _buildUrlSyncedTab(
    BuildContext context,
    ThemeData theme,
    AppSpacing spacing,
    TabConfig tab,
    bool isSelected,
  ) {
    final tabWidget = InkWell(
      onTap: tab.enabled ? () => _navigateToTab(context, tab.id) : null,
      child: Container(
        padding: EdgeInsets.symmetric(
          horizontal: spacing.md,
          vertical: spacing.sm,
        ),
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(
              color: isSelected
                  ? (widget.indicatorColor ?? AppColors.brandPrimary)
                  : Colors.transparent,
              width: 3,
            ),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (tab.icon != null) ...[
              Icon(
                tab.icon,
                size: spacing.iconSizeLG,
                color: isSelected
                    ? (widget.indicatorColor ?? AppColors.brandPrimary)
                    : tab.enabled
                    ? theme.colorScheme.onSurfaceVariant
                    : theme.disabledColor,
              ),
              SizedBox(width: spacing.xs),
            ],
            Text(
              tab.label,
              style: theme.textTheme.labelLarge?.copyWith(
                color: isSelected
                    ? (widget.indicatorColor ?? AppColors.brandPrimary)
                    : tab.enabled
                    ? theme.colorScheme.onSurface
                    : theme.disabledColor,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );

    if (tab.tooltip != null) {
      return Tooltip(message: tab.tooltip!, child: tabWidget);
    }
    return tabWidget;
  }

  Widget _buildVerticalTab(
    BuildContext context,
    ThemeData theme,
    AppSpacing spacing,
    TabConfig tab,
    bool isSelected,
  ) {
    final indicatorColor = widget.indicatorColor ?? AppColors.brandPrimary;

    final tabWidget = InkWell(
      onTap: tab.enabled ? () => _handleVerticalTabTap(context, tab) : null,
      child: Container(
        key: tab.tabKey,
        width: double.infinity,
        padding: EdgeInsets.symmetric(
          horizontal: spacing.md,
          vertical: spacing.sm,
        ),
        decoration: BoxDecoration(
          color: isSelected
              ? indicatorColor.withValues(alpha: 0.1)
              : Colors.transparent,
          border: Border(
            left: BorderSide(
              color: isSelected ? indicatorColor : Colors.transparent,
              width: 3,
            ),
          ),
        ),
        child: Row(
          children: [
            if (tab.icon != null) ...[
              Icon(
                tab.icon,
                size: spacing.iconSizeLG,
                color: isSelected
                    ? indicatorColor
                    : tab.enabled
                    ? theme.colorScheme.onSurfaceVariant
                    : theme.disabledColor,
              ),
              SizedBox(width: spacing.sm),
            ],
            Expanded(
              child: Text(
                tab.label,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: isSelected
                      ? indicatorColor
                      : tab.enabled
                      ? theme.colorScheme.onSurface
                      : theme.disabledColor,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                ),
              ),
            ),
          ],
        ),
      ),
    );

    if (tab.tooltip != null) {
      return Tooltip(message: tab.tooltip!, child: tabWidget);
    }
    return tabWidget;
  }

  void _handleVerticalTabTap(BuildContext context, TabConfig tab) {
    if (widget.syncWithUrl) {
      _navigateToTab(context, tab.id);
    } else {
      final index = widget.tabs.indexWhere((t) => t.id == tab.id);
      if (index >= 0) {
        _tabController?.animateTo(index);
      }
    }
  }

  Widget _buildContent(AppSpacing spacing) {
    if (widget.syncWithUrl) {
      // URL-synced: Direct content building
      return Padding(
        padding: widget.contentPadding ?? EdgeInsets.all(spacing.md),
        child: widget.contentBuilder(_currentTabId),
      );
    } else {
      // Local state: TabBarView for swipe support
      return TabBarView(
        controller: _tabController,
        children: widget.tabs.map((config) {
          return Padding(
            padding: widget.contentPadding ?? EdgeInsets.all(spacing.lg),
            child: widget.contentBuilder(config.id),
          );
        }).toList(),
      );
    }
  }

  Widget _buildHorizontalDivider(ThemeData theme) {
    return Divider(height: 1, thickness: 1, color: theme.dividerColor);
  }

  void _navigateToTab(BuildContext context, String tabId) {
    final route = '${widget.baseRoute}?tab=$tabId';
    context.go(route);
  }
}
