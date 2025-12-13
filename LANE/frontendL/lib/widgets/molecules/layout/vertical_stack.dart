/// VerticalStack - Molecular Wrapper for Column
///
/// Pure single-atom molecule that provides semantic vertical layout.
/// ZERO logic - pure composition following SRP-literal atomic design.
///
/// Wraps Flutter's Column with semantic parameters.
library;

import 'package:flutter/material.dart';

/// Semantic vertical layout wrapper (Column)
///
/// Single-atom molecule: Wraps Column with semantic API.
/// Zero logic, pure composition.
class VerticalStack extends StatelessWidget {
  /// Children widgets to stack vertically
  final List<Widget> children;

  /// How to align children horizontally
  final CrossAxisAlignment crossAxisAlignment;

  /// How to align children vertically
  final MainAxisAlignment mainAxisAlignment;

  /// How much space children should occupy vertically
  final MainAxisSize mainAxisSize;

  /// Text baseline for aligning children
  final TextBaseline? textBaseline;

  /// Text direction for children
  final TextDirection? textDirection;

  /// Vertical direction for stacking
  final VerticalDirection verticalDirection;

  const VerticalStack({
    super.key,
    required this.children,
    this.crossAxisAlignment = CrossAxisAlignment.start,
    this.mainAxisAlignment = MainAxisAlignment.start,
    this.mainAxisSize = MainAxisSize.max,
    this.textBaseline,
    this.textDirection,
    this.verticalDirection = VerticalDirection.down,
  });

  /// Centered variant - children centered horizontally and vertically
  const VerticalStack.centered({
    super.key,
    required this.children,
    this.mainAxisSize = MainAxisSize.max,
    this.textBaseline,
    this.textDirection,
    this.verticalDirection = VerticalDirection.down,
  }) : crossAxisAlignment = CrossAxisAlignment.center,
       mainAxisAlignment = MainAxisAlignment.center;

  /// Start-aligned variant - children aligned to leading edge
  const VerticalStack.start({
    super.key,
    required this.children,
    this.mainAxisAlignment = MainAxisAlignment.start,
    this.mainAxisSize = MainAxisSize.max,
    this.textBaseline,
    this.textDirection,
    this.verticalDirection = VerticalDirection.down,
  }) : crossAxisAlignment = CrossAxisAlignment.start;

  /// End-aligned variant - children aligned to trailing edge
  const VerticalStack.end({
    super.key,
    required this.children,
    this.mainAxisAlignment = MainAxisAlignment.start,
    this.mainAxisSize = MainAxisSize.max,
    this.textBaseline,
    this.textDirection,
    this.verticalDirection = VerticalDirection.down,
  }) : crossAxisAlignment = CrossAxisAlignment.end;

  /// Stretch variant - children stretched to fill horizontal space
  const VerticalStack.stretch({
    super.key,
    required this.children,
    this.mainAxisAlignment = MainAxisAlignment.start,
    this.mainAxisSize = MainAxisSize.max,
    this.textBaseline,
    this.textDirection,
    this.verticalDirection = VerticalDirection.down,
  }) : crossAxisAlignment = CrossAxisAlignment.stretch;

  @override
  Widget build(BuildContext context) {
    // Pure wrapper - zero logic, just semantic API → Flutter primitive
    return Column(
      crossAxisAlignment: crossAxisAlignment,
      mainAxisAlignment: mainAxisAlignment,
      mainAxisSize: mainAxisSize,
      textBaseline: textBaseline,
      textDirection: textDirection,
      verticalDirection: verticalDirection,
      children: children,
    );
  }
}
