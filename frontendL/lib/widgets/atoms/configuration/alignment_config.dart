/// AlignmentConfig - Semantic wrappers for Flutter alignment constants
///
/// **SOLE RESPONSIBILITY:** Provide semantic, readable names for alignment values
///
/// This atom provides ZERO logic - it's purely semantic mapping of Flutter's
/// Alignment and AlignmentDirectional constants to meaningful names.
///
/// Why this exists:
/// - `AlignmentConfig.centered` is clearer than `Alignment.center`
/// - `AlignmentConfig.topStart` is clearer than `AlignmentDirectional.topStart`
/// - Single source of truth for alignment semantics
/// - Easy to search and refactor
///
/// Usage:
/// ```dart
/// Container(
///   alignment: AlignmentConfig.centered,
///   child: Text('Centered'),
/// )
///
/// Stack(
///   alignment: AlignmentConfig.bottomEnd,
///   children: [...],
/// )
/// ```
library;

import 'package:flutter/material.dart';

/// Semantic alignment configuration atom
class AlignmentConfig {
  // Private constructor to prevent instantiation
  AlignmentConfig._();

  // ============================================================================
  // CENTER ALIGNMENTS
  // ============================================================================

  /// Center alignment - both horizontally and vertically centered
  static const Alignment centered = Alignment.center;

  // ============================================================================
  // CORNER ALIGNMENTS (Directional - respects RTL/LTR)
  // ============================================================================

  /// Top-start corner (top-left in LTR, top-right in RTL)
  static const AlignmentDirectional topStart = AlignmentDirectional.topStart;

  /// Top-end corner (top-right in LTR, top-left in RTL)
  static const AlignmentDirectional topEnd = AlignmentDirectional.topEnd;

  /// Bottom-start corner (bottom-left in LTR, bottom-right in RTL)
  static const AlignmentDirectional bottomStart =
      AlignmentDirectional.bottomStart;

  /// Bottom-end corner (bottom-right in LTR, bottom-left in RTL)
  static const AlignmentDirectional bottomEnd = AlignmentDirectional.bottomEnd;

  // ============================================================================
  // EDGE ALIGNMENTS (Directional - respects RTL/LTR)
  // ============================================================================

  /// Start edge center (left in LTR, right in RTL)
  static const AlignmentDirectional centerStart =
      AlignmentDirectional.centerStart;

  /// End edge center (right in LTR, left in RTL)
  static const AlignmentDirectional centerEnd = AlignmentDirectional.centerEnd;

  /// Top edge center
  static const Alignment topCenter = Alignment.topCenter;

  /// Bottom edge center
  static const Alignment bottomCenter = Alignment.bottomCenter;

  // ============================================================================
  // ABSOLUTE CORNER ALIGNMENTS (Non-directional - ignores RTL/LTR)
  // ============================================================================
  // Use sparingly - prefer directional alignments for internationalization

  /// Top-left corner (absolute, ignores text direction)
  static const Alignment topLeft = Alignment.topLeft;

  /// Top-right corner (absolute, ignores text direction)
  static const Alignment topRight = Alignment.topRight;

  /// Bottom-left corner (absolute, ignores text direction)
  static const Alignment bottomLeft = Alignment.bottomLeft;

  /// Bottom-right corner (absolute, ignores text direction)
  static const Alignment bottomRight = Alignment.bottomRight;

  // ============================================================================
  // ABSOLUTE EDGE ALIGNMENTS (Non-directional - ignores RTL/LTR)
  // ============================================================================
  // Use sparingly - prefer directional alignments for internationalization

  /// Left edge center (absolute, ignores text direction)
  static const Alignment centerLeft = Alignment.centerLeft;

  /// Right edge center (absolute, ignores text direction)
  static const Alignment centerRight = Alignment.centerRight;
}
