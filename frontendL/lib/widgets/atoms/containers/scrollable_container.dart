/// ScrollableContainer - Atom for scrollable content with visible scrollbar
///
/// **SOLE RESPONSIBILITY:** Provide consistent scrolling UX with visible scrollbars
///
/// Architectural benefits:
/// - Consistent scrollbar styling across app
/// - Always shows scrollbar when content overflows
/// - Single source of truth for scroll behavior
/// - Follows SRP - only handles scrolling presentation
///
/// Usage:
/// ```dart
/// ScrollableContainer.horizontal(
///   child: WideContent(),
/// )
/// ```
library;

import 'package:flutter/material.dart';
import '../../../config/constants.dart';

/// Reusable scrollable container with visible scrollbar
class ScrollableContainer extends StatelessWidget {
  final Widget child;
  final Axis scrollDirection;
  final ScrollController? controller;

  const ScrollableContainer({
    super.key,
    required this.child,
    this.scrollDirection = Axis.vertical,
    this.controller,
  });

  /// Horizontal scrolling with visible scrollbar (common for tables)
  const ScrollableContainer.horizontal({
    super.key,
    required this.child,
    this.controller,
  }) : scrollDirection = Axis.horizontal;

  /// Vertical scrolling with visible scrollbar
  const ScrollableContainer.vertical({
    super.key,
    required this.child,
    this.controller,
  }) : scrollDirection = Axis.vertical;

  @override
  Widget build(BuildContext context) {
    final effectiveController = controller ?? ScrollController();

    return Scrollbar(
      controller: effectiveController,
      thumbVisibility: true, // Always show scrollbar when content overflows
      trackVisibility: true, // Show track for better UX
      thickness: StyleConstants.scrollbarThickness,
      radius: Radius.circular(StyleConstants.scrollbarRadius),
      child: SingleChildScrollView(
        controller: effectiveController,
        scrollDirection: scrollDirection,
        // Padding synced with scrollbar thickness to prevent overlay
        padding: scrollDirection == Axis.horizontal
            ? const EdgeInsets.only(
                bottom: StyleConstants.scrollbarPadding,
              ) // Space for horizontal scrollbar
            : const EdgeInsets.only(
                right: StyleConstants.scrollbarPadding,
              ), // Space for vertical scrollbar
        child: child,
      ),
    );
  }
}
