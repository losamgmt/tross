import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../config/app_spacing.dart';

/// InlineEditCell - Molecule for inline editing within table cells or lists
///
/// **SOLE RESPONSIBILITY:** Switch between display and edit modes inline
/// - Context-agnostic: NO domain logic
/// - Fully parameterized: display value, edit widget, callbacks
///
/// GENERIC: Works for any inline editing scenario:
/// - Table cell editing
/// - List item editing
/// - Inline form fields
/// - Quick edit overlays
///
/// Usage:
/// ```dart
/// // Simple text editing
/// InlineEditCell(
///   value: 'Current value',
///   isEditing: _isEditing,
///   onEditStart: () => setState(() => _isEditing = true),
///   onEditEnd: (newValue) => setState(() {
///     _value = newValue;
///     _isEditing = false;
///   }),
///   editWidget: TextField(
///     controller: _controller,
///     autofocus: true,
///   ),
/// )
///
/// // With custom display widget
/// InlineEditCell(
///   value: '42',
///   displayWidget: Row(
///     children: [Icon(Icons.tag), Text('42')],
///   ),
///   isEditing: _isEditing,
///   onEditStart: () => setState(() => _isEditing = true),
///   onEditEnd: (_) => setState(() => _isEditing = false),
///   editWidget: NumberInput(...),
/// )
/// ```
class InlineEditCell extends StatelessWidget {
  /// The current value (used for display if displayWidget not provided)
  final String value;

  /// Custom display widget (overrides default text display)
  final Widget? displayWidget;

  /// Widget to show when editing
  final Widget editWidget;

  /// Whether currently in edit mode
  final bool isEditing;

  /// Called when user initiates editing (e.g., double-tap or tap on edit icon)
  final VoidCallback? onEditStart;

  /// Called when editing ends with the new value
  final ValueChanged<String>? onEditEnd;

  /// Called when editing is cancelled
  final VoidCallback? onCancel;

  /// Whether to show edit icon hint when not editing
  final bool showEditHint;

  /// Icon to show for edit hint
  final IconData editIcon;

  /// Whether the cell is enabled for editing
  final bool enabled;

  /// Alignment of the display content
  final Alignment alignment;

  /// Padding around the cell content
  final EdgeInsetsGeometry? padding;

  /// Edit mode trigger (double tap or single tap)
  final InlineEditTrigger editTrigger;

  const InlineEditCell({
    super.key,
    required this.value,
    this.displayWidget,
    required this.editWidget,
    required this.isEditing,
    this.onEditStart,
    this.onEditEnd,
    this.onCancel,
    this.showEditHint = true,
    this.editIcon = Icons.edit,
    this.enabled = true,
    this.alignment = Alignment.centerLeft,
    this.padding,
    this.editTrigger = InlineEditTrigger.doubleTap,
  });

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final theme = Theme.of(context);
    final effectivePadding =
        padding ??
        EdgeInsets.symmetric(horizontal: spacing.sm, vertical: spacing.xs);

    if (isEditing) {
      return _buildEditMode(context, effectivePadding);
    }

    return _buildDisplayMode(context, theme, spacing, effectivePadding);
  }

  Widget _buildEditMode(BuildContext context, EdgeInsetsGeometry padding) {
    return Container(padding: padding, alignment: alignment, child: editWidget);
  }

  Widget _buildDisplayMode(
    BuildContext context,
    ThemeData theme,
    AppSpacing spacing,
    EdgeInsetsGeometry padding,
  ) {
    final displayContent =
        displayWidget ??
        Text(
          value,
          overflow: TextOverflow.ellipsis,
          style: theme.textTheme.bodyMedium,
        );

    Widget content = Container(
      padding: padding,
      alignment: alignment,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Flexible(child: displayContent),
          if (showEditHint && enabled) ...[
            SizedBox(width: spacing.xs),
            Icon(
              editIcon,
              size: 14,
              color: theme.colorScheme.onSurface.withValues(alpha: 0.4),
            ),
          ],
        ],
      ),
    );

    if (!enabled) {
      return Opacity(opacity: 0.5, child: content);
    }

    // Wrap with appropriate gesture detector
    return switch (editTrigger) {
      InlineEditTrigger.doubleTap => GestureDetector(
        onDoubleTap: onEditStart,
        child: content,
      ),
      InlineEditTrigger.singleTap => GestureDetector(
        onTap: onEditStart,
        child: content,
      ),
      InlineEditTrigger.longPress => GestureDetector(
        onLongPress: onEditStart,
        child: content,
      ),
    };
  }
}

/// Trigger type for entering edit mode
enum InlineEditTrigger {
  /// Double tap to edit (default, safer for touch)
  doubleTap,

  /// Single tap to edit
  singleTap,

  /// Long press to edit
  longPress,
}

/// InlineEditTextField - Pre-built edit widget for text editing
///
/// A convenience widget for the common case of editing text values.
class InlineEditTextField extends StatefulWidget {
  /// Initial value
  final String initialValue;

  /// Called when editing completes (submit or focus lost)
  final ValueChanged<String>? onSubmit;

  /// Called when editing is cancelled (escape key)
  final VoidCallback? onCancel;

  /// Whether to auto-focus on mount
  final bool autofocus;

  /// Keyboard type
  final TextInputType? keyboardType;

  /// Text input action
  final TextInputAction? textInputAction;

  const InlineEditTextField({
    super.key,
    required this.initialValue,
    this.onSubmit,
    this.onCancel,
    this.autofocus = true,
    this.keyboardType,
    this.textInputAction = TextInputAction.done,
  });

  @override
  State<InlineEditTextField> createState() => _InlineEditTextFieldState();
}

class _InlineEditTextFieldState extends State<InlineEditTextField> {
  late TextEditingController _controller;
  late FocusNode _focusNode;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.initialValue);
    _focusNode = FocusNode();
    _focusNode.addListener(_onFocusChange);
  }

  @override
  void dispose() {
    _focusNode.removeListener(_onFocusChange);
    _focusNode.dispose();
    _controller.dispose();
    super.dispose();
  }

  void _onFocusChange() {
    if (!_focusNode.hasFocus) {
      widget.onSubmit?.call(_controller.text);
    }
  }

  void _handleSubmit(String value) {
    widget.onSubmit?.call(value);
  }

  void _handleKeyEvent(KeyEvent event) {
    if (event is KeyDownEvent &&
        event.logicalKey == LogicalKeyboardKey.escape) {
      widget.onCancel?.call();
    }
  }

  @override
  Widget build(BuildContext context) {
    return KeyboardListener(
      focusNode: FocusNode(),
      onKeyEvent: _handleKeyEvent,
      child: TextField(
        controller: _controller,
        focusNode: _focusNode,
        autofocus: widget.autofocus,
        keyboardType: widget.keyboardType,
        textInputAction: widget.textInputAction,
        onSubmitted: _handleSubmit,
        decoration: const InputDecoration(
          isDense: true,
          contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          border: OutlineInputBorder(),
        ),
      ),
    );
  }
}
