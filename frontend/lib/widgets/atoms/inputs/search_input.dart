/// SearchInput - Generic search input atom
///
/// **SOLE RESPONSIBILITY:** Render a search text field with search icon
/// - Context-agnostic: NO layout assumptions
/// - Debounce-ready: onChanged fires as user types (debounce is caller's job)
/// - Parent decides: placement, sizing, debounce timing
///
/// GENERIC: Works for ANY search context (table filter, global search,
/// entity lookup, autocomplete trigger, etc.)
///
/// Features:
/// - Search icon prefix (configurable)
/// - Clear button when has text
/// - Placeholder/hint text
/// - Compact and standard sizes
/// - Enabled/disabled states
/// - onSubmitted for Enter key handling
///
/// Usage:
/// ```dart
/// // Basic search
/// SearchInput(
///   value: searchQuery,
///   onChanged: (value) => setState(() => searchQuery = value),
///   placeholder: 'Search...',
/// )
///
/// // With submit handler
/// SearchInput(
///   value: searchQuery,
///   onChanged: (value) => setState(() => searchQuery = value),
///   onSubmitted: (value) => performSearch(value),
///   placeholder: 'Search users...',
/// )
///
/// // Compact variant
/// SearchInput(
///   value: query,
///   onChanged: updateQuery,
///   compact: true,
/// )
/// ```
library;

import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';

class SearchInput extends StatefulWidget {
  /// Current search value
  final String value;

  /// Callback when value changes
  final ValueChanged<String> onChanged;

  /// Callback when user presses Enter/submits
  final ValueChanged<String>? onSubmitted;

  /// Placeholder text
  final String placeholder;

  /// Whether field is enabled
  final bool enabled;

  /// Compact mode (smaller height/padding)
  final bool compact;

  /// Leading icon (default: search icon)
  final IconData leadingIcon;

  /// Whether to show clear button when has text
  final bool showClearButton;

  /// Autofocus on mount
  final bool autofocus;

  const SearchInput({
    super.key,
    required this.value,
    required this.onChanged,
    this.onSubmitted,
    this.placeholder = 'Search...',
    this.enabled = true,
    this.compact = false,
    this.leadingIcon = Icons.search,
    this.showClearButton = true,
    this.autofocus = false,
  });

  @override
  State<SearchInput> createState() => _SearchInputState();
}

class _SearchInputState extends State<SearchInput> {
  late TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.value);
  }

  @override
  void didUpdateWidget(SearchInput oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Sync controller if value changed externally
    if (widget.value != oldWidget.value && widget.value != _controller.text) {
      _controller.text = widget.value;
      // Move cursor to end
      _controller.selection = TextSelection.collapsed(
        offset: _controller.text.length,
      );
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _handleClear() {
    _controller.clear();
    widget.onChanged('');
  }

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final theme = Theme.of(context);

    final hasText = _controller.text.isNotEmpty;
    final verticalPadding = widget.compact ? spacing.xs : spacing.sm;
    final iconSize = widget.compact ? 18.0 : 20.0;

    return TextField(
      controller: _controller,
      enabled: widget.enabled,
      autofocus: widget.autofocus,
      onChanged: widget.onChanged,
      onSubmitted: widget.onSubmitted,
      style: theme.textTheme.bodyMedium,
      decoration: InputDecoration(
        hintText: widget.placeholder,
        hintStyle: theme.textTheme.bodyMedium?.copyWith(
          color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
        ),
        prefixIcon: Icon(
          widget.leadingIcon,
          size: iconSize,
          color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
        ),
        suffixIcon: (widget.showClearButton && hasText && widget.enabled)
            ? IconButton(
                icon: Icon(Icons.clear, size: iconSize),
                onPressed: _handleClear,
                tooltip: 'Clear',
              )
            : null,
        contentPadding: EdgeInsets.symmetric(
          vertical: verticalPadding,
          horizontal: spacing.sm,
        ),
        border: OutlineInputBorder(
          borderRadius: spacing.radiusSM,
          borderSide: BorderSide(color: theme.colorScheme.outline),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: spacing.radiusSM,
          borderSide: BorderSide(
            color: theme.colorScheme.outline.withValues(alpha: 0.5),
          ),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: spacing.radiusSM,
          borderSide: BorderSide(color: theme.colorScheme.primary, width: 2),
        ),
        disabledBorder: OutlineInputBorder(
          borderRadius: spacing.radiusSM,
          borderSide: BorderSide(
            color: theme.colorScheme.outline.withValues(alpha: 0.3),
          ),
        ),
        filled: true,
        fillColor: widget.enabled
            ? theme.colorScheme.surface
            : theme.colorScheme.onSurface.withValues(alpha: 0.05),
      ),
    );
  }
}
