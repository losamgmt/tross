/// AdaptiveScroll - Platform-aware scrollable container atom
///
/// Automatically applies platform-appropriate scroll physics:
/// - iOS: BouncingScrollPhysics (elastic overscroll)
/// - Android/Web/Desktop: ClampingScrollPhysics (hard stop)
///
/// Also handles:
/// - Keyboard dismiss on scroll (mobile)
/// - Consistent Scrollbar styling
/// - Restoration ID for scroll position persistence
///
/// Usage:
/// ```dart
/// // Simple vertical scroll
/// AdaptiveScroll(child: MyContent())
///
/// // Horizontal scroll
/// AdaptiveScroll.horizontal(child: MyContent())
///
/// // List builder
/// AdaptiveScroll.list(
///   itemCount: items.length,
///   itemBuilder: (context, index) => ItemWidget(items[index]),
/// )
/// ```
library;

import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import '../../../config/platform_utilities.dart';

/// Platform-aware scrollable container
class AdaptiveScroll extends StatelessWidget {
  final Widget child;
  final Axis scrollDirection;
  final bool reverse;
  final EdgeInsetsGeometry? padding;
  final ScrollController? controller;
  final bool primary;
  final String? restorationId;
  final Clip clipBehavior;
  final DragStartBehavior dragStartBehavior;

  /// Override platform physics if needed
  final ScrollPhysics? physicsOverride;

  /// Override keyboard dismiss behavior if needed
  final ScrollViewKeyboardDismissBehavior? keyboardDismissBehaviorOverride;

  const AdaptiveScroll({
    super.key,
    required this.child,
    this.scrollDirection = Axis.vertical,
    this.reverse = false,
    this.padding,
    this.controller,
    this.primary = false,
    this.restorationId,
    this.clipBehavior = Clip.hardEdge,
    this.dragStartBehavior = DragStartBehavior.start,
    this.physicsOverride,
    this.keyboardDismissBehaviorOverride,
  });

  /// Vertical scrolling (default)
  const AdaptiveScroll.vertical({
    super.key,
    required this.child,
    this.reverse = false,
    this.padding,
    this.controller,
    this.primary = false,
    this.restorationId,
    this.clipBehavior = Clip.hardEdge,
    this.dragStartBehavior = DragStartBehavior.start,
    this.physicsOverride,
    this.keyboardDismissBehaviorOverride,
  }) : scrollDirection = Axis.vertical;

  /// Horizontal scrolling
  const AdaptiveScroll.horizontal({
    super.key,
    required this.child,
    this.reverse = false,
    this.padding,
    this.controller,
    this.primary = false,
    this.restorationId,
    this.clipBehavior = Clip.hardEdge,
    this.dragStartBehavior = DragStartBehavior.start,
    this.physicsOverride,
    this.keyboardDismissBehaviorOverride,
  }) : scrollDirection = Axis.horizontal;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: scrollDirection,
      reverse: reverse,
      padding: padding,
      controller: controller,
      primary: primary,
      physics: physicsOverride ?? PlatformUtilities.scrollPhysics,
      dragStartBehavior: dragStartBehavior,
      clipBehavior: clipBehavior,
      restorationId: restorationId,
      keyboardDismissBehavior:
          keyboardDismissBehaviorOverride ??
          PlatformUtilities.keyboardDismissBehavior,
      child: child,
    );
  }
}

/// Platform-aware ListView wrapper
class AdaptiveListView extends StatelessWidget {
  final int itemCount;
  final Widget Function(BuildContext, int) itemBuilder;
  final Widget Function(BuildContext, int)? separatorBuilder;
  final Axis scrollDirection;
  final bool reverse;
  final ScrollController? controller;
  final bool primary;
  final EdgeInsetsGeometry? padding;
  final bool shrinkWrap;
  final String? restorationId;
  final Clip clipBehavior;

  /// Override platform physics if needed
  final ScrollPhysics? physicsOverride;

  /// Override keyboard dismiss behavior if needed
  final ScrollViewKeyboardDismissBehavior? keyboardDismissBehaviorOverride;

  const AdaptiveListView({
    super.key,
    required this.itemCount,
    required this.itemBuilder,
    this.separatorBuilder,
    this.scrollDirection = Axis.vertical,
    this.reverse = false,
    this.controller,
    this.primary = false,
    this.padding,
    this.shrinkWrap = false,
    this.restorationId,
    this.clipBehavior = Clip.hardEdge,
    this.physicsOverride,
    this.keyboardDismissBehaviorOverride,
  });

  @override
  Widget build(BuildContext context) {
    final physics = physicsOverride ?? PlatformUtilities.scrollPhysics;
    final keyboardBehavior =
        keyboardDismissBehaviorOverride ??
        PlatformUtilities.keyboardDismissBehavior;

    if (separatorBuilder != null) {
      return ListView.separated(
        scrollDirection: scrollDirection,
        reverse: reverse,
        controller: controller,
        primary: primary,
        physics: physics,
        shrinkWrap: shrinkWrap,
        padding: padding,
        itemCount: itemCount,
        itemBuilder: itemBuilder,
        separatorBuilder: separatorBuilder!,
        restorationId: restorationId,
        clipBehavior: clipBehavior,
        keyboardDismissBehavior: keyboardBehavior,
      );
    }

    return ListView.builder(
      scrollDirection: scrollDirection,
      reverse: reverse,
      controller: controller,
      primary: primary,
      physics: physics,
      shrinkWrap: shrinkWrap,
      padding: padding,
      itemCount: itemCount,
      itemBuilder: itemBuilder,
      restorationId: restorationId,
      clipBehavior: clipBehavior,
      keyboardDismissBehavior: keyboardBehavior,
    );
  }
}
