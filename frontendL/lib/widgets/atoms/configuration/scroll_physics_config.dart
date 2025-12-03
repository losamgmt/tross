/// ScrollPhysicsConfig - Semantic wrappers for Flutter scroll physics
///
/// **SOLE RESPONSIBILITY:** Provide semantic, readable names for ScrollPhysics
///
/// This atom provides ZERO logic - it's purely semantic mapping of Flutter's
/// ScrollPhysics classes to meaningful names.
///
/// Why this exists:
/// - `ScrollPhysicsConfig.bouncing` is clearer than `BouncingScrollPhysics()`
/// - `ScrollPhysicsConfig.clamping` is clearer than `ClampingScrollPhysics()`
/// - Single source of truth for scroll behavior semantics
/// - Easy to search and refactor scroll behaviors
///
/// Usage:
/// ```dart
/// ListView(
///   physics: ScrollPhysicsConfig.bouncing,
///   children: [...],
/// )
///
/// SingleChildScrollView(
///   physics: ScrollPhysicsConfig.neverScrollable,
///   child: ...,
/// )
/// ```
library;

import 'package:flutter/material.dart';

/// Semantic scroll physics configuration atom
class ScrollPhysicsConfig {
  // Private constructor to prevent instantiation
  ScrollPhysicsConfig._();

  // ============================================================================
  // SCROLL PHYSICS - How scrollable widgets behave
  // ============================================================================

  /// Bouncing physics - iOS-style bounce at edges
  /// Scrolls past bounds and bounces back
  static const ScrollPhysics bouncing = BouncingScrollPhysics();

  /// Clamping physics - Android-style glow at edges
  /// Stops at bounds with overscroll glow effect
  static const ScrollPhysics clamping = ClampingScrollPhysics();

  /// Never scrollable - disables scrolling completely
  /// Content is not scrollable even if it overflows
  static const ScrollPhysics neverScrollable = NeverScrollableScrollPhysics();

  /// Always scrollable - forces scrollable even if content fits
  /// Useful for pull-to-refresh patterns
  static const ScrollPhysics alwaysScrollable = AlwaysScrollableScrollPhysics();

  /// Platform default - uses platform's native scroll physics
  /// iOS: bouncing, Android: clamping, etc.
  static const ScrollPhysics platformDefault = ScrollPhysics();
}
