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
/// - **Keyboard typeahead filtering** - type to filter options
/// - Full keyboard navigation (arrow keys, Enter, Escape)
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
import 'package:flutter/services.dart';
import '../../../config/app_spacing.dart';

class FilterDropdown<T> extends StatefulWidget {
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

  @override
  State<FilterDropdown<T>> createState() => _FilterDropdownState<T>();
}

class _FilterDropdownState<T> extends State<FilterDropdown<T>> {
  final MenuController _menuController = MenuController();
  final FocusNode _focusNode = FocusNode();
  String _filterText = '';

  @override
  void dispose() {
    _focusNode.dispose();
    super.dispose();
  }

  String _getDisplayText(T item) {
    return widget.displayText?.call(item) ?? item.toString();
  }

  /// Filter items based on keyboard input
  List<T> get _filteredItems {
    if (_filterText.isEmpty) return widget.items;
    final query = _filterText.toLowerCase();
    return widget.items
        .where((item) => _getDisplayText(item).toLowerCase().contains(query))
        .toList();
  }

  /// Check if key is a control key (non-printable)
  bool _isControlKey(LogicalKeyboardKey key) {
    return key == LogicalKeyboardKey.control ||
        key == LogicalKeyboardKey.controlLeft ||
        key == LogicalKeyboardKey.controlRight ||
        key == LogicalKeyboardKey.alt ||
        key == LogicalKeyboardKey.altLeft ||
        key == LogicalKeyboardKey.altRight ||
        key == LogicalKeyboardKey.shift ||
        key == LogicalKeyboardKey.shiftLeft ||
        key == LogicalKeyboardKey.shiftRight ||
        key == LogicalKeyboardKey.meta ||
        key == LogicalKeyboardKey.metaLeft ||
        key == LogicalKeyboardKey.metaRight ||
        key == LogicalKeyboardKey.capsLock ||
        key == LogicalKeyboardKey.tab ||
        key == LogicalKeyboardKey.arrowUp ||
        key == LogicalKeyboardKey.arrowDown ||
        key == LogicalKeyboardKey.arrowLeft ||
        key == LogicalKeyboardKey.arrowRight;
  }

  void _handleKeyEvent(KeyEvent event) {
    if (event is KeyDownEvent) {
      final key = event.logicalKey;

      // Close on Escape
      if (key == LogicalKeyboardKey.escape) {
        _menuController.close();
        _filterText = '';
        return;
      }

      // Handle character input for filtering
      if (event.character != null &&
          event.character!.isNotEmpty &&
          !_isControlKey(key)) {
        setState(() {
          _filterText += event.character!;
        });
        // Clear filter after a delay
        Future.delayed(const Duration(milliseconds: 1000), () {
          if (mounted) {
            setState(() => _filterText = '');
          }
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final theme = Theme.of(context);

    final horizontalPadding = widget.compact ? spacing.xs : spacing.sm;
    final verticalPadding = widget.compact ? spacing.xxs : spacing.xs;
    final fontSize = widget.compact ? 12.0 : 13.0;

    // Determine display text for current value
    final selectedDisplayText = widget.value != null
        ? _getDisplayText(widget.value as T)
        : widget.allOptionText;

    return MenuAnchor(
      controller: _menuController,
      menuChildren: [
        // "All" option
        if (widget.showAllOption)
          MenuItemButton(
            onPressed: () {
              widget.onChanged(null);
              _menuController.close();
              _filterText = '';
            },
            child: Text(
              widget.allOptionText,
              style: theme.textTheme.bodyMedium?.copyWith(
                fontWeight: widget.value == null
                    ? FontWeight.w600
                    : FontWeight.normal,
              ),
            ),
          ),
        // Filtered items
        ..._filteredItems.map(
          (item) => MenuItemButton(
            onPressed: () {
              widget.onChanged(item);
              _menuController.close();
              _filterText = '';
            },
            child: Text(
              _getDisplayText(item),
              style: theme.textTheme.bodyMedium?.copyWith(
                fontWeight: item == widget.value
                    ? FontWeight.w600
                    : FontWeight.normal,
              ),
            ),
          ),
        ),
      ],
      child: KeyboardListener(
        focusNode: _focusNode,
        onKeyEvent: widget.enabled ? _handleKeyEvent : null,
        child: Container(
          decoration: BoxDecoration(
            border: Border.all(
              color: widget.enabled
                  ? theme.colorScheme.outline.withValues(alpha: 0.5)
                  : theme.colorScheme.outline.withValues(alpha: 0.3),
            ),
            borderRadius: spacing.radiusSM,
            color: widget.enabled
                ? theme.colorScheme.surface
                : theme.colorScheme.onSurface.withValues(alpha: 0.05),
          ),
          child: InkWell(
            onTap: widget.enabled
                ? () {
                    if (_menuController.isOpen) {
                      _menuController.close();
                    } else {
                      _menuController.open();
                      _focusNode.requestFocus();
                    }
                  }
                : null,
            borderRadius: spacing.radiusSM,
            child: Padding(
              padding: EdgeInsets.symmetric(
                horizontal: horizontalPadding,
                vertical: verticalPadding,
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (widget.label != null) ...[
                    Text(
                      '${widget.label}:',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurface.withValues(
                          alpha: 0.6,
                        ),
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
                      color: widget.enabled
                          ? theme.colorScheme.onSurface
                          : theme.colorScheme.onSurface.withValues(alpha: 0.5),
                    ),
                  ),
                  SizedBox(width: spacing.xxs),
                  Icon(
                    Icons.arrow_drop_down,
                    size: widget.compact ? 18 : 20,
                    color: widget.enabled
                        ? theme.colorScheme.onSurface.withValues(alpha: 0.6)
                        : theme.colorScheme.onSurface.withValues(alpha: 0.3),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
