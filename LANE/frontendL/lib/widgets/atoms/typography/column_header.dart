/// ColumnHeader - Atom component for table column headers
library;

import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';

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

    Widget content = Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Flexible(
          child: Text(
            label,
            style: theme.textTheme.labelLarge?.copyWith(
              fontWeight: FontWeight.w700,
              color: theme.colorScheme.onSurface,
              letterSpacing: 0.5,
            ),
            textAlign: textAlign,
            overflow: TextOverflow.ellipsis,
          ),
        ),
        if (sortable) ...[
          SizedBox(width: spacing.xxs),
          _SortIcon(direction: sortDirection),
        ],
      ],
    );

    if (textAlign == TextAlign.right || textAlign == TextAlign.end) {
      content = Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (sortable) ...[
            _SortIcon(direction: sortDirection),
            SizedBox(width: spacing.xxs),
          ],
          Flexible(
            child: Text(
              label,
              style: theme.textTheme.labelLarge?.copyWith(
                fontWeight: FontWeight.w700,
                color: theme.colorScheme.onSurface,
                letterSpacing: 0.5,
              ),
              textAlign: textAlign,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      );
    }

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
    final color = direction == SortDirection.none
        ? theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.4)
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

    return Icon(icon, size: 16, color: color);
  }
}
