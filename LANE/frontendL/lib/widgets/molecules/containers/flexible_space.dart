/// FlexibleSpace - Molecular Wrapper for Flexible/Expanded
///
/// Pure single-atom molecule that provides semantic flexible layout.
/// ZERO logic - pure composition following SRP-literal atomic design.
///
/// Wraps Flutter's Flexible and Expanded with semantic parameters.
library;

import 'package:flutter/material.dart';

/// Semantic flexible space wrapper
///
/// Single-atom molecule: Wraps Flexible with semantic API.
/// Zero logic, pure composition.
class FlexibleSpace extends StatelessWidget {
  /// Child widget to make flexible
  final Widget child;

  /// Flex factor (how much space to take relative to siblings)
  final int flex;

  /// How to fit the child in available space
  final FlexFit fit;

  const FlexibleSpace({
    super.key,
    required this.child,
    this.flex = 1,
    this.fit = FlexFit.loose,
  });

  /// Expanded variant - child fills available space
  const FlexibleSpace.expanded({super.key, required this.child, this.flex = 1})
    : fit = FlexFit.tight;

  /// Tight variant - child must fill allocated space
  const FlexibleSpace.tight({super.key, required this.child, this.flex = 1})
    : fit = FlexFit.tight;

  /// Loose variant - child can be smaller than allocated space
  const FlexibleSpace.loose({super.key, required this.child, this.flex = 1})
    : fit = FlexFit.loose;

  @override
  Widget build(BuildContext context) {
    // Pure wrapper - zero logic, just semantic API → Flutter primitive
    return Flexible(flex: flex, fit: fit, child: child);
  }
}
