/// DataCell - Molecule component for table cell
///
/// Wraps data values with consistent padding and styling
/// Supports alignment, overflow handling, and custom content
///
/// Composes: DataValue, DataLabel atoms
library;

import 'package:flutter/material.dart';
import '../../config/app_spacing.dart';

class DataCell extends StatelessWidget {
  final Widget child;
  final Alignment alignment;
  final EdgeInsetsGeometry? padding;
  final double? width;
  final VoidCallback? onTap;
  final bool showRightBorder;
  final Color? borderColor;

  const DataCell({
    super.key,
    required this.child,
    this.alignment = Alignment.centerLeft,
    this.padding,
    this.width,
    this.onTap,
    this.showRightBorder = false,
    this.borderColor,
  });

  /// Factory for text cells
  factory DataCell.text(String text, {TextAlign? textAlign, double? width}) {
    return DataCell(
      width: width,
      alignment: textAlign == TextAlign.right
          ? Alignment.centerRight
          : Alignment.centerLeft,
      child: Text(text, textAlign: textAlign, overflow: TextOverflow.ellipsis),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Use theme-relative spacing instead of hardcoded pixels
    final spacing = context.spacing;
    final defaultPadding = EdgeInsets.symmetric(
      horizontal: spacing.sm,
      vertical: spacing.sm,
    );
    final theme = Theme.of(context);

    Widget content = Container(
      width: width,
      padding: padding ?? defaultPadding,
      alignment: alignment,
      decoration: showRightBorder
          ? BoxDecoration(
              border: Border(
                right: BorderSide(
                  color: borderColor ?? theme.colorScheme.outlineVariant,
                  width: 1,
                ),
              ),
            )
          : null,
      child: child,
    );

    if (onTap != null) {
      content = InkWell(onTap: onTap, child: content);
    }

    return content;
  }
}
