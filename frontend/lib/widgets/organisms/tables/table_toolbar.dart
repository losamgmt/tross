/// TableToolbar - Organism component for table controls
///
/// Combines search, filters, actions above table
/// Flexible layout with common table operations
///
/// Composes: DebouncedSearchFilter organism, action widgets
library;

import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';
import '../search/debounced_search_filter.dart';

class TableToolbar extends StatelessWidget {
  /// String title (mutually exclusive with titleWidget)
  final String? title;

  /// Custom title widget (e.g., dropdown selector) - takes precedence over title
  final Widget? titleWidget;

  final ValueChanged<String>? onSearch;
  final List<Widget>? actions;
  final Widget? leading;

  const TableToolbar({
    super.key,
    this.title,
    this.titleWidget,
    this.onSearch,
    this.actions,
    this.leading,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final spacing = context.spacing;

    // Determine the title display: widget takes precedence over string
    final Widget? titleDisplay =
        titleWidget ??
        (title != null
            ? Text(
                title!,
                style: theme.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              )
            : null);

    return Container(
      padding: spacing.paddingLG,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Title and actions row
          if (titleDisplay != null || actions != null || leading != null)
            Padding(
              padding: EdgeInsets.only(bottom: spacing.lg),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  if (leading != null) ...[
                    leading!,
                    SizedBox(width: spacing.md),
                  ],
                  if (titleDisplay != null) Flexible(child: titleDisplay),
                  if (actions != null) ...[
                    SizedBox(width: spacing.md),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children:
                          actions!
                              .expand(
                                (action) => [
                                  action,
                                  SizedBox(width: spacing.sm),
                                ],
                              )
                              .toList()
                            ..removeLast(), // Remove last spacer
                    ),
                  ],
                ],
              ),
            ),
          // Search bar
          if (onSearch != null)
            DebouncedSearchFilter(
              searchPlaceholder: 'Search...',
              onSearchChanged: onSearch,
            ),
        ],
      ),
    );
  }
}
