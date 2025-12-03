/// FlexConfig - Semantic wrappers for Flutter flex and fit behaviors
///
/// **SOLE RESPONSIBILITY:** Provide semantic, readable names for flex/fit values
///
/// This atom provides ZERO logic - it's purely semantic mapping of Flutter's
/// flex integers and FlexFit enum to meaningful names.
///
/// Why this exists:
/// - `FlexConfig.equalWeight` is clearer than `flex: 1`
/// - `FlexConfig.fillRemaining` is clearer than `FlexFit.tight`
/// - Single source of truth for flex semantics
/// - Prevents magic numbers in layouts
///
/// Usage:
/// ```dart
/// Flexible(
///   flex: FlexConfig.equalWeight,
///   fit: FlexConfig.expandToFill,
///   child: Container(),
/// )
///
/// Expanded(
///   flex: FlexConfig.doubleWeight,
///   child: Container(),
/// )
/// ```
library;

import 'package:flutter/material.dart';

/// Semantic flex and fit configuration atom
class FlexConfig {
  // Private constructor to prevent instantiation
  FlexConfig._();

  // ============================================================================
  // FLEX WEIGHTS - Common flex integer values
  // ============================================================================

  /// No flex - don't expand (flex: 0)
  static const int noFlex = 0;

  /// Equal weight - share space equally (flex: 1)
  static const int equalWeight = 1;

  /// Double weight - take twice the space of equalWeight siblings (flex: 2)
  static const int doubleWeight = 2;

  /// Triple weight - take three times the space of equalWeight siblings (flex: 3)
  static const int tripleWeight = 3;

  /// Quadruple weight - take four times the space of equalWeight siblings (flex: 4)
  static const int quadrupleWeight = 4;

  /// Dominant weight - take most available space (flex: 10)
  static const int dominantWeight = 10;

  // ============================================================================
  // FLEX FIT MODES - How widgets fill their flex space
  // ============================================================================

  /// Expand to fill - widget expands to fill allocated space (FlexFit.tight)
  /// This is the behavior of Expanded widget
  static const FlexFit expandToFill = FlexFit.tight;

  /// Loose fit - widget can be smaller than allocated space (FlexFit.loose)
  /// This is the default behavior of Flexible widget
  static const FlexFit looseFit = FlexFit.loose;
}
