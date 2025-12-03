/// StackFitConfig - Semantic wrappers for Flutter stack fit behaviors
///
/// **SOLE RESPONSIBILITY:** Provide semantic, readable names for StackFit values
///
/// This atom provides ZERO logic - it's purely semantic mapping of Flutter's
/// StackFit enum to meaningful names.
///
/// Why this exists:
/// - `StackFitConfig.loose` is as clear as `StackFit.loose` (consistency)
/// - `StackFitConfig.expandToContainer` adds semantic clarity
/// - Single source of truth for stack fit semantics
/// - Maintains atomic design pattern consistency
///
/// Usage:
/// ```dart
/// Stack(
///   fit: StackFitConfig.loose,
///   children: [...],
/// )
///
/// Stack(
///   fit: StackFitConfig.expandToContainer,
///   children: [...],
/// )
/// ```
library;

import 'package:flutter/material.dart';

/// Semantic stack fit configuration atom
class StackFitConfig {
  // Private constructor to prevent instantiation
  StackFitConfig._();

  // ============================================================================
  // STACK FIT MODES - How non-positioned children size themselves
  // ============================================================================

  /// Loose fit - children sized by their own constraints
  /// Non-positioned children can be their natural size
  static const StackFit loose = StackFit.loose;

  /// Expand to container - children forced to size of Stack
  /// Non-positioned children expand to fill the Stack
  static const StackFit expandToContainer = StackFit.expand;

  /// Pass through - children inherit parent's constraints
  /// Useful for precise control of child sizing
  static const StackFit passThrough = StackFit.passthrough;
}
