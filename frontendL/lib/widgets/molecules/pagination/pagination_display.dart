/// PaginationDisplay - Generic molecule for pagination UI
///
/// SINGLE RESPONSIBILITY: Display pagination controls
/// 100% GENERIC - receives computed values as props, NO calculation logic!
///
/// Parent organism uses PaginationHelper to compute values, passes them down.
///
/// Usage:
/// ```dart
/// // In organism:
/// final rangeText = PaginationHelper.getPageRangeText(currentPage, itemsPerPage, totalItems);
/// final canPrev = PaginationHelper.canGoPrevious(currentPage);
/// final canNext = PaginationHelper.canGoNext(currentPage, totalPages);
///
/// // Pass to molecule:
/// PaginationDisplay(
///   rangeText: rangeText,
///   canGoPrevious: canPrev,
///   canGoNext: canNext,
///   onPrevious: _handlePrevious,
///   onNext: _handleNext,
/// )
/// ```
library;

import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';

class PaginationDisplay extends StatelessWidget {
  /// Display text showing range (e.g., "1-10 of 100")
  final String rangeText;

  /// Whether previous button should be enabled
  final bool canGoPrevious;

  /// Whether next button should be enabled
  final bool canGoNext;

  /// Callback when previous button pressed
  final VoidCallback onPrevious;

  /// Callback when next button pressed
  final VoidCallback onNext;

  const PaginationDisplay({
    super.key,
    required this.rangeText,
    required this.canGoPrevious,
    required this.canGoNext,
    required this.onPrevious,
    required this.onNext,
  });

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final theme = Theme.of(context);

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        // Range text
        Text(
          rangeText,
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.colorScheme.onSurface.withValues(alpha: 0.7),
          ),
        ),

        SizedBox(width: spacing.md),

        // Navigation buttons
        Row(
          children: [
            IconButton(
              onPressed: canGoPrevious ? onPrevious : null,
              icon: const Icon(Icons.chevron_left),
              tooltip: 'Previous page',
            ),
            SizedBox(width: spacing.xs),
            IconButton(
              onPressed: canGoNext ? onNext : null,
              icon: const Icon(Icons.chevron_right),
              tooltip: 'Next page',
            ),
          ],
        ),
      ],
    );
  }
}
