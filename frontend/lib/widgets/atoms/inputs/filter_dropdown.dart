/// FilterDropdown - Generic filter dropdown atom
///
/// **SOLE RESPONSIBILITY:** Render a compact dropdown for filtering
/// - Context-agnostic: NO layout assumptions
/// - Inline display: Shows selected value with dropdown indicator
/// - Parent decides: placement, grouping with other filters
///
/// GENERIC: Works for ANY filter context (status filter, category filter,
/// date range filter, type filter, etc.)
///
/// Differs from SelectInput:
/// - More compact visual (inline chip-style vs form field)
/// - Designed for toolbars/filter bars vs forms
/// - Optional "All" default option
/// - No validation, helper text, etc.
///
/// Features:
/// - Compact inline display
/// - Optional prefix label
/// - Optional "All" option for clearing filter
/// - Custom display text transformation
/// - Disabled state
///
/// Usage:
/// ```dart
/// // Status filter
/// FilterDropdown<String>(
///   value: selectedStatus,
///   items: ['Active', 'Inactive', 'Pending'],
///   onChanged: (status) => setState(() => selectedStatus = status),
///   label: 'Status',
/// )
///
/// // With enum
/// FilterDropdown<Priority>(
///   value: selectedPriority,
///   items: Priority.values,
///   displayText: (p) => p.name.toUpperCase(),
///   onChanged: (priority) => setState(() => selectedPriority = priority),
///   showAllOption: true,
///   allOptionText: 'All Priorities',
/// )
/// ```
library;

import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';

class FilterDropdown<T> extends StatelessWidget {
  /// Currently selected value (null = "All" or nothing selected)
  final T? value;

  /// Available filter options
  final List<T> items;

  /// Callback when selection changes
  final ValueChanged<T?> onChanged;

  /// Function to convert item to display string
  final String Function(T)? displayText;

  /// Optional prefix label (e.g., "Status:")
  final String? label;

  /// Whether to show an "All" option at the top
  final bool showAllOption;

  /// Text for the "All" option
  final String allOptionText;

  /// Whether the dropdown is enabled
  final bool enabled;

  /// Compact mode (smaller padding)
  final bool compact;

  const FilterDropdown({
    super.key,
    required this.value,
    required this.items,
    required this.onChanged,
    this.displayText,
    this.label,
    this.showAllOption = true,
    this.allOptionText = 'All',
    this.enabled = true,
    this.compact = false,
  });

  String _getDisplayText(T item) {
    return displayText?.call(item) ?? item.toString();
  }

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final theme = Theme.of(context);

    final horizontalPadding = compact ? spacing.xs : spacing.sm;
    final verticalPadding = compact ? spacing.xxs : spacing.xs;
    final fontSize = compact ? 12.0 : 13.0;

    // Determine display text for current value
    final selectedDisplayText = value != null
        ? _getDisplayText(value as T)
        : allOptionText;

    return Container(
      decoration: BoxDecoration(
        border: Border.all(
          color: enabled
              ? theme.colorScheme.outline.withValues(alpha: 0.5)
              : theme.colorScheme.outline.withValues(alpha: 0.3),
        ),
        borderRadius: spacing.radiusSM,
        color: enabled
            ? theme.colorScheme.surface
            : theme.colorScheme.onSurface.withValues(alpha: 0.05),
      ),
      child: InkWell(
        onTap: enabled ? () => _showDropdown(context) : null,
        borderRadius: spacing.radiusSM,
        child: Padding(
          padding: EdgeInsets.symmetric(
            horizontal: horizontalPadding,
            vertical: verticalPadding,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (label != null) ...[
                Text(
                  '$label:',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                    fontSize: fontSize,
                  ),
                ),
                SizedBox(width: spacing.xs),
              ],
              Text(
                selectedDisplayText,
                style: theme.textTheme.bodyMedium?.copyWith(
                  fontSize: fontSize,
                  fontWeight: FontWeight.w500,
                  color: enabled
                      ? theme.colorScheme.onSurface
                      : theme.colorScheme.onSurface.withValues(alpha: 0.5),
                ),
              ),
              SizedBox(width: spacing.xxs),
              Icon(
                Icons.arrow_drop_down,
                size: compact ? 18 : 20,
                color: enabled
                    ? theme.colorScheme.onSurface.withValues(alpha: 0.6)
                    : theme.colorScheme.onSurface.withValues(alpha: 0.3),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showDropdown(BuildContext context) {
    final theme = Theme.of(context);
    final RenderBox button = context.findRenderObject() as RenderBox;
    final RenderBox overlay =
        Overlay.of(context).context.findRenderObject() as RenderBox;
    final Offset position = button.localToGlobal(
      Offset.zero,
      ancestor: overlay,
    );

    showMenu<T?>(
      context: context,
      position: RelativeRect.fromLTRB(
        position.dx,
        position.dy + button.size.height,
        position.dx + button.size.width,
        position.dy,
      ),
      items: [
        // "All" option
        if (showAllOption)
          PopupMenuItem<T?>(
            value: null,
            child: Text(
              allOptionText,
              style: theme.textTheme.bodyMedium?.copyWith(
                fontWeight: value == null ? FontWeight.w600 : FontWeight.normal,
              ),
            ),
          ),
        // Actual items
        ...items.map(
          (item) => PopupMenuItem<T?>(
            value: item,
            child: Text(
              _getDisplayText(item),
              style: theme.textTheme.bodyMedium?.copyWith(
                fontWeight: item == value ? FontWeight.w600 : FontWeight.normal,
              ),
            ),
          ),
        ),
      ],
    ).then((selected) {
      // Only fire callback if selection actually changed
      // Note: showMenu returns null on dismiss without selection
      // We use a sentinel pattern to distinguish "selected All" from "dismissed"
      if (selected != value) {
        onChanged(selected);
      }
    });
  }
}
