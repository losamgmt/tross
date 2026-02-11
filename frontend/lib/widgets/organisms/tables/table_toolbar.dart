/// TableToolbar - Organism component for table controls
///
/// SINGLE ROW LAYOUT:
/// - Search on left (expands to fill available space)
/// - Actions on right (inline or overflow based on space)
///
/// Mobile: All actions in overflow menu
/// Tablet: First 2 actions inline, rest in overflow
/// Desktop: All actions inline (unless space constrained)
///
/// Actions are DATA (ActionItem), not widgets - this allows appropriate
/// rendering for different contexts (inline buttons, overflow menu, etc.)
///
/// Composes: DebouncedSearchFilter, ActionMenu
library;

import 'package:flutter/material.dart';
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
  final List<ActionItem>? actionItems;

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

    final hasActions = actionItems != null && actionItems!.isNotEmpty;
    final hasTrailing = trailingWidgets != null && trailingWidgets!.isNotEmpty;

    return Padding(
      padding: EdgeInsets.all(spacing.md),
      child: Row(
        children: [
          // Search on left - expands to fill available space
          if (onSearch != null)
            Expanded(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 400),
                child: DebouncedSearchFilter(
                  searchPlaceholder: searchPlaceholder,
                  onSearchChanged: onSearch,
                ),
              ),
            )
          else
            const Spacer(),

          // Spacing between search and actions
          if ((hasActions || hasTrailing) && onSearch != null)
            SizedBox(width: spacing.md),

          // Actions on right
          if (hasActions)
            ActionMenu(
              actions: actionItems!,
              mode: actionMode,
              maxInline: maxInline,
            ),

          // Trailing widgets (customization menu, etc.)
          if (hasTrailing) ...[
            if (hasActions) SizedBox(width: spacing.sm),
            ...trailingWidgets!
                .expand((w) => [w, SizedBox(width: spacing.sm)])
                .take(trailingWidgets!.length * 2 - 1), // Remove last spacer
          ],
        ],
      ),
    );
  }
}
