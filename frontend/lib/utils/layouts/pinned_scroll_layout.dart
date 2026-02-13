/// PinnedScrollLayout - Generic layout with pinned regions and scrollable center
///
/// A flexible layout widget that supports pinning content to any edge while
/// the center region scrolls. All pinned regions automatically sync their
/// scroll position with the center.
///
/// Layout structure:
/// ```
/// ┌─────────────────────────────────────────────┐
/// │              pinnedTop                      │ ← syncs horizontally
/// ├─────────┬─────────────────────┬─────────────┤
/// │ pinned  │                     │   pinned    │
/// │  Left   │       CENTER        │    Right    │ ← sync vertically
/// │ (sync-V)│   (scrolls both)    │  (sync-V)   │
/// ├─────────┴─────────────────────┴─────────────┤
/// │             pinnedBottom                    │ ← syncs horizontally
/// └─────────────────────────────────────────────┘
/// ```
///
/// Features:
/// - Pin content to any edge (or combination)
/// - Automatic scroll synchronization via [ScrollSyncGroup]
/// - Optional scrollbars
/// - Works with any widget content (tables, lists, grids)
///
/// Usage:
/// ```dart
/// PinnedScrollLayout(
///   pinnedLeft: myLeftColumn,
///   pinnedRight: myActionsColumn,
///   scrollableHorizontal: true,
///   scrollableVertical: true,
///   child: myDataTable,
/// )
/// ```
library;

import 'package:flutter/material.dart';
import '../../config/constants.dart';
import '../../config/platform_utilities.dart';
import '../scroll_sync_group.dart';

/// A layout with pinnable regions on any edge and a scrollable center
class PinnedScrollLayout extends StatefulWidget {
  /// The main scrollable content (center region)
  final Widget child;

  /// Content pinned to the left edge (scrolls vertically with center)
  final Widget? pinnedLeft;

  /// Content pinned to the right edge (scrolls vertically with center)
  final Widget? pinnedRight;

  /// Content pinned to the top edge (scrolls horizontally with center)
  final Widget? pinnedTop;

  /// Content pinned to the bottom edge (scrolls horizontally with center)
  final Widget? pinnedBottom;

  /// Whether the center region scrolls horizontally
  final bool scrollableHorizontal;

  /// Whether the center region scrolls vertically
  final bool scrollableVertical;

  /// Whether to show scrollbars
  final bool showScrollbars;

  /// Scrollbar thickness
  final double scrollbarThickness;

  /// Padding at the bottom for scrollbar clearance
  final double scrollbarPadding;

  const PinnedScrollLayout({
    super.key,
    required this.child,
    this.pinnedLeft,
    this.pinnedRight,
    this.pinnedTop,
    this.pinnedBottom,
    this.scrollableHorizontal = true,
    this.scrollableVertical = true,
    this.showScrollbars = true,
    this.scrollbarThickness = StyleConstants.scrollbarThickness,
    this.scrollbarPadding = 4.0,
  });

  @override
  State<PinnedScrollLayout> createState() => _PinnedScrollLayoutState();
}

class _PinnedScrollLayoutState extends State<PinnedScrollLayout> {
  // Sync groups for coordinated scrolling
  late final ScrollSyncGroup _verticalSync = ScrollSyncGroup();
  late final ScrollSyncGroup _horizontalSync = ScrollSyncGroup();

  // Controllers for each region
  late final ScrollController _centerVertical = _verticalSync
      .createController();
  late final ScrollController _centerHorizontal = _horizontalSync
      .createController();
  late final ScrollController _leftVertical = _verticalSync.createController();
  late final ScrollController _rightVertical = _verticalSync.createController();
  late final ScrollController _topHorizontal = _horizontalSync
      .createController();
  late final ScrollController _bottomHorizontal = _horizontalSync
      .createController();

  @override
  void dispose() {
    _verticalSync.dispose();
    _horizontalSync.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final hasLeft = widget.pinnedLeft != null;
    final hasRight = widget.pinnedRight != null;
    final hasTop = widget.pinnedTop != null;
    final hasBottom = widget.pinnedBottom != null;

    // Build the center content with appropriate scroll wrappers
    Widget centerContent = widget.child;

    // Add bottom padding for scrollbar clearance
    if (widget.showScrollbars && widget.scrollableVertical) {
      centerContent = Padding(
        padding: EdgeInsets.only(
          bottom: widget.scrollbarThickness + widget.scrollbarPadding,
        ),
        child: centerContent,
      );
    }

    // Wrap in horizontal scroll if needed
    if (widget.scrollableHorizontal) {
      final horizontalScroll = SingleChildScrollView(
        controller: _centerHorizontal,
        scrollDirection: Axis.horizontal,
        physics: PlatformUtilities.scrollPhysics,
        child: centerContent,
      );

      centerContent = widget.showScrollbars
          ? Scrollbar(
              controller: _centerHorizontal,
              thumbVisibility: true,
              trackVisibility: true,
              thickness: widget.scrollbarThickness,
              radius: Radius.circular(widget.scrollbarThickness / 2),
              notificationPredicate: (notification) => notification.depth == 0,
              child: horizontalScroll,
            )
          : horizontalScroll;
    }

    // Wrap in vertical scroll if needed
    if (widget.scrollableVertical) {
      final verticalScroll = SingleChildScrollView(
        controller: _centerVertical,
        physics: PlatformUtilities.scrollPhysics,
        child: centerContent,
      );

      centerContent = widget.showScrollbars
          ? Scrollbar(
              controller: _centerVertical,
              thumbVisibility: true,
              trackVisibility: true,
              thickness: widget.scrollbarThickness,
              radius: Radius.circular(widget.scrollbarThickness / 2),
              child: verticalScroll,
            )
          : verticalScroll;
    }

    // Build left pinned region
    Widget? leftRegion;
    if (hasLeft) {
      leftRegion = SingleChildScrollView(
        controller: _leftVertical,
        physics: PlatformUtilities.scrollPhysics,
        child: Padding(
          padding: EdgeInsets.only(
            bottom: widget.showScrollbars && widget.scrollableVertical
                ? widget.scrollbarThickness + widget.scrollbarPadding
                : 0,
          ),
          child: widget.pinnedLeft,
        ),
      );
    }

    // Build right pinned region
    Widget? rightRegion;
    if (hasRight) {
      rightRegion = SingleChildScrollView(
        controller: _rightVertical,
        physics: PlatformUtilities.scrollPhysics,
        child: Padding(
          padding: EdgeInsets.only(
            bottom: widget.showScrollbars && widget.scrollableVertical
                ? widget.scrollbarThickness + widget.scrollbarPadding
                : 0,
          ),
          child: widget.pinnedRight,
        ),
      );
    }

    // Build top pinned region
    Widget? topRegion;
    if (hasTop) {
      topRegion = widget.scrollableHorizontal
          ? SingleChildScrollView(
              controller: _topHorizontal,
              scrollDirection: Axis.horizontal,
              physics: PlatformUtilities.scrollPhysics,
              child: widget.pinnedTop,
            )
          : widget.pinnedTop;
    }

    // Build bottom pinned region
    Widget? bottomRegion;
    if (hasBottom) {
      bottomRegion = widget.scrollableHorizontal
          ? SingleChildScrollView(
              controller: _bottomHorizontal,
              scrollDirection: Axis.horizontal,
              physics: PlatformUtilities.scrollPhysics,
              child: widget.pinnedBottom,
            )
          : widget.pinnedBottom;
    }

    // Compose the horizontal row (left + center + right)
    Widget horizontalLayout = Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (leftRegion != null) leftRegion,
        Expanded(child: centerContent),
        if (rightRegion != null) rightRegion,
      ],
    );

    // Compose the full layout (top + middle + bottom)
    if (hasTop || hasBottom) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (topRegion != null) topRegion,
          Expanded(child: horizontalLayout),
          if (bottomRegion != null) bottomRegion,
        ],
      );
    }

    return horizontalLayout;
  }
}
