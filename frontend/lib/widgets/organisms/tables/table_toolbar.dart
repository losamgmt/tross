/// TableToolbar - Organism component for table controls
///
/// LAYOUT (Position-based):
/// - Leading actions (date pickers, view controls) - never overflow
/// - Search (expands to fill available space)
/// - Actions (refresh, create, delete) - can overflow on mobile
/// - Trailing actions (settings, customize) - never overflow
///
/// Mobile: Actions in overflow menu
/// Tablet: First 2 actions inline, rest in overflow
/// Desktop: All actions inline (unless space constrained)
///
/// Actions are DATA (ActionItem), not widgets - this allows appropriate
/// rendering for different contexts (inline buttons, overflow menu, etc.)
///
/// Position is purely a placement concern - any action can move to any
/// position by changing the position property.
///
/// Composes: DebouncedSearchFilter, ActionMenu
library;

import 'package:flutter/material.dart';
import '../../../config/app_sizes.dart';
import '../../../config/app_spacing.dart';
import '../../molecules/menus/action_item.dart';
import '../../molecules/menus/action_menu.dart';
import '../search/debounced_search_filter.dart';

class TableToolbar extends StatelessWidget {
  /// Search placeholder text
  final String searchPlaceholder;

  /// Callback when search changes
  final ValueChanged<String>? onSearch;

  /// Action items (refresh, create, export, filters, etc.)
  /// Position determines placement: leading, actions, or trailing.
  final List<ActionItem>? actionItems;

  /// @deprecated Use actionItems with position instead.
  /// Trailing widgets (for complex widgets like customization menu)
  /// These are NOT included in the action overflow - always shown
  final List<Widget>? trailingWidgets;

  const TableToolbar({
    super.key,
    this.searchPlaceholder = 'Search...',
    this.onSearch,
    this.actionItems,
    this.trailingWidgets,
  });

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final sizes = context.sizes;
    final screenWidth = MediaQuery.of(context).size.width;

    // Determine action menu mode based on screen size
    final ActionMenuMode actionMode;
    final int maxInline;
    if (AppBreakpoints.isMobile(screenWidth)) {
      actionMode = ActionMenuMode.overflow;
      maxInline = 0;
    } else if (screenWidth < 900) {
      actionMode = ActionMenuMode.hybrid;
      maxInline = 2;
    } else {
      actionMode = ActionMenuMode.inline;
      maxInline = 10; // effectively all
    }

    // Sort actions by position
    final allActions = actionItems ?? [];
    final leadingActions = allActions
        .where((a) => a.position == ActionPosition.leading)
        .toList();
    final middleActions = allActions
        .where((a) => a.position == ActionPosition.actions)
        .toList();
    final trailingActions = allActions
        .where((a) => a.position == ActionPosition.trailing)
        .toList();

    final hasLeading = leadingActions.isNotEmpty;
    final hasMiddle = middleActions.isNotEmpty;
    final hasTrailing =
        trailingActions.isNotEmpty || (trailingWidgets?.isNotEmpty ?? false);

    return Padding(
      padding: EdgeInsets.all(spacing.md),
      child: Row(
        children: [
          // Leading actions (never overflow) - date pickers, view controls
          if (hasLeading) ...[
            ..._buildActionWidgets(context, leadingActions, spacing, sizes),
            SizedBox(width: spacing.md),
          ],

          // Search - expands to fill available space
          if (onSearch != null)
            Expanded(
              child: ConstrainedBox(
                constraints: BoxConstraints(maxWidth: sizes.searchMaxWidth),
                child: DebouncedSearchFilter(
                  searchPlaceholder: searchPlaceholder,
                  onSearchChanged: onSearch,
                ),
              ),
            )
          else
            const Spacer(),

          // Spacing between search and actions
          if ((hasMiddle || hasTrailing) && onSearch != null)
            SizedBox(width: spacing.md),

          // Actions (can overflow on mobile)
          if (hasMiddle)
            ActionMenu(
              actions: middleActions,
              mode: actionMode,
              maxInline: maxInline,
            ),

          // Trailing actions (never overflow)
          if (trailingActions.isNotEmpty) ...[
            if (hasMiddle) SizedBox(width: spacing.sm),
            ..._buildActionWidgets(context, trailingActions, spacing, sizes),
          ],

          // Legacy trailing widgets support
          if (trailingWidgets != null && trailingWidgets!.isNotEmpty) ...[
            if (hasMiddle || trailingActions.isNotEmpty)
              SizedBox(width: spacing.sm),
            ...trailingWidgets!
                .expand((w) => [w, SizedBox(width: spacing.sm)])
                .take(trailingWidgets!.length * 2 - 1), // Remove last spacer
          ],
        ],
      ),
    );
  }

  /// Build widgets for leading/trailing actions (never overflow)
  List<Widget> _buildActionWidgets(
    BuildContext context,
    List<ActionItem> actions,
    AppSpacing spacing,
    AppSizes sizes,
  ) {
    final widgets = <Widget>[];
    for (int i = 0; i < actions.length; i++) {
      final action = actions[i];

      // Use widgetBuilder if provided (for complex controls like DateInput)
      if (action.hasWidgetBuilder) {
        widgets.add(action.widgetBuilder!(context));
      } else {
        // Render as icon button
        widgets.add(
          Tooltip(
            message: action.effectiveTooltip,
            child: IconButton(
              icon: action.isLoading
                  ? SizedBox(
                      width: sizes.loadingIndicatorSmall,
                      height: sizes.loadingIndicatorSmall,
                      child: CircularProgressIndicator(
                        strokeWidth: sizes.loadingStrokeThin,
                      ),
                    )
                  : Icon(action.icon ?? Icons.more_horiz),
              onPressed: action.isInteractive ? action.onTap : null,
            ),
          ),
        );
      }

      // Add spacing between items (except after last)
      if (i < actions.length - 1) {
        widgets.add(SizedBox(width: spacing.sm));
      }
    }
    return widgets;
  }
}
