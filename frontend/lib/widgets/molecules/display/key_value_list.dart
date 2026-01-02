/// KeyValueList - Vertical list of label:value pairs
///
/// **SOLE RESPONSIBILITY:** Compose label:value rows in a vertical list
///
/// **PURE COMPOSITION:** Composes FieldDisplay atoms for values,
/// coordinates layout only - implements ZERO display logic itself.
///
/// Used for:
/// - Entity detail displays (read-only)
/// - Settings/config panels
/// - Admin metadata display
///
/// USAGE:
/// ```dart
/// KeyValueList(
///   items: [
///     KeyValueItem.text(label: 'Name', value: 'John Doe'),
///     KeyValueItem.boolean(label: 'Active', value: true),
///   ],
/// )
/// ```
library;

import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';
import '../../atoms/display/field_display.dart';

/// Single key-value item
class KeyValueItem {
  /// Label/key displayed on the left
  final String label;

  /// Value widget displayed on the right
  final Widget value;

  /// Optional icon shown before the label
  final IconData? icon;

  /// Optional tooltip for the label
  final String? tooltip;

  /// Whether this item should be visually emphasized
  final bool isHighlighted;

  const KeyValueItem({
    required this.label,
    required this.value,
    this.icon,
    this.tooltip,
    this.isHighlighted = false,
  });

  /// Factory for text values - composes FieldDisplay atom
  factory KeyValueItem.text({
    required String label,
    required String value,
    IconData? icon,
    String? tooltip,
    bool isHighlighted = false,
  }) {
    return KeyValueItem(
      label: label,
      value: FieldDisplay(value: value, type: DisplayType.text),
      icon: icon,
      tooltip: tooltip,
      isHighlighted: isHighlighted,
    );
  }

  /// Factory for boolean values - composes FieldDisplay atom
  factory KeyValueItem.boolean({
    required String label,
    required bool value,
    IconData? icon,
    String? tooltip,
  }) {
    return KeyValueItem(
      label: label,
      value: FieldDisplay(
        value: value,
        type: DisplayType.boolean,
        showBooleanIcon: true,
      ),
      icon: icon,
      tooltip: tooltip,
    );
  }

  /// Factory for number values - composes FieldDisplay atom
  factory KeyValueItem.number({
    required String label,
    required num value,
    String? prefix,
    String? suffix,
    int? decimalPlaces,
    IconData? icon,
    String? tooltip,
  }) {
    return KeyValueItem(
      label: label,
      value: FieldDisplay(
        value: value,
        type: DisplayType.number,
        prefix: prefix,
        suffix: suffix,
        decimalPlaces: decimalPlaces,
      ),
      icon: icon,
      tooltip: tooltip,
    );
  }

  /// Factory for date values - composes FieldDisplay atom
  factory KeyValueItem.date({
    required String label,
    required DateTime? value,
    String? dateFormat,
    IconData? icon,
    String? tooltip,
  }) {
    return KeyValueItem(
      label: label,
      value: FieldDisplay(
        value: value,
        type: DisplayType.date,
        dateFormat: dateFormat,
      ),
      icon: icon,
      tooltip: tooltip,
    );
  }
}

/// Vertical list of key-value pairs
///
/// Pure composition molecule - coordinates layout only.
class KeyValueList extends StatelessWidget {
  /// Items to display
  final List<KeyValueItem> items;

  /// Whether to show dividers between items
  final bool showDividers;

  /// Minimum width for labels (ensures alignment)
  final double? labelWidth;

  /// Whether to use compact spacing
  final bool dense;

  const KeyValueList({
    super.key,
    required this.items,
    this.showDividers = false,
    this.labelWidth,
    this.dense = false,
  });

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) return const SizedBox.shrink();

    final spacing = context.spacing;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        for (int i = 0; i < items.length; i++) ...[
          _KeyValueRow(
            item: items[i],
            labelWidth: labelWidth,
            dense: dense,
          ),
          if (showDividers && i < items.length - 1)
            Divider(height: spacing.md, thickness: 1),
          if (!showDividers && i < items.length - 1)
            SizedBox(height: dense ? spacing.xs : spacing.sm),
        ],
      ],
    );
  }
}

/// Single row in KeyValueList - handles responsive layout
class _KeyValueRow extends StatelessWidget {
  final KeyValueItem item;
  final double? labelWidth;
  final bool dense;

  const _KeyValueRow({
    required this.item,
    this.labelWidth,
    this.dense = false,
  });

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final theme = Theme.of(context);

    final labelStyle = theme.textTheme.bodyMedium?.copyWith(
      color: theme.colorScheme.onSurfaceVariant,
      fontWeight: item.isHighlighted ? FontWeight.w600 : FontWeight.normal,
    );

    // Build label with optional icon
    Widget labelWidget = Text(
      item.label,
      style: labelStyle,
      overflow: TextOverflow.ellipsis,
    );

    if (item.icon != null) {
      labelWidget = Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            item.icon,
            size: 16,
            color: theme.colorScheme.onSurfaceVariant,
          ),
          SizedBox(width: spacing.xs),
          Flexible(child: labelWidget),
        ],
      );
    }

    if (item.tooltip != null) {
      labelWidget = Tooltip(message: item.tooltip!, child: labelWidget);
    }

    // Use LayoutBuilder for responsive behavior
    return LayoutBuilder(
      builder: (context, constraints) {
        // Stack vertically on narrow screens
        if (constraints.maxWidth < 300) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              labelWidget,
              SizedBox(height: spacing.xxs),
              Padding(
                padding: EdgeInsets.only(left: item.icon != null ? spacing.md : 0),
                child: item.value,
              ),
            ],
          );
        }

        // Side-by-side on wider screens
        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              width: labelWidth ?? 120,
              child: labelWidget,
            ),
            SizedBox(width: spacing.md),
            Expanded(child: item.value),
          ],
        );
      },
    );
  }
}
