/// FilterBar - Composite molecule for search and filter controls
///
/// **SOLE RESPONSIBILITY:** Compose SearchInput + FilterDropdown(s) in a row
/// - Pure composition of atoms - ZERO business logic
/// - Horizontal layout with consistent spacing
/// - Responsive: wraps on smaller screens
///
/// GENERIC: Works for ANY filterable list/table context
///
/// Features:
/// - Search input (left side)
/// - Multiple filter dropdowns (right side)
/// - Consistent spacing and alignment
/// - Optional action buttons slot
///
/// Usage:
/// ```dart
/// FilterBar(
///   searchValue: searchQuery,
///   onSearchChanged: (value) => setState(() => searchQuery = value),
///   searchPlaceholder: 'Search users...',
///   filters: [
///     FilterConfig(
///       value: statusFilter,
///       items: ['Active', 'Inactive', 'Pending'],
///       onChanged: (v) => setState(() => statusFilter = v),
///       label: 'Status',
///     ),
///     FilterConfig(
///       value: roleFilter,
///       items: UserRole.values,
///       displayText: (r) => r.name,
///       onChanged: (v) => setState(() => roleFilter = v),
///       label: 'Role',
///     ),
///   ],
/// )
/// ```
library;

import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';
import '../../atoms/inputs/search_input.dart';
import '../../atoms/inputs/filter_dropdown.dart';

/// Configuration for a single filter dropdown in the FilterBar
class FilterConfig<T> {
  /// Currently selected value (null = "All")
  final T? value;

  /// Available filter options
  final List<T> items;

  /// Callback when selection changes
  final ValueChanged<T?> onChanged;

  /// Function to convert item to display string
  final String Function(T)? displayText;

  /// Optional label prefix (e.g., "Status:")
  final String? label;

  /// Whether to show "All" option
  final bool showAllOption;

  /// Text for the "All" option
  final String allOptionText;

  /// Whether the filter is enabled
  final bool enabled;

  const FilterConfig({
    required this.value,
    required this.items,
    required this.onChanged,
    this.displayText,
    this.label,
    this.showAllOption = true,
    this.allOptionText = 'All',
    this.enabled = true,
  });

  /// Build the FilterDropdown widget for this config
  Widget build({bool globalEnabled = true, bool compact = false}) {
    return FilterDropdown<T>(
      value: value,
      items: items,
      onChanged: onChanged,
      displayText: displayText,
      label: label,
      showAllOption: showAllOption,
      allOptionText: allOptionText,
      enabled: globalEnabled && enabled,
      compact: compact,
    );
  }
}

class FilterBar extends StatelessWidget {
  /// Current search query
  final String searchValue;

  /// Callback when search changes
  final ValueChanged<String> onSearchChanged;

  /// Callback when search is submitted (Enter pressed)
  final ValueChanged<String>? onSearchSubmitted;

  /// Search placeholder text
  final String searchPlaceholder;

  /// Whether to show the search input
  final bool showSearch;

  /// List of filter configurations
  final List<FilterConfig> filters;

  /// Optional trailing widget (e.g., action buttons)
  final Widget? trailing;

  /// Whether the entire bar is enabled
  final bool enabled;

  /// Compact mode for tighter spacing
  final bool compact;

  const FilterBar({
    super.key,
    this.searchValue = '',
    required this.onSearchChanged,
    this.onSearchSubmitted,
    this.searchPlaceholder = 'Search...',
    this.showSearch = true,
    this.filters = const [],
    this.trailing,
    this.enabled = true,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;

    return Wrap(
      spacing: spacing.sm,
      runSpacing: spacing.sm,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        // Search input
        if (showSearch)
          SizedBox(
            width: compact ? 200 : 250,
            child: SearchInput(
              value: searchValue,
              onChanged: onSearchChanged,
              onSubmitted: onSearchSubmitted,
              placeholder: searchPlaceholder,
              enabled: enabled,
              compact: compact,
            ),
          ),

        // Filter dropdowns
        ...filters.map(
          (filter) => filter.build(globalEnabled: enabled, compact: compact),
        ),

        // Trailing widget
        if (trailing != null) trailing!,
      ],
    );
  }
}
