import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';

/// PageToolbar - Molecule for page-level action bars
///
/// **SOLE RESPONSIBILITY:** Display action controls for a page
/// - Context-agnostic: NO domain logic
/// - Fully parameterized: all actions passed as widgets
///
/// GENERIC: Works for any toolbar scenario:
/// - CRUD action bars (Add, Edit, Delete buttons)
/// - Bulk action bars (Select All, Delete Selected)
/// - Filter/sort controls
/// - Export/import actions
///
/// Layout: [leading] [Expanded: center] [trailing]
///
/// Usage:
/// ```dart
/// // Simple toolbar with primary action
/// PageToolbar(
///   trailing: ElevatedButton.icon(
///     icon: Icon(Icons.add),
///     label: Text('Add New'),
///     onPressed: () {},
///   ),
/// )
///
/// // Toolbar with multiple sections
/// PageToolbar(
///   leading: Text('3 items selected'),
///   center: SearchInput(onChanged: _onSearch),
///   trailing: Row(
///     children: [
///       IconButton(icon: Icon(Icons.delete), onPressed: _delete),
///       IconButton(icon: Icon(Icons.download), onPressed: _export),
///     ],
///   ),
/// )
///
/// // Compact toolbar
/// PageToolbar(
///   compact: true,
///   trailing: IconButton(icon: Icon(Icons.refresh), onPressed: _refresh),
/// )
/// ```
class PageToolbar extends StatelessWidget {
  /// Widget on the left side (e.g., selection count, back button)
  final Widget? leading;

  /// Widget in the center (e.g., search input, tab bar)
  final Widget? center;

  /// Widget on the right side (e.g., action buttons)
  final Widget? trailing;

  /// Whether to use compact spacing
  final bool compact;

  /// Custom padding (overrides default)
  final EdgeInsetsGeometry? padding;

  /// Background color
  final Color? backgroundColor;

  /// Whether to show bottom border
  final bool showBorder;

  /// Border color (when showBorder is true)
  final Color? borderColor;

  /// Minimum height of the toolbar
  final double? minHeight;

  /// Main axis alignment for the row
  final MainAxisAlignment mainAxisAlignment;

  /// Cross axis alignment for the row
  final CrossAxisAlignment crossAxisAlignment;

  const PageToolbar({
    super.key,
    this.leading,
    this.center,
    this.trailing,
    this.compact = false,
    this.padding,
    this.backgroundColor,
    this.showBorder = false,
    this.borderColor,
    this.minHeight,
    this.mainAxisAlignment = MainAxisAlignment.spaceBetween,
    this.crossAxisAlignment = CrossAxisAlignment.center,
  });

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final theme = Theme.of(context);

    final horizontalPadding = compact ? spacing.sm : spacing.md;
    final verticalPadding = compact ? spacing.xs : spacing.sm;
    final effectivePadding =
        padding ??
        EdgeInsets.symmetric(
          horizontal: horizontalPadding,
          vertical: verticalPadding,
        );

    final effectiveMinHeight = minHeight ?? (compact ? 40.0 : 56.0);

    return Container(
      constraints: BoxConstraints(minHeight: effectiveMinHeight),
      padding: effectivePadding,
      decoration: BoxDecoration(
        color: backgroundColor,
        border: showBorder
            ? Border(
                bottom: BorderSide(
                  color: borderColor ?? theme.dividerColor,
                  width: 1,
                ),
              )
            : null,
      ),
      child: Row(
        mainAxisAlignment: mainAxisAlignment,
        crossAxisAlignment: crossAxisAlignment,
        children: [
          if (leading != null) leading!,
          if (center != null) ...[
            if (leading != null) SizedBox(width: spacing.sm),
            Expanded(child: center!),
            if (trailing != null) SizedBox(width: spacing.sm),
          ] else if (leading != null && trailing != null) ...[
            const Spacer(),
          ],
          if (trailing != null) trailing!,
        ],
      ),
    );
  }
}

/// PageToolbarDivider - Visual divider between toolbar sections
class PageToolbarDivider extends StatelessWidget {
  final double? height;
  final Color? color;

  const PageToolbarDivider({super.key, this.height, this.color});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final spacing = context.spacing;

    return Container(
      width: 1,
      height: height ?? spacing.lg,
      margin: EdgeInsets.symmetric(horizontal: spacing.sm),
      color: color ?? theme.dividerColor,
    );
  }
}

/// PageToolbarGroup - Groups related toolbar items with consistent spacing
class PageToolbarGroup extends StatelessWidget {
  /// Children to group together
  final List<Widget> children;

  /// Spacing between children
  final double? spacing;

  const PageToolbarGroup({super.key, required this.children, this.spacing});

  @override
  Widget build(BuildContext context) {
    final appSpacing = context.spacing;
    final effectiveSpacing = spacing ?? appSpacing.xs;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (int i = 0; i < children.length; i++) ...[
          children[i],
          if (i < children.length - 1) SizedBox(width: effectiveSpacing),
        ],
      ],
    );
  }
}
