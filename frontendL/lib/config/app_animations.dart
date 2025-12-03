/// Application Animation System
///
/// Single source of truth for ALL animation durations and curves.
/// KISS Principle: Animations only - no widgets or other styling.
///
/// Organization:
/// - Durations: Timing constants for animations
/// - Curves: Easing functions for smooth motion
///
/// Usage:
/// ```dart
/// AnimatedContainer(
///   duration: AppAnimations.durationNormal,
///   curve: AppAnimations.curveEaseInOut,
/// )
/// ```
library;

import 'package:flutter/material.dart';

/// Application animation constants
class AppAnimations {
  // Private constructor to prevent instantiation
  AppAnimations._();

  // ============================================================================
  // DURATIONS - Timing constants
  // ============================================================================

  /// Instant (0ms) - No animation
  /// Use for: Immediate changes, no transition
  static const Duration durationInstant = Duration.zero;

  /// Very fast (100ms)
  /// Use for: Micro-interactions, hover states
  static const Duration durationVeryFast = Duration(milliseconds: 100);

  /// Fast (200ms)
  /// Use for: Quick transitions, snackbars
  static const Duration durationFast = Duration(milliseconds: 200);

  /// Normal (300ms) - Default
  /// Use for: Standard transitions, dialogs, page changes
  static const Duration durationNormal = Duration(milliseconds: 300);

  /// Medium (400ms)
  /// Use for: Complex animations, list reordering
  static const Duration durationMedium = Duration(milliseconds: 400);

  /// Slow (500ms)
  /// Use for: Emphasized transitions, important changes
  static const Duration durationSlow = Duration(milliseconds: 500);

  /// Very slow (800ms)
  /// Use for: Dramatic effects, onboarding
  static const Duration durationVerySlow = Duration(milliseconds: 800);

  // ============================================================================
  // CURVES - Easing functions
  // ============================================================================

  /// Linear - Constant speed
  /// Use for: Loading spinners, continuous rotations
  static const Curve curveLinear = Curves.linear;

  /// Ease - Gradual acceleration and deceleration
  /// Use for: General purpose, natural motion
  static const Curve curveEase = Curves.ease;

  /// Ease In - Starts slow, ends fast
  /// Use for: Elements exiting the screen
  static const Curve curveEaseIn = Curves.easeIn;

  /// Ease Out - Starts fast, ends slow
  /// Use for: Elements entering the screen
  static const Curve curveEaseOut = Curves.easeOut;

  /// Ease In Out - Smooth start and end (DEFAULT)
  /// Use for: Most animations, page transitions
  static const Curve curveEaseInOut = Curves.easeInOut;

  /// Ease In Cubic - Stronger ease in
  /// Use for: Emphasized exits
  static const Curve curveEaseInCubic = Curves.easeInCubic;

  /// Ease Out Cubic - Stronger ease out
  /// Use for: Emphasized entrances
  static const Curve curveEaseOutCubic = Curves.easeOutCubic;

  /// Fast Out Slow In - Material Design standard
  /// Use for: Material transitions, dialogs
  static const Curve curveFastOutSlowIn = Curves.fastOutSlowIn;

  /// Bounce - Bouncing effect
  /// Use for: Playful interactions, confirmations
  static const Curve curveBounce = Curves.bounceOut;

  /// Elastic - Elastic overshoot
  /// Use for: Attention-grabbing animations
  static const Curve curveElastic = Curves.elasticOut;

  /// Decelerate - Starts fast, gradually slows (Material default)
  /// Use for: Material scrolling, fling gestures
  static const Curve curveDecelerate = Curves.decelerate;

  // ============================================================================
  // COMMON COMBINATIONS - Predefined duration + curve pairs
  // ============================================================================

  /// Quick fade (200ms, ease out)
  /// Use for: Tooltips, hover effects
  static const Duration quickFadeDuration = durationFast;
  static const Curve quickFadeCurve = curveEaseOut;

  /// Standard transition (300ms, ease in out)
  /// Use for: Page changes, dialog open/close
  static const Duration standardTransitionDuration = durationNormal;
  static const Curve standardTransitionCurve = curveEaseInOut;

  /// Emphasized transition (400ms, fast out slow in)
  /// Use for: Important state changes
  static const Duration emphasizedTransitionDuration = durationMedium;
  static const Curve emphasizedTransitionCurve = curveFastOutSlowIn;

  /// Smooth scroll (500ms, decelerate)
  /// Use for: Programmatic scrolling
  static const Duration smoothScrollDuration = durationSlow;
  static const Curve smoothScrollCurve = curveDecelerate;
}
