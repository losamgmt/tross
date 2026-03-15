/// CollapseToggleIcon - Animated expand/collapse indicator
///
/// Displays an animated chevron icon that rotates based on expanded state.
/// Pure visual atom - receives state from parent (typically CollapseController).
///
/// **Design principle:** Receives animation from CollapseController for smooth sync.
/// Alternatively accepts just isExpanded for simple cases.
///
/// Usage:
/// ```dart
/// // With CollapseController animation (smooth sync)
/// CollapseController(
///   builder: (context, isExpanded, toggle, animation) => Row(
///     children: [
///       Text('Header'),
///       CollapseToggleIcon(
///         animation: animation,
///         onTap: toggle,
///       ),
///     ],
///   ),
/// )
///
/// // Without animation (uses internal implicit animation)
/// CollapseToggleIcon(
///   isExpanded: someState,
///   onTap: () => setState(() => someState = !someState),
/// )
/// ```
library;

import 'dart:math' as math;
import 'package:flutter/material.dart';

/// Animated chevron icon for collapse toggle
class CollapseToggleIcon extends StatelessWidget {
  /// External animation from CollapseController (takes priority over isExpanded)
  final Animation<double>? animation;

  /// Simple expanded state (used if animation is null)
  final bool isExpanded;

  /// Callback when icon is tapped
  final VoidCallback? onTap;

  /// Icon size (defaults to 24)
  final double size;

  /// Icon color (defaults to theme icon color)
  final Color? color;

  /// Semantic label for accessibility
  final String? semanticLabel;

  /// Duration for implicit animation when using isExpanded (not animation)
  final Duration duration;

  const CollapseToggleIcon({
    super.key,
    this.animation,
    this.isExpanded = true,
    this.onTap,
    this.size = 24.0,
    this.color,
    this.duration = const Duration(milliseconds: 200),
    this.semanticLabel,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final iconColor =
        color ?? theme.iconTheme.color ?? theme.colorScheme.onSurface;
    final effectiveLabel =
        semanticLabel ?? (isExpanded ? 'Collapse' : 'Expand');

    Widget icon;

    if (animation != null) {
      // Use external animation - synchronizes with CollapseController
      icon = AnimatedBuilder(
        animation: animation!,
        builder: (context, child) => Transform.rotate(
          angle: animation!.value * math.pi, // 0 → π (180°)
          child: child,
        ),
        child: Icon(Icons.expand_more, size: size, color: iconColor),
      );
    } else {
      // Use implicit animation based on isExpanded bool
      icon = TweenAnimationBuilder<double>(
        tween: Tween(
          begin: isExpanded ? 1.0 : 0.0,
          end: isExpanded ? 1.0 : 0.0,
        ),
        duration: duration,
        builder: (context, value, child) => Transform.rotate(
          angle: value * math.pi, // 0 → π (180°)
          child: child,
        ),
        child: Icon(Icons.expand_more, size: size, color: iconColor),
      );
    }

    return Semantics(
      label: effectiveLabel,
      button: onTap != null,
      child: onTap != null
          ? IconButton(
              onPressed: onTap,
              icon: icon,
              iconSize: size,
              padding: EdgeInsets.zero,
              constraints: BoxConstraints(
                minWidth: size + 8,
                minHeight: size + 8,
              ),
              tooltip: effectiveLabel,
            )
          : icon,
    );
  }
}
