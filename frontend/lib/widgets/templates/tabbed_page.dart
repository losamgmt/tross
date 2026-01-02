/// TabbedPage - URL-driven tabbed page template
///
/// SOLE RESPONSIBILITY: Compose TabBar with URL-synced navigation
///
/// PURE COMPOSITION: Composes TabBar + content, delegates navigation to go_router.
/// No internal tab state - tab selection is derived from URL.
///
/// Used for:
/// - Admin panels (System Config tabs: Health, Roles, etc.)
/// - Settings pages with multiple sections
/// - Any page where tabs should be bookmarkable/shareable
///
/// URL Pattern:
/// - Base route: /admin/system
/// - Tab routes: /admin/system/health, /admin/system/roles
/// - Tab ID extracted from URL segment
///
/// USAGE:
/// ```dart
/// TabbedPage(
///   currentTabId: 'health', // from URL
///   tabs: [
///     TabDefinition(id: 'health', label: 'Health', icon: Icons.monitor_heart),
///     TabDefinition(id: 'roles', label: 'Roles', icon: Icons.people),
///   ],
///   baseRoute: '/admin/system',
///   contentBuilder: (tabId) => switch (tabId) {
///     'health' => const HealthPanel(),
///     'roles' => const RolesPanel(),
///     _ => const SizedBox.shrink(),
///   },
/// )
/// ```
library;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../config/app_colors.dart';
import '../../config/app_spacing.dart';

/// Definition for a single tab
class TabDefinition {
  /// Unique identifier for the tab (used in URL)
  final String id;

  /// Display label for the tab
  final String label;

  /// Optional icon displayed before label
  final IconData? icon;

  /// Whether this tab is enabled
  final bool enabled;

  /// Optional tooltip for the tab
  final String? tooltip;

  const TabDefinition({
    required this.id,
    required this.label,
    this.icon,
    this.enabled = true,
    this.tooltip,
  });
}

/// TabbedPage - URL-driven tabbed layout template
///
/// Composes TabBar with go_router navigation.
/// Tab selection is controlled by URL, not internal state.
class TabbedPage extends StatelessWidget {
  /// Current tab ID (extracted from URL)
  final String currentTabId;

  /// List of tab definitions
  final List<TabDefinition> tabs;

  /// Base route for tab navigation (e.g., '/admin/system')
  /// Tab routes will be: baseRoute/tabId
  final String baseRoute;

  /// Builder for tab content
  /// Receives the current tab ID and returns the content widget
  final Widget Function(String tabId) contentBuilder;

  /// Optional title displayed above tabs
  final String? title;

  /// Tab bar position (top or left for vertical layout)
  final Axis tabAxis;

  /// Custom padding around content
  final EdgeInsetsGeometry? contentPadding;

  /// Whether to show divider between tab bar and content
  final bool showDivider;

  const TabbedPage({
    super.key,
    required this.currentTabId,
    required this.tabs,
    required this.baseRoute,
    required this.contentBuilder,
    this.title,
    this.tabAxis = Axis.horizontal,
    this.contentPadding,
    this.showDivider = true,
  });

  @override
  Widget build(BuildContext context) {
    if (tabs.isEmpty) return const SizedBox.shrink();

    final theme = Theme.of(context);
    final spacing = context.spacing;

    // Find current tab index
    final currentIndex = tabs.indexWhere((t) => t.id == currentTabId);
    final validIndex = currentIndex >= 0 ? currentIndex : 0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Optional title
        if (title != null) ...[
          Padding(
            padding: EdgeInsets.symmetric(
              horizontal: spacing.md,
              vertical: spacing.sm,
            ),
            child: Text(
              title!,
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],

        // Tab bar
        if (tabAxis == Axis.horizontal)
          _buildHorizontalTabBar(context, theme, spacing, validIndex)
        else
          Expanded(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildVerticalTabBar(context, theme, spacing, validIndex),
                if (showDivider)
                  VerticalDivider(
                    width: 1,
                    thickness: 1,
                    color: theme.dividerColor,
                  ),
                Expanded(child: _buildContent(spacing)),
              ],
            ),
          ),

        // Divider (horizontal layout only)
        if (tabAxis == Axis.horizontal && showDivider)
          Divider(height: 1, thickness: 1, color: theme.dividerColor),

        // Content (horizontal layout only)
        if (tabAxis == Axis.horizontal) Expanded(child: _buildContent(spacing)),
      ],
    );
  }

  Widget _buildHorizontalTabBar(
    BuildContext context,
    ThemeData theme,
    AppSpacing spacing,
    int currentIndex,
  ) {
    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        border: Border(
          bottom: BorderSide(color: theme.colorScheme.outlineVariant, width: 1),
        ),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            for (int i = 0; i < tabs.length; i++)
              _buildTab(context, theme, spacing, tabs[i], i == currentIndex),
          ],
        ),
      ),
    );
  }

  Widget _buildVerticalTabBar(
    BuildContext context,
    ThemeData theme,
    AppSpacing spacing,
    int currentIndex,
  ) {
    return Container(
      width: AppBreakpoints.verticalTabWidth,
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerLow,
        border: Border(
          right: BorderSide(color: theme.colorScheme.outlineVariant, width: 1),
        ),
      ),
      child: ListView(
        shrinkWrap: true,
        children: [
          for (int i = 0; i < tabs.length; i++)
            _buildVerticalTab(
              context,
              theme,
              spacing,
              tabs[i],
              i == currentIndex,
            ),
        ],
      ),
    );
  }

  Widget _buildTab(
    BuildContext context,
    ThemeData theme,
    AppSpacing spacing,
    TabDefinition tab,
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
              color: isSelected ? AppColors.brandPrimary : Colors.transparent,
              width: 2,
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
                    ? AppColors.brandPrimary
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
                    ? AppColors.brandPrimary
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
    TabDefinition tab,
    bool isSelected,
  ) {
    final tabWidget = InkWell(
      onTap: tab.enabled ? () => _navigateToTab(context, tab.id) : null,
      child: Container(
        width: double.infinity,
        padding: EdgeInsets.symmetric(
          horizontal: spacing.md,
          vertical: spacing.sm,
        ),
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.brandPrimary.withValues(alpha: 0.1)
              : Colors.transparent,
          border: Border(
            left: BorderSide(
              color: isSelected ? AppColors.brandPrimary : Colors.transparent,
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
                    ? AppColors.brandPrimary
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
                      ? AppColors.brandPrimary
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

  Widget _buildContent(AppSpacing spacing) {
    return Padding(
      padding: contentPadding ?? EdgeInsets.all(spacing.md),
      child: contentBuilder(currentTabId),
    );
  }

  void _navigateToTab(BuildContext context, String tabId) {
    // Navigate to tab route: baseRoute/tabId
    final route = baseRoute.endsWith('/')
        ? '$baseRoute$tabId'
        : '$baseRoute/$tabId';
    context.go(route);
  }
}
