import 'dart:async';
import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';

/// Lookup input atom for large datasets using Autocomplete
///
/// Unlike SelectInput which loads all items upfront and uses a dropdown,
/// LookupInput uses Flutter's Autocomplete widget for:
/// - **Debounced search** - only queries after user stops typing
/// - **Lazy loading** - fetches matching items on demand
/// - **Keyboard navigation** - full arrow key support
/// - **Type-to-search** - natural keyboard input
///
/// Perfect for:
/// - Foreign key fields with large datasets (100k+ customers)
/// - Any lookup that would be impractical to load entirely
///
/// **SRP: Pure Input Rendering**
/// - Returns ONLY the Autocomplete field
/// - NO label rendering (molecule's job)
/// - NO Column wrapper (molecule handles layout)
/// - Context-agnostic: Can be used anywhere
///
/// Usage:
/// ```dart
/// LookupInput<Customer>(
///   value: selectedCustomer,
///   searchItems: (query) async {
///     return await customerService.search(query);
///   },
///   displayText: (customer) => customer.name,
///   onChanged: (customer) => setState(() => selected = customer),
/// )
/// ```
class LookupInput<T extends Object> extends StatefulWidget {
  /// Currently selected value
  final T? value;

  /// Async function to search for items based on query
  /// Should return filtered list matching the search text
  final Future<List<T>> Function(String query) searchItems;

  /// Function to convert item to display string
  final String Function(T) displayText;

  /// Callback when value is selected
  final ValueChanged<T?> onChanged;

  /// Optional validation function
  final String? Function(T?)? validator;

  /// Current error message to display
  final String? errorText;

  /// Helper text shown below input
  final String? helperText;

  /// Whether field is enabled
  final bool enabled;

  /// Placeholder text
  final String? placeholder;

  /// Optional prefix icon
  final IconData? prefixIcon;

  /// Debounce duration for search (default 300ms)
  final Duration debounceDuration;

  /// Minimum characters before searching (default 2)
  final int minSearchLength;

  /// Allow clearing the selection
  final bool allowClear;

  const LookupInput({
    super.key,
    required this.value,
    required this.searchItems,
    required this.displayText,
    required this.onChanged,
    this.validator,
    this.errorText,
    this.helperText,
    this.enabled = true,
    this.placeholder,
    this.prefixIcon,
    this.debounceDuration = const Duration(milliseconds: 300),
    this.minSearchLength = 2,
    this.allowClear = true,
  });

  @override
  State<LookupInput<T>> createState() => _LookupInputState<T>();
}

class _LookupInputState<T extends Object> extends State<LookupInput<T>> {
  late TextEditingController _textController;
  Completer<List<T>>? _searchCompleter;
  String _lastSearchQuery = '';
  Timer? _debounceTimer;
  bool _isLoading = false;
  bool _hasSelected = false;

  @override
  void initState() {
    super.initState();
    _textController = TextEditingController(
      text: widget.value != null ? widget.displayText(widget.value as T) : '',
    );
    _hasSelected = widget.value != null;
  }

  @override
  void didUpdateWidget(LookupInput<T> oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Update text if value changed externally
    if (widget.value != oldWidget.value) {
      final newText = widget.value != null
          ? widget.displayText(widget.value as T)
          : '';
      if (_textController.text != newText) {
        _textController.text = newText;
        _hasSelected = widget.value != null;
      }
    }
  }

  @override
  void dispose() {
    _textController.dispose();
    _debounceTimer?.cancel();
    super.dispose();
  }

  /// Options builder that returns a Future for proper async Autocomplete support
  Future<Iterable<T>> _optionsBuilder(TextEditingValue textEditingValue) async {
    final query = textEditingValue.text;

    // If selected and user starts typing something different, clear selection
    if (_hasSelected &&
        widget.value != null &&
        query != widget.displayText(widget.value as T)) {
      _hasSelected = false;
      // Schedule the callback for after build
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) widget.onChanged(null);
      });
    }

    // Don't search if too short
    if (query.length < widget.minSearchLength) {
      return [];
    }

    // If same query, don't re-search
    if (query == _lastSearchQuery && _searchCompleter != null) {
      return _searchCompleter!.future;
    }

    _lastSearchQuery = query;

    // Cancel previous timer
    _debounceTimer?.cancel();

    // Create new completer for this search
    _searchCompleter = Completer<List<T>>();
    final currentCompleter = _searchCompleter!;

    // Update loading state after build
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) setState(() => _isLoading = true);
    });

    // Debounce the actual search
    _debounceTimer = Timer(widget.debounceDuration, () async {
      if (!mounted) {
        currentCompleter.complete([]);
        return;
      }

      try {
        final results = await widget.searchItems(query);
        if (!currentCompleter.isCompleted) {
          currentCompleter.complete(results);
        }
        if (mounted) {
          setState(() => _isLoading = false);
        }
      } catch (e) {
        if (!currentCompleter.isCompleted) {
          currentCompleter.complete([]);
        }
        if (mounted) {
          setState(() => _isLoading = false);
        }
      }
    });

    return currentCompleter.future;
  }

  void _onSelected(T item) {
    setState(() {
      _hasSelected = true;
    });
    _textController.text = widget.displayText(item);
    widget.onChanged(item);
  }

  void _onClear() {
    setState(() {
      _hasSelected = false;
      _lastSearchQuery = '';
      _searchCompleter = null;
    });
    _textController.clear();
    widget.onChanged(null);
  }

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Autocomplete<T>(
          displayStringForOption: widget.displayText,
          optionsBuilder: _optionsBuilder,
          onSelected: _onSelected,
          fieldViewBuilder:
              (context, textEditingController, focusNode, onFieldSubmitted) {
                // Sync external controller with Autocomplete's internal one
                // This ensures the text is updated when value changes externally
                if (_textController.text != textEditingController.text) {
                  textEditingController.text = _textController.text;
                }

                // Use ValueListenableBuilder to update suffix icon reactively
                return ValueListenableBuilder<TextEditingValue>(
                  valueListenable: textEditingController,
                  builder: (context, value, child) {
                    return TextField(
                      controller: textEditingController,
                      focusNode: focusNode,
                      enabled: widget.enabled,
                      decoration: InputDecoration(
                        hintText:
                            widget.placeholder ??
                            'Type to search (min ${widget.minSearchLength} chars)...',
                        border: const OutlineInputBorder(),
                        contentPadding: EdgeInsets.symmetric(
                          horizontal: spacing.sm,
                          vertical: spacing.xs,
                        ),
                        prefixIcon: widget.prefixIcon != null
                            ? Icon(widget.prefixIcon)
                            : null,
                        suffixIcon: _buildSuffixIcon(textEditingController),
                      ),
                      onChanged: (value) {
                        // Keep our controller in sync
                        _textController.text = value;
                      },
                      onSubmitted: (_) => onFieldSubmitted(),
                    );
                  },
                );
              },
          optionsViewBuilder: (context, onSelected, options) {
            return Align(
              alignment: Alignment.topLeft,
              child: Material(
                elevation: 4,
                borderRadius: BorderRadius.circular(spacing.xs),
                child: ConstrainedBox(
                  constraints: BoxConstraints(
                    maxHeight: spacing.xxxl * 6,
                    maxWidth: MediaQuery.of(context).size.width * 0.9,
                  ),
                  child: ListView.builder(
                    padding: EdgeInsets.zero,
                    shrinkWrap: true,
                    itemCount: options.length,
                    itemBuilder: (context, index) {
                      final option = options.elementAt(index);
                      final isHighlighted =
                          AutocompleteHighlightedOption.of(context) == index;
                      return ListTile(
                        dense: true,
                        selected: isHighlighted,
                        selectedTileColor: theme.colorScheme.primary.withValues(
                          alpha: 0.1,
                        ),
                        title: Text(widget.displayText(option)),
                        onTap: () => onSelected(option),
                      );
                    },
                  ),
                ),
              ),
            );
          },
        ),
        // Loading indicator
        if (_isLoading)
          Padding(
            padding: EdgeInsets.only(top: spacing.xxs, left: spacing.sm),
            child: Row(
              children: [
                SizedBox(
                  width: 12,
                  height: 12,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: theme.colorScheme.primary,
                  ),
                ),
                SizedBox(width: spacing.xs),
                Text(
                  'Searching...',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                  ),
                ),
              ],
            ),
          ),
        // Helper text
        if (widget.helperText != null &&
            widget.errorText == null &&
            !_isLoading)
          Padding(
            padding: EdgeInsets.only(top: spacing.xxs, left: spacing.sm),
            child: Text(
              widget.helperText!,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
              ),
            ),
          ),
        // Error text
        if (widget.errorText != null)
          Padding(
            padding: EdgeInsets.only(top: spacing.xxs, left: spacing.sm),
            child: Text(
              widget.errorText!,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.error,
              ),
            ),
          ),
      ],
    );
  }

  Widget? _buildSuffixIcon(TextEditingController controller) {
    if (_isLoading) {
      return const Padding(
        padding: EdgeInsets.all(12),
        child: SizedBox(
          width: 16,
          height: 16,
          child: CircularProgressIndicator(strokeWidth: 2),
        ),
      );
    }

    if (widget.allowClear && controller.text.isNotEmpty && widget.enabled) {
      return IconButton(
        icon: const Icon(Icons.clear),
        onPressed: _onClear,
        tooltip: 'Clear',
      );
    }

    return const Icon(Icons.search);
  }
}
