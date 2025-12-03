/// Responsive Breakpoints - Material Design 3 Standard
///
/// Defines screen size breakpoints and responsive utilities.
/// Based on Material Design 3 window size classes.
///
/// Breakpoints:
/// - Compact: 0-600dp (phones in portrait)
/// - Medium: 600-840dp (tablets in portrait, phones in landscape)
/// - Expanded: 840-1200dp (tablets in landscape, small desktops)
/// - Large: 1200-1600dp (desktops)
/// - Extra Large: 1600+dp (wide desktops)
///
/// Usage:
/// ```dart
/// // Get current breakpoint
/// final breakpoint = context.breakpoint;
///
/// // Conditional rendering
/// if (breakpoint.isCompact) {
///   return MobileLayout();
/// } else {
///   return DesktopLayout();
/// }
///
/// // Responsive values
/// final columns = breakpoint.columns; // 4, 8, or 12
/// ```
library;

import 'package:flutter/material.dart';

/// Extension on BuildContext for easy access to responsive breakpoints
extension ResponsiveExtension on BuildContext {
  /// Get the current responsive breakpoint
  Breakpoint get breakpoint =>
      Breakpoint.fromWidth(MediaQuery.sizeOf(this).width);

  /// Check if current width is compact (mobile)
  bool get isCompact => breakpoint.isCompact;

  /// Check if current width is medium (tablet)
  bool get isMedium => breakpoint.isMedium;

  /// Check if current width is expanded (small desktop)
  bool get isExpanded => breakpoint.isExpanded;

  /// Check if current width is large (desktop)
  bool get isLarge => breakpoint.isLarge;

  /// Check if current width is extra large (wide desktop)
  bool get isExtraLarge => breakpoint.isExtraLarge;
}

/// Material Design 3 window size class breakpoints
class ResponsiveBreakpoints {
  ResponsiveBreakpoints._();

  /// Compact breakpoint (0-600dp) - Phones in portrait
  static const double compact = 600.0;

  /// Medium breakpoint (600-840dp) - Tablets in portrait, phones in landscape
  static const double medium = 840.0;

  /// Expanded breakpoint (840-1200dp) - Tablets in landscape, small desktops
  static const double expanded = 1200.0;

  /// Large breakpoint (1200-1600dp) - Desktops
  static const double large = 1600.0;

  /// Extra Large breakpoint (1600+dp) - Wide desktops
  static const double extraLarge = 1600.0;
}

/// Represents a responsive breakpoint with utility methods
class Breakpoint {
  final double width;

  const Breakpoint._(this.width);

  /// Create breakpoint from width
  factory Breakpoint.fromWidth(double width) {
    return Breakpoint._(width);
  }

  /// Check if compact (0-600dp)
  bool get isCompact => width < ResponsiveBreakpoints.compact;

  /// Check if medium (600-840dp)
  bool get isMedium =>
      width >= ResponsiveBreakpoints.compact &&
      width < ResponsiveBreakpoints.medium;

  /// Check if expanded (840-1200dp)
  bool get isExpanded =>
      width >= ResponsiveBreakpoints.medium &&
      width < ResponsiveBreakpoints.expanded;

  /// Check if large (1200-1600dp)
  bool get isLarge =>
      width >= ResponsiveBreakpoints.expanded &&
      width < ResponsiveBreakpoints.large;

  /// Check if extra large (1600+dp)
  bool get isExtraLarge => width >= ResponsiveBreakpoints.extraLarge;

  /// Material Design 3 column count for this breakpoint
  /// Compact: 4, Medium: 8, Expanded+: 12
  int get columns {
    if (isCompact) return 4;
    if (isMedium) return 8;
    return 12;
  }

  /// Get responsive value based on breakpoint
  T responsive<T>({
    required T compact,
    T? medium,
    T? expanded,
    T? large,
    T? extraLarge,
  }) {
    if (isExtraLarge && extraLarge != null) return extraLarge;
    if (isLarge && large != null) return large;
    if (isExpanded && expanded != null) return expanded;
    if (isMedium && medium != null) return medium;
    return compact;
  }

  /// Get minimum column width for grid layouts
  double get minColumnWidth {
    if (isCompact) return 150.0;
    if (isMedium) return 200.0;
    return 250.0;
  }

  @override
  String toString() {
    if (isCompact) return 'Breakpoint.compact';
    if (isMedium) return 'Breakpoint.medium';
    if (isExpanded) return 'Breakpoint.expanded';
    if (isLarge) return 'Breakpoint.large';
    return 'Breakpoint.extraLarge';
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Breakpoint &&
          runtimeType == other.runtimeType &&
          width == other.width;

  @override
  int get hashCode => width.hashCode;
}
