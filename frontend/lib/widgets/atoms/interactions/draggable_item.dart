/// DraggableItem - Generic draggable wrapper for any widget
///
/// SOLE RESPONSIBILITY: Make any widget draggable with data payload
///
/// Platform-aware:
/// - Touch: Long-press to initiate drag (default on mobile)
/// - Pointer: Click-and-drag (default on desktop/web)
///
/// ZERO STYLING OPINIONS:
/// - Uses child's intrinsic appearance
/// - Feedback/placeholder styling is caller's responsibility
/// - No hardcoded sizes, colors, or spacing
///
/// USAGE:
/// ```dart
/// // Basic draggable
/// DraggableItem<int>(
///   data: workOrder['id'],
///   child: WorkOrderCard(workOrder),
/// )
///
/// // With custom feedback and placeholder
/// DraggableItem<int>(
///   data: item['id'],
///   feedbackBuilder: (id) => ItemCard(item, variant: CardVariant.drag),
///   placeholder: ItemCard(item, variant: CardVariant.ghost),
///   child: ItemCard(item),
/// )
///
/// // Force long-press on web for mixed content
/// DraggableItem<int>(
///   data: id,
///   requireLongPress: true,
///   child: MyWidget(),
/// )
/// ```
library;

import 'package:flutter/material.dart';

/// Generic draggable wrapper - entity-agnostic, style-agnostic
///
/// Type parameter [T] is the data payload that travels with the drag.
/// Commonly an int (entity ID), but can be any non-null type.
/// The `extends Object` constraint ensures null safety - use a nullable
/// wrapper type if null is meaningful (e.g., `int?` wrapped in a record).
class DraggableItem<T extends Object> extends StatelessWidget {
  /// The data payload that travels with the drag
  ///
  /// This is what [DropZone.onDrop] receives.
  final T data;

  /// The widget to make draggable
  final Widget child;

  /// Builder for the drag preview (follows cursor)
  ///
  /// If null, uses a Material-wrapped copy of [child] with elevation.
  /// Caller should handle sizing/styling via widget variants.
  final Widget Function(T data)? feedbackBuilder;

  /// Widget to show in original position while dragging
  ///
  /// If null, shows [child] with reduced opacity.
  final Widget? placeholder;

  /// Whether to require long-press to initiate drag
  ///
  /// Default: false on desktop/web, true on mobile (via platform detection).
  /// Set explicitly to override platform default.
  final bool? requireLongPress;

  /// Called when drag starts
  final VoidCallback? onDragStarted;

  /// Called when drag ends (regardless of success)
  final void Function(DraggableDetails)? onDragEnd;

  /// Called when drag is cancelled
  final void Function(Velocity, Offset)? onDraggableCanceled;

  /// Called when item is dropped on a target
  final VoidCallback? onDragCompleted;

  /// Axis constraint for drag movement
  final Axis? axis;

  /// Semantic label for accessibility
  final String? semanticLabel;

  const DraggableItem({
    super.key,
    required this.data,
    required this.child,
    this.feedbackBuilder,
    this.placeholder,
    this.requireLongPress,
    this.onDragStarted,
    this.onDragEnd,
    this.onDraggableCanceled,
    this.onDragCompleted,
    this.axis,
    this.semanticLabel,
  });

  @override
  Widget build(BuildContext context) {
    // Platform-aware default: long-press on touch, immediate on pointer
    final useLongPress = requireLongPress ?? _defaultRequiresLongPress(context);

    final feedback = feedbackBuilder?.call(data) ?? _defaultFeedback();
    final childWhenDragging = placeholder ?? _defaultPlaceholder();

    final semantics = semanticLabel != null
        ? Semantics(label: semanticLabel, child: child)
        : child;

    if (useLongPress) {
      return LongPressDraggable<T>(
        data: data,
        feedback: feedback,
        childWhenDragging: childWhenDragging,
        onDragStarted: onDragStarted,
        onDragEnd: onDragEnd,
        onDraggableCanceled: onDraggableCanceled,
        onDragCompleted: onDragCompleted,
        axis: axis,
        child: semantics,
      );
    }

    return Draggable<T>(
      data: data,
      feedback: feedback,
      childWhenDragging: childWhenDragging,
      onDragStarted: onDragStarted,
      onDragEnd: onDragEnd,
      onDraggableCanceled: onDraggableCanceled,
      onDragCompleted: onDragCompleted,
      axis: axis,
      child: semantics,
    );
  }

  /// Default feedback: Material-wrapped child with elevation
  Widget _defaultFeedback() {
    return Material(elevation: 4, color: Colors.transparent, child: child);
  }

  /// Default placeholder: child with reduced opacity
  Widget _defaultPlaceholder() {
    return Opacity(opacity: 0.4, child: child);
  }

  /// Platform detection for long-press default
  bool _defaultRequiresLongPress(BuildContext context) {
    final platform = Theme.of(context).platform;
    return platform == TargetPlatform.iOS || platform == TargetPlatform.android;
  }
}
