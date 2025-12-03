/// SpacedBox - Molecular Wrapper for SizedBox
///
/// Pure single-atom molecule that provides semantic spacing.
/// ZERO logic - pure composition following SRP-literal atomic design.
///
/// Wraps Flutter's SizedBox with semantic parameters.
library;

import 'package:flutter/material.dart';

/// Semantic spacing box wrapper
///
/// Single-atom molecule: Wraps SizedBox with semantic API.
/// Zero logic, pure composition.
class SpacedBox extends StatelessWidget {
  /// Width of the box
  final double? width;

  /// Height of the box
  final double? height;

  /// Child widget (optional - can be used for fixed-size container)
  final Widget? child;

  const SpacedBox({super.key, this.width, this.height, this.child});

  /// Square box variant
  const SpacedBox.square({super.key, required double size, this.child})
    : width = size,
      height = size;

  /// Vertical spacer variant (height only)
  const SpacedBox.vertical({super.key, required this.height})
    : width = null,
      child = null;

  /// Horizontal spacer variant (width only)
  const SpacedBox.horizontal({super.key, required this.width})
    : height = null,
      child = null;

  /// Expand variant - fills available space
  const SpacedBox.expand({super.key, this.child})
    : width = double.infinity,
      height = double.infinity;

  /// Shrink variant - zero size
  const SpacedBox.shrink({super.key, this.child}) : width = 0.0, height = 0.0;

  @override
  Widget build(BuildContext context) {
    // Pure wrapper - zero logic, just semantic API → Flutter primitive
    return SizedBox(width: width, height: height, child: child);
  }
}
