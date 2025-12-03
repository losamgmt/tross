/// ScrollableContent - Molecular Wrapper for SingleChildScrollView
///
/// Pure single-atom molecule that provides semantic scrollable container.
/// ZERO logic - pure composition following SRP-literal atomic design.
///
/// Wraps Flutter's SingleChildScrollView with semantic parameters.
library;

import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';

/// Semantic scrollable container wrapper
///
/// Single-atom molecule: Wraps SingleChildScrollView with semantic API.
/// Zero logic, pure composition.
class ScrollableContent extends StatelessWidget {
  /// Child widget that will be scrollable
  final Widget child;

  /// Scroll direction (vertical or horizontal)
  final Axis scrollDirection;

  /// Whether to reverse the scroll direction
  final bool reverse;

  /// Padding around the scrollable content
  final EdgeInsetsGeometry? padding;

  /// Whether content should be in reverse order
  final bool primary;

  /// Physics for scrolling behavior
  final ScrollPhysics? physics;

  /// Controller for programmatic scrolling
  final ScrollController? controller;

  /// Drag start behavior
  final DragStartBehavior dragStartBehavior;

  /// Clip behavior for overflow
  final Clip clipBehavior;

  /// Key for restoring scroll position
  final String? restorationId;

  /// Keyboard dismiss behavior
  final ScrollViewKeyboardDismissBehavior keyboardDismissBehavior;

  const ScrollableContent({
    super.key,
    required this.child,
    this.scrollDirection = Axis.vertical,
    this.reverse = false,
    this.padding,
    this.primary = true,
    this.physics,
    this.controller,
    this.dragStartBehavior = DragStartBehavior.start,
    this.clipBehavior = Clip.hardEdge,
    this.restorationId,
    this.keyboardDismissBehavior = ScrollViewKeyboardDismissBehavior.manual,
  });

  /// Vertical scrolling variant (default)
  const ScrollableContent.vertical({
    super.key,
    required this.child,
    this.reverse = false,
    this.padding,
    this.primary = true,
    this.physics,
    this.controller,
    this.dragStartBehavior = DragStartBehavior.start,
    this.clipBehavior = Clip.hardEdge,
    this.restorationId,
    this.keyboardDismissBehavior = ScrollViewKeyboardDismissBehavior.manual,
  }) : scrollDirection = Axis.vertical;

  /// Horizontal scrolling variant
  const ScrollableContent.horizontal({
    super.key,
    required this.child,
    this.reverse = false,
    this.padding,
    this.primary = false,
    this.physics,
    this.controller,
    this.dragStartBehavior = DragStartBehavior.start,
    this.clipBehavior = Clip.hardEdge,
    this.restorationId,
    this.keyboardDismissBehavior = ScrollViewKeyboardDismissBehavior.manual,
  }) : scrollDirection = Axis.horizontal;

  @override
  Widget build(BuildContext context) {
    // Pure wrapper - zero logic, just semantic API → Flutter primitive
    return SingleChildScrollView(
      scrollDirection: scrollDirection,
      reverse: reverse,
      padding: padding,
      primary: primary,
      physics: physics,
      controller: controller,
      dragStartBehavior: dragStartBehavior,
      clipBehavior: clipBehavior,
      restorationId: restorationId,
      keyboardDismissBehavior: keyboardDismissBehavior,
      child: child,
    );
  }
}
