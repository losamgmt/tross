/// PageScaffold - Molecular Wrapper for Scaffold
///
/// Pure single-atom molecule that provides semantic page structure.
/// ZERO logic - pure composition following SRP-literal atomic design.
///
/// Wraps Flutter's Scaffold with semantic parameters.
library;

import 'package:flutter/material.dart';

/// Semantic page scaffold wrapper
///
/// Single-atom molecule: Wraps Scaffold with semantic API.
/// Zero logic, pure composition.
class PageScaffold extends StatelessWidget {
  /// Page body content
  final Widget? body;

  /// App bar at top of page
  final PreferredSizeWidget? appBar;

  /// Floating action button
  final Widget? floatingActionButton;

  /// Position of floating action button
  final FloatingActionButtonLocation? floatingActionButtonLocation;

  /// Bottom navigation bar
  final Widget? bottomNavigationBar;

  /// Bottom sheet
  final Widget? bottomSheet;

  /// Drawer on the side
  final Widget? drawer;

  /// End drawer on opposite side
  final Widget? endDrawer;

  /// Background color
  final Color? backgroundColor;

  /// Whether to resize body when keyboard appears
  final bool? resizeToAvoidBottomInset;

  /// Whether body extends behind app bar
  final bool extendBody;

  /// Whether body extends behind bottom navigation
  final bool extendBodyBehindAppBar;

  /// Drawer edge drag width
  final double? drawerEdgeDragWidth;

  /// Enable drawer drag gesture
  final bool drawerEnableOpenDragGesture;

  /// Enable end drawer drag gesture
  final bool endDrawerEnableOpenDragGesture;

  const PageScaffold({
    super.key,
    this.body,
    this.appBar,
    this.floatingActionButton,
    this.floatingActionButtonLocation,
    this.bottomNavigationBar,
    this.bottomSheet,
    this.drawer,
    this.endDrawer,
    this.backgroundColor,
    this.resizeToAvoidBottomInset,
    this.extendBody = false,
    this.extendBodyBehindAppBar = false,
    this.drawerEdgeDragWidth,
    this.drawerEnableOpenDragGesture = true,
    this.endDrawerEnableOpenDragGesture = true,
  });

  /// Simple page variant - just body and app bar
  const PageScaffold.simple({
    super.key,
    required this.body,
    this.appBar,
    this.backgroundColor,
    this.resizeToAvoidBottomInset,
  }) : floatingActionButton = null,
       floatingActionButtonLocation = null,
       bottomNavigationBar = null,
       bottomSheet = null,
       drawer = null,
       endDrawer = null,
       extendBody = false,
       extendBodyBehindAppBar = false,
       drawerEdgeDragWidth = null,
       drawerEnableOpenDragGesture = true,
       endDrawerEnableOpenDragGesture = true;

  @override
  Widget build(BuildContext context) {
    // Pure wrapper - zero logic, just semantic API → Flutter primitive
    return Scaffold(
      body: body,
      appBar: appBar,
      floatingActionButton: floatingActionButton,
      floatingActionButtonLocation: floatingActionButtonLocation,
      bottomNavigationBar: bottomNavigationBar,
      bottomSheet: bottomSheet,
      drawer: drawer,
      endDrawer: endDrawer,
      backgroundColor: backgroundColor,
      resizeToAvoidBottomInset: resizeToAvoidBottomInset,
      extendBody: extendBody,
      extendBodyBehindAppBar: extendBodyBehindAppBar,
      drawerEdgeDragWidth: drawerEdgeDragWidth,
      drawerEnableOpenDragGesture: drawerEnableOpenDragGesture,
      endDrawerEnableOpenDragGesture: endDrawerEnableOpenDragGesture,
    );
  }
}
