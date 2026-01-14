/// FilterBar - Pure Composition Molecule for Search + Filters
///
/// **SOLE RESPONSIBILITY:** Compose SearchInput + FilterDropdown(s) in a row
/// - Pure composition of atoms - ZERO business logic
/// - Horizontal layout with consistent spacing
/// - Responsive: wraps on smaller screens
///
/// **ATOMIC DESIGN COMPLIANCE:**
/// - Molecule = Pure composition of atoms
/// - All functionality comes through atoms ONLY
/// - No inline logic, just layout orchestration
///
/// GENERIC: Works for ANY filterable list/table context
///
/// Features:
/// - Search input (SearchInput atom)
/// - Entity type filter (FilterDropdown atom) - optional
/// - Multiple additional filter dropdowns (FilterDropdown atoms)
/// - Optional trailing widget slot (action buttons, etc.)
/// - Responsive: wraps on smaller screens
///
/// Usage:
/// ```dart
/// // Basic search only
/// FilterBar(
///   searchValue: searchQuery,
///   onSearchChanged: (value) => setState(() => searchQuery = value),
/// )
///
/// // With entity filter
/// FilterBar(
///   searchValue: searchQuery,
///   onSearchChanged: updateQuery,
///   entityFilter: EntityFilterConfig(
///     value: selectedEntity,
///     entities: ['work_order', 'customer', 'invoice'],
///     onChanged: updateEntityFilter,
///   ),
/// )
///
/// // With multiple filters
/// FilterBar(
///   searchValue: searchQuery,
///   onSearchChanged: updateQuery,
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
///
/// Data class with a `build()` helper to create the typed FilterDropdown.
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
  ///
  /// This preserves the generic type T for proper widget typing.
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

/// Configuration specifically for entity type filtering
///
/// Provides entity-specific conveniences like snake_case to Title Case conversion.
class EntityFilterConfig {
  /// Currently selected entity (null = all entities)
  final String? value;

  /// Available entity types
  final List<String> entities;

  /// Callback when selection changes
  final ValueChanged<String?> onChanged;

  /// Label for the filter (default: 'Entity')
  final String label;

  /// Text for the "All" option
  final String allOptionText;

  /// Custom display text function (defaults to title case conversion)
  final String Function(String)? displayText;

  /// Whether the filter is enabled
  final bool enabled;

  const EntityFilterConfig({
    required this.value,
    required this.entities,
    required this.onChanged,
    this.label = 'Entity',
    this.allOptionText = 'All Entities',
    this.displayText,
    this.enabled = true,
  });

  /// Convert entity snake_case to Title Case for display
  static String defaultDisplayText(String entity) {
    return entity
        .split('_')
        .map(
          (word) => word.isEmpty
              ? ''
              : '${word[0].toUpperCase()}${word.substring(1)}',
        )
        .join(' ');
  }
}

/// FilterBar - Pure composition molecule
///
/// Combines SearchInput atom with FilterDropdown atoms.
/// NO STATE - just layout. Debouncing/state is parent's job.
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

  /// Optional entity type filter (rendered first after search)
  final EntityFilterConfig? entityFilter;

  /// List of additional filter configurations
  final List<FilterConfig> filters;

  /// Optional trailing widget (e.g., action buttons)
  final Widget? trailing;

  /// Whether the entire bar is enabled
  final bool enabled;

  /// Compact mode for tighter spacing
  final bool compact;

  /// Autofocus search input on mount
  final bool autofocus;

  const FilterBar({
    super.key,
    this.searchValue = '',
    required this.onSearchChanged,
    this.onSearchSubmitted,
    this.searchPlaceholder = 'Search...',
    this.showSearch = true,
    this.entityFilter,
    this.filters = const [],
    this.trailing,
    this.enabled = true,
    this.compact = false,
    this.autofocus = false,
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
              autofocus: autofocus,
            ),
          ),

        // Entity filter (if provided)
        if (entityFilter != null)
          FilterDropdown<String>(
            value: entityFilter!.value,
            items: entityFilter!.entities,
            onChanged: entityFilter!.onChanged,
            displayText:
                entityFilter!.displayText ??
                EntityFilterConfig.defaultDisplayText,
            label: entityFilter!.label,
            showAllOption: true,
            allOptionText: entityFilter!.allOptionText,
            enabled: enabled && entityFilter!.enabled,
            compact: compact,
          ),

        // Additional filter dropdowns
        ...filters.map(
          (filter) => filter.build(globalEnabled: enabled, compact: compact),
        ),

        // Trailing widget
        if (trailing != null) trailing!,
      ],
    );
  }
}
