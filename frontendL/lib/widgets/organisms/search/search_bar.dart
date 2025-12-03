/// SearchBar - Organism for search/filter input with state management
///
/// **SOLE RESPONSIBILITY:** Manage search state with debouncing
/// - StatefulWidget for managing TextEditingController and debounce timer
/// - Composes atoms: TextField, IconButton
///
/// Debounced input to reduce API calls
library;

import 'package:flutter/material.dart';
import 'dart:async';
import '../../../config/app_spacing.dart';

class SearchBar extends StatefulWidget {
  final String? placeholder;
  final ValueChanged<String>? onSearch;
  final VoidCallback? onClear;
  final Duration debounceDuration;
  final String? initialValue;

  const SearchBar({
    super.key,
    this.placeholder = 'Search...',
    this.onSearch,
    this.onClear,
    this.debounceDuration = const Duration(milliseconds: 500),
    this.initialValue,
  });

  @override
  State<SearchBar> createState() => _SearchBarState();
}

class _SearchBarState extends State<SearchBar> {
  late TextEditingController _controller;
  Timer? _debounceTimer;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.initialValue);
    _controller.addListener(_onTextChanged);
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _onTextChanged() {
    // Cancel previous timer
    _debounceTimer?.cancel();

    // Start new timer
    _debounceTimer = Timer(widget.debounceDuration, () {
      widget.onSearch?.call(_controller.text);
    });
  }

  void _clearSearch() {
    _controller.clear();
    widget.onClear?.call();
    widget.onSearch?.call('');
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final spacing = context.spacing;

    return TextField(
      controller: _controller,
      decoration: InputDecoration(
        hintText: widget.placeholder,
        prefixIcon: Icon(
          Icons.search,
          color: theme.colorScheme.onSurfaceVariant,
        ),
        suffixIcon: _controller.text.isNotEmpty
            ? IconButton(
                icon: const Icon(Icons.clear),
                onPressed: _clearSearch,
                tooltip: 'Clear search',
              )
            : null,
        border: OutlineInputBorder(
          borderRadius: spacing.radiusMD,
          borderSide: BorderSide(color: theme.colorScheme.outline),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: spacing.radiusMD,
          borderSide: BorderSide(
            color: theme.colorScheme.outline.withValues(alpha: 0.5),
          ),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: spacing.radiusMD,
          borderSide: BorderSide(color: theme.colorScheme.primary, width: 2),
        ),
        filled: true,
        fillColor: theme.colorScheme.surfaceContainerHighest.withValues(
          alpha: 0.3,
        ),
        contentPadding: EdgeInsets.symmetric(
          horizontal: spacing.lg,
          vertical: spacing.md,
        ),
      ),
    );
  }
}
