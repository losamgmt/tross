/// ScrollableContent - Platform-aware scrollable container molecule
///
/// Enhanced wrapper that provides:
/// - Platform-appropriate scroll physics (iOS bounce, Android clamp)
/// - Automatic keyboard dismiss on scroll (mobile)
/// - Tap-outside to dismiss keyboard (mobile)
/// - Semantic API over Flutter primitives
///
/// Wraps Flutter's SingleChildScrollView with platform-aware defaults.
library;

import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import '../../../config/platform_utilities.dart';

/// Semantic scrollable container wrapper with platform awareness
///
/// Molecule: Wraps SingleChildScrollView with semantic API and platform defaults.
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

  /// Physics for scrolling behavior (defaults to platform-appropriate)
  final ScrollPhysics? physics;

  /// Controller for programmatic scrolling
  final ScrollController? controller;

  /// Drag start behavior
  final DragStartBehavior dragStartBehavior;

  /// Clip behavior for overflow
  final Clip clipBehavior;

  /// Key for restoring scroll position
  final String? restorationId;

  /// Keyboard dismiss behavior (defaults to platform-appropriate)
  final ScrollViewKeyboardDismissBehavior? keyboardDismissBehavior;

  /// Whether to dismiss keyboard on tap outside (mobile only)
  final bool dismissKeyboardOnTapOutside;

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
    this.keyboardDismissBehavior,
    this.dismissKeyboardOnTapOutside = true,
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
    this.keyboardDismissBehavior,
    this.dismissKeyboardOnTapOutside = true,
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
    this.keyboardDismissBehavior,
    this.dismissKeyboardOnTapOutside = true,
  }) : scrollDirection = Axis.horizontal;

  @override
  Widget build(BuildContext context) {
    // Platform-aware defaults
    final effectivePhysics = physics ?? PlatformUtilities.scrollPhysics;
    final effectiveKeyboardBehavior =
        keyboardDismissBehavior ?? PlatformUtilities.keyboardDismissBehavior;

    Widget scrollView = SingleChildScrollView(
      scrollDirection: scrollDirection,
      reverse: reverse,
      padding: padding,
      primary: primary,
      physics: effectivePhysics,
      controller: controller,
      dragStartBehavior: dragStartBehavior,
      clipBehavior: clipBehavior,
      restorationId: restorationId,
      keyboardDismissBehavior: effectiveKeyboardBehavior,
      child: child,
    );

    // Wrap with tap-to-dismiss on touch devices
    if (dismissKeyboardOnTapOutside && PlatformUtilities.isTouchDevice) {
      scrollView = GestureDetector(
        onTap: () => FocusScope.of(context).unfocus(),
        behavior: HitTestBehavior.translucent,
        child: scrollView,
      );
    }

    return scrollView;
  }
}
