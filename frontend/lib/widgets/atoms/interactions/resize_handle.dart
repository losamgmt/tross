/// ResizeHandle - Platform-aware resize drag handle
///
/// Provides draggable resize handle for column/row resizing.
/// Mobile: 48dp drag area. Web/Desktop: 8dp with cursor feedback.
library;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../config/platform_utilities.dart';
import '../../../config/app_spacing.dart';

/// Platform-aware resize handle
class ResizeHandle extends StatefulWidget {
  final Axis direction;
  final VoidCallback? onDragStart;
  final ValueChanged<double>? onDragUpdate;
  final VoidCallback? onDragEnd;
  final double? indicatorLength;
  final Color? indicatorColor;
  final bool enabled;

  const ResizeHandle({
    super.key,
    this.direction = Axis.horizontal,
    this.onDragStart,
    this.onDragUpdate,
    this.onDragEnd,
    this.indicatorLength,
    this.indicatorColor,
    this.enabled = true,
  });

  /// Horizontal resize handle (column resizing)
  const ResizeHandle.horizontal({
    super.key,
    this.onDragStart,
    this.onDragUpdate,
    this.onDragEnd,
    this.indicatorLength,
    this.indicatorColor,
    this.enabled = true,
  }) : direction = Axis.horizontal;

  /// Vertical resize handle (row resizing)
  const ResizeHandle.vertical({
    super.key,
    this.onDragStart,
    this.onDragUpdate,
    this.onDragEnd,
    this.indicatorLength,
    this.indicatorColor,
    this.enabled = true,
  }) : direction = Axis.vertical;

  @override
  State<ResizeHandle> createState() => _ResizeHandleState();
}

class _ResizeHandleState extends State<ResizeHandle> {
  bool _isDragging = false;

  bool get _isHorizontal => widget.direction == Axis.horizontal;

  double get _dragAreaSize =>
      PlatformUtilities.adaptiveSize(pointer: 8, touch: 48);

  MouseCursor get _cursor => widget.enabled
      ? (_isHorizontal
            ? SystemMouseCursors.resizeColumn
            : SystemMouseCursors.resizeRow)
      : SystemMouseCursors.basic;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final spacing = context.spacing;
    final length = widget.indicatorLength ?? spacing.xl;
    final color =
        widget.indicatorColor ??
        theme.colorScheme.outline.withValues(alpha: _isDragging ? 0.8 : 0.4);

    // Visual indicator line
    final indicator = Container(
      width: _isHorizontal ? 2 : length,
      height: _isHorizontal ? length : 2,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(1),
      ),
    );

    // Drag area (larger than indicator for touch)
    Widget handle = Container(
      width: _isHorizontal ? _dragAreaSize : null,
      height: !_isHorizontal ? _dragAreaSize : null,
      color: Colors.transparent,
      alignment: Alignment.center,
      child: indicator,
    );

    // Gesture detection
    if (widget.enabled && widget.onDragUpdate != null) {
      handle = GestureDetector(
        behavior: HitTestBehavior.opaque,
        onHorizontalDragStart: _isHorizontal ? _onDragStart : null,
        onHorizontalDragUpdate: _isHorizontal ? _onHorizontalUpdate : null,
        onHorizontalDragEnd: _isHorizontal ? _onDragEnd : null,
        onVerticalDragStart: !_isHorizontal ? _onDragStart : null,
        onVerticalDragUpdate: !_isHorizontal ? _onVerticalUpdate : null,
        onVerticalDragEnd: !_isHorizontal ? _onDragEnd : null,
        child: handle,
      );
    }

    // Cursor on pointer devices
    if (PlatformUtilities.isPointerDevice) {
      handle = MouseRegion(cursor: _cursor, child: handle);
    }

    return Semantics(
      label: _isHorizontal ? 'Resize column' : 'Resize row',
      slider: true,
      enabled: widget.enabled,
      child: handle,
    );
  }

  void _onDragStart(DragStartDetails _) {
    if (PlatformUtilities.isTouchDevice) HapticFeedback.selectionClick();
    setState(() => _isDragging = true);
    widget.onDragStart?.call();
  }

  void _onHorizontalUpdate(DragUpdateDetails d) =>
      widget.onDragUpdate?.call(d.delta.dx);
  void _onVerticalUpdate(DragUpdateDetails d) =>
      widget.onDragUpdate?.call(d.delta.dy);

  void _onDragEnd(DragEndDetails _) {
    setState(() => _isDragging = false);
    widget.onDragEnd?.call();
  }
}
