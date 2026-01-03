/// ColumnHeader - Atom component for table column headers
///
/// Designed to work within table cells with any constraint.
/// Text will ellipsis if space is limited.
library;

import 'package:flutter/material.dart';
import '../../../config/app_colors.dart';
import '../../../config/app_spacing.dart';
import '../../../config/app_typography.dart';

enum SortDirection { none, ascending, descending }

class ColumnHeader extends StatelessWidget {
  final String label;
  final bool sortable;
  final SortDirection sortDirection;
  final VoidCallback? onSort;
  final TextAlign? textAlign;
  final double? width;

  const ColumnHeader({
    super.key,
    required this.label,
    this.sortable = false,
    this.sortDirection = SortDirection.none,
    this.onSort,
    this.textAlign,
    this.width,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final spacing = context.spacing;

    final isRightAligned =
        textAlign == TextAlign.right || textAlign == TextAlign.end;

    final textWidget = Text(
      label,
      style: theme.textTheme.labelLarge?.copyWith(
        fontWeight: AppTypography.bold,
        color: theme.colorScheme.onSurface,
        letterSpacing: AppTypography.letterSpacingWide,
      ),
      textAlign: textAlign,
      overflow: TextOverflow.ellipsis,
      maxLines: 1,
    );

    final sortIcon = sortable ? _SortIcon(direction: sortDirection) : null;

    // Content layout - sized to content, text clips via ellipsis
    Widget content;
    if (sortIcon != null) {
      if (isRightAligned) {
        content = Row(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            sortIcon,
            SizedBox(width: spacing.xxs),
            Flexible(child: textWidget),
          ],
        );
      } else {
        content = Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Flexible(child: textWidget),
            SizedBox(width: spacing.xxs),
            sortIcon,
          ],
        );
      }
    } else {
      content = textWidget;
    }

    // No ClipRect needed - text uses ellipsis, Row uses MainAxisSize.min

    if (!sortable || onSort == null) {
      return Container(
        width: width,
        padding: EdgeInsets.symmetric(
          horizontal: spacing.sm,
          vertical: spacing.sm,
        ),
        child: content,
      );
    }

    return InkWell(
      onTap: onSort,
      borderRadius: spacing.radiusSM,
      child: Container(
        width: width,
        padding: EdgeInsets.symmetric(
          horizontal: spacing.sm,
          vertical: spacing.sm,
        ),
        child: content,
      ),
    );
  }
}

class _SortIcon extends StatelessWidget {
  final SortDirection direction;

  const _SortIcon({required this.direction});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final spacing = context.spacing;
    final color = direction == SortDirection.none
        ? theme.colorScheme.onSurfaceVariant.withValues(
            alpha: AppColors.opacityDisabled,
          )
        : theme.colorScheme.primary;

    IconData icon;
    switch (direction) {
      case SortDirection.ascending:
        icon = Icons.arrow_upward;
        break;
      case SortDirection.descending:
        icon = Icons.arrow_downward;
        break;
      case SortDirection.none:
        icon = Icons.unfold_more;
        break;
    }

    return Icon(icon, size: spacing.iconSizeMD, color: color);
  }
}
