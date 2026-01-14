/// DebouncedSearchFilter - Organism with State Management
///
/// **SOLE RESPONSIBILITY:** Manage search/filter state with debouncing
/// - StatefulWidget for debounce timer management
/// - Composes: FilterBar molecule (pure composition)
/// - Adds: Debounce logic, consolidated callbacks
///
/// **ATOMIC DESIGN COMPLIANCE:**
/// - Organism = Molecule + behavior/state
/// - All visual composition delegated to FilterBar molecule
/// - Organism adds ONLY: state management, debouncing, callbacks
///
/// Features:
/// - Configurable debounce duration for search
/// - Immediate callbacks for filter changes (no debounce)
/// - Consolidated onFilterChanged callback with all current values
/// - Optional separate callbacks per filter
/// - Cancel pending debounce on unmount
///
/// Usage:
/// ```dart
/// // Basic debounced search
/// DebouncedSearchFilter(
///   onSearchChanged: (query) => loadData(query: query),
///   debounceDuration: Duration(milliseconds: 300),
/// )
///
/// // With entity filter
/// DebouncedSearchFilter(
///   onSearchChanged: (query) => loadData(query: query),
///   entityFilter: EntityFilterConfig(
///     value: selectedEntity,
///     entities: availableEntities,
///     onChanged: (entity) => loadData(entity: entity),
///   ),
/// )
///
/// // Consolidated callback
/// DebouncedSearchFilter(
///   onFilterChanged: (search, entity, filters) {
///     loadData(query: search, entity: entity, filters: filters);
///   },
/// )
/// ```
library;

import 'dart:async';
import 'package:flutter/material.dart';
import '../../molecules/forms/filter_bar.dart';

// Re-export FilterBar types for convenience
export '../../molecules/forms/filter_bar.dart'
    show FilterConfig, EntityFilterConfig;

/// Callback with all current filter values
typedef OnFilterChanged =
    void Function(
      String searchQuery,
      String? entityFilter,
      Map<String, dynamic> additionalFilters,
    );

/// DebouncedSearchFilter - Organism that adds debouncing to FilterBar
///
/// Composes the pure FilterBar molecule and adds:
/// - Debounce timer for search input
/// - State synchronization
/// - Consolidated callbacks
class DebouncedSearchFilter extends StatefulWidget {
  /// Initial search value
  final String? initialSearch;

  /// Callback when search changes (debounced)
  final ValueChanged<String>? onSearchChanged;

  /// Callback when search is submitted (Enter - immediate, not debounced)
  final ValueChanged<String>? onSearchSubmitted;

  /// Debounce duration for search input
  final Duration debounceDuration;

  /// Search placeholder text
  final String searchPlaceholder;

  /// Entity filter configuration (changes are immediate, not debounced)
  final EntityFilterConfig? entityFilter;

  /// Additional filter configurations
  final List<FilterConfig>? additionalFilters;

  /// Consolidated callback when any filter changes
  /// Called with debounced search and immediate filter values
  final OnFilterChanged? onFilterChanged;

  /// Whether inputs are enabled
  final bool enabled;

  /// Use compact sizing
  final bool compact;

  /// Autofocus search on mount
  final bool autofocus;

  /// Optional trailing widget
  final Widget? trailing;

  const DebouncedSearchFilter({
    super.key,
    this.initialSearch,
    this.onSearchChanged,
    this.onSearchSubmitted,
    this.debounceDuration = const Duration(milliseconds: 300),
    this.searchPlaceholder = 'Search...',
    this.entityFilter,
    this.additionalFilters,
    this.onFilterChanged,
    this.enabled = true,
    this.compact = false,
    this.autofocus = false,
    this.trailing,
  });

  @override
  State<DebouncedSearchFilter> createState() => _DebouncedSearchFilterState();
}

class _DebouncedSearchFilterState extends State<DebouncedSearchFilter> {
  late String _searchValue;
  Timer? _debounceTimer;

  @override
  void initState() {
    super.initState();
    _searchValue = widget.initialSearch ?? '';
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    super.dispose();
  }

  void _onSearchChanged(String value) {
    setState(() => _searchValue = value);

    // Cancel previous timer
    _debounceTimer?.cancel();

    // Start new debounce timer
    _debounceTimer = Timer(widget.debounceDuration, () {
      widget.onSearchChanged?.call(value);
      _notifyFilterChanged();
    });
  }

  void _onSearchSubmitted(String value) {
    // Cancel pending debounce - we're submitting now
    _debounceTimer?.cancel();

    widget.onSearchSubmitted?.call(value);
    widget.onSearchChanged?.call(value);
    _notifyFilterChanged();
  }

  void _notifyFilterChanged() {
    if (widget.onFilterChanged != null) {
      widget.onFilterChanged!(
        _searchValue,
        widget.entityFilter?.value,
        _buildAdditionalFiltersMap(),
      );
    }
  }

  Map<String, dynamic> _buildAdditionalFiltersMap() {
    if (widget.additionalFilters == null) return {};

    final map = <String, dynamic>{};
    for (var i = 0; i < widget.additionalFilters!.length; i++) {
      final filter = widget.additionalFilters![i];
      map['filter_$i'] = filter.value;
    }
    return map;
  }

  /// Create wrapped entity filter that notifies on change
  EntityFilterConfig? _wrapEntityFilter() {
    final original = widget.entityFilter;
    if (original == null) return null;

    return EntityFilterConfig(
      value: original.value,
      entities: original.entities,
      label: original.label,
      allOptionText: original.allOptionText,
      displayText: original.displayText,
      enabled: original.enabled,
      onChanged: (value) {
        // Call original callback
        original.onChanged(value);
        // Also trigger consolidated callback (immediate, no debounce)
        _notifyFilterChanged();
      },
    );
  }

  /// Wrap additional filters to notify on change
  List<FilterConfig>? _wrapAdditionalFilters() {
    final original = widget.additionalFilters;
    if (original == null) return null;

    return original.map((filter) {
      return FilterConfig<dynamic>(
        value: filter.value,
        items: filter.items,
        displayText: filter.displayText,
        label: filter.label,
        showAllOption: filter.showAllOption,
        allOptionText: filter.allOptionText,
        enabled: filter.enabled,
        onChanged: (value) {
          // Call original callback
          filter.onChanged(value);
          // Also trigger consolidated callback (immediate)
          _notifyFilterChanged();
        },
      );
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    // Pure composition: delegate to FilterBar molecule
    return FilterBar(
      searchValue: _searchValue,
      onSearchChanged: _onSearchChanged,
      onSearchSubmitted: widget.onSearchSubmitted != null
          ? _onSearchSubmitted
          : null,
      searchPlaceholder: widget.searchPlaceholder,
      entityFilter: _wrapEntityFilter(),
      filters: _wrapAdditionalFilters() ?? [],
      enabled: widget.enabled,
      compact: widget.compact,
      autofocus: widget.autofocus,
      trailing: widget.trailing,
    );
  }
}
