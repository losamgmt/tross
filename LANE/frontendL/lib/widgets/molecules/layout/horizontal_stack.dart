/// HorizontalStack - Molecular Wrapper for Row
///
/// Pure single-atom molecule that provides semantic horizontal layout.
/// ZERO logic - pure composition following SRP-literal atomic design.
///
/// Wraps Flutter's Row with semantic parameters.
library;

import 'package:flutter/material.dart';

/// Semantic horizontal layout wrapper (Row)
///
/// Single-atom molecule: Wraps Row with semantic API.
/// Zero logic, pure composition.
class HorizontalStack extends StatelessWidget {
  /// Children widgets to stack horizontally
  final List<Widget> children;

  /// How to align children vertically
  final CrossAxisAlignment crossAxisAlignment;

  /// How to align children horizontally
  final MainAxisAlignment mainAxisAlignment;

  /// How much space children should occupy horizontally
  final MainAxisSize mainAxisSize;

  /// Text baseline for aligning children
  final TextBaseline? textBaseline;

  /// Text direction for children
  final TextDirection? textDirection;

  /// Vertical direction for cross-axis alignment
  final VerticalDirection verticalDirection;

  const HorizontalStack({
    super.key,
    required this.children,
    this.crossAxisAlignment = CrossAxisAlignment.center,
    this.mainAxisAlignment = MainAxisAlignment.start,
    this.mainAxisSize = MainAxisSize.max,
    this.textBaseline,
    this.textDirection,
    this.verticalDirection = VerticalDirection.down,
  });

  /// Centered variant - children centered horizontally and vertically
  const HorizontalStack.centered({
    super.key,
    required this.children,
    this.mainAxisSize = MainAxisSize.max,
    this.textBaseline,
    this.textDirection,
    this.verticalDirection = VerticalDirection.down,
  }) : crossAxisAlignment = CrossAxisAlignment.center,
       mainAxisAlignment = MainAxisAlignment.center;

  /// Start-aligned variant - children aligned to leading edge
  const HorizontalStack.start({
    super.key,
    required this.children,
    this.crossAxisAlignment = CrossAxisAlignment.center,
    this.mainAxisSize = MainAxisSize.max,
    this.textBaseline,
    this.textDirection,
    this.verticalDirection = VerticalDirection.down,
  }) : mainAxisAlignment = MainAxisAlignment.start;

  /// End-aligned variant - children aligned to trailing edge
  const HorizontalStack.end({
    super.key,
    required this.children,
    this.crossAxisAlignment = CrossAxisAlignment.center,
    this.mainAxisSize = MainAxisSize.max,
    this.textBaseline,
    this.textDirection,
    this.verticalDirection = VerticalDirection.down,
  }) : mainAxisAlignment = MainAxisAlignment.end;

  /// Space-between variant - children evenly spaced
  const HorizontalStack.spaceBetween({
    super.key,
    required this.children,
    this.crossAxisAlignment = CrossAxisAlignment.center,
    this.mainAxisSize = MainAxisSize.max,
    this.textBaseline,
    this.textDirection,
    this.verticalDirection = VerticalDirection.down,
  }) : mainAxisAlignment = MainAxisAlignment.spaceBetween;

  /// Space-around variant - children with space around each
  const HorizontalStack.spaceAround({
    super.key,
    required this.children,
    this.crossAxisAlignment = CrossAxisAlignment.center,
    this.mainAxisSize = MainAxisSize.max,
    this.textBaseline,
    this.textDirection,
    this.verticalDirection = VerticalDirection.down,
  }) : mainAxisAlignment = MainAxisAlignment.spaceAround;

  @override
  Widget build(BuildContext context) {
    // Pure wrapper - zero logic, just semantic API → Flutter primitive
    return Row(
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
