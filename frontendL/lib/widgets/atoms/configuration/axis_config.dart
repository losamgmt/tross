/// AxisConfig - Semantic wrappers for Flutter axis directions
///
/// **SOLE RESPONSIBILITY:** Provide semantic, readable names for axis values
///
/// This atom provides ZERO logic - it's purely semantic mapping of Flutter's
/// Axis enum to meaningful names.
///
/// Why this exists:
/// - `AxisConfig.vertical` is as clear as `Axis.vertical` (consistency)
/// - Single source of truth for axis semantics across app
/// - Easy to search and refactor all axis usage
/// - Maintains atomic design pattern consistency
///
/// Usage:
/// ```dart
/// ListView(
///   scrollDirection: AxisConfig.horizontal,
///   children: [...],
/// )
///
/// Flex(
///   direction: AxisConfig.vertical,
///   children: [...],
/// )
/// ```
library;

import 'package:flutter/material.dart';

/// Semantic axis configuration atom
class AxisConfig {
  // Private constructor to prevent instantiation
  AxisConfig._();

  // ============================================================================
  // AXIS DIRECTIONS
  // ============================================================================

  /// Vertical axis - top to bottom
  /// Used for: Column-like layouts, vertical scrolling
  static const Axis vertical = Axis.vertical;

  /// Horizontal axis - start to end (left to right in LTR)
  /// Used for: Row-like layouts, horizontal scrolling
  static const Axis horizontal = Axis.horizontal;
}
